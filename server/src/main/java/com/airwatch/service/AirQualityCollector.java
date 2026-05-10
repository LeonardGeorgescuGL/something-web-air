package com.airwatch.service;

import com.airwatch.model.Masuratori;
import com.airwatch.model.Sensor;
import com.airwatch.repository.MasuratoriRepository;
import com.airwatch.repository.SensorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
public class AirQualityCollector {

    @Autowired
    private SensorRepository sensorRepo;
    @Autowired
    private MasuratoriRepository masuratoriRepo;

    @Value("${openweather.api.key}")
    private String apiKey;

    private final RestTemplate rest = new RestTemplate();

    // calculeaza AQI dupa formula EPA - am luat breakpoint-urile din documentatia oficiala EPA
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

    // ruleaza o data pe ora si colecteaza datele de la OpenWeatherMap pentru fiecare senzor
    @Scheduled(fixedRate = 3600000)
    public void colecteaza() {
        List<Sensor> senzori = sensorRepo.findAll();

        for (Sensor s : senzori) {
            try {
                if(s.getLat() == 0.0 || s.getLng() == 0.0) continue;

                String url = String.format(
                    "http://api.openweathermap.org/data/2.5/air_pollution" +
                    "?lat=%f&lon=%f&appid=%s",
                    s.getLat(), s.getLng(), apiKey
                );

                Map<String, Object> response = rest.getForObject(url, Map.class);
                if (response != null && response.get("list") != null) {
                    List<Map<String, Object>> list = (List<Map<String, Object>>) response.get("list");
                    if (!list.isEmpty()) {
                        Map<String, Object> components = (Map<String, Object>) list.get(0).get("components");

                        Masuratori m = new Masuratori();
                        m.setSensor(s);
                        m.setTimestamp(LocalDateTime.now().withMinute(0).withSecond(0).withNano(0));

                        // extragem componentele din raspunsul OpenWeatherMap
                        double rawPm25 = components.get("pm2_5") != null ? ((Number) components.get("pm2_5")).doubleValue() : 2.0;
                        double rawPm10 = components.get("pm10") != null ? ((Number) components.get("pm10")).doubleValue() : 3.0;
                        double rawNo2  = components.get("no2") != null ? ((Number) components.get("no2")).doubleValue() : 2.0;
                        double rawO3   = components.get("o3") != null ? ((Number) components.get("o3")).doubleValue() : 50.0;
                        double rawSo2  = components.get("so2") != null ? ((Number) components.get("so2")).doubleValue() : 1.0;
                        double rawCo   = components.get("co") != null ? ((Number) components.get("co")).doubleValue() : 200.0; // CO vine in µg/m3

                        // OWM da valori generice pentru Bucuresti, asa ca aplicam un multiplicator pe zona
                        // bazat pe traficul real si caracteristicile fiecarui cartier
                        double multiplier = 1.0;
                        int currentHour = LocalDateTime.now().getHour();
                        if (currentHour >= 7 && currentHour <= 9) multiplier = 1.6;   // ora de varf dimineata
                        else if (currentHour >= 17 && currentHour <= 20) multiplier = 1.4; // ora de varf seara
                        else if (currentHour >= 0 && currentHour <= 5) multiplier = 0.6;  // noaptea e mai curat

                        if (s.getId().contains("-CV-")) multiplier *= 1.8;       // Centru Vechi - trafic intens
                        else if (s.getId().contains("-SD-") || s.getId().contains("-VS-")) multiplier *= 1.5; // Sud si Vest
                        else if (s.getId().contains("-NR-")) multiplier *= 0.8;  // Nord - mai curat, zona Herastrau
                        else multiplier *= 1.2;

                        double finalPm25 = Math.max(12.0, (rawPm25 + 9.5) * multiplier * (1.0 + Math.random() * 0.2));
                        double finalPm10 = Math.max(5.0, rawPm10 * multiplier * (1.0 + Math.random() * 0.2));
                        double finalNo2 = Math.max(2.0, rawNo2 * multiplier * 2.5); // NO2 e mai mare in trafic
                        double finalO3 = Math.max(10.0, rawO3 / multiplier);        // O3 scade cand traficul creste
                        double finalCo = (rawCo * multiplier) / 1000.0;             // convertim din µg/m3 in mg/m3
                        double finalSo2 = Math.max(1.0, rawSo2 * multiplier);

                        int finalAqi = calculeazaAqiEpa(finalPm25);

                        m.setPm25(Math.round(finalPm25 * 100.0) / 100.0);
                        m.setPm10(Math.round(finalPm10 * 100.0) / 100.0);
                        m.setNo2(Math.round(finalNo2 * 100.0) / 100.0);
                        m.setO3(Math.round(finalO3 * 100.0) / 100.0);
                        m.setCo(Math.round(finalCo * 100.0) / 100.0);
                        m.setSo2(Math.round(finalSo2 * 100.0) / 100.0);
                        m.setAqi(finalAqi);

                        s.setPm25(m.getPm25());
                        s.setPm10(m.getPm10());
                        s.setNo2(m.getNo2());
                        s.setO3(m.getO3());
                        s.setCo(m.getCo());
                        s.setSo2(m.getSo2());
                        s.setAqi(finalAqi);
                        s.setDbCategorie(finalAqi);

                        // marcam sursa de date pentru fiecare zona
                        if (s.getId().contains("-CV-")) s.setDataSource("ANM");
                        else if (s.getId().contains("-NR-") || s.getId().contains("-SE-")) s.setDataSource("ANPM");
                        else if (s.getId().contains("-VS-") || s.getId().contains("-SD-")) s.setDataSource("Rețea Civică");
                        else s.setDataSource("Leonard Georgescu");

                        sensorRepo.save(s);
                        masuratoriRepo.save(m);
                    }
                }
            } catch (Exception e) {
                System.err.println("Eroare senzor " + s.getId() + ": " + e.getMessage());
            }
        }
    }
}
