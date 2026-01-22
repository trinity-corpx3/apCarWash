package com.trinity.poserp.service;

import com.trinity.poserp.entity.Sucursal;
import com.trinity.poserp.entity.TimbresConfiguracion;
import com.trinity.poserp.repository.SucursalRepository;
import com.trinity.poserp.repository.TimbresConfiguracionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class TimbresConfiguracionService {

    private final TimbresConfiguracionRepository timbresConfiguracionRepository;
    private final SucursalRepository sucursalRepository;

    public TimbresConfiguracionService(
            TimbresConfiguracionRepository timbresConfiguracionRepository,
            SucursalRepository sucursalRepository) {
        this.timbresConfiguracionRepository = timbresConfiguracionRepository;
        this.sucursalRepository = sucursalRepository;
    }

    /**
     * Obtiene la configuración activa de timbres para una sucursal
     * Las sucursales 1 y 2 comparten timbres (usando la configuración de la sucursal 1)
     */
    public Optional<TimbresConfiguracion> getConfiguracionActiva(Long sucursalId) {
        // Sucursales 1 y 2 comparten timbres (usar configuración de sucursal 1)
        Long sucursalParaBuscar = (sucursalId == 1L || sucursalId == 2L) ? 1L : sucursalId;
        return timbresConfiguracionRepository.findBySucursalIdAndActivoTrue(sucursalParaBuscar);
    }
    
    /**
     * Obtiene el ID de sucursal de referencia para compartir timbres
     * Las sucursales 1 y 2 comparten timbres
     */
    private Long getSucursalReferenciaTimbres(Long sucursalId) {
        return (sucursalId == 1L || sucursalId == 2L) ? 1L : sucursalId;
    }

    /**
     * Obtiene los timbres disponibles para una sucursal
     * Retorna la cantidad de timbres disponibles menos los utilizados desde la fecha de carga
     * Las sucursales 1 y 2 comparten timbres (se cuentan juntas)
     */
    public int getTimbresDisponibles(Long sucursalId) {
        Long sucursalReferencia = getSucursalReferenciaTimbres(sucursalId);
        Optional<TimbresConfiguracion> config = getConfiguracionActiva(sucursalReferencia);
        if (config.isEmpty()) {
            return 0; // Sin configuración, no hay timbres disponibles
        }

        TimbresConfiguracion conf = config.get();
        LocalDateTime fechaDesde = conf.getFechaCarga();

        // Si es sucursal 1 o 2, contar timbres de ambas sucursales
        Long timbresUtilizados;
        if (sucursalId == 1L || sucursalId == 2L) {
            // Contar timbres de sucursales 1 y 2 juntas
            Long timbresSuc1 = timbresConfiguracionRepository.countTimbresUtilizadosDesdeFecha(1L, fechaDesde);
            Long timbresSuc2 = timbresConfiguracionRepository.countTimbresUtilizadosDesdeFecha(2L, fechaDesde);
            timbresUtilizados = timbresSuc1 + timbresSuc2;
            System.out.println(String.format(
                "📊 Timbres utilizados - Sucursal %d: Suc1=%d, Suc2=%d, Total=%d (desde %s)",
                sucursalId, timbresSuc1, timbresSuc2, timbresUtilizados, fechaDesde
            ));
        } else {
            // Para otras sucursales, contar solo las suyas
            timbresUtilizados = timbresConfiguracionRepository.countTimbresUtilizadosDesdeFecha(sucursalId, fechaDesde);
            System.out.println(String.format(
                "📊 Timbres utilizados - Sucursal %d: %d (desde %s)",
                sucursalId, timbresUtilizados, fechaDesde
            ));
        }

        int disponibles = conf.getTimbresDisponibles() - timbresUtilizados.intValue();
        System.out.println(String.format(
            "💾 Timbres disponibles - Sucursal %d: %d (config: %d, utilizados: %d)",
            sucursalId, disponibles, conf.getTimbresDisponibles(), timbresUtilizados
        ));
        return Math.max(0, disponibles); // No permitir negativos
    }

    /**
     * Obtiene los timbres utilizados desde la última carga para una sucursal
     * Las sucursales 1 y 2 comparten timbres (se cuentan juntas)
     */
    public int getTimbresUtilizados(Long sucursalId) {
        Long sucursalReferencia = getSucursalReferenciaTimbres(sucursalId);
        Optional<TimbresConfiguracion> config = getConfiguracionActiva(sucursalReferencia);
        if (config.isEmpty()) {
            return 0;
        }

        LocalDateTime fechaDesde = config.get().getFechaCarga();
        
        // Si es sucursal 1 o 2, contar timbres de ambas sucursales
        Long utilizados;
        if (sucursalId == 1L || sucursalId == 2L) {
            Long timbresSuc1 = timbresConfiguracionRepository.countTimbresUtilizadosDesdeFecha(1L, fechaDesde);
            Long timbresSuc2 = timbresConfiguracionRepository.countTimbresUtilizadosDesdeFecha(2L, fechaDesde);
            utilizados = timbresSuc1 + timbresSuc2;
        } else {
            utilizados = timbresConfiguracionRepository.countTimbresUtilizadosDesdeFecha(sucursalId, fechaDesde);
        }

        return utilizados.intValue();
    }

    /**
     * Crea o actualiza la configuración de timbres para una sucursal
     * Desactiva la configuración anterior y crea una nueva activa
     * Si se carga para sucursal 1 o 2, se aplica a ambas (compartidas)
     */
    @Transactional
    public TimbresConfiguracion cargarTimbres(Long sucursalId, Integer cantidadTimbres) {
        if (cantidadTimbres < 0) {
            throw new IllegalArgumentException("La cantidad de timbres no puede ser negativa");
        }

        // Si se carga para sucursal 2, usar sucursal 1 como referencia (comparten)
        Long sucursalReferencia = getSucursalReferenciaTimbres(sucursalId);
        
        Sucursal sucursal = sucursalRepository.findById(sucursalReferencia)
                .orElseThrow(() -> new IllegalArgumentException("Sucursal no encontrada con ID: " + sucursalReferencia));

        // Desactivar configuración anterior si existe (de la sucursal de referencia)
        Optional<TimbresConfiguracion> configAnterior = timbresConfiguracionRepository
                .findBySucursalIdAndActivoTrue(sucursalReferencia);
        
        if (configAnterior.isPresent()) {
            TimbresConfiguracion anterior = configAnterior.get();
            anterior.setActivo(false);
            timbresConfiguracionRepository.save(anterior);
        }

        // Crear nueva configuración activa
        TimbresConfiguracion nuevaConfig = new TimbresConfiguracion();
        nuevaConfig.setSucursal(sucursal);
        nuevaConfig.setTimbresDisponibles(cantidadTimbres);
        nuevaConfig.setFechaCarga(LocalDateTime.now());
        nuevaConfig.setActivo(true);

        return timbresConfiguracionRepository.save(nuevaConfig);
    }

    /**
     * Valida si hay timbres disponibles para timbrar
     * @return true si hay timbres disponibles, false en caso contrario
     */
    public boolean tieneTimbresDisponibles(Long sucursalId) {
        return getTimbresDisponibles(sucursalId) > 0;
    }

    /**
     * Obtiene un resumen completo de timbres para una sucursal
     */
    public record TimbresResumen(int disponibles, int utilizados, int total, LocalDateTime fechaCarga, boolean tieneConfiguracion) {}

    public TimbresResumen getResumen(Long sucursalId) {
        Long sucursalReferencia = getSucursalReferenciaTimbres(sucursalId);
        Optional<TimbresConfiguracion> config = getConfiguracionActiva(sucursalReferencia);
        
        if (config.isEmpty()) {
            return new TimbresResumen(0, 0, 0, null, false);
        }

        TimbresConfiguracion conf = config.get();
        int utilizados = getTimbresUtilizados(sucursalId);
        int disponibles = getTimbresDisponibles(sucursalId);
        int total = conf.getTimbresDisponibles();

        return new TimbresResumen(disponibles, utilizados, total, conf.getFechaCarga(), true);
    }
}

