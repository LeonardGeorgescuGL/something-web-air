package com.airwatch.config;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.postgresql.util.PGobject;

import java.sql.SQLException;

/**
 * Converter JPA care permite salvarea unui String Java in coloana de tip jsonb din PostgreSQL.
 * Fara acesta, Hibernate nu stie sa faca conversia si arunca eroare la save().
 * Solutia e sa cream manual un PGobject cu tipul "jsonb" si sa dam valoarea ca string.
 */
@Converter
public class JsonbConverter implements AttributeConverter<String, Object> {

    @Override
    public Object convertToDatabaseColumn(String attribute) {
        if (attribute == null) return null;
        try {
            PGobject pgObject = new PGobject();
            pgObject.setType("jsonb");
            pgObject.setValue(attribute);
            return pgObject;
        } catch (SQLException e) {
            throw new IllegalArgumentException("Nu s-a putut converti String-ul in jsonb: " + e.getMessage(), e);
        }
    }

    @Override
    public String convertToEntityAttribute(Object dbData) {
        if (dbData == null) return null;
        if (dbData instanceof PGobject pgObject) {
            return pgObject.getValue();
        }
        return dbData.toString();
    }
}
