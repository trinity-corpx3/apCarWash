package com.trinity.poserp.service;

import com.trinity.poserp.entity.Cliente;
import com.trinity.poserp.repository.ClienteRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;

    public ClienteService(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    public List<Cliente> findAll() {
        return clienteRepository.findAll();
    }

    public Optional<Cliente> findById(Long id) {
        return clienteRepository.findById(id);
    }

    public Cliente save(Cliente cliente) {
        return clienteRepository.save(cliente);
    }

    public void delete(Long id) {
        clienteRepository.deleteById(id);
    }

    public List<Cliente> search(String q) {
        String qLower = q == null ? "" : q.trim().toLowerCase();
        if (qLower.isEmpty()) {
            return clienteRepository.findAll();
        }
        return clienteRepository.findAll().stream()
                .filter(c -> (c.getNombreCompleto() != null && c.getNombreCompleto().toLowerCase().contains(qLower))
                        || (c.getEmail() != null && c.getEmail().toLowerCase().contains(qLower))
                        || (c.getTelefono() != null && c.getTelefono().toLowerCase().contains(qLower))
                        || (c.getRfc() != null && c.getRfc().toLowerCase().contains(qLower))
                        || (c.getRazonSocial() != null && c.getRazonSocial().toLowerCase().contains(qLower))
                        || (c.getCodigoPostal() != null && c.getCodigoPostal().toLowerCase().contains(qLower))
                        || (c.getEmailCfdi() != null && c.getEmailCfdi().toLowerCase().contains(qLower)))
                .toList();
    }

    public Optional<Cliente> findByRfc(String rfc) {
        return clienteRepository.findAll().stream()
                .filter(c -> rfc.equalsIgnoreCase(c.getRfc()))
                .findFirst();
    }
}
