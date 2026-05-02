package com.airwatch.controller;

import com.airwatch.model.Masuratori;
import com.airwatch.repository.MasuratoriRepository;
import com.airwatch.service.MasuratoriService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Endpoint-uri pentru prognoza Facebook Prophet.
 * Preia date istorice din DB, le trimite la microserviciul Python ML,
 * si returneaza predictiile + metricile de evaluare catre frontend.
 */
@RestController
@RequestMapping("/api/prophet")
@CrossOrigin(origins = "*")
public class ProphetController {

    @Autowired
    private MasuratoriService masuratoriService;

    @Autowired
    private MasuratoriRepository masuratoriRepo;

    private final RestTemplate rest;
    private static final String ML_URL = "http://localhost:8000/predict";
    private static final DateTimeFormatter ISO_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public ProphetController() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(30000); // Asteptam 30 secunde dupa Prophet
        this.rest = new RestTemplate(factory);
    }

    /**
     * GET /api/prophet/predict/{idZona}/{indicator}/{days}
     *
     * @param idZona     ID-ul zonei urbane (2-7)
     * @param indicator  "aqi", "pm25", "pm10", "no2", "o3", "co", "so2"
     * @param days       Zile de prognoza: 1, 3, 7, 14
     *
     * Returneaza: { forecast: [...], metrics: {...}, model_info: {...} }
     */
    @GetMapping("/predict/{idZona}/{indicator}/{days}")
    public ResponseEntity<Map<String, Object>> predict(
            @PathVariable Integer idZona,
            @PathVariable String indicator,
            @PathVariable Integer days) {

        // 1. Preia date istorice din DB — ultimele 30 zile (720 ore)
        LocalDateTime deLa = LocalDateTime.now().minusDays(30);
        List<Masuratori> masuratori = masuratoriRepo.findByZonaAndTimestamp(idZona, deLa);

        if (masuratori.size() < 14) {
            return ResponseEntity.status(HttpStatus.INSUFFICIENT_STORAGE)
                    .body(Map.of("error", "Date insuficiente in DB pentru zona " + idZona
                            + ". Minim 14 inregistrari necesare, exista " + masuratori.size()));
        }

        // 2. Construieste seria de timp {ds, y} pentru Prophet
        List<Map<String, Object>> prophetData = new ArrayList<>();
        int countZero = 0;
        for (Masuratori m : masuratori) {
            double val = extractIndicator(m, indicator);
            if (val <= 0) {
                countZero++;
                continue;
            }
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("ds", m.getTimestamp().format(ISO_FMT));
            point.put("y", val);
            prophetData.add(point);
        }

        System.out.println("DEBUG PROPHET: Zona=" + idZona + ", Indicator=" + indicator + ", Total=" + masuratori.size() + ", Valide=" + prophetData.size() + ", Zero/Null=" + countZero);

        // 3. Trimite la microserviciul Python
        if (prophetData.size() < 14) {
            return ResponseEntity.status(HttpStatus.INSUFFICIENT_STORAGE)
                    .body(Map.of("error", "Date insuficiente (" + prophetData.size() + " valide din " + masuratori.size() + "). Indicatorul '" + indicator + "' pare sa aiba valori 0 sau null in DB."));
        }

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("data", prophetData);
        requestBody.put("indicator", indicator);
        requestBody.put("forecast_days", days);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> mlResponse = rest.exchange(ML_URL, HttpMethod.POST, entity, Map.class);
            if (mlResponse.getBody() != null) {
                return ResponseEntity.ok(mlResponse.getBody());
            }
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            System.err.println("ML Service Error: " + e.getResponseBodyAsString());
            return ResponseEntity.status(e.getStatusCode())
                    .body(Map.of("error", "ML Service Error: " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            System.err.println("ML Service connection failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Microserviciul ML (Python) nu este pornit sau nu raspunde la " + ML_URL));
        }

        return ResponseEntity.internalServerError().body(Map.of("error", "Raspuns gol de la ML Service"));
    }

    private double extractIndicator(Masuratori m, String indicator) {
        return switch (indicator.toLowerCase()) {
            case "aqi"  -> m.getAqi() != null  ? m.getAqi()  : 0;
            case "pm25" -> m.getPm25() != null ? m.getPm25() : 0;
            case "pm10" -> m.getPm10() != null ? m.getPm10() : 0;
            case "no2"  -> m.getNo2()  != null ? m.getNo2()  : 0;
            case "o3"   -> m.getO3()   != null ? m.getO3()   : 0;
            case "co"   -> m.getCo()   != null ? m.getCo()   : 0;
            case "so2"  -> m.getSo2()  != null ? m.getSo2()  : 0;
            default     -> 0;
        };
    }
}
