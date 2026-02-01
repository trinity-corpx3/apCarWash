package com.trinity.poserp.service;

import com.trinity.poserp.dto.OrdenCompraDto;
import com.trinity.poserp.dto.ProductoDto;
import com.trinity.poserp.entity.OrdenCompra;
import com.trinity.poserp.entity.Producto;
import com.trinity.poserp.entity.Sucursal;
import com.trinity.poserp.exception.UnauthorizedException;
import com.trinity.poserp.entity.OrdenesCompraProductos;
import com.trinity.poserp.repository.OrdenCompraRepository;
import com.trinity.poserp.repository.OrdenesCompraProductosRepository;
import com.trinity.poserp.repository.ProductoRepository;
import com.trinity.poserp.repository.UsuarioRepository;
import com.trinity.poserp.repository.SucursalRepository;
import com.trinity.poserp.repository.PlateRepository;
import com.trinity.poserp.entity.Plate;

import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class OrdenCompraService {

    private final OrdenCompraRepository ordenCompraRepository;
    private final OrdenesCompraProductosRepository ordenesCompraProductosRepository;
    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;
    private final SucursalRepository sucursalRepository;
    private PlateRepository plateRepository;

    public OrdenCompraService(
            OrdenCompraRepository ordenCompraRepository,
            OrdenesCompraProductosRepository ordenesCompraProductosRepository,
            ProductoRepository productoRepository,
            UsuarioRepository usuarioRepository,
            SucursalRepository sucursalRepository) {
        this.ordenCompraRepository = ordenCompraRepository;
        this.ordenesCompraProductosRepository = ordenesCompraProductosRepository;
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository;
        this.sucursalRepository = sucursalRepository;
    }

    private LoyaltyService loyaltyService;

    @Autowired
    public void setLoyaltyService(LoyaltyService loyaltyService) {
        this.loyaltyService = loyaltyService;
    }

    @Autowired
    public void setPlateRepository(PlateRepository plateRepository) {
        this.plateRepository = plateRepository;
    }

    @Transactional
    public OrdenCompra save(OrdenCompraDto ordenCompraDto) {
        if (ordenCompraDto.getSucursalId() == null) {
            throw new IllegalArgumentException("El ID de la sucursal no puede ser nulo.");
        }

        // Obtener la sucursal
        Sucursal sucursal = sucursalRepository.findById(ordenCompraDto.getSucursalId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Sucursal no encontrada con ID: " + ordenCompraDto.getSucursalId()));

        // Generar el número de recibo basado en la sucursal
        String nuevoRecibo = generarNumeroReciboPorSucursal(sucursal);

        // Crear la orden de compra
        OrdenCompra ordenCompra = new OrdenCompra();
        ordenCompra.setNumeroRecibo(nuevoRecibo);
        ordenCompra.setFecha(ordenCompraDto.getFecha());
        ordenCompra.setCajero(ordenCompraDto.getCajero());
        ordenCompra.setSucursal(sucursal);
        ordenCompra.setSucursalNombre(sucursal.getNombre());
        // Normalizar placa: trim/upper, vacía -> null
        String placaNormLocal = null;
        if (ordenCompraDto.getPlaca() != null) {
            String t = ordenCompraDto.getPlaca().trim();
            if (!t.isEmpty()) {
                placaNormLocal = t.toUpperCase();
            }
        }
        ordenCompra.setPlaca(placaNormLocal);
        ordenCompra.setNota(ordenCompraDto.getNota());
        ordenCompra.setMetodoPago(ordenCompraDto.getMetodoPago());
        ordenCompra.setTotal(ordenCompraDto.getTotal());
        ordenCompra.setCantidadRecibida(ordenCompraDto.getCantidadRecibida());
        ordenCompra.setCambio(ordenCompraDto.getCambio());
        ordenCompra.setEstado("completado");

        // Asegurar existencia en plates antes de guardar, para no violar la FK
        final String placaNorm = placaNormLocal;
        if (placaNorm != null && plateRepository != null) {
            plateRepository.findById(placaNorm).orElseGet(() -> {
                Plate p = new Plate();
                p.setPlate(placaNorm);
                return plateRepository.save(p);
            });
        }

        OrdenCompra savedOrder = ordenCompraRepository.save(ordenCompra);

        // Registrar visita de lealtad por placa si aplica
        if (placaNorm != null) {
            try {
                loyaltyService.registerVisit(placaNorm, sucursal.getId());
            } catch (Exception ignored) {
            }
        }

        if (ordenCompraDto.getProductos() == null || ordenCompraDto.getProductos().isEmpty()) {
            throw new IllegalArgumentException("Debe incluir al menos un producto en la orden.");
        }

        List<Long> productoIds = ordenCompraDto.getProductos().stream()
                .map(ProductoDto::getId)
                .toList();

        Map<Long, Producto> productos = productoRepository.findAllById(productoIds).stream()
                .collect(Collectors.toMap(Producto::getId, producto -> producto));

        for (ProductoDto productoDto : ordenCompraDto.getProductos()) {
            Producto producto = productos.get(productoDto.getId());
            if (producto == null) {
                throw new IllegalArgumentException("Producto no encontrado con ID: " + productoDto.getId());
            }

            OrdenesCompraProductos ordenesCompraProductos = new OrdenesCompraProductos();
            ordenesCompraProductos.setOrdenCompra(savedOrder);
            ordenesCompraProductos.setProducto(producto);
            ordenesCompraProductos.setNombreProducto(producto.getNombre());
            ordenesCompraProductos.setPrecioProducto(producto.getPrecio());
            ordenesCompraProductos.setCantidad(productoDto.getCantidad());

            ordenesCompraProductosRepository.save(ordenesCompraProductos);
        }

        // Calcular precio más alto del pedido (para descuento de 6ª)
        double highestPrice = ordenCompraDto.getProductos().stream()
                .map(p -> productos.get(p.getId()))
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Producto::getPrecio)
                .max()
                .orElse(0.0);

        // Si hay placa, evaluar elegibilidad y aplicar redención automáticamente
        if (placaNorm != null) {
            try {
                var summary = loyaltyService.getSummary(placaNorm, sucursal.getId());
                // Only apply full discount (7th visit - 100%)
                if (summary.eligibleForFullDiscount()) {
                    savedOrder.setLoyaltyApplied(true);
                    savedOrder.setLoyaltyDiscountAmount(java.math.BigDecimal.valueOf(highestPrice));
                    ordenCompraRepository.save(savedOrder);
                    loyaltyService.tryRedeemIfEligible(placaNorm, sucursal.getId(), savedOrder, null);
                }
            } catch (Exception ignored) {
            }
        }

        return savedOrder;
    }

    private String generarNumeroReciboPorSucursal(Sucursal sucursal) {
        String abreviacion = sucursal.getAbreviacion();
        if (abreviacion == null || abreviacion.isEmpty()) {
            throw new IllegalStateException("La sucursal no tiene una abreviación configurada.");
        }

        // Obtener el último número de recibo para la sucursal
        String ultimoRecibo = ordenCompraRepository.findUltimoReciboPorSucursal(sucursal.getId());
        int ultimoNumero = 0;
        String prefijo = "AA";

        if (ultimoRecibo != null && ultimoRecibo.startsWith(abreviacion)) {
            try {
                String[] partes = ultimoRecibo.split("-");
                prefijo = partes[1].substring(0, 2); // Extraer el prefijo
                ultimoNumero = Integer.parseInt(partes[1].substring(2)); // Extraer el número
            } catch (NumberFormatException e) {
                throw new RuntimeException("Formato inválido en el último número de recibo: " + ultimoRecibo, e);
            }
        }

        if (ultimoNumero >= 9999) {
            // Incrementar el prefijo si se alcanza el límite
            prefijo = incrementarPrefijo(prefijo);
            ultimoNumero = 0; // Reiniciar el número
        }

        // Incrementar el número y generar el nuevo recibo
        int nuevoNumero = ultimoNumero + 1;
        return String.format("%s-%s%04d", abreviacion, prefijo, nuevoNumero);
    }

    private String incrementarPrefijo(String prefijo) {
        char[] chars = prefijo.toCharArray();

        for (int i = chars.length - 1; i >= 0; i--) {
            if (chars[i] < 'Z') {
                chars[i]++;
                return new String(chars);
            } else {
                chars[i] = 'A'; // Reiniciar la letra actual
            }
        }

        // Si todas las posiciones llegaron a 'Z', añadir una nueva letra al inicio
        return "A" + new String(chars);
    }

    public void delete(Long id) {
        ordenCompraRepository.deleteById(id);
    }

    public List<OrdenCompra> findAll() {
        return ordenCompraRepository.findAll();
    }

    public List<OrdenCompra> findBySucursalId(Long sucursalId) {
        return ordenCompraRepository.findBySucursalId(sucursalId);
    }

    public List<OrdenCompra> findBySucursalIdAndCurrentMonth(Long sucursalId) {
        // Calcular inicio y fin de mes en zona horaria de México
        java.time.ZoneId zoneId = java.time.ZoneId.of("America/Mexico_City");
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(zoneId);

        java.time.ZonedDateTime startMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay(zoneId);
        java.time.ZonedDateTime endMonth = now.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth()).toLocalDate()
                .atTime(23, 59, 59).atZone(zoneId);

        // Convertir a UTC antes de extraer LocalDateTime, ya que la BD guarda en UTC
        java.time.LocalDateTime start = startMonth.withZoneSameInstant(java.time.ZoneId.of("UTC")).toLocalDateTime();
        java.time.LocalDateTime end = endMonth.withZoneSameInstant(java.time.ZoneId.of("UTC")).toLocalDateTime();

        System.out.println("🔎 Buscando ventas del mes (local Mexico): " + start + " a " + end);

        return ordenCompraRepository.findBySucursalIdAndCurrentMonth(sucursalId, start, end);
    }

    public List<OrdenCompra> findBySucursalIdAndSpecificMonth(Long sucursalId, int mes, int anio) {
        return ordenCompraRepository.findBySucursalIdAndSpecificMonth(sucursalId, mes, anio);
    }

    public List<OrdenCompra> findBySucursalIdAndDateRange(Long sucursalId, String fechaInicio, String fechaFin) {
        return ordenCompraRepository.findBySucursalIdAndDateRange(sucursalId, fechaInicio, fechaFin);
    }

    public String obtenerUltimoRecibo() {
        return ordenCompraRepository.findUltimoRecibo().stream().findFirst().orElse(null);
    }

    public String obtenerUltimoReciboPorSucursal(Long sucursalId) {
        return ordenCompraRepository.findUltimoReciboPorSucursal(sucursalId);
    }

    public int contarVentasPorPlaca(String placa) {
        return ordenCompraRepository.contarVentasPorPlaca(placa);
    }

    public int obtenerVentasTotalesPorPlaca(String placa) {
        return ordenCompraRepository.contarVentasPorPlaca(placa);
    }

    public List<OrdenCompra> findByPlaca(String placa) {
        return ordenCompraRepository.findByPlaca(placa);
    }

    public Long countByPlaca(String placa) {
        return ordenCompraRepository.countByPlaca(placa);
    }

    public List<OrdenCompra> findByPlacaAndDateRange(String placa, String fechaInicio, String fechaFin) {
        return ordenCompraRepository.findByPlacaAndDateRange(placa, fechaInicio, fechaFin);
    }

    public Map<String, Object> getEstadisticasPlaca(String placa) {
        return ordenCompraRepository.getEstadisticasPlaca(placa);
    }

    public List<OrdenCompra> findAllOrdenesCompra() {
        return ordenCompraRepository.findAll(); // Devuelve todas las órdenes de compra
    }

    public Map<String, Object> getEstadisticasDia(Long sucursalId) {
        return ordenCompraRepository.getEstadisticasDia(sucursalId);
    }

    @Transactional
    public void updateFacturadaStatus(String numeroRecibo, boolean facturada) {
        System.out.println(String.format(
                "🔄 updateFacturadaStatus llamado: numeroRecibo=%s, facturada=%s",
                numeroRecibo, facturada));

        OrdenCompra ordenCompra = ordenCompraRepository.findByNumeroRecibo(numeroRecibo)
                .orElseThrow(() -> {
                    System.err.println(String.format(
                            "❌ ERROR: Orden no encontrada con numeroRecibo: %s",
                            numeroRecibo));
                    return new RuntimeException("Orden no encontrada con numeroRecibo: " + numeroRecibo);
                });

        boolean estabaFacturada = ordenCompra.isFacturada();

        System.out.println(String.format(
                "✅ Orden encontrada - ID: %d, Sucursal: %d, Fecha: %s, Actualmente facturada: %s -> Nuevo estado: %s",
                ordenCompra.getId(),
                ordenCompra.getSucursal() != null ? ordenCompra.getSucursal().getId() : null,
                ordenCompra.getFecha(),
                estabaFacturada,
                facturada));

        ordenCompra.setFacturada(facturada);

        // Si la orden pasa de no facturada a facturada, establecer la fecha de
        // facturación
        if (!estabaFacturada && facturada) {
            ordenCompra.setFechaFacturacion(java.time.LocalDateTime.now());
            System.out.println(String.format(
                    "📅 Fecha de facturación establecida: %s",
                    ordenCompra.getFechaFacturacion()));
        } else if (estabaFacturada && !facturada) {
            // Si se desmarca como facturada, limpiar la fecha de facturación
            ordenCompra.setFechaFacturacion(null);
            System.out.println("🗑️ Fecha de facturación eliminada (orden desmarcada como facturada)");
        }

        ordenCompraRepository.save(ordenCompra);

        System.out.println(String.format(
                "✅ Orden guardada exitosamente con facturada=%s, fechaFacturacion=%s",
                facturada, ordenCompra.getFechaFacturacion()));
    }

    public Integer countFacturasEmitidas() {
        return ordenCompraRepository.countFacturasEmitidas();
    }

    public java.util.Optional<OrdenCompra> findByNumeroRecibo(String numeroRecibo) {
        return ordenCompraRepository.findByNumeroRecibo(numeroRecibo);
    }

    @Transactional
    public OrdenCompra saveEntity(OrdenCompra order) {
        return ordenCompraRepository.save(order);
    }

}
