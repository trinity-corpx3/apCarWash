export interface OrdenCompra {
  id: number;
  numeroRecibo: string;
  fecha: string;
  productos: any[];
  total: number;
  metodoPago: string;
  sucursal: {
    id: number;
    nombre: string;
  };
  estado: string;
  facturada: boolean;
  placa?: string;
  cantidadRecibida?: number;
  cambio?: number;
  cajero?: string;
  nota?: string;
  loyaltyApplied?: boolean;
  loyaltyDiscountAmount?: number;
  cliente?: {
    id: number;
    nombre: string;
    email: string;
  };

  // Promotional discounts
  descuentoPromocionalTipo?: string;
  descuentoPromocionalPorcentaje?: number;
  descuentoPromocionalMonto?: number;
  ticketGasolinaMonto?: number;

  // Loyalty discount tracking - 6th and 7th visit
  descuento6taVisitaAplicado?: boolean;
  descuento6taVisitaMonto?: number;
  descuento7maVisitaAplicado?: boolean;
  descuento7maVisitaMonto?: number;
}

export interface DatosFiscales {
  rfc: string;
  nombre: string;
  regimenFiscal: string;
  usoCFDI: string;
  direccion: string;
  codigoPostal: string;
} 