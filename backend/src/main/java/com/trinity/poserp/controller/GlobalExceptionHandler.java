package com.trinity.poserp.controller;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

import java.sql.SQLException;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        HttpStatus status = HttpStatus.BAD_REQUEST; // por defecto, datos inválidos

        Throwable cause = ex.getMostSpecificCause();
        if (cause instanceof SQLException sqlEx) {
            String sqlState = sqlEx.getSQLState();
            if ("23505".equals(sqlState)) {
                status = HttpStatus.CONFLICT; // duplicado
            } else if ("22001".equals(sqlState)) {
                status = HttpStatus.BAD_REQUEST; // longitud excedida
            }
        }
        Map<String, Object> body = new HashMap<>();
        body.put("error", "DataIntegrityViolation");
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
