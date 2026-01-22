package com.trinity.poserp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("http://localhost:4200", "http://poserprl.s3-website.us-east-2.amazonaws.com") // Permitir
                        // el
                        // acceso
                        // solo
                        // desde
                        // el
                        // frontend local
                        // .allowedOrigins("http://poserprl.s3-website.us-east-2.amazonaws.com") //
                        // Permitir el acceso solo
                        // desde el frontend local
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH") // Métodos permitidos
                        .allowedHeaders("Authorization", "Content-Type") // Encabezados específicos permitidos
                        .allowCredentials(true); // Permitir el envío de credenciales
            }
        };
    }
}
