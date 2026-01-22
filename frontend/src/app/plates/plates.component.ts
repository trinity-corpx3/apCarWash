import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import Swal from 'sweetalert2';
import * as bootstrap from 'bootstrap';

@Component({
  selector: 'app-plates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgbModule,
    SidebarComponent,
  ],
  providers: [
    NgbModal
  ],
  templateUrl: './plates.component.html',
  styleUrls: ['./plates.component.css']
})
export class PlatesComponent implements OnInit {
  plates: any[] = [];
  loading: boolean = false;
  error: string | null = null;
  selectedPlate: any = null;
  userName: string = '';
  userEmail: string = '';
  userRole: string = '';

  // Paginación
  currentPage: number = 0;
  pageSize: number = 50;
  totalPages: number = 0;
  totalElements: number = 0;

  // Filtros
  searchQuery: string = '';
  sucursalId: number | null = null;
  sucursales: any[] = [];
  fechaInicio: string = '';
  fechaFin: string = '';

  // Detalles de placa
  plateDetails: any = null;
  plateOrders: any[] = [];
  plateOrdersPage: number = 0;
  plateOrdersTotalPages: number = 0;
  plateOrdersTotal: number = 0;
  loadingDetails: boolean = false;
  expandedOrderId: number | null = null; // Para expandir/colapsar items de una orden

  private apiUrl = environment.apiUrl;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getCurrentUser();
    if (userData) {
      this.userName = userData.name || '';
      this.userEmail = userData.email || '';
      this.userRole = userData.role || '';
    }
    this.loadSucursales();
    this.loadPlates();
  }

  loadSucursales(): void {
    this.http.get<any[]>(`${this.apiUrl}/sucursales`, {
      headers: this.buildAuthHeaders()
    }).subscribe({
      next: (sucursales) => {
        this.sucursales = sucursales || [];
      },
      error: (error) => {
        console.error('Error al cargar sucursales:', error);
      }
    });
  }

  private buildAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Basic ' + btoa('uniqueAdmin:admin123'),
    });
  }

  loadPlates(): void {
    this.loading = true;
    this.error = null;

    const params: any = {
      page: this.currentPage.toString(),
      size: this.pageSize.toString()
    };

    if (this.searchQuery && this.searchQuery.trim()) {
      params.search = this.searchQuery.trim();
    }

    if (this.sucursalId !== null && this.sucursalId !== undefined) {
      params.sucursalId = this.sucursalId.toString();
    }

    if (this.fechaInicio) {
      params.fechaInicio = this.fechaInicio;
    }

    if (this.fechaFin) {
      params.fechaFin = this.fechaFin;
    }

    this.http.get<any>(`${this.apiUrl}/plates/analytics`, {
      headers: this.buildAuthHeaders(),
      params: params
    }).subscribe({
      next: (response) => {
        this.plates = response.content || [];
        this.totalPages = response.totalPages || 0;
        this.totalElements = response.totalElements || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar placas:', error);
        this.error = 'Error al cargar las placas';
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar las placas', 'error');
      }
    });
  }

  search(): void {
    this.currentPage = 0;
    this.loadPlates();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.sucursalId = null;
    this.fechaInicio = '';
    this.fechaFin = '';
    this.currentPage = 0;
    this.loadPlates();
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadPlates();
    }
  }

  viewPlateDetails(plate: string): void {
    this.loadingDetails = true;
    this.selectedPlate = plate;
    this.expandedOrderId = null; // Reset expanded order

    // Mostrar modal
    const modalElement = document.getElementById('plateDetailsModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }

    this.http.get<any>(`${this.apiUrl}/plates/${plate}/details`, {
      headers: this.buildAuthHeaders(),
      params: {
        page: this.plateOrdersPage.toString(),
        size: '20'
      }
    }).subscribe({
      next: (response) => {
        this.plateDetails = response;
        this.plateOrders = response.orders || [];
        this.plateOrdersTotal = response.ordersTotal || 0;
        this.plateOrdersTotalPages = response.ordersTotalPages || 0;
        this.loadingDetails = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles de placa:', error);
        this.loadingDetails = false;
        Swal.fire('Error', 'No se pudieron cargar los detalles de la placa', 'error');
      }
    });
  }

  loadPlateOrdersPage(page: number): void {
    if (page >= 0 && page < this.plateOrdersTotalPages && this.selectedPlate) {
      this.plateOrdersPage = page;
      this.viewPlateDetails(this.selectedPlate);
    }
  }

  closeDetails(): void {
    // Cerrar modal
    const modalElement = document.getElementById('plateDetailsModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    
    this.selectedPlate = null;
    this.plateDetails = null;
    this.plateOrders = [];
    this.plateOrdersPage = 0;
    this.expandedOrderId = null;
  }

  toggleOrderItems(orderId: number): void {
    if (this.expandedOrderId === orderId) {
      this.expandedOrderId = null;
    } else {
      this.expandedOrderId = orderId;
    }
  }

  isOrderExpanded(orderId: number): boolean {
    return this.expandedOrderId === orderId;
  }

  formatCurrency(value: any): string {
    if (value == null) return '$0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(num);
  }

  formatDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = Math.min(5, this.totalPages);
    let start = Math.max(0, this.currentPage - Math.floor(maxPages / 2));
    let end = Math.min(this.totalPages, start + maxPages);
    
    if (end - start < maxPages) {
      start = Math.max(0, end - maxPages);
    }
    
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getOrderPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = Math.min(5, this.plateOrdersTotalPages);
    let start = Math.max(0, this.plateOrdersPage - Math.floor(maxPages / 2));
    let end = Math.min(this.plateOrdersTotalPages, start + maxPages);
    
    if (end - start < maxPages) {
      start = Math.max(0, end - maxPages);
    }
    
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  Math = Math; // Para usar en el template

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

