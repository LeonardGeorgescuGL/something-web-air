package com.airwatch.controller;

import com.airwatch.model.AirPollutionResponse;
import com.airwatch.service.AirQualityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/air-quality")
@CrossOrigin(origins = "*") // Permite accesul de la frontend
public class AirQualityController {

    @Autowired
    private AirQualityService airQualityService;

    @GetMapping("/{numeCartier}")
    public AirPollutionResponse getQuality(@PathVariable String numeCartier) {
        return airQualityService.getAirQuality(numeCartier);
    }
}
