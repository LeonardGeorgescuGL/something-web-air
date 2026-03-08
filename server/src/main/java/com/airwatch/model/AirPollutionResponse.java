package com.airwatch.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

// clasă mapează tot răspunsul de la OpenWeather
public class AirPollutionResponse {
    public List<AirData> list;

    public static class AirData {
        public Map<String, Double> components;
        public MainData main;
    }

    public static class MainData {
        public int aqi;
    }
}
