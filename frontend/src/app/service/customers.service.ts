import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Customer {
  id?: number;
  nombreCompleto: string;
  email?: string;
  telefono?: string;
  domicilio?: string;
  rfc?: string;
  razonSocial?: string;
  regimenFiscal?: string;
  usoCfdi?: string;
  codigoPostal?: string;
}

export interface CustomerInvoicing {
  customerId?: number;
  rfc?: string;
  razonSocial?: string;
  regimenFiscal?: string;
  usoCfdi?: string;
  codigoPostal?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private api = `${environment.apiUrl}/clientes`;
  constructor(private http: HttpClient) {}

  list(): Observable<Customer[]> { return this.http.get<Customer[]>(this.api); }
  get(id: number): Observable<Customer> { return this.http.get<Customer>(`${this.api}/${id}`); }
  search(q: string): Observable<Customer[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<Customer[]>(`${this.api}/search`, { params });
  }
  create(body: Customer): Observable<Customer> { return this.http.post<Customer>(this.api, body); }
  update(id: number, body: Customer): Observable<Customer> { return this.http.put<Customer>(`${this.api}/${id}`, body); }
  remove(id: number): Observable<void> { return this.http.delete<void>(`${this.api}/${id}`); }

  // Compat removida: fiscales ahora viven en Cliente
  findByRfc(rfc: string): Observable<Customer> { return this.http.get<Customer>(`${this.api}/by-rfc/${encodeURIComponent(rfc)}`); }
}
