import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrdenCompra } from '../models/orden-compra.model';

@Injectable({
  providedIn: 'root'
})
export class OrdenCompraService {
  private apiUrl = `${environment.apiUrl}/ordenes`;

  constructor(private http: HttpClient) {}

  getOrdenes(): Observable<OrdenCompra[]> {
    return this.http.get<OrdenCompra[]>(this.apiUrl);
  }

  getOrden(id: number): Observable<OrdenCompra> {
    return this.http.get<OrdenCompra>(`${this.apiUrl}/${id}`);
  }

  crearOrden(orden: OrdenCompra): Observable<OrdenCompra> {
    return this.http.post<OrdenCompra>(this.apiUrl, orden);
  }

  actualizarOrden(id: number, orden: OrdenCompra): Observable<OrdenCompra> {
    return this.http.put<OrdenCompra>(`${this.apiUrl}/${id}`, orden);
  }

  eliminarOrden(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
