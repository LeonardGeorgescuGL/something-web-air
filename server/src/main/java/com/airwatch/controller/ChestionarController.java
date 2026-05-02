package com.airwatch.controller;

import com.airwatch.repository.ChestionarRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chestionare")
@CrossOrigin(origins = "*")
public class ChestionarController {

    @Autowired
    private ChestionarRepository chestionarRepository;

    @GetMapping("/analytics")
    public Map<String, Object> getAnalytics() {
        Map<String, Object> response = new HashMap<>();

        // 1. Distribuția calității aerului
        List<Map<String, Object>> calitateDistributie = new ArrayList<>();
        for (Object[] row : chestionarRepository.getCalitateDistributie()) {
            Map<String, Object> map = new HashMap<>();
            map.put("name", row[0]);
            map.put("value", row[1]);
            calitateDistributie.add(map);
        }
        response.put("calitateDistributie", calitateDistributie);

        // 2. Top zone urbane cu cele mai multe rapoarte
        List<Map<String, Object>> topZone = new ArrayList<>();
        for (Object[] row : chestionarRepository.getTopZone()) {
            Map<String, Object> map = new HashMap<>();
            map.put("zona", row[0]);
            map.put("rapoarte", row[1]);
            // Formatare medie la o zecimala (daca nu e null)
            Object avg = row[2];
            if (avg instanceof Number) {
                map.put("calitateMedia", Math.round(((Number) avg).doubleValue() * 10.0) / 10.0);
            } else {
                map.put("calitateMedia", 3.0);
            }
            topZone.add(map);
        }
        response.put("topZone", topZone);

        // 3. Surse poluare
        List<Map<String, Object>> sursePoluare = new ArrayList<>();
        for (Object[] row : chestionarRepository.getSursePoluare()) {
            Map<String, Object> map = new HashMap<>();
            map.put("sursa", row[0]);
            map.put("count", row[1]);
            sursePoluare.add(map);
        }
        response.put("sursePoluare", sursePoluare);

        // 4. Evoluție zilnică
        List<Map<String, Object>> evolutieZilnica = new ArrayList<>();
        for (Object[] row : chestionarRepository.getEvolutieZilnica()) {
            Map<String, Object> map = new HashMap<>();
            map.put("data", row[0].toString());
            map.put("rapoarte", row[1]);
            evolutieZilnica.add(map);
        }
        response.put("evolutieZilnica", evolutieZilnica);

        // 5. Simptome distribuție
        List<Map<String, Object>> simptomeDistributie = new ArrayList<>();
        for (Object[] row : chestionarRepository.getSimptomeDistributie()) {
            Map<String, Object> map = new HashMap<>();
            map.put("simptom", row[0]);
            map.put("count", row[1]);
            simptomeDistributie.add(map);
        }
        response.put("simptomeDistributie", simptomeDistributie);

        // 6. Rapoarte pe moment
        List<Map<String, Object>> rapoartePeMoment = new ArrayList<>();
        for (Object[] row : chestionarRepository.getRapoartePeMoment()) {
            Map<String, Object> map = new HashMap<>();
            map.put("moment", row[0]);
            map.put("count", row[1]);
            rapoartePeMoment.add(map);
        }
        response.put("rapoartePeMoment", rapoartePeMoment);

        return response;
    }
}
