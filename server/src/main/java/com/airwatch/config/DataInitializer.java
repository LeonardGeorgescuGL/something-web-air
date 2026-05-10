package com.airwatch.config;

import com.airwatch.model.Beneficiu;
import com.airwatch.model.Chestionar;
import com.airwatch.model.CivicUser;
import com.airwatch.model.Masuratori;
import com.airwatch.model.Sensor;
import com.airwatch.model.UrbanArea;
import com.airwatch.repository.BeneficiuRepository;
import com.airwatch.repository.ChestionarRepository;
import com.airwatch.repository.CivicUserRepository;
import com.airwatch.repository.MasuratoriRepository;
import com.airwatch.repository.SensorRepository;
import com.airwatch.repository.UrbanAreaRepository;
import com.airwatch.service.AirQualityCollector;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

/*
 * Aceasta clasa ruleaza la fiecare pornire a serverului si:
 * 1. Initializeaza beneficiile Top 3 in baza de date daca nu exista
 * 2. Populeaza date istorice de masuratori pentru senzorii din DB
 *    (ultimele 30 zile, cate un senzor per zona, la intervale orare)
 *    - acestea sunt necesare pentru ca modelul Prophet sa aiba date suficiente
 * 3. Genereaza chestionare demo daca baza de date e goala
 * 4. Triggereaza o colectare de date reale de la OpenWeatherMap la startup
 */
@Component
public class DataInitializer implements ApplicationRunner {

    @Autowired
    private BeneficiuRepository beneficiuRepo;

    @Autowired
    private SensorRepository sensorRepo;

    @Autowired
    private MasuratoriRepository masuratoriRepo;

    @Autowired
    private ChestionarRepository chestionarRepo;

    @Autowired
    private CivicUserRepository membruRepo;

    @Autowired
    private UrbanAreaRepository urbanAreaRepo;

    /*
     * Valorile de baza pentru fiecare zona a Bucurestiului.
     * Le-am calibrat dupa datele ANPM din 2024 si dupa caracteristicile
     * fiecarei zone (trafic, industrie, spatii verzi etc.)
     * Format: { aqi, pm25, pm10, no2, o3, co, so2 }
     */
    private static final Map<Integer, double[]> ZONE_AQI_BASE = new LinkedHashMap<>();
    static {
        ZONE_AQI_BASE.put(2, new double[]{ 80,  18.5, 32.0, 42.0, 55.0, 1.2, 8.0 });  // Centru - trafic ridicat
        ZONE_AQI_BASE.put(3, new double[]{ 55,  10.2, 18.0, 28.0, 70.0, 0.8, 5.0 });  // Nord - relativ curat (parc Herastrau)
        ZONE_AQI_BASE.put(4, new double[]{ 95,  22.0, 40.0, 52.0, 45.0, 1.5, 12.0}); // Sud - industrial/trafic intens
        ZONE_AQI_BASE.put(5, new double[]{ 75,  16.0, 28.0, 38.0, 58.0, 1.1, 9.0 });  // Est - trafic mediu
        ZONE_AQI_BASE.put(6, new double[]{ 85,  20.0, 36.0, 48.0, 50.0, 1.3, 10.0}); // Vest - DN1 trafic
        ZONE_AQI_BASE.put(7, new double[]{ 90,  21.5, 38.0, 50.0, 48.0, 1.4, 11.0}); // SE - industrial
    }

    @Autowired
    private AirQualityCollector airQualityCollector;

    @Override
    public void run(ApplicationArguments args) {
        seedBeneficii();
        seedMasuratoriIstorice();
        seedChestionare();

        // la startup colectam si date reale de la OWM ca harta sa fie actualizata
        System.out.println("Colectam date reale de pe OpenWeatherMap API...");
        try {
            airQualityCollector.colecteaza();
            System.out.println("Date reale actualizate cu succes.");
        } catch (Exception e) {
            System.err.println("Nu s-au putut prelua datele reale: " + e.getMessage());
        }
    }

    private void seedBeneficii() {
        if (beneficiuRepo.findByPozitieTop(1).isEmpty()) {
            Beneficiu b1 = new Beneficiu();
            b1.setPozitieTop(1);
            b1.setDenumire("Acces Date Complet");
            b1.setDescriere("Descarca intregul istoric de masuratori din toate cartierele Bucurestiului");
            b1.setEndpointDescarcare("http://localhost:8080/api/export/masuratori/csv");
            b1.setInsignaText("\uD83C\uDFC6 Vocea Cartierului");
            b1.setLabelButon("Descarcă CSV Complet (toate datele)");
            b1.setProfilVerificat(true);
            beneficiuRepo.save(b1);
        }
        if (beneficiuRepo.findByPozitieTop(2).isEmpty()) {
            Beneficiu b2 = new Beneficiu();
            b2.setPozitieTop(2);
            b2.setDenumire("Acces Date 7 Zile");
            b2.setDescriere("Descarca masuratorile din ultimele 7 zile pentru cartierul tau");
            b2.setEndpointDescarcare("http://localhost:8080/api/export/masuratori/7zile/csv");
            b2.setInsignaText("\uD83E\uDD48 Investigator");
            b2.setLabelButon("Descarcă CSV Ultimele 7 Zile");
            b2.setProfilVerificat(true);
            beneficiuRepo.save(b2);
        }
        if (beneficiuRepo.findByPozitieTop(3).isEmpty()) {
            Beneficiu b3 = new Beneficiu();
            b3.setPozitieTop(3);
            b3.setDenumire("Acces Date 24 Ore");
            b3.setDescriere("Descarca masuratorile din ultimele 24 de ore pentru cartierul tau");
            b3.setEndpointDescarcare("http://localhost:8080/api/export/masuratori/24ore/csv");
            b3.setInsignaText("\uD83E\uDD49 Vigilent");
            b3.setLabelButon("Descarcă CSV Ultimele 24 Ore");
            b3.setProfilVerificat(true);
            beneficiuRepo.save(b3);
        }
        System.out.println("Beneficii Top 3 initializate in DB");
    }

    private void seedMasuratoriIstorice() {
        List<Sensor> totiSenzorii = sensorRepo.findAll();
        if (totiSenzorii.isEmpty()) {
            System.out.println("Nu exista senzori in DB, sarim peste seed masuratori");
            return;
        }

        // luam cate un senzor per zona (primul gasit) ca sa nu duplicam date
        Map<Integer, Sensor> senzorPerZona = new LinkedHashMap<>();
        for (Sensor s : totiSenzorii) {
            if (s.getUrbanArea() != null) {
                senzorPerZona.putIfAbsent(s.getUrbanArea().getId(), s);
            }
        }

        // seed fix ca sa fie reproductibil la fiecare restart
        Random rnd = new Random(42);
        int totalSalvate = 0;
        LocalDateTime acum = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);

        List<Masuratori> deSalvat = new ArrayList<>();
        for (Map.Entry<Integer, Sensor> entry : senzorPerZona.entrySet()) {
            Integer idZona = entry.getKey();
            Sensor senzor = entry.getValue();

            // verificam daca zona are deja date suficiente pentru Prophet (minim 300 puncte)
            long countZona = masuratoriRepo.findByZonaAndTimestamp(idZona, LocalDateTime.now().minusDays(40)).size();
            if (countZona >= 300) {
                System.out.println("Zona " + idZona + " are deja " + countZona + " date istorice, sarim peste");
                continue;
            }

            System.out.println("Generam date istorice (30 zile) pentru zona " + idZona + "...");
            double[] base = ZONE_AQI_BASE.getOrDefault(idZona,
                    new double[]{ 70, 15.0, 25.0, 35.0, 55.0, 1.0, 7.0 });

            for (int zi = 29; zi >= 0; zi--) {
                for (int ora = 0; ora < 24; ora++) {
                    LocalDateTime ts = acum.minusDays(zi).withHour(ora);

                    // simulam variatia zilnica: mai multa poluare in orele de varf
                    double factorOrar = 1.0;
                    if (ora >= 7 && ora <= 9)   factorOrar = 1.35;  // dimineata
                    if (ora >= 17 && ora <= 20) factorOrar = 1.25;  // seara
                    if (ora >= 0  && ora <= 5)  factorOrar = 0.65;  // noaptea

                    // adaugam putin zgomot gaussian ca datele sa nu fie prea "curate"
                    double noise = 1.0 + rnd.nextGaussian() * 0.12;
                    double pm25 = Math.max(2.0,  base[1] * factorOrar * noise);
                    double pm10 = Math.max(5.0,  base[2] * factorOrar * noise * 1.1);
                    double no2  = Math.max(5.0,  base[3] * factorOrar * noise);
                    double o3   = Math.max(10.0, base[4] * (2.0 - factorOrar) * noise); // O3 e invers cu traficul
                    double co   = Math.max(0.2,  base[5] * factorOrar * noise);
                    double so2  = Math.max(1.0,  base[6] * factorOrar * noise);

                    int aqi = (int) Math.round(base[0] * factorOrar * noise);
                    aqi = Math.max(20, Math.min(250, aqi));

                    Masuratori m = new Masuratori();
                    m.setSensor(senzor);
                    m.setTimestamp(ts);
                    m.setPm25(round2(pm25));
                    m.setPm10(round2(pm10));
                    m.setNo2(round2(no2));
                    m.setO3(round2(o3));
                    m.setCo(round2(co));
                    m.setSo2(round2(so2));
                    m.setAqi(aqi);

                    deSalvat.add(m);
                }
            }
        }

        // salvam tot dintr-o data pentru performanta (saveAll e mult mai rapid decat save in bucla)
        if (!deSalvat.isEmpty()) {
            masuratoriRepo.saveAll(deSalvat);
            System.out.println("Seed masuratori finalizat: " + deSalvat.size() + " inregistrari noi.");
        }
    }

    private double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }

    private void seedChestionare() {
        if (chestionarRepo.count() > 0) {
            System.out.println("Chestionare existente, sarim peste seed");
            return;
        }

        List<UrbanArea> zone = urbanAreaRepo.findAll();
        List<CivicUser> membri = membruRepo.findAll();

        if (zone.isEmpty() || membri.isEmpty()) {
            System.out.println("Nu exista zone sau membri, sarim peste seed chestionare");
            return;
        }

        Random rnd = new Random(42);
        String[] airQualityOptions = {"Foarte bună", "Bună", "Acceptabilă", "Slabă", "Foarte slabă", "Periculoasă"};
        String[] visibilityOptions = {"Excelentă", "Bună", "Redusă"};
        String[] smellOptions = {"Fără miros", "Miros ușor", "Miros moderat", "Miros puternic"};
        String[] timeOfDayOptions = {"Dimineață (6-10)", "Prânz (10-14)", "După-amiază (14-18)", "Seară (18-22)", "Noapte (22-6)"};
        String[] durationOptions = {"Sub 30 minute", "30min - 2ore", "2-6 ore", "Toată ziua", "Mai multe zile consecutiv"};
        String[] allSymptoms = {"Tuse", "Iritații ochi", "Dificultăți respiratorii", "Dureri de cap", "Altele"};
        String[] allSources = {"Trafic intens", "Construcții", "Industrie", "Ardere deșeuri", "Transport public", "Altele"};

        int saved = 0;
        for (int i = 0; i < 40; i++) {
            Chestionar c = new Chestionar();
            c.setTitlu("Raport Calitate Aer Demo");
            c.setTip("CHESTIONAR");
            c.setContinut("Raport chestionar JSON generat automat");

            // asociem chestionarul cu un user real si o zona random
            c.setMembruId(membri.get(rnd.nextInt(membri.size())).getId());
            c.setZonaUrbana(zone.get(rnd.nextInt(zone.size())));

            // data random in ultimele 30 de zile
            LocalDateTime dt = LocalDateTime.now().minusDays(rnd.nextInt(30)).minusHours(rnd.nextInt(24));
            c.setDataEmitere(dt);

            String aqi = airQualityOptions[rnd.nextInt(airQualityOptions.length)];

            // alegem 1-3 surse de poluare random
            List<String> srcList = new ArrayList<>();
            int numSrc = 1 + rnd.nextInt(3);
            for(int j=0; j<numSrc; j++) {
                String src = allSources[rnd.nextInt(allSources.length)];
                if(!srcList.contains(src)) srcList.add(src);
            }

            // alegem 0-2 simptome random
            List<String> sympList = new ArrayList<>();
            int numSymp = rnd.nextInt(3);
            for(int j=0; j<numSymp; j++) {
                String s = allSymptoms[rnd.nextInt(allSymptoms.length)];
                if(!sympList.contains(s)) sympList.add(s);
            }
            if(sympList.isEmpty()) sympList.add("Fără simptome");

            // construim JSON-ul manual (fara Jackson ca sa nu adaugam dependente)
            StringBuilder jsonb = new StringBuilder("{");
            jsonb.append("\"airQuality\":\"").append(aqi).append("\",");
            jsonb.append("\"visibility\":\"").append(visibilityOptions[rnd.nextInt(visibilityOptions.length)]).append("\",");
            jsonb.append("\"smell\":\"").append(smellOptions[rnd.nextInt(smellOptions.length)]).append("\",");
            jsonb.append("\"timeOfDay\":\"").append(timeOfDayOptions[rnd.nextInt(timeOfDayOptions.length)]).append("\",");
            jsonb.append("\"duration\":\"").append(durationOptions[rnd.nextInt(durationOptions.length)]).append("\",");

            jsonb.append("\"sources\":[");
            for(int j=0; j<srcList.size(); j++) {
                jsonb.append("\"").append(srcList.get(j)).append("\"");
                if(j < srcList.size()-1) jsonb.append(",");
            }
            jsonb.append("],");

            jsonb.append("\"symptoms\":[");
            for(int j=0; j<sympList.size(); j++) {
                jsonb.append("\"").append(sympList.get(j)).append("\"");
                if(j < sympList.size()-1) jsonb.append(",");
            }
            jsonb.append("]");
            jsonb.append("}");

            c.setRaspunsuri(jsonb.toString());
            chestionarRepo.save(c);
            saved++;
        }
        System.out.println("Generat " + saved + " rapoarte chestionar demo.");
    }
}
