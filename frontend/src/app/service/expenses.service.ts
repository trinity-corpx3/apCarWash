import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private apiUrl = `${environment.apiUrl}/expenses`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Basic ' + btoa('uniqueAdmin:admin123')
    });
  }

  // Listados
  getBySucursal(sucursalId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/por-sucursal`, {
      params: { sucursalId: sucursalId.toString() },
      headers: this.getHeaders()
    });
  }

  getBySucursalMes(sucursalId: number, mes: number, anio: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/por-sucursal-mes-especifico`, {
      params: { sucursalId: sucursalId.toString(), mes: mes.toString(), anio: anio.toString() },
      headers: this.getHeaders()
    });
  }

  getBySucursalRango(sucursalId: number, fechaInicio: string, fechaFin: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/por-sucursal-rango-fechas`, {
      params: { sucursalId: sucursalId.toString(), fechaInicio, fechaFin },
      headers: this.getHeaders()
    });
  }

  // CRUD
  createExpense(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, payload, { headers: this.getHeaders() });
  }

  updateExpense(id: number, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/update/${id}`, payload, { headers: this.getHeaders() });
  }

  markPaid(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/mark-paid/${id}`, {}, { headers: this.getHeaders() });
  }

  annul(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/annul/${id}`, {}, { headers: this.getHeaders() });
  }

  // Adjuntos
  listAttachments(expenseId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attachments/${expenseId}`, { headers: this.getHeaders() });
  }

  uploadAttachment(expenseId: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/attachments/upload/${expenseId}`, form, { headers: this.getHeaders() });
  }

  deleteAttachment(attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/attachments/${attachmentId}`, { headers: this.getHeaders() });
  }

  downloadAttachment(attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/attachments/download/${attachmentId}`, {
      responseType: 'blob',
      headers: this.getHeaders()
    });
  }
}


