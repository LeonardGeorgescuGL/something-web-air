package com.airwatch.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "RAPORT_CIVIC")
@Inheritance(strategy = InheritanceType.JOINED)
public class RaportCivic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_raport")
    private Integer idRaport;

    @Column(nullable = false)
    private String titlu;

    @Column(nullable = false)
    private String tip;

    private String continut;

    @Column(name = "dataemitere", columnDefinition = "TIMESTAMP DEFAULT NOW()")
    private LocalDateTime dataEmitere;

    @OneToOne
    @JoinColumn(name = "id_validare")
    private ValidareRaport validare;

    @ManyToOne
    @JoinColumn(name = "id_zona")
    private UrbanArea zonaUrbana;

    @Transient
    private String membruId;

    // campuri transient folosite la creare foto (nu se salveaza direct, ci in GeoFoto)
    @Transient
    private Double lat;
    @Transient
    private Double lng;
    @Transient
    private String fotografie;

    public RaportCivic() {}
    public Integer getIdRaport() { return idRaport; }
    public void setIdRaport(Integer idRaport) { this.idRaport = idRaport; }
    public String getMembruId() { return membruId; }
    public void setMembruId(String membruId) { this.membruId = membruId; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public String getFotografie() { return fotografie; }
    public void setFotografie(String fotografie) { this.fotografie = fotografie; }
    public String getTitlu() { return titlu; }
    public void setTitlu(String titlu) { this.titlu = titlu; }
    public String getTip() { return tip; }
    public void setTip(String tip) { this.tip = tip; }
    public String getContinut() { return continut; }
    public void setContinut(String continut) { this.continut = continut; }
    public LocalDateTime getDataEmitere() { return dataEmitere; }
    public void setDataEmitere(LocalDateTime dataEmitere) { this.dataEmitere = dataEmitere; }
    public ValidareRaport getValidare() { return validare; }
    public void setValidare(ValidareRaport validare) { this.validare = validare; }
    public UrbanArea getZonaUrbana() { return zonaUrbana; }
    public void setZonaUrbana(UrbanArea zonaUrbana) { this.zonaUrbana = zonaUrbana; }
}
