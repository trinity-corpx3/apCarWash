import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { DatosFiscales } from './models/orden-compra.model';

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  facturarVenta(ventaId: number, datosFiscales: DatosFiscales): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/facturacion/venta/${ventaId}`, datosFiscales, {
      responseType: 'blob'
    });
  }

  generarCFDIGlobal(params: any): Observable<Blob> {
    return this.http.post(`${this.apiUrl}/facturacion/global`, params, {
      responseType: 'blob'
    });
  }

  obtenerVentasSinFactura(params: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/facturacion/ventas-sin-factura`, { params });
  }
} 