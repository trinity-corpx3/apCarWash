package com.trinity.poserp.service;

import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import jakarta.activation.DataSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class CorreoService {

    @Autowired
    private JavaMailSender mailSender;

    public void enviarFacturaPorCorreo(String destinatario, byte[] archivoZip, String folio) {
        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, "UTF-8");

            helper.setTo(destinatario);
            helper.setSubject("Factura timbrada - Folio " + folio);
            helper.setText("Adjuntamos tu factura (PDF y XML) correspondiente al folio: " + folio);

            DataSource dataSource = new ByteArrayDataSource(archivoZip, "application/zip");
            helper.addAttachment("factura-" + folio + ".zip", dataSource);

            mailSender.send(mensaje);
        } catch (Exception e) {
            throw new RuntimeException("Error al enviar el correo", e);
        }
    }
}
