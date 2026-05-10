package com.airwatch.model;

import com.airwatch.config.JsonbConverter;
import jakarta.persistence.*;

@Entity
@Table(name = "GEO_JSON")
public class GeoJson extends RaportCivic {

    // folosim suportul nativ din Hibernate 6 pentru tipuri JSON
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "geodata", columnDefinition = "jsonb")
    private String geoData;

    public GeoJson() {}
    public String getGeoData() { return geoData; }
    public void setGeoData(String geoData) { this.geoData = geoData; }
}
