package com.airwatch.model;

import com.airwatch.config.JsonbConverter;
import jakarta.persistence.*;

@Entity
@Table(name = "GEO_JSON")
public class GeoJson extends RaportCivic {

    // folosim converterul custom ca Hibernate sa stie cum sa scrie in coloana de tip jsonb
    @Convert(converter = JsonbConverter.class)
    @Column(name = "geodata", columnDefinition = "jsonb")
    private String geoData;

    public GeoJson() {}
    public String getGeoData() { return geoData; }
    public void setGeoData(String geoData) { this.geoData = geoData; }
}
