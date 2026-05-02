package com.airwatch.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "CHESTIONAR")
public class Chestionar extends RaportCivic {
    @Column(name = "nrintrebari", columnDefinition = "INT DEFAULT 0")
    private Integer nrIntrebari = 0;
    
    @Column(name = "nrraspunsuri", columnDefinition = "INT DEFAULT 0")
    private Integer nrRaspunsuri = 0;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String intrebari;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String raspunsuri;

    public Chestionar() {}
    public Integer getNrIntrebari() { return nrIntrebari; }
    public void setNrIntrebari(Integer nrIntrebari) { this.nrIntrebari = nrIntrebari; }
    public Integer getNrRaspunsuri() { return nrRaspunsuri; }
    public void setNrRaspunsuri(Integer nrRaspunsuri) { this.nrRaspunsuri = nrRaspunsuri; }
    public String getIntrebari() { return intrebari; }
    public void setIntrebari(String intrebari) { this.intrebari = intrebari; }
    public String getRaspunsuri() { return raspunsuri; }
    public void setRaspunsuri(String raspunsuri) { this.raspunsuri = raspunsuri; }
}
