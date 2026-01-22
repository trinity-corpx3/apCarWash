package com.trinity.poserp.controller;

import com.trinity.poserp.entity.Cliente;
import com.trinity.poserp.service.ClienteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @GetMapping
    public List<Cliente> getAllClientes() {
        return clienteService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Cliente> getById(@PathVariable Long id) {
        Optional<Cliente> c = clienteService.findById(id);
        return c.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<Cliente> search(@RequestParam("q") String q) {
        return clienteService.search(q);
    }

    @PostMapping
    public Cliente createCliente(@RequestBody Cliente cliente) {
        return clienteService.save(cliente);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Cliente> updateCliente(@PathVariable Long id, @RequestBody Cliente body) {
        Optional<Cliente> c = clienteService.findById(id);
        if (c.isEmpty())
            return ResponseEntity.notFound().build();
        Cliente cur = c.get();
        cur.setNombreCompleto(body.getNombreCompleto());
        cur.setEmail(body.getEmail());
        cur.setTelefono(body.getTelefono());
        cur.setDomicilio(body.getDomicilio());
        cur.setRfc(body.getRfc());
        cur.setRazonSocial(body.getRazonSocial());
        cur.setRegimenFiscal(body.getRegimenFiscal());
        cur.setUsoCfdi(body.getUsoCfdi());
        cur.setCodigoPostal(body.getCodigoPostal());
        // Si emailCfdi no viene o es null, usar email como fallback
        String emailCfdi = body.getEmailCfdi();
        cur.setEmailCfdi(emailCfdi != null && !emailCfdi.trim().isEmpty() ? emailCfdi : body.getEmail());
        return ResponseEntity.ok(clienteService.save(cur));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCliente(@PathVariable Long id) {
        clienteService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Invoicing endpoints
    // Compatibilidad temporal: devolver datos desde Cliente
    @GetMapping("/{id}/invoicing")
    public ResponseEntity<Cliente> getInvoicing(@PathVariable Long id) {
        return clienteService.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/invoicing")
    public ResponseEntity<Cliente> putInvoicing(@PathVariable Long id, @RequestBody Cliente body) {
        var clienteOpt = clienteService.findById(id);
        if (clienteOpt.isEmpty())
            return ResponseEntity.notFound().build();
        Cliente cur = clienteOpt.get();
        cur.setRfc(body.getRfc());
        cur.setRazonSocial(body.getRazonSocial());
        cur.setRegimenFiscal(body.getRegimenFiscal());
        cur.setUsoCfdi(body.getUsoCfdi());
        cur.setCodigoPostal(body.getCodigoPostal());
        // Si emailCfdi no viene o es null, usar email como fallback
        String emailCfdi = body.getEmailCfdi();
        cur.setEmailCfdi(emailCfdi != null && !emailCfdi.trim().isEmpty() ? emailCfdi : cur.getEmail());
        return ResponseEntity.ok(clienteService.save(cur));
    }

    @GetMapping("/by-rfc/{rfc}")
    public ResponseEntity<Cliente> findByRfc(@PathVariable String rfc) {
        return ResponseEntity.of(clienteService.findByRfc(rfc));
    }
}
