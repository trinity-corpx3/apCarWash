package com.trinity.poserp.service;

import com.trinity.poserp.entity.Cliente;
import com.trinity.poserp.entity.Plate;
import com.trinity.poserp.repository.ClienteRepository;
import com.trinity.poserp.repository.PlateRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PlateService {

    private final PlateRepository plateRepository;
    private final ClienteRepository clienteRepository;

    public PlateService(PlateRepository plateRepository, ClienteRepository clienteRepository) {
        this.plateRepository = plateRepository;
        this.clienteRepository = clienteRepository;
    }

    public Optional<Plate> findByPlate(String plate) {
        return plateRepository.findById(plate);
    }

    public Plate createOrLink(String plate, Long customerId) {
        Plate p = plateRepository.findById(plate).orElseGet(() -> {
            Plate np = new Plate();
            np.setPlate(plate);
            return np;
        });
        if (customerId != null) {
            Cliente c = clienteRepository.findById(customerId)
                    .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado"));
            p.setCustomer(c);
        }
        return plateRepository.save(p);
    }

    public Plate updateLink(String plate, Long customerId, Boolean active) {
        Plate p = plateRepository.findById(plate)
                .orElseThrow(() -> new IllegalArgumentException("Placa no encontrada"));
        if (customerId != null) {
            Cliente c = clienteRepository.findById(customerId)
                    .orElseThrow(() -> new IllegalArgumentException("Cliente no encontrado"));
            p.setCustomer(c);
        }
        if (active != null) {
            p.setActive(active);
        }
        return plateRepository.save(p);
    }
}
