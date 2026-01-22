import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DatosFiscales } from '../models/orden-compra.model';

@Injectable({
  providedIn: 'root'
})
export class FacturacionService {
  private apiUrl = `${environment.apiUrl}/facturacion`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Basic ' + btoa('uniqueAdmin:admin123'),
      'Content-Type': 'application/json'
    });
  }

  private getBlobHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Basic ' + btoa('uniqueAdmin:admin123')
    });
  }

  facturarOrden(ordenId: number, datosFiscales: DatosFiscales): Observable<any> {
    return this.http.post(`${this.apiUrl}/orden/${ordenId}`, datosFiscales, { headers: this.getHeaders() });
  }

  facturarGlobal(): Observable<any> {
    return this.http.post(`${this.apiUrl}/global`, {}, { headers: this.getHeaders() });
  }

  descargarFactura(facturaId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/descargar/${facturaId}`, {
      responseType: 'blob',
      headers: this.getBlobHeaders()
    });
  }

  obtenerVentasSinFactura(params: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/ventas-sin-factura`, { 
      params,
      headers: this.getHeaders()
    });
  }

  generarCFDIGlobal(params: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/global`, params, { 
      responseType: 'blob',
      headers: this.getBlobHeaders()
    });
  }
} 