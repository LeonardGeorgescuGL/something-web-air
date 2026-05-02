package com.airwatch.repository;

import com.airwatch.model.Chestionar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChestionarRepository extends JpaRepository<Chestionar, Integer> {

    // 1. Distribuția calității aerului
    @Query(value = "SELECT raspunsuri->>'airQuality' as name, COUNT(*) as value " +
            "FROM chestionar WHERE raspunsuri->>'airQuality' IS NOT NULL GROUP BY raspunsuri->>'airQuality'", nativeQuery = true)
    List<Object[]> getCalitateDistributie();

    // 2. Top zone urbane cu cele mai multe rapoarte + calitate medie
    @Query(value = "SELECT z.name as zona, COUNT(c.id_raport) as rapoarte, " +
            "AVG(CASE raspunsuri->>'airQuality' " +
            "WHEN 'Foarte bună' THEN 1.0 " +
            "WHEN 'Bună' THEN 2.0 " +
            "WHEN 'Acceptabilă' THEN 3.0 " +
            "WHEN 'Slabă' THEN 4.0 " +
            "WHEN 'Foarte slabă' THEN 5.0 " +
            "WHEN 'Periculoasă' THEN 6.0 ELSE 3.0 END) as calitateMedia " +
            "FROM chestionar c JOIN raport_civic r ON c.id_raport = r.id_raport " +
            "JOIN zona_urbana z ON r.id_zona = z.id_zona " +
            "GROUP BY z.name", nativeQuery = true)
    List<Object[]> getTopZone();

    // 3. Surse poluare
    @Query(value = "SELECT source, COUNT(*) FROM chestionar, jsonb_array_elements_text(raspunsuri->'sources') as source " +
            "GROUP BY source", nativeQuery = true)
    List<Object[]> getSursePoluare();

    // 4. Evoluție temporală (ultimele 30 zile)
    @Query(value = "SELECT DATE(r.dataemitere) as data, COUNT(*) as rapoarte " +
            "FROM chestionar c JOIN raport_civic r ON c.id_raport = r.id_raport " +
            "WHERE r.dataemitere >= current_date - interval '30 days' " +
            "GROUP BY DATE(r.dataemitere) ORDER BY data", nativeQuery = true)
    List<Object[]> getEvolutieZilnica();

    // 5. Simptome fizice
    @Query(value = "SELECT symptom, COUNT(*) FROM chestionar, jsonb_array_elements_text(raspunsuri->'symptoms') as symptom " +
            "GROUP BY symptom", nativeQuery = true)
    List<Object[]> getSimptomeDistributie();

    // 6. Rapoarte pe moment al zilei
    @Query(value = "SELECT raspunsuri->>'timeOfDay' as moment, COUNT(*) as count " +
            "FROM chestionar WHERE raspunsuri->>'timeOfDay' IS NOT NULL GROUP BY raspunsuri->>'timeOfDay'", nativeQuery = true)
    List<Object[]> getRapoartePeMoment();
}
