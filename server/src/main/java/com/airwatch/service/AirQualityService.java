package com.airwatch.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.airwatch.model.AirPollutionResponse;

@Service
public class AirQualityService {

    private final String API_KEY = "544d528dc9c9a501777e8d0b304b542f";
    private final RestTemplate restTemplate = new RestTemplate();

    private static final Map<String, double[]> CARTIERE = new HashMap<>();

    static {
        CARTIERE.put("centru", new double[]{44.4355, 26.1025});
        CARTIERE.put("militari", new double[]{44.4345, 26.0341});
        CARTIERE.put("titan", new double[]{44.4230, 26.1550});
        CARTIERE.put("pipera", new double[]{44.4800, 26.1080});
        CARTIERE.put("drumul-taberei", new double[]{44.4320, 26.0200});
    }

    public AirPollutionResponse getAirQuality(String cartier) {
        double[] coords = CARTIERE.get(cartier.toLowerCase());
        if (coords == null) return null;

        String url = String.format(
            "https://api.openweathermap.org/data/2.5/air_pollution?lat=%f&lon=%f&appid=%s",
            coords[0], coords[1], API_KEY
        );

        return restTemplate.getForObject(url, AirPollutionResponse.class);
    }
}
