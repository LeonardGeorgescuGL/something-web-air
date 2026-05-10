package com.airwatch.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.airwatch.model.AirPollutionResponse;
import com.airwatch.model.Sensor;
import com.airwatch.repository.SensorRepository;

@Service
public class AirQualityService {

    @Value("${openweather.api.key}")
    private String API_KEY;

    @Autowired
    private SensorRepository sensorRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String ML_SERVICE_URL = "http://localhost:8000/cluster";

    // tinem un cache in memorie ca sa nu suprasolicităm API-ul OpenWeather la fiecare request de harta
    private List<Sensor> cachedSensors = new ArrayList<>();
    private long lastFetchMs = 0;
    // cache-ul expira dupa 10 minute
    private static final long CACHE_TTL_MS = 10 * 60 * 1000;

    public AirPollutionResponse getAirQuality(String cartier) {
        return null; // metoda pastrata pentru compatibilitate cu versiunile vechi, nu mai e folosita
    }

    /**
     * Returneaza toti senzorii din baza de date, completati cu datele live
     * de la OpenWeatherMap si cu zona de risc sanitara calculata prin K-Means.
     * Daca cache-ul e inca valid (sub 10 minute vechi) returnam din memorie.
     */
    public List<Sensor> getEnrichedSensors() {
        long now = System.currentTimeMillis();
        if (!cachedSensors.isEmpty() && (now - lastFetchMs) < CACHE_TTL_MS) {
            return cachedSensors;
        }

        // preluam toti senzorii din DB
        List<Sensor> senzoriDB = sensorRepository.findAll();
        if (senzoriDB.isEmpty()) {
            return new ArrayList<>();
        }

        // pentru fiecare senzor facem un apel la OWM si updatam valorile
        for (Sensor s : senzoriDB) {
            if (s.getLat() == 0.0 || s.getLng() == 0.0) continue;
            try {
                String url = String.format(
                    "https://api.openweathermap.org/data/2.5/air_pollution?lat=%f&lon=%f&appid=%s",
                    s.getLat(), s.getLng(), API_KEY
                );
                AirPollutionResponse response = restTemplate.getForObject(url, AirPollutionResponse.class);
                if (response != null && response.list != null && !response.list.isEmpty()) {
                    var item = response.list.get(0);

                    if (item.components != null) {
                        var c = item.components;
                        double rawPm25 = c.containsKey("pm2_5") ? ((Number) c.get("pm2_5")).doubleValue() : 2.0;
                        double rawPm10 = c.containsKey("pm10") ? ((Number) c.get("pm10")).doubleValue() : 3.0;
                        double rawNo2 = c.containsKey("no2") ? ((Number) c.get("no2")).doubleValue() : 2.0;
                        double rawO3 = c.containsKey("o3") ? ((Number) c.get("o3")).doubleValue() : 50.0;
                        double rawCo = c.containsKey("co") ? ((Number) c.get("co")).doubleValue() : 200.0;
                        double rawSo2 = c.containsKey("so2") ? ((Number) c.get("so2")).doubleValue() : 1.0;

                        // aplicam acelasi multiplicator pe zona ca si in Collector ca sa fie consistent
                        double multiplier = 1.0;
                        int currentHour = java.time.LocalDateTime.now().getHour();
                        if (currentHour >= 7 && currentHour <= 9) multiplier = 1.6;
                        else if (currentHour >= 17 && currentHour <= 20) multiplier = 1.4;
                        else if (currentHour >= 0 && currentHour <= 5) multiplier = 0.6;

                        if (s.getId().contains("-CV-")) multiplier *= 1.8;
                        else if (s.getId().contains("-SD-") || s.getId().contains("-VS-")) multiplier *= 1.5;
                        else if (s.getId().contains("-NR-")) multiplier *= 0.8;
                        else multiplier *= 1.2;

                        double finalPm25 = Math.max(12.0, (rawPm25 + 9.5) * multiplier * (1.0 + Math.random() * 0.2));

                        s.setPm25(Math.round(finalPm25 * 100.0) / 100.0);
                        s.setPm10(Math.round(Math.max(5.0, rawPm10 * multiplier * (1.0 + Math.random() * 0.2)) * 100.0) / 100.0);
                        s.setNo2(Math.round(Math.max(2.0, rawNo2 * multiplier * 2.5) * 100.0) / 100.0);
                        s.setO3(Math.round(Math.max(10.0, rawO3 / multiplier) * 100.0) / 100.0);
                        s.setCo(Math.round(((rawCo * multiplier) / 1000.0) * 100.0) / 100.0);
                        s.setSo2(Math.round(Math.max(1.0, rawSo2 * multiplier) * 100.0) / 100.0);

                        // calculam AQI dupa EPA si setam categoria corespunzatoare
                        int finalAqi = calculeazaAqiEpa(finalPm25);
                        s.setAqi(finalAqi);
                        s.setCategory(getAQICategory(finalAqi));
                    }
                }
            } catch (Exception e) {
                System.err.println("OWM error senzor " + s.getId() + ": " + e.getMessage());
                // daca OWM nu raspunde folosim ce avem deja in DB
                if (s.getDbCategorie() != null && s.getDbCategorie() > 0) {
                    s.setAqi(s.getDbCategorie());
                    s.setCategory(getAQICategory(s.getDbCategorie()));
                } else {
                    s.setAqi(60);
                    s.setCategory("moderate");
                }
            }
        }

        // trimitem datele la microserviciul Python pentru clustering K-Means
        // acesta calculeaza cele 3 zone de risc sanitar pe baza valorilor poluantilor
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<List<Sensor>> request = new HttpEntity<>(senzoriDB, headers);

            ResponseEntity<List<Sensor>> response = restTemplate.exchange(
                ML_SERVICE_URL,
                org.springframework.http.HttpMethod.POST,
                request,
                new ParameterizedTypeReference<List<Sensor>>() {}
            );

            if (response.getBody() != null) {
                cachedSensors = response.getBody();
                lastFetchMs = now;
                return cachedSensors;
            }
        } catch (Exception e) {
            System.err.println("ML K-Means unavailable, using fallback zones: " + e.getMessage());
        }

        // daca microserviciul ML nu e disponibil, atribuim zone de risc simplu dupa AQI
        for (Sensor s : senzoriDB) {
            int aqi = s.getAqi();
            if (aqi > 150) {
                s.setHealthRiskZone("severe-risk");
                s.setRiskCluster(2);
            } else if (aqi > 100) {
                s.setHealthRiskZone("high-risk");
                s.setRiskCluster(1);
            } else {
                s.setHealthRiskZone("moderate-risk");
                s.setRiskCluster(0);
            }
        }

        // salvam valorile actualizate in DB si actualizam cache-ul
        sensorRepository.saveAll(senzoriDB);
        cachedSensors = senzoriDB;
        lastFetchMs = now;
        return cachedSensors;
    }

    private String getAQICategory(int aqi) {
        if (aqi <= 50)  return "good";
        if (aqi <= 100) return "moderate";
        if (aqi <= 150) return "sensitive";
        if (aqi <= 200) return "unhealthy";
        if (aqi <= 300) return "very-unhealthy";
        return "hazardous";
    }

    private int calculeazaAqiEpa(double pm25) {
        if (pm25 < 0) return 0;
        double[][] bp = {
            {0.0, 12.0, 0, 50},
            {12.1, 35.4, 51, 100},
            {35.5, 55.4, 101, 150},
            {55.5, 150.4, 151, 200},
            {150.5, 250.4, 201, 300},
            {250.5, 350.4, 301, 400},
            {350.5, 500.4, 401, 500}
        };
        for (double[] b : bp) {
            if (pm25 >= b[0] && pm25 <= b[1]) {
                return (int) Math.round(((b[3] - b[2]) / (b[1] - b[0])) * (pm25 - b[0]) + b[2]);
            }
        }
        return 500;
    }
}
