package com.trinity.poserp.service;

import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;

@Service
public class TokenService {
    private String token;
    private Instant tokenExpiry;

    private final RestTemplate restTemplate;
    private final String usuario = "trinity.corpx3@gmail.com";
    private final String password = "WZZI42%2B48g8%40";
    private final String tokenUrl = "https://timbrado.digibox.com.mx/api/autenticacion/autenticarbasico";

    public TokenService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Refresca el token automáticamente cada 5 minutos si es necesario.
     */
    @Scheduled(fixedDelay = 1000 * 60 * 5)
    public void refreshTokenIfNeeded() {
        validarYRefrescarTokenSiEsNecesario();
    }

    /**
     * Método sincronizado para obtener el token vigente.
     */
    public synchronized String getToken() {
        validarYRefrescarTokenSiEsNecesario();
        return token.replace("\"", "").trim();
    }

    /**
     * Verifica si el token está por expirar o es nulo y lo refresca si es
     * necesario.
     */
    private void validarYRefrescarTokenSiEsNecesario() {
        if (token == null || token.trim().isEmpty() || tokenExpiry == null
                || Instant.now().isAfter(tokenExpiry.minusSeconds(300))) {
            System.out.println("⚠️ Token nulo, vacío o por expirar. Solicitando uno nuevo...");
            obtenerNuevoToken();
        } else {
            System.out.println("✅ Token vigente. Expira en: "
                    + Duration.between(Instant.now(), tokenExpiry).toMinutes() + " minutos.");
        }
    }

    /**
     * Realiza la petición para obtener un nuevo token.
     */
    public void obtenerNuevoToken() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("usuario", usuario);
            headers.set("password", password);

            HttpEntity<String> entity = new HttpEntity<>("", headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    tokenUrl, HttpMethod.POST, entity, String.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException(
                        "❌ No se pudo obtener el token del PAC. Status: " + response.getStatusCode());
            }

            token = response.getBody().trim();
            tokenExpiry = Instant.now().plus(Duration.ofMinutes(30)); // Ajustar si el PAC indica otro tiempo

            System.out.println("🔑 Token obtenido correctamente: " + token + " (Expira en 30 minutos)");

        } catch (Exception e) {
            throw new RuntimeException("❌ Error obteniendo token del PAC: " + e.getMessage(), e);
        }
    }
}
