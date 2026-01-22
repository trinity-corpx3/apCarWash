package com.trinity.poserp.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TimbradoAsyncService {

    private final Map<String, CompletableFuture<byte[]>> requestsEnProceso = new ConcurrentHashMap<>();
    private final Map<String, byte[]> requestsCompletados = new ConcurrentHashMap<>();
    private final Map<String, String> requestsConError = new ConcurrentHashMap<>();
    private final FacturaService facturaService;

    public TimbradoAsyncService(FacturaService facturaService) {
        this.facturaService = facturaService;
    }

    @Async
    public void procesarTimbrado(String requestId, Map<String, Object> cfdiData) {
        CompletableFuture<byte[]> future = CompletableFuture.supplyAsync(() -> {
            try {
                System.out.println("Iniciando timbrado async para requestId: " + requestId);
                return facturaService.timbrar(cfdiData);
            } catch (Exception e) {
                System.err.println("Error en timbrado async para requestId " + requestId + ": " + e.getMessage());
                throw new RuntimeException(e);
            }
        });

        requestsEnProceso.put(requestId, future);

        future.whenComplete((result, error) -> {
            requestsEnProceso.remove(requestId);
            if (error != null) {
                requestsConError.put(requestId, error.getMessage());
                System.err.println("Timbrado fallido para requestId " + requestId);
            } else {
                requestsCompletados.put(requestId, result);
                System.out.println("Timbrado completado para requestId " + requestId);
            }
        });
    }

    public String getStatus(String requestId) {
        if (requestsCompletados.containsKey(requestId)) {
            return "completed";
        } else if (requestsConError.containsKey(requestId)) {
            return "error";
        } else if (requestsEnProceso.containsKey(requestId)) {
            return "processing";
        } else {
            return "not_found";
        }
    }

    public byte[] getResultado(String requestId) {
        return requestsCompletados.get(requestId);
    }

    public String getError(String requestId) {
        return requestsConError.get(requestId);
    }

    public void limpiarRequest(String requestId) {
        requestsCompletados.remove(requestId);
        requestsConError.remove(requestId);
        requestsEnProceso.remove(requestId);
    }
}
