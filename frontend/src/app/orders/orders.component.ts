import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FacturacionService } from '../service/facturacion.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

import { OrdenCompra } from '../models/orden-compra.model';
import moment from 'moment';
import jsPDF from 'jspdf';
import { tick } from '@angular/core/testing';
import * as bootstrap from 'bootstrap';
import Swal from 'sweetalert2';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';


@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    SidebarComponent,
  ],
  providers: [
    NgbModal
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {
  ordenes: OrdenCompra[] = [];
  loading: boolean = false;
  error: string | null = null;
  ordenSeleccionada: any = null;
  userName: string = '';
  userEmail: string = '';
  userRole: string = '';
  sucursalName: string = ''; // Para almacenar el nombre de la sucursal
  selectedOrder: any = {
    productos: []
  };

  receiptNumber: string = '';
  totalAmount: number = 0;
  paymentMethod: string = '';
  productos: any[] = [];  // Lista de productos de la orden seleccionada

  todaySalesCount: number = 0;
  todaySalesAmount: number = 0;
  yesterdaySalesCount: number = 0;
  yesterdaySalesAmount: number = 0;
  weekSalesCount: number = 0;
  weekSalesAmount: number = 0;
  monthSalesCount: number = 0;
  monthSalesAmount: number = 0;

  // Descuentos 6ª visita (montos y conteos)
  todayDiscountAmount: number = 0;
  todayDiscountCount: number = 0;
  yesterdayDiscountAmount: number = 0;
  yesterdayDiscountCount: number = 0;
  weekDiscountAmount: number = 0;
  weekDiscountCount: number = 0;
  monthDiscountAmount: number = 0;
  monthDiscountCount: number = 0;

  // Descuentos 6ta visita (10%) - NEW
  todayDiscount6thAmount: number = 0;
  todayDiscount6thCount: number = 0;
  yesterdayDiscount6thAmount: number = 0;
  yesterdayDiscount6thCount: number = 0;
  weekDiscount6thAmount: number = 0;
  weekDiscount6thCount: number = 0;
  monthDiscount6thAmount: number = 0;
  monthDiscount6thCount: number = 0;

  // Descuentos 7ma visita (100%) - NEW
  todayDiscount7thAmount: number = 0;
  todayDiscount7thCount: number = 0;
  yesterdayDiscount7thAmount: number = 0;
  yesterdayDiscount7thCount: number = 0;
  weekDiscount7thAmount: number = 0;
  weekDiscount7thCount: number = 0;
  monthDiscount7thAmount: number = 0;
  monthDiscount7thCount: number = 0;

  // Totales netos
  todayNetAmount: number = 0;
  yesterdayNetAmount: number = 0;
  weekNetAmount: number = 0;
  monthNetAmount: number = 0;

  recordsPerPage: number = 100;
  currentPage: number = 1;
  totalPages: number = 0;
  paginatedOrders: any[] = [];


  filteredOrders: any[] = [];
  filter = {
    startDate: '',
    endDate: '',
    today: false,
    yesterday: false,
    thisWeek: false,
    thisMonth: false,
    paymentMethods: {
      cash: false,
      creditCard: false,
      debitCard: false
    }
  };
  customStartDate: string = '';
  customEndDate: string = '';
  productosCatalogo: any[] = []; // Lista completa de productos del catálogo

  globalInvoiceSucursalIds: number[] = [];
  currentSucursalId: number | null = null;
  globalInvoiceOrders: any[] = [];
  globalInvoiceOrdersLoaded = false;
  sucursalNames: Record<number, string> = {};
  globalInvoicePeriodCache: Record<string, { orders: any[]; loaded: boolean }> = {};
  globalInvoicePeriodLoading = new Set<string>();



  private apiUrl = environment.apiUrl;  // Usa la URL base del entorno

  showUserDropdown = false;

  datosFiscales = {
    rfc: '',
    nombre: '',
    cp: '',
    regimenFiscal: '612', // Valor por defecto para persona física
    usoCfdi: 'G03',
    email: ''
  };

  // Autocomplete de RFC (Clientes)
  customerQuery: string = '';
  customerInv: any | null = null;
  rfcSuggestions: any[] = [];
  showRfcSuggestions = false;

  private resolveSucursalGroupIds(baseId: number): number[] {
    return [baseId];
  }

  private isSucursalAllowedForGlobal(id?: number | null): boolean {
    if (id === undefined || id === null) {
      return false;
    }
    return this.globalInvoiceSucursalIds.includes(Number(id));
  }

  private buildAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Basic ' + btoa('uniqueAdmin:admin123'),
    });
  }

  getGlobalFacturaSucursalLabel(): string {
    if (!this.globalInvoiceSucursalIds || this.globalInvoiceSucursalIds.length === 0) {
      return '';
    }
    const names = this.globalInvoiceSucursalIds.map((id) =>
      this.sucursalNames[id] ? this.sucursalNames[id] : `Sucursal ${id}`
    );
    return names.join(' + ');
  }

  private mapOrdersResponse(orders: any[]): any[] {
    return (orders || []).map((order: any) => ({
      ...order,
      totalItems:
        order.productos?.reduce((sum: number, product: any) => sum + (product.cantidad || 0), 0) || 0,
    }));
  }

  private getOrdersForGlobalInvoice(): any[] {
    if (!this.globalInvoiceSucursalIds || this.globalInvoiceSucursalIds.length === 0) {
      return this.ordenes;
    }

    if (this.selectedMonth) {
      const periodKey = `${this.anioActual}-${this.selectedMonth}`;
      const cache = this.globalInvoicePeriodCache[periodKey];
      if (cache?.loaded) {
        return cache.orders;
      }
    }

    if (
      this.globalInvoiceSucursalIds.length === 1 &&
      this.currentSucursalId !== null &&
      this.globalInvoiceSucursalIds[0] === this.currentSucursalId
    ) {
      return this.ordenes;
    }

    return this.globalInvoiceOrders.length ? this.globalInvoiceOrders : this.ordenes;
  }

  private refreshGlobalInvoiceOrders(onComplete?: () => void): void {
    this.globalInvoiceOrdersLoaded = false;

    if (!this.globalInvoiceSucursalIds || this.globalInvoiceSucursalIds.length === 0) {
      this.globalInvoiceOrders = [...this.ordenes];
      this.globalInvoiceOrdersLoaded = true;
      if (onComplete) onComplete();
      return;
    }

    if (
      this.globalInvoiceSucursalIds.length === 1 &&
      this.currentSucursalId !== null &&
      this.globalInvoiceSucursalIds[0] === this.currentSucursalId
    ) {
      this.globalInvoiceOrders = [...this.ordenes];
      this.globalInvoiceOrdersLoaded = true;
      if (onComplete) onComplete();
      return;
    }

    const headers = this.buildAuthHeaders();
    const requests = this.globalInvoiceSucursalIds.map((id) =>
      this.http
        .get<any[]>(`${this.apiUrl}/ordenes-compra/por-sucursal?sucursalId=${id}`, { headers })
        .pipe(
          catchError((error) => {
            console.error(`Error al refrescar órdenes para sucursal ${id}:`, error);
            return of([]);
          })
        )
    );

    forkJoin(requests).subscribe({
      next: (responses: any[][]) => {
        const combined = responses.flat();
        this.globalInvoiceOrders = this.mapOrdersResponse(combined).sort(
          (a, b) => this.getOrderTimestamp(b.fecha) - this.getOrderTimestamp(a.fecha)
        );
        this.loadSucursalNames(this.globalInvoiceSucursalIds);
        this.cacheGlobalOrdersByPeriod(this.globalInvoiceOrders);
        this.globalInvoiceOrdersLoaded = true;
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('Error al refrescar órdenes globales:', error);
        this.globalInvoiceOrders = [...this.ordenes];
        this.loadSucursalNames(this.globalInvoiceSucursalIds);
        this.globalInvoiceOrdersLoaded = true;
        if (onComplete) onComplete();
      },
    });
  }

  private loadSucursalNames(ids: number[]): void {
    const uniqueIds = Array.from(new Set(ids.filter((id) => id != null)));
    if (uniqueIds.length === 0) {
      return;
    }

    const missingIds = uniqueIds.filter((id) => !this.sucursalNames[id]);
    if (missingIds.length === 0) {
      return;
    }

    const requests = missingIds.map((id) =>
      this.authService.getSucursalNombre(id).pipe(
        map((resp: any) => ({ id, nombre: resp?.nombre || `Sucursal ${id}` })),
        catchError((error) => {
          console.error(`Error obteniendo nombre de sucursal ${id}:`, error);
          return of({ id, nombre: `Sucursal ${id}` });
        })
      )
    );

    forkJoin(requests).subscribe((results) => {
      results.forEach(({ id, nombre }) => {
        this.sucursalNames[id] = nombre;
      });
    });
  }

  private ensureGlobalOrdersForPeriod(mes: string, anio: number, onComplete: () => void): void {
    const periodKey = `${anio}-${mes}`;
    const cache = this.globalInvoicePeriodCache[periodKey];

    if (cache?.loaded) {
      onComplete();
      return;
    }

    if (this.globalInvoicePeriodLoading.has(periodKey)) {
      return;
    }

    this.globalInvoicePeriodLoading.add(periodKey);
    this.globalInvoicePeriodCache[periodKey] = { orders: [], loaded: false };

    const headers = this.buildAuthHeaders();
    const requests = this.globalInvoiceSucursalIds.map((id) =>
      this.http
        .get<any[]>(`${this.apiUrl}/ordenes-compra/por-sucursal-mes-especifico`, {
          params: {
            sucursalId: id.toString(),
            mes,
            anio: anio.toString(),
          },
          headers,
        })
        .pipe(
          catchError((error) => {
            console.error(`Error al obtener órdenes globales para ${mes}/${anio} (sucursal ${id}):`, error);
            return of([]);
          })
        )
    );

    forkJoin(requests).subscribe({
      next: (responses: any[][]) => {
        const combined = responses.flat();
        const mapped = this.mapOrdersResponse(combined).sort(
          (a, b) => this.getOrderTimestamp(b.fecha) - this.getOrderTimestamp(a.fecha)
        );
        this.globalInvoicePeriodCache[periodKey] = { orders: mapped, loaded: true };
        this.globalInvoicePeriodLoading.delete(periodKey);
        this.loadSucursalNames(this.globalInvoiceSucursalIds);
        this.cacheGlobalOrdersByPeriod(mapped, periodKey);
        onComplete();
      },
      error: (error) => {
        console.error('Error al combinar órdenes globales para periodo', periodKey, error);
        this.globalInvoicePeriodCache[periodKey] = { orders: [], loaded: true };
        this.globalInvoicePeriodLoading.delete(periodKey);
        onComplete();
      },
    });
  }

  private cacheGlobalOrdersByPeriod(orders: any[], forcedKey?: string): void {
    if (!orders || orders.length === 0) {
      return;
    }

    const grouped: Record<string, any[]> = {};

    orders.forEach(order => {
      const date = this.parseOrderDateLocal(order.fecha);
      if (Number.isNaN(date.getTime())) {
        return;
      }
      const key = forcedKey || `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(order);
    });

    Object.entries(grouped).forEach(([key, list]) => {
      this.globalInvoicePeriodCache[key] = {
        orders: [...list],
        loaded: true,
      };
    });
  }

  openGlobalInvoiceModal(): void {
    this.resumenMes = null;
    if (this.globalInvoiceSucursalIds.length > 1) {
      this.refreshGlobalInvoiceOrders(() => this.cargarResumenMes());
    } else {
      this.globalInvoiceOrders = [...this.ordenes];
      this.globalInvoiceOrdersLoaded = true;
      this.cargarResumenMes();
    }
  }

  onCustomerRfcInput(ev: any) {
    const val = (ev?.target?.value || '').trim();
    this.customerQuery = val;
    if (val.length < 3) {
      this.customerInv = null;
      this.rfcSuggestions = [];
      this.showRfcSuggestions = false;
      return;
    }
    // Búsqueda predictiva por RFC
    this.http.get<any[]>(`${this.apiUrl}/clientes/search`, { params: { q: val } }).subscribe({
      next: (list: any[]) => {
        const upper = val.toUpperCase();
        const filtered = (list || []).filter(c => (c.rfc || '').toUpperCase().includes(upper));
        this.rfcSuggestions = filtered.slice(0, 6);
        this.showRfcSuggestions = true;
        // Autorelleno si hay coincidencia exacta
        const exact = filtered.find(c => (c.rfc || '').toUpperCase() === upper);
        if (exact) {
          this.applyCustomerToInvoice(exact);
        }
      },
      error: () => { this.rfcSuggestions = []; this.showRfcSuggestions = true; }
    });
  }

  selectCustomerSuggestion(c: any): void {
    if (!c) return;
    this.applyCustomerToInvoice(c);
    this.showRfcSuggestions = false;
  }

  private applyCustomerToInvoice(c: any): void {
    this.datosFiscales.rfc = c.rfc || this.datosFiscales.rfc;
    this.datosFiscales.nombre = c.razonSocial || c.nombreCompleto || this.datosFiscales.nombre;
    this.datosFiscales.cp = c.codigoPostal || this.datosFiscales.cp;
    this.datosFiscales.email = c.emailCfdi || c.email || this.datosFiscales.email;
  }

  onRfcBlur(): void {
    // Permitir click en sugerencia antes de ocultar
    setTimeout(() => this.showRfcSuggestions = false, 150);
  }

  selectedMonth: string = '';
  resumenMes: any = null;
  montoAFacturar: number = 0;

  meses = [
    { nombre: 'Enero', value: '01' },
    { nombre: 'Febrero', value: '02' },
    { nombre: 'Marzo', value: '03' },
    { nombre: 'Abril', value: '04' },
    { nombre: 'Mayo', value: '05' },
    { nombre: 'Junio', value: '06' },
    { nombre: 'Julio', value: '07' },
    { nombre: 'Agosto', value: '08' },
    { nombre: 'Septiembre', value: '09' },
    { nombre: 'Octubre', value: '10' },
    { nombre: 'Noviembre', value: '11' },
    { nombre: 'Diciembre', value: '12' }
  ];

  anioActual = new Date().getFullYear();

  ventasSeleccionadas: any[] = [];
  totalSeleccionado: number = 0;

  selectedFormaPago: string = '28'; // Valor por defecto para la forma de pago

  // Nuevas propiedades para histórico
  selectedHistoricalMonth: string = '';
  selectedHistoricalYear: number = 0;
  isHistoricalView: boolean = false;
  availableYears: number[] = [];
  diasConVentas: number = 0;
  totalMesHistorico: number = 0;

  // Propiedades para timbres
  timbresUtilizados: number = 0;
  timbresDisponibles: number = 300; // Valor por defecto editable
  editandoTimbres: boolean = false;
  timbresDisponiblesOriginal: number = 300;

  constructor(
    public authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private modal: NgbModal,
    private facturacionService: FacturacionService
  ) { }

  ngOnInit(): void {
    const userData = this.authService.getCurrentUser();
    console.log('Datos del usuario en Orders:', userData);

    // Corregir la validación del rol para permitir Super Admin y Operator
    const userRole = typeof userData?.rol === 'string' ? userData?.rol : userData?.rol?.nombre;
    const normalizedRole = userRole?.toLowerCase();

    if (!userData || !userRole || (normalizedRole !== 'super admin' && normalizedRole !== 'operator')) {
      console.error('Usuario no autorizado. Rol requerido: Super Admin o Operator. Rol actual:', userRole);
      this.router.navigate(['/login']);
      return;
    }

    const sucursalIdRaw = this.authService.getSucursalId();
    const sucursalId = Number(sucursalIdRaw);
    if (sucursalIdRaw === null || sucursalIdRaw === undefined || Number.isNaN(sucursalId)) {
      console.error('Sucursal ID no encontrado. Asegúrate de que el usuario tenga una sucursal asignada.');
      this.router.navigate(['/unauthorized']);
      return;
    }

    this.currentSucursalId = sucursalId;
    this.globalInvoiceSucursalIds = this.resolveSucursalGroupIds(sucursalId);
    this.loadSucursalNames([sucursalId, ...this.globalInvoiceSucursalIds]);

    // Obtener el nombre de la sucursal base
    this.authService.getSucursalNombre(sucursalId).subscribe({
      next: (response: any) => {
        this.sucursalName = response.nombre || 'Sucursal no encontrada';
        if (response?.nombre) {
          this.sucursalNames[sucursalId] = response.nombre;
        }
      },
      error: (error) => {
        console.error('Error al obtener el nombre de la sucursal:', error);
        this.sucursalName = 'Error al cargar la sucursal';
      },
    });

    // Obtener los datos del usuario actual
    if (userData) {
      this.userName = userData.nombreCompleto || 'Usuario no identificado';
      this.userEmail = userData.email || 'Correo no disponible';
      this.userRole = userData.rol?.nombre || 'Rol no asignado';
    } else {
      console.error('No se pudo obtener la información del usuario.');
    }

    // Generar años disponibles para histórico (últimos 3 años)
    const currentYear = new Date().getFullYear();
    this.availableYears = [currentYear, currentYear - 1, currentYear - 2];

    this.cargarTimbresUtilizados();
    this.cargarOrdenes();
    this.fetchProductos();
  }

  private readonly mexicoOffset = '-06:00';

  private getNowInMexico(): moment.Moment {
    return moment.parseZone(moment().utcOffset(this.mexicoOffset).format('YYYY-MM-DDTHH:mm:ss.SSSZ'));
  }

  private parseDateInMexico(date: string, endOfDay: boolean = false): moment.Moment {
    const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
    return moment.parseZone(`${date}T${time}${this.mexicoOffset}`);
  }

  private parseOrderMomentMexico(fecha: string | null | undefined): moment.Moment {
    if (!fecha) {
      return moment.invalid();
    }
    // Forzamos interpretación uniforme: el valor almacenado en BD se trata como UTC naive.
    // Esto evita mezclas cuando el payload llega con/ sin offset.
    const normalized = fecha
      .trim()
      .replace(' ', 'T')
      .replace(/(Z|[+-]\d{2}:\d{2})$/, '');
    return moment.utc(normalized).utcOffset(this.mexicoOffset);
  }

  private parseOrderDateLocal(fecha: string | null | undefined): Date {
    const parsed = this.parseOrderMomentMexico(fecha);
    return parsed.isValid() ? parsed.toDate() : new Date(NaN);
  }

  private getOrderTimestamp(fecha: string | null | undefined): number {
    const parsed = this.parseOrderMomentMexico(fecha);
    return parsed.isValid() ? parsed.valueOf() : Number.NEGATIVE_INFINITY;
  }

  formatOrderDateMexico(fecha: string | null | undefined): string {
    const parsed = this.parseOrderMomentMexico(fecha);
    return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : '-';
  }

  logout(): void {
    // Primero limpiar el almacenamiento local
    localStorage.removeItem('currentUser');
    localStorage.removeItem('jwt');

    // Luego llamar al servicio de logout
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
        // Aún así, redirigir al login ya que el almacenamiento local ya está limpio
        this.router.navigate(['/login']);
      }
    });
  }
  cargarOrdenes(): void {
    this.loading = true;

    if (this.currentSucursalId === null) {
      console.error('Sucursal ID no encontrado.');
      this.loading = false;
      return;
    }

    const headers = this.buildAuthHeaders();
    this.http
      .get<any[]>(`${this.apiUrl}/ordenes-compra/por-sucursal?sucursalId=${this.currentSucursalId}`, { headers })
      .subscribe({
        next: (response: any[]) => {
          console.log('Órdenes recibidas:', response);
          this.ordenes = this.mapOrdersResponse(response);
          this.ordenes.sort((a, b) => this.getOrderTimestamp(b.fecha) - this.getOrderTimestamp(a.fecha));
          this.paginateOrders();
          this.calculateSalesSummary();
          this.refreshGlobalInvoiceOrders();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al obtener órdenes:', error);
          this.ordenes = [];
          this.paginateOrders();
          this.calculateSalesSummary();
          this.refreshGlobalInvoiceOrders();
          this.loading = false;
        },
      });
  }

  processOrders(orders: any[]): any[] {
    return orders.map((order: any) => {
      if (order?.fecha) {
        const date = this.parseOrderDateLocal(order.fecha);
        order.fecha = `${date.getFullYear()}-${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${date.getDate()
            .toString()
            .padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes()
              .toString()
              .padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
      }
      return order;
    });
  }

  paginateOrders(): void {
    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const endIndex = startIndex + this.recordsPerPage;
    this.paginatedOrders = this.ordenes.slice(startIndex, endIndex);
    this.totalPages = Math.ceil(this.ordenes.length / this.recordsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.paginateOrders();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.paginateOrders();
    }
  }

  onRecordsPerPageChange(): void {
    this.currentPage = 1;  // Reinicia a la primera página al cambiar la cantidad de registros
    this.paginateOrders();
  }

  // Métodos para histórico
  cargarHistorico(): void {
    if (!this.selectedHistoricalMonth || !this.selectedHistoricalYear) {
      return;
    }

    this.loading = true;
    this.isHistoricalView = true;
    if (this.currentSucursalId === null) {
      console.error('Sucursal ID no encontrado.');
      this.loading = false;
      return;
    }

    const headers = this.buildAuthHeaders();
    this.http
      .get<any[]>(`${this.apiUrl}/ordenes-compra/por-sucursal-mes-especifico`, {
        params: {
          sucursalId: this.currentSucursalId.toString(),
          mes: this.selectedHistoricalMonth,
          anio: this.selectedHistoricalYear.toString(),
        },
        headers,
      })
      .subscribe({
        next: (response: any[]) => {
          this.ordenes = response.map((order: any) => ({
            ...order,
            totalItems:
              order.productos?.reduce((sum: number, product: any) => sum + (product.cantidad || 0), 0) || 0,
          }));

          this.ordenes.sort((a, b) => this.getOrderTimestamp(b.fecha) - this.getOrderTimestamp(a.fecha));
          this.paginateOrders();
          this.calculateSalesSummary();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al cargar histórico:', error);
          this.loading = false;
        },
      });
  }

  volverMesActual(): void {
    this.isHistoricalView = false;
    this.selectedHistoricalMonth = '';
    this.selectedHistoricalYear = 0;
    this.cargarOrdenes(); // Método original que carga mes actual
  }

  getSelectedMonthName(): string {
    const mes = this.meses.find(m => m.value === this.selectedHistoricalMonth);
    return mes ? mes.nombre : '';
  }

  getMesNombre(mesValue: string): string {
    const mes = this.meses.find(m => m.value === mesValue);
    return mes ? mes.nombre : mesValue;
  }

  getDaysInSelectedMonth(): number {
    return new Date(this.selectedHistoricalYear, parseInt(this.selectedHistoricalMonth), 0).getDate();
  }

  cargarTimbresUtilizados(): void {
    if (this.currentSucursalId === null) {
      console.error('No se puede cargar timbres: Sucursal ID no disponible');
      return;
    }

    const headers = this.buildAuthHeaders();
    this.http.get<any>(`${this.apiUrl}/timbres/resumen/${this.currentSucursalId}`, { headers })
      .subscribe({
        next: (resumen) => {
          this.timbresUtilizados = resumen.utilizados || 0;
          this.timbresDisponibles = resumen.disponibles || 0;
          console.log('Resumen de timbres:', resumen);
        },
        error: (error) => {
          console.error('Error al cargar timbres utilizados:', error);
          this.timbresUtilizados = 0;
          // Si no hay configuración, mantener el valor por defecto
          if (error.status !== 404) {
            this.timbresDisponibles = 0;
          }
        }
      });
  }

  editarTimbres(): void {
    this.timbresDisponiblesOriginal = this.timbresDisponibles;
    this.editandoTimbres = true;
  }

  guardarTimbres(): void {
    if (this.timbresDisponibles < 0) {
      Swal.fire('Error', 'La cantidad no puede ser negativa', 'error');
      return;
    }

    if (this.currentSucursalId === null) {
      Swal.fire('Error', 'No se pudo identificar la sucursal', 'error');
      return;
    }

    const headers = this.buildAuthHeaders();
    const payload = {
      sucursalId: this.currentSucursalId,
      cantidadTimbres: this.timbresDisponibles
    };

    Swal.fire({
      title: 'Guardando...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.http.post(`${this.apiUrl}/timbres/cargar`, payload, { headers })
      .subscribe({
        next: (response: any) => {
          Swal.fire('¡Éxito!', 'Timbres disponibles actualizados correctamente', 'success');
          this.editandoTimbres = false;
          // Recargar el resumen de timbres
          this.cargarTimbresUtilizados();
        },
        error: (error) => {
          console.error('Error al guardar timbres:', error);
          const mensaje = error.error?.error || 'Error al guardar timbres disponibles';
          Swal.fire('Error', mensaje, 'error');
        }
      });
  }

  cancelarEdicionTimbres(): void {
    this.timbresDisponibles = this.timbresDisponiblesOriginal;
    this.editandoTimbres = false;
  }

  toggleItemDetails(order: any): void {
    order.showDetails = !order.showDetails; // Alterna el valor para mostrar/ocultar los detalles
  }
  openReceiptModal(order: any): void {
    if (order && order.productos) {
      this.selectedOrder = order;

      // Si hay placa, consultar información de lealtad antes de imprimir
      if (order.placa && order.placa.trim() !== '') {
        const sucursalId = order.sucursal?.id || 1;
        this.http.get<any>(`${environment.apiUrl}/plates/${order.placa}/quick-info?sucursalId=${sucursalId}`).subscribe(
          (plateInfo) => {
            const ticketData = this.generateTicketData(order, plateInfo);
            this.printReceipt(ticketData);
          },
          (error) => {
            console.warn('No se pudo obtener info de lealtad, imprimiendo sin ella:', error);
            const ticketData = this.generateTicketData(order);
            this.printReceipt(ticketData);
          }
        );
      } else {
        // Sin placa, imprimir normalmente
        const ticketData = this.generateTicketData(order);
        this.printReceipt(ticketData);
      }
    } else {
      console.error("La orden no es válida o no tiene productos.");
    }
  }

  calculateSalesSummary(): void {
    if (this.currentSucursalId === null) {
      console.error('Sucursal actual no definida. No se pueden calcular los resúmenes de ventas.');
      return;
    }

    if (this.isHistoricalView) {
      // Cálculos para vista histórica
      this.calculateHistoricalSummary();
    } else {
      // Cálculos normales (mes actual)
      this.calculateCurrentMonthSummary();
    }
  }

  calculateCurrentMonthSummary(): void {
    // Fechas base para comparación
    const nowMexico = this.getNowInMexico();
    const today = nowMexico.clone().startOf('day');
    const yesterday = nowMexico.clone().subtract(1, 'day').startOf('day');
    const startOfWeek = nowMexico.clone().startOf('isoWeek');
    const endOfWeek = nowMexico.clone().endOf('isoWeek');
    const startOfMonth = nowMexico.clone().startOf('month');
    const endOfMonth = nowMexico.clone().endOf('month');

    // Inicializa los contadores
    this.todaySalesCount = 0;
    this.todaySalesAmount = 0;
    this.yesterdaySalesCount = 0;
    this.yesterdaySalesAmount = 0;
    this.weekSalesCount = 0;
    this.weekSalesAmount = 0;
    this.monthSalesCount = 0;
    this.monthSalesAmount = 0;
    // Descuentos (legacy)
    this.todayDiscountAmount = 0; this.todayDiscountCount = 0;
    this.yesterdayDiscountAmount = 0; this.yesterdayDiscountCount = 0;
    this.weekDiscountAmount = 0; this.weekDiscountCount = 0;
    this.monthDiscountAmount = 0; this.monthDiscountCount = 0;
    // Descuentos 6ta visita (10%)
    this.todayDiscount6thAmount = 0; this.todayDiscount6thCount = 0;
    this.yesterdayDiscount6thAmount = 0; this.yesterdayDiscount6thCount = 0;
    this.weekDiscount6thAmount = 0; this.weekDiscount6thCount = 0;
    this.monthDiscount6thAmount = 0; this.monthDiscount6thCount = 0;
    // Descuentos 7ma visita (100%)
    this.todayDiscount7thAmount = 0; this.todayDiscount7thCount = 0;
    this.yesterdayDiscount7thAmount = 0; this.yesterdayDiscount7thCount = 0;
    this.weekDiscount7thAmount = 0; this.weekDiscount7thCount = 0;
    this.monthDiscount7thAmount = 0; this.monthDiscount7thCount = 0;

    // Procesar las órdenes y calcular el resumen
    this.ordenes.forEach(order => {
      const orderDate = this.parseOrderMomentMexico(order.fecha);
      if (!orderDate.isValid()) {
        return;
      }
      const orderTotal = order.total || 0; // Total de la orden

      // Validar sucursal
      if (order.sucursal?.id !== this.currentSucursalId) {
        return; // Ignorar órdenes de otras sucursales
      }

      // Calcular ventas de hoy
      if (orderDate.isSame(today, 'day')) {
        this.todaySalesCount++;
        this.todaySalesAmount += orderTotal;
        // Track loyalty discounts separately
        if (order.descuento6taVisitaAplicado) {
          const disc6th = Number(order.descuento6taVisitaMonto || 0);
          this.todayDiscount6thAmount += disc6th;
          if (disc6th > 0) this.todayDiscount6thCount++;
        }
        if (order.descuento7maVisitaAplicado) {
          const disc7th = Number(order.descuento7maVisitaMonto || 0);
          this.todayDiscount7thAmount += disc7th;
          if (disc7th > 0) this.todayDiscount7thCount++;
        }
        // Legacy tracking
        if (order.loyaltyApplied) {
          const disc = Number(order.loyaltyDiscountAmount || 0);
          this.todayDiscountAmount += disc;
          if (disc > 0) this.todayDiscountCount++;
        }
      }

      // Calcular ventas de ayer
      if (orderDate.isSame(yesterday, 'day')) {
        this.yesterdaySalesCount++;
        this.yesterdaySalesAmount += orderTotal;
        // Track loyalty discounts separately
        if (order.descuento6taVisitaAplicado) {
          const disc6th = Number(order.descuento6taVisitaMonto || 0);
          this.yesterdayDiscount6thAmount += disc6th;
          if (disc6th > 0) this.yesterdayDiscount6thCount++;
        }
        if (order.descuento7maVisitaAplicado) {
          const disc7th = Number(order.descuento7maVisitaMonto || 0);
          this.yesterdayDiscount7thAmount += disc7th;
          if (disc7th > 0) this.yesterdayDiscount7thCount++;
        }
        // Legacy tracking
        if (order.loyaltyApplied) {
          const disc = Number(order.loyaltyDiscountAmount || 0);
          this.yesterdayDiscountAmount += disc;
          if (disc > 0) this.yesterdayDiscountCount++;
        }
      }

      // Calcular ventas de la semana
      if (orderDate.isBetween(startOfWeek, endOfWeek, undefined, '[]')) {
        this.weekSalesCount++;
        this.weekSalesAmount += orderTotal;
        // Track loyalty discounts separately
        if (order.descuento6taVisitaAplicado) {
          const disc6th = Number(order.descuento6taVisitaMonto || 0);
          this.weekDiscount6thAmount += disc6th;
          if (disc6th > 0) this.weekDiscount6thCount++;
        }
        if (order.descuento7maVisitaAplicado) {
          const disc7th = Number(order.descuento7maVisitaMonto || 0);
          this.weekDiscount7thAmount += disc7th;
          if (disc7th > 0) this.weekDiscount7thCount++;
        }
        // Legacy tracking
        if (order.loyaltyApplied) {
          const disc = Number(order.loyaltyDiscountAmount || 0);
          this.weekDiscountAmount += disc;
          if (disc > 0) this.weekDiscountCount++;
        }
      }

      // Calcular ventas del mes
      if (orderDate.isBetween(startOfMonth, endOfMonth, undefined, '[]')) {
        this.monthSalesCount++;
        this.monthSalesAmount += orderTotal;
        // Track loyalty discounts separately
        if (order.descuento6taVisitaAplicado) {
          const disc6th = Number(order.descuento6taVisitaMonto || 0);
          this.monthDiscount6thAmount += disc6th;
          if (disc6th > 0) this.monthDiscount6thCount++;
        }
        if (order.descuento7maVisitaAplicado) {
          const disc7th = Number(order.descuento7maVisitaMonto || 0);
          this.monthDiscount7thAmount += disc7th;
          if (disc7th > 0) this.monthDiscount7thCount++;
        }
        // Legacy tracking
        if (order.loyaltyApplied) {
          const disc = Number(order.loyaltyDiscountAmount || 0);
          this.monthDiscountAmount += disc;
          if (disc > 0) this.monthDiscountCount++;
        }
      }
    });

    // Calcular netos
    this.todayNetAmount = +(this.todaySalesAmount - this.todayDiscountAmount);
    this.yesterdayNetAmount = +(this.yesterdaySalesAmount - this.yesterdayDiscountAmount);
    this.weekNetAmount = +(this.weekSalesAmount - this.weekDiscountAmount);
    this.monthNetAmount = +(this.monthSalesAmount - this.monthDiscountAmount);

    // Log de resumen para depuración
    console.log('Resumen de ventas calculado:', {
      today: { count: this.todaySalesCount, amount: this.todaySalesAmount },
      yesterday: { count: this.yesterdaySalesCount, amount: this.yesterdaySalesAmount },
      week: { count: this.weekSalesCount, amount: this.weekSalesAmount },
      month: { count: this.monthSalesCount, amount: this.monthSalesAmount },
      discounts: {
        today: { amount: this.todayDiscountAmount, count: this.todayDiscountCount },
        yesterday: { amount: this.yesterdayDiscountAmount, count: this.yesterdayDiscountCount },
        week: { amount: this.weekDiscountAmount, count: this.weekDiscountCount },
        month: { amount: this.monthDiscountAmount, count: this.monthDiscountCount }
      }
    });
  }

  calculateHistoricalSummary(): void {
    // Resetear contadores mensuales
    this.monthSalesCount = 0;
    this.monthSalesAmount = 0;
    this.monthDiscountAmount = 0;
    this.monthDiscountCount = 0;
    this.monthNetAmount = 0;

    // Reiniciar contadores de descuentos específicos (10% y 100%)
    this.monthDiscount6thAmount = 0;
    this.monthDiscount6thCount = 0;
    this.monthDiscount7thAmount = 0;
    this.monthDiscount7thCount = 0;

    this.diasConVentas = 0;
    this.totalMesHistorico = 0;

    // Agrupar por días para contar días únicos con ventas
    const diasUnicos = new Set<string>();

    this.ordenes.forEach(order => {
      // Validar sucursal (aunque el backend ya filtra, mantenemos consistencia)
      if (order.sucursal?.id !== this.currentSucursalId) {
        return;
      }

      const orderDate = this.parseOrderDateLocal(order.fecha);
      const dia = orderDate.getDate().toString().padStart(2, '0');
      diasUnicos.add(dia);

      const orderTotal = order.total || 0;
      this.monthSalesCount++;
      this.monthSalesAmount += orderTotal;

      // Track loyalty discounts (10% y 100%)
      if (order.descuento6taVisitaAplicado) {
        const disc6th = Number(order.descuento6taVisitaMonto || 0);
        this.monthDiscount6thAmount += disc6th;
        if (disc6th > 0) this.monthDiscount6thCount++;
      }
      if (order.descuento7maVisitaAplicado) {
        const disc7th = Number(order.descuento7maVisitaMonto || 0);
        this.monthDiscount7thAmount += disc7th;
        if (disc7th > 0) this.monthDiscount7thCount++;
      }

      // Legacy tracking
      if (order.loyaltyApplied) {
        const disc = Number(order.loyaltyDiscountAmount || 0);
        this.monthDiscountAmount += disc;
        if (disc > 0) this.monthDiscountCount++;
      }
    });

    this.diasConVentas = diasUnicos.size;
    this.monthNetAmount = +(this.monthSalesAmount - this.monthDiscountAmount);
    this.totalMesHistorico = this.monthNetAmount;

    console.log('Resumen histórico calculado:', {
      diasConVentas: this.diasConVentas,
      totalMesHistorico: this.totalMesHistorico,
      monthSalesCount: this.monthSalesCount,
      monthSalesAmount: this.monthSalesAmount,
      monthNetAmount: this.monthNetAmount
    });
  }

  applyFilter(): void {
    this.filteredOrders = this.ordenes.filter(order => {
      const orderDate = this.parseOrderMomentMexico(order.fecha);
      if (!orderDate.isValid()) {
        return false;
      }
      let matchesDateRange = true;
      let matchesPaymentMethod = true;

      // Filtrar por rango de fechas
      if (this.filter.startDate && this.filter.endDate) {
        const startDate = this.parseDateInMexico(this.filter.startDate);
        const endDate = this.parseDateInMexico(this.filter.endDate, true);
        matchesDateRange = orderDate.isBetween(startDate, endDate, 'day', '[]');
      }

      // Filtrar por períodos específicos
      if (this.filter.today) {
        const today = this.getNowInMexico().startOf('day');
        matchesDateRange = orderDate.isSame(today, 'day');
      }

      if (this.filter.yesterday) {
        const yesterday = this.getNowInMexico().subtract(1, 'day').startOf('day');
        matchesDateRange = orderDate.isSame(yesterday, 'day');
      }

      if (this.filter.thisWeek) {
        const nowMexico = this.getNowInMexico();
        const startOfWeek = nowMexico.startOf('isoWeek');
        const endOfWeek = this.getNowInMexico().endOf('isoWeek');
        matchesDateRange = orderDate.isBetween(startOfWeek, endOfWeek, 'day', '[]');
      }

      if (this.filter.thisMonth) {
        const nowMexico = this.getNowInMexico();
        const startOfMonth = nowMexico.startOf('month');
        const endOfMonth = this.getNowInMexico().endOf('month');
        matchesDateRange = orderDate.isBetween(startOfMonth, endOfMonth, 'day', '[]');
      }

      // Filtrar por método de pago
      const paymentMethod = order.metodoPago.toLowerCase();
      matchesPaymentMethod = (
        (this.filter.paymentMethods.cash && paymentMethod === 'cash') ||
        (this.filter.paymentMethods.creditCard && paymentMethod === 'creditcard') ||
        (this.filter.paymentMethods.debitCard && paymentMethod === 'debitcard')
      );

      return matchesDateRange && matchesPaymentMethod;
    });
  }

  closeModal(): void {
    const modalElement = document.getElementById('filterModal');
    if (modalElement) {
      const modal = new (window as any).bootstrap.Modal(modalElement);
      modal.hide();  // Oculta el modal
    }
  }

  discardFilter(): void {
    // Reinicia todos los filtros
    this.filter = {
      startDate: '',
      endDate: '',
      today: false,
      yesterday: false,
      thisWeek: false,
      thisMonth: false,
      paymentMethods: {
        cash: false,
        creditCard: false,
        debitCard: false
      }
    };
    this.closeModal();  // Cierra el modal después de descartar
  }

  printReceipt(ticketData: any): void {
    if (!ticketData || !ticketData.items || ticketData.items.length === 0) {
      console.error('Los datos del ticket son inválidos o no hay productos.');
      return;
    }

    const lineHeight = 5;
    let yPosition = 10;

    // Calcular la altura dinámica del documento
    const totalHeight = 200 + ticketData.items.length * 10 + 20; // Altura ajustada dinámicamente
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, totalHeight],
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    // Encabezado: Domicilio Fiscal
    doc.text('AUTO-LAVADO TRINITY', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('¡Gracias por su Compra!', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Domicilio Fiscal:', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Av. Tecnológico No. 1500', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Col. San Salvador, CP: 50130', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Toluca,', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Estado de México.', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('RFC: ATR230101T99', 29, yPosition, { align: 'center' });

    doc.setLineWidth(0.5);
    yPosition += 2;
    doc.line(5, yPosition, 53, yPosition); // Línea horizontal
    yPosition += lineHeight;

    // Información General
    doc.text(`Sucursal:`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`${ticketData.branch?.nombre || 'N/A'}`, 5, yPosition);

    yPosition += lineHeight;
    doc.text(`Recibo:`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`${ticketData.receiptNumber}`, 5, yPosition);
    yPosition += lineHeight;
    // Fecha y Hora de la venta (usar fecha real de la orden si está disponible)
    const ventaDate = ticketData?.fechaVenta ? moment.utc(ticketData.fechaVenta).local().toDate() : new Date();
    const fechaStr = ventaDate.toLocaleDateString('es-MX');
    const horaStr = ventaDate.toLocaleTimeString('es-MX');
    doc.text(`Fecha: ${fechaStr}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Hora: ${horaStr}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Atendido por:`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`${ticketData.userName}`, 5, yPosition);
    yPosition += lineHeight;

    if (ticketData.licensePlate) {
      doc.text(`Placas: ${ticketData.licensePlate}`, 5, yPosition);
      yPosition += lineHeight;
    }

    doc.text(`Método de Pago: ${ticketData.paymentMethod}`, 5, yPosition);
    yPosition += lineHeight;

    if (ticketData.paymentMethod === 'Efectivo') {
      doc.text(`Cantidad Recibida: $${ticketData.cantidadRecibida.toFixed(2)}`, 5, yPosition);
      yPosition += lineHeight;
      doc.text(`Cambio: $${ticketData.change.toFixed(2)}`, 5, yPosition);
      yPosition += lineHeight;
    }

    if (ticketData.totalVisits) {
      doc.setFont('helvetica', 'bold');
      doc.text(`--- PROGRAMA DE LEALTAD ---`, 5, yPosition);
      yPosition += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.text(`Visitas Totales: ${ticketData.totalVisits}`, 5, yPosition);
      yPosition += lineHeight;
      if (ticketData.cyclesCompleted > 0) {
        doc.text(`Ciclos Completados: ${ticketData.cyclesCompleted}`, 5, yPosition);
        yPosition += lineHeight;
      }
      if (ticketData.nextInCycle > 0) {
        doc.text(`Proxima Visita: ${ticketData.nextInCycle} de 6`, 5, yPosition);
        yPosition += lineHeight;
      }
      yPosition += lineHeight * 0.5; // Espacio adicional
    }

    if (ticketData.note) {
      const lineasNota = ticketData.note
        .split('\n')
        .map((linea: string) => linea.trim())
        .filter((linea: string) => linea !== '');

      if (lineasNota.length > 0) {
        doc.text('Nota:', 5, yPosition);
        yPosition += lineHeight;
        lineasNota.forEach((linea: string) => {
          doc.text(linea, 5, yPosition);
          yPosition += lineHeight;
        });
      }
    }

    doc.setLineWidth(0.5);
    doc.line(5, yPosition, 53, yPosition); // Línea horizontal
    yPosition += lineHeight;

    // Detalle de productos
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PRODUCTOS:', 5, yPosition);
    yPosition += lineHeight;
    console.log('ticketData.items:', ticketData.items);

    ticketData.items.forEach((item: any) => {
      const name = item?.name || 'N/A';
      const quantity = item?.quantity || 0;
      const total = item?.total && typeof item.total === 'number' ? item.total : 0; // Validación estricta

      doc.setFont('helvetica', 'normal');
      const nameLines = doc.splitTextToSize(`Producto: ${name}`, 50);
      nameLines.forEach((ln: string | string[]) => { doc.text(ln, 5, yPosition); yPosition += lineHeight; });
      doc.text(`Cantidad: ${quantity}`, 5, yPosition);
      yPosition += lineHeight;
      const productoId = item.productoId ? item.productoId.toString() : 'N/A';
      doc.text(`Total: $${total.toFixed(2)}`, 5, yPosition);
      yPosition += lineHeight;
    });

    doc.line(5, yPosition, 53, yPosition); // Línea horizontal final
    yPosition += lineHeight;

    // Total general y descuento (si aplica)
    doc.setFont('helvetica', 'bold');
    if (ticketData.loyaltyApplied && ticketData.loyaltyDiscountAmount && ticketData.loyaltyDiscountAmount > 0) {
      doc.text(`Descuento 6ª visita: -$${ticketData.loyaltyDiscountAmount.toFixed(2)}`, 5, yPosition);
      yPosition += lineHeight;
    }
    doc.text(`TOTAL VENDIDO: $${ticketData.total.toFixed(2)}`, 5, yPosition);

    yPosition += lineHeight;
    doc.text(`TOTAL SERVICIOS: ${ticketData.totalItems}`, 5, yPosition);

    // Disclaimer
    doc.setLineWidth(0.5);
    yPosition += lineHeight;
    doc.line(5, yPosition, 53, yPosition);
    yPosition += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const centerX = 29;
    doc.text('AP CAR WASH', centerX, yPosition, { align: 'center' });
    yPosition += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const maxTextWidth = 48;
    const disclaimer = doc.splitTextToSize('NO, NOS HACEMOS RESPONSABLES: POR FALLA O DAÑOS EN EL VEHÍCULO YA QUE NO CONOCEMOS EL ESTADO DEL MISMO (LLAVES, PORTA PLACA, RETROVISOR, SISTEMA ELÉCTRICO EN GENERAL) ASÍ MISMO POR OBJETOS DE VALOR NO REPORTADOS A LA ADMINISTRACIÓN', maxTextWidth);
    disclaimer.forEach((l: string) => { doc.text(l, centerX, yPosition, { align: 'center' }); yPosition += lineHeight; });

    yPosition += lineHeight;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('GRACIAS POR SU VISITA', centerX, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('VUELVA PRONTO', centerX, yPosition, { align: 'center' });


    // Generar blob y URL del PDF
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Asignar el PDF al iframe del modal
    const iframe: HTMLIFrameElement = document.getElementById('receiptIframe') as HTMLIFrameElement;
    iframe.src = pdfUrl;

    // Mostrar el modal
    const modal = new bootstrap.Modal(document.getElementById('receiptModal')!);
    modal.show();

    // Guardar el archivo
    //doc.save(`ticket_${ticketData.receiptNumber}.pdf`);
  }

  printReceiptFromIframe(): void {
    const iframe: HTMLIFrameElement = document.getElementById('receiptIframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    } else {
      console.error('No se pudo acceder al contenido del iframe para imprimir.');
    }
  }

  generateCustomTicket(): void {
    if (!this.customStartDate || !this.customEndDate) {
      Swal.fire('Error', 'Por favor selecciona ambas fechas.', 'error');
      return;
    }

    const startDate = this.parseDateInMexico(this.customStartDate);
    const endDate = this.parseDateInMexico(this.customEndDate, true);

    if (startDate.isAfter(endDate)) {
      Swal.fire('Error', 'La fecha de inicio no puede ser posterior a la fecha de fin.', 'error');
      return;
    }

    if (!this.currentSucursalId) {
      Swal.fire('Error', 'No se encontró la sucursal actual del usuario.', 'error');
      return;
    }

    console.log('Generando corte personalizado desde:', this.customStartDate, 'hasta:', this.customEndDate);
    console.log('Sucursal actual:', this.currentSucursalId);

    // Mostrar loading
    Swal.fire({
      title: 'Generando corte personalizado...',
      text: 'Obteniendo órdenes del rango de fechas seleccionado',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const headers = this.buildAuthHeaders();
    let fallbackTriggered = false;

    // Usar solo la sucursal actual, NO globalInvoiceSucursalIds
    const requests = [this.currentSucursalId].map((id) =>
      this.http
        .get<any[]>(`${this.apiUrl}/ordenes-compra/por-sucursal-rango-fechas`, {
          params: {
            sucursalId: id.toString(),
            fechaInicio: this.customStartDate,
            fechaFin: this.customEndDate,
          },
          headers,
        })
        .pipe(
          catchError((error) => {
            console.error(`Error al obtener órdenes para la sucursal ${id}:`, error);
            if (error.status === 404 || error.status === 405) {
              fallbackTriggered = true;
              return of([]);
            }
            return of([]);
          })
        )
    );

    forkJoin(requests).subscribe({
      next: (responses: any[][]) => {
        Swal.close();
        const combined = responses.flat();
        console.log('Órdenes obtenidas del backend para corte personalizado:', combined.length);

        if (combined.length === 0) {
          if (fallbackTriggered) {
            console.log('Endpoint no disponible, usando fallback con filtrado local');
            this.generateCustomTicketFallback();
            return;
          }
          Swal.fire('Información', 'No se encontraron ventas en el rango de fechas seleccionado.', 'info');
          return;
        }

        const filteredOrders = combined.map((order: any) => ({
          ...order,
          totalItems:
            order.productos?.reduce((sum: number, product: any) => sum + (product.cantidad || 0), 0) || 0,
        }));

        console.log('Órdenes procesadas para corte personalizado:', filteredOrders.length);
        this.generarPDFCortePersonalizado(filteredOrders);
      },
      error: (error) => {
        Swal.close();
        console.error('Error al obtener órdenes para corte personalizado:', error);
        this.generateCustomTicketFallback();
      },
    });
  }

  generateCustomTicketFallback(): void {
    const startDate = this.parseDateInMexico(this.customStartDate);
    const endDate = this.parseDateInMexico(this.customEndDate, true);
    console.log('Usando fallback para corte personalizado');
    console.log('Filtrando desde órdenes locales:', this.ordenes.length);

    // Filtrar por rango de fechas Y sucursal desde las órdenes locales
    const filteredOrders = this.ordenes.filter(order => {
      const orderDate = this.parseOrderMomentMexico(order.fecha);
      const cumpleFecha = orderDate.isBetween(startDate, endDate, undefined, '[]');
      const cumpleSucursal = order.sucursal?.id === this.currentSucursalId;

      return cumpleFecha && cumpleSucursal;
    });

    console.log('Órdenes filtradas (fallback):', filteredOrders.length);

    if (filteredOrders.length === 0) {
      Swal.fire('Información', 'No se encontraron ventas en el rango de fechas seleccionado en las órdenes cargadas actualmente.', 'info');
      return;
    }

    // Mostrar advertencia sobre limitaciones
    Swal.fire({
      title: 'Advertencia',
      text: `Se encontraron ${filteredOrders.length} órdenes en las órdenes actualmente cargadas. Para obtener todas las órdenes del rango de fechas, actualiza el backend.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.generarPDFCortePersonalizado(filteredOrders);
      }
    });
  }

  generarPDFCortePersonalizado(filteredOrders: any[]): void {
    const ticketData = this.processTicketData(filteredOrders);
    const total = ticketData?.total || 0;
    const paymentMethods = ticketData?.paymentMethods || { cash: 0, credit: 0, debit: 0 };
    const items = ticketData?.items || [];
    const branch = this.ordenes.length > 0 ? this.ordenes[0].sucursal?.nombre : 'N/A';
    const totalSales = ticketData?.totalSales || 0;
    const totalItems = ticketData?.totalItems || 0;
    const totalDiscounts = Number(ticketData?.totalDiscounts || 0);
    const discountCount = Number(ticketData?.discountCount || 0);
    const totalNet = Number(ticketData?.totalNet || (total - totalDiscounts));

    // ===========================
    // ✅ Crear el documento PDF
    // ===========================
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 295], // Altura máxima (58mm de ancho x 295mm de alto)
    });

    const lineHeight = 4;
    let yPosition = 10;

    // ===========================
    // ✅ Encabezado del ticket
    // ===========================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`CORTE PERSONALIZADO`, 29, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`USUARIO: ${this.userName}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`FECHA DEL CORTE: ${new Date().toLocaleDateString()}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`HORA: ${new Date().toLocaleTimeString()}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Sucursal: ${branch}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`PERÍODO: ${this.customStartDate} al ${this.customEndDate}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`ÓRDENES PROCESADAS: ${filteredOrders.length}`, 5, yPosition);

    // ===========================
    // ✅ Total de ventas
    // ===========================
    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`VENDIDO: $${total.toFixed(2)}`, 5, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`01-EFECTIVO: $${paymentMethods.cash.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`02-TARJETAS CRÉDITO: $${paymentMethods.credit.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`03-TARJETAS DÉBITO: $${paymentMethods.debit.toFixed(2)}`, 5, yPosition += lineHeight);

    // Descuentos y total neto
    yPosition += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`DESCUENTOS 6ª: -$${totalDiscounts.toFixed(2)} (${discountCount})`, 5, yPosition += lineHeight);
    doc.text(`TOTAL NETO: $${totalNet.toFixed(2)}`, 5, yPosition += lineHeight);

    // ===========================
    // ✅ Detalle de productos
    // ===========================
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PRODUCTOS:', 5, yPosition);

    yPosition += 4;
    items
      .sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
      .forEach((item: any) => {
        doc.setFont('helvetica', 'normal');
        const lineText = `${item.name} X ${item.quantity} - $${item.total.toFixed(2)}`;
        const splitLines = doc.splitTextToSize(lineText, 50);

        splitLines.forEach((line: string | string[]) => {
          if (yPosition >= 285) {
            doc.addPage([58, 295]);
            yPosition = 10;
          }
          doc.text(line, 5, yPosition);
          yPosition += lineHeight;
        });
      });

    // ===========================
    // ✅ Mostrar los totales al final
    // ===========================
    if (yPosition >= 285) {
      doc.addPage([58, 295]);
      yPosition = 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL VENDIDO: $${total.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`TOTAL TICKETS: ${totalSales}`, 5, yPosition += lineHeight);
    doc.text(`TOTAL SERVICIOS: ${totalItems}`, 5, yPosition += lineHeight);

    // ===========================
    // ✅ Generar el PDF
    // ===========================
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const iframe = document.getElementById('ticketIframe') as HTMLIFrameElement;
    iframe.src = pdfUrl;

    const modal = new (window as any).bootstrap.Modal(document.getElementById('ticketModal')!);
    modal.show();

    // ===========================
    // ✅ Limpiar y cerrar modal
    // ===========================
    const customModal = document.getElementById('customTicketModal');
    if (customModal) {
      const customModalInstance = bootstrap.Modal.getInstance(customModal);
      customModalInstance?.hide();
    }

    this.customStartDate = '';
    this.customEndDate = '';

    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }





  //Método de preparación de data para cortes personalizados
  processTicketData(orders: any[]): any {
    console.log('Procesando datos de ticket para', orders.length, 'órdenes');

    const totalVendido = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const paymentMethods = {
      cash: 0,
      credit: 0,
      debit: 0,
    };
    let totalDiscounts = 0;
    let discountCount = 0;

    // Crear un mapa para productos (inicializar con catálogo si está disponible)
    const productMap: { [key: number]: { name: string; quantity: number; total: number } } = {};

    // Inicializar el mapa con los productos del catálogo si están disponibles
    if (this.productos && this.productos.length > 0) {
      this.productos.forEach(product => {
        productMap[product.id] = {
          name: product.nombre,
          quantity: 0,
          total: 0,
        };
      });
    }

    let totalSales = orders.length;
    let totalItems = 0; // Inicializar el total de ítems vendidos

    // Obtener la sucursal del primer pedido (asumiendo que todos son de la misma sucursal)
    const branch = orders.length > 0 ? orders[0].sucursal?.nombre : 'N/A';

    // Procesar las órdenes
    orders.forEach(order => {
      // Actualizar métodos de pago
      const metodo = (order.metodoPago || '').toLowerCase();
      if (metodo === 'efectivo') {
        paymentMethods.cash += order.total || 0;
      } else if (metodo.includes('credito') || metodo.includes('crédito')) {
        paymentMethods.credit += order.total || 0;
      } else if (metodo.includes('debito') || metodo.includes('débito') || metodo.includes('tarjeta')) {
        paymentMethods.debit += order.total || 0;
      }

      // Sumar todos los tipos de descuentos
      let orderDiscount = 0;
      if (order.descuento6taVisitaAplicado) {
        orderDiscount += Number(order.descuento6taVisitaMonto || 0);
      }
      if (order.descuento7maVisitaAplicado) {
        orderDiscount += Number(order.descuento7maVisitaMonto || 0);
      }
      if (order.loyaltyApplied) {
        orderDiscount += Number(order.loyaltyDiscountAmount || 0);
      }

      if (orderDiscount > 0) {
        totalDiscounts += orderDiscount;
        discountCount++;
      }

      // Procesar los productos vendidos en la orden
      order.productos?.forEach((product: any) => {
        const productId = product.producto?.id; // Accede al ID correcto del producto
        const cantidad = product.cantidad || 0;
        const precio = product.precioProducto || 0;
        const nombreProducto = product.nombreProducto || product.producto?.nombre || `Producto ${productId}`;

        if (!isNaN(productId) && productId) {
          // Si el producto no existe en el mapa, agregarlo
          if (!productMap[productId]) {
            productMap[productId] = {
              name: nombreProducto,
              quantity: 0,
              total: 0,
            };
          }

          productMap[productId].quantity += cantidad; // Actualiza la cantidad
          productMap[productId].total += cantidad * precio; // Actualiza el total
          totalItems += cantidad; // Sumar al total de ítems vendidos
        } else {
          console.warn(`Producto con ID inválido o no encontrado:`, product);
        }
      });
    });

    // Convertir el mapa a un arreglo para ordenarlos y mostrarlos
    const items = Object.keys(productMap).map(key => ({
      id: Number(key),
      name: productMap[Number(key)].name,
      quantity: productMap[Number(key)].quantity,
      total: productMap[Number(key)].total,
    }));

    return {
      total: totalVendido,
      paymentMethods,
      items: items.sort((a, b) => a.id - b.id), // Lista de productos con cantidades y totales actualizados
      totalSales,
      totalItems, // Incluye el total de ítems vendidos
      branch,
      totalDiscounts,
      discountCount,
      totalNet: +(totalVendido - totalDiscounts)
    };
  }



  // Método para preparar los datos del ticket
  prepareTicketData(filteredOrders: any[]): any {
    const paymentMethods = { cash: 0, credit: 0, debit: 0 };
    const groupedItems: { [key: string]: { quantity: number; total: number } } = {};
    let total = 0;

    // Iterar sobre todas las órdenes
    filteredOrders.forEach(order => {
      total += order.total || 0;

      // Sumar métodos de pago
      if (order.metodoPago.toLowerCase() === 'efectivo') {
        paymentMethods.cash += order.total || 0;
      } else if (order.metodoPago.toLowerCase().includes('credito')) {
        paymentMethods.credit += order.total || 0;
      } else if (order.metodoPago.toLowerCase().includes('debito')) {
        paymentMethods.debit += order.total || 0;
      }

      // Agrupar y totalizar productos sin importar fechas
      order.productos?.forEach((product: any) => {
        const productName = product.nombreProducto;

        if (groupedItems[productName]) {
          // Sumar cantidad y total
          groupedItems[productName].quantity += product.cantidad;
          groupedItems[productName].total += product.precioProducto * product.cantidad;
        } else {
          // Inicializar si no existe aún
          groupedItems[productName] = {
            quantity: product.cantidad,
            total: product.precioProducto * product.cantidad,
          };
        }
      });
    });

    // Convertir el objeto agrupado en un arreglo ordenado por nombre
    const items = Object.entries(groupedItems)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        total: data.total,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordenar alfabéticamente

    return {
      total,
      paymentMethods,
      items, // Productos totalizados
      branch: this.ordenes[0]?.sucursal || 'N/A',
      userName: this.userName,
    };
  }





  // Mostrar el ticket en el modal (usando el iframe)
  showTicketInModal(ticketData: any, period: string): void {
    const doc = this.createTicketPDF(ticketData, period);

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const iframe = document.getElementById('ticketIframe') as HTMLIFrameElement;
    iframe.src = pdfUrl;

    const modal = new (window as any).bootstrap.Modal(document.getElementById('ticketModal')!);
    modal.show();

    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }

  // Método para crear el PDF (reutiliza la lógica existente)
  createTicketPDF(ticketData: any, period: string): any {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 200 + ticketData.items.length * 10],
    });

    const lineHeight = 5;
    let yPosition = 10;

    // Fecha y hora actuales
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    const formattedTime = currentDate.toLocaleTimeString();

    // Encabezado principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`CORTE ${period.toUpperCase()}`, 29, yPosition, { align: 'center' });
    yPosition += lineHeight;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sucursal: ${ticketData.branch?.nombre || 'N/A'}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Usuario: ${ticketData.userName}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Fecha: ${formattedDate}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Hora: ${formattedTime}`, 5, yPosition);
    yPosition += lineHeight;

    doc.line(5, yPosition, 53, yPosition); // Línea divisoria
    yPosition += lineHeight;

    // Totales del corte
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL VENDIDO: $${ticketData.total.toFixed(2)}`, 5, yPosition);
    yPosition += lineHeight;
    // NUEVA LÍNEA: TOTAL DE VENTAS
    doc.text(`TOTAL VENTAS: ${ticketData.totalSales}`, 5, yPosition);
    yPosition += lineHeight;
    const discounts = Number(ticketData.totalDiscounts || 0);
    const discountCount = Number(ticketData.discountCount || 0);
    doc.text(`DESCUENTOS 6ª: -$${discounts.toFixed(2)} (${discountCount})`, 5, yPosition);
    yPosition += lineHeight;
    if (ticketData.totalNet !== undefined) {
      doc.text(`TOTAL NETO: $${ticketData.totalNet.toFixed(2)}`, 5, yPosition);
      yPosition += lineHeight;
    }

    doc.setFont('helvetica', 'normal');
    doc.text(`EFECTIVO: $${ticketData.paymentMethods.cash.toFixed(2)}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`T. CRÉDITO: $${ticketData.paymentMethods.credit.toFixed(2)}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`T. DÉBITO: $${ticketData.paymentMethods.debit.toFixed(2)}`, 5, yPosition);
    yPosition += lineHeight;

    doc.line(5, yPosition, 53, yPosition);
    yPosition += lineHeight;

    // Detalle de productos
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PRODUCTOS:', 5, yPosition);
    yPosition += lineHeight;


    // Ordenar items por ID y mostrarlos  
    ticketData.items
      .sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
      .forEach((item: any) => {
        doc.setFont('helvetica', 'normal');
        const lineText = `${item.name}  X ${item.quantity} - $${item.total.toFixed(2)}`;
        const lines = doc.splitTextToSize(lineText, 50);
        lines.forEach((ln: string | string[]) => { doc.text(ln, 5, yPosition); yPosition += lineHeight; });
      });

    // Total General separado al final con línea divisoria
    doc.line(5, yPosition, 53, yPosition);
    yPosition += lineHeight + 2;

    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GENERAL: $${ticketData.total.toFixed(2)}`, 5, yPosition);

    return doc;
  }





  // Método para exportar los datos a CSV según el periodo seleccionado
  exportToCSV(period: string): void {
    let dataToExport: any[] = [];

    switch (period) {
      case 'today':
        dataToExport = this.ordenes.filter(order => this.isOrderFromToday(order.fecha));
        break;
      case 'yesterday':
        dataToExport = this.ordenes.filter(order => this.isOrderFromYesterday(order.fecha));
        break;
      case 'week':
        dataToExport = this.ordenes.filter(order => this.isOrderFromThisWeek(order.fecha));
        break;
      case 'month':
        dataToExport = this.ordenes.filter(order => this.isOrderFromThisMonth(order.fecha));
        break;
    }

    // Genera el nombre del archivo con el periodo y la fecha actual
    const today = new Date().toISOString().split('T')[0];  // Fecha en formato YYYY-MM-DD
    const fileName = `ventas_${period}_${today}.csv`;

    // Añadir columnas de descuentos y total neto
    const rows = dataToExport.map(order => ({
      numeroRecibo: order.numeroRecibo,
      fecha: order.fecha,
      sucursal: order.sucursal?.nombre || order.sucursal,
      placa: order.placa || '',
      cajero: order.cajero,
      estado: order.estado,
      items: (order.productos || []).map((p: any) => `${p.cantidad} X ${p.nombreProducto} - ${p.precioProducto}`).join(' | '),
      metodoPago: order.metodoPago,
      cantidadRecibida: order.cantidadRecibida || 0,
      cambio: order.cambio || 0,
      total: order.total || 0,
      huboDescuento6a: order.loyaltyApplied ? 'SI' : 'NO',
      descuentos6a: Number(order.loyaltyDiscountAmount || 0),
      totalNeto: +(Number(order.total || 0) - Number(order.loyaltyDiscountAmount || 0))
    }));

    const headers = ['numeroRecibo', 'fecha', 'sucursal', 'placa', 'cajero', 'estado', 'items', 'metodoPago', 'cantidadRecibida', 'cambio', 'total', 'huboDescuento6a', 'descuentos6a', 'totalNeto'];
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => {
      const v: any = (r as any)[h];
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v;
    }).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Función para generar y descargar el archivo CSV
  downloadCSV(data: any[], filename: string): void {
    const csvData = this.convertToCSV(data);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Convierte los datos en formato CSV con los nuevos campos y detalles de los productos
  convertToCSV(data: any[]): string {
    const salesHeaders = [
      'Recibo', 'Fecha', 'Sucursal', 'Placa', 'Cajero', 'Estado', 'Items',
      'Metodo de Pago', 'Cantidad Recibida', 'Cambio', 'Total'
    ];

    const salesRows = [salesHeaders.join(',')];

    // Sección de Ventas
    data.forEach(order => {
      const items = order.productos?.map((product: any) => {
        return `${product.cantidad || 0} X ${product.nombreProducto || ''} - ${product.precioProducto || 0}`;
      }).join(' | ') || 'No items';

      const row = [
        order.numeroRecibo,
        order.fecha,
        order.sucursal,
        order.placa,
        order.cajero,
        order.estado,
        items,
        order.metodoPago,
        order.cantidadRecibida || '',
        order.cambio || '',
        order.total || ''
      ];
      salesRows.push(row.join(','));
    });

    // Añadir una fila separadora después de las ventas
    salesRows.push('');

    // Sección Resumen
    const resumenHeader = ['Producto', 'Cantidad', 'Total'];
    salesRows.push('RESUMEN');
    salesRows.push(resumenHeader.join(','));

    const productSummary: { [key: string]: { cantidad: number, total: number } } = {};

    data.forEach(order => {
      order.productos?.forEach((product: any) => {
        if (!productSummary[product.nombreProducto]) {
          productSummary[product.nombreProducto] = { cantidad: 0, total: 0 };
        }
        productSummary[product.nombreProducto].cantidad += product.cantidad;
        productSummary[product.nombreProducto].total += product.cantidad * product.precioProducto;
      });
    });

    Object.entries(productSummary).forEach(([productName, summary]) => {
      salesRows.push(`${productName},${summary.cantidad},${summary.total}`);
    });

    // Añadir una fila separadora después del resumen
    salesRows.push('');

    // Sección de Métodos de Pago
    salesRows.push('EFECTIVO,TARJETAS');
    const efectivo = data
      .filter(order => order.metodoPago.toLowerCase() === 'efectivo')
      .reduce((acc, order) => acc + order.total, 0);
    const tarjetas = data
      .filter(order => order.metodoPago.toLowerCase().includes('tarjeta'))
      .reduce((acc, order) => acc + order.total, 0);

    salesRows.push(`${efectivo},${tarjetas}`);
    salesRows.push('');

    // Total general
    const totalGeneral = efectivo + tarjetas;
    salesRows.push(`TOTAL,,${totalGeneral}`);

    return salesRows.join('\n');
  }

  generateTicketData(order: any, plateInfo?: any): any {
    const totalItems = order.productos.reduce((sum: number, product: any) => sum + product.cantidad, 0);
    return {
      receiptNumber: order.numeroRecibo,
      branch: order.sucursal || 'Sucursal no especificada',
      userName: order.cajero,
      // Fecha y hora reales de la venta
      fechaVenta: order.fecha,
      licensePlate: order.placa || '',
      paymentMethod: order.metodoPago || 'N/A',
      cantidadRecibida: order.cantidadRecibida || 0,
      change: order.cambio || 0,
      total: order.total || 0,
      loyaltyApplied: !!order.loyaltyApplied,
      loyaltyDiscountAmount: order.loyaltyDiscountAmount || 0,
      totalVisits: plateInfo?.totalVisits || 0,
      cyclesCompleted: plateInfo?.cyclesCompleted || 0,
      nextInCycle: plateInfo?.nextInCycle || 0,
      note: order.nota || '',
      items: order.productos.map((product: any) => ({
        id: product.productoId || 0,
        name: product.nombreProducto,
        quantity: product.cantidad,
        total: product.cantidad * product.precioProducto,
      })),
      totalSales: 1, // Solo una orden
      totalItems: totalItems
    };
  }




  generateTicket(period: string | any): void {
    // Si period es un objeto de orden, generar ticket individual
    if (typeof period !== 'string') {
      const ticketData = this.generateTicketData(period);
      this.printReceipt(ticketData);
      return;
    }

    // Si period es un string, generar corte de caja
    const ticketData = this.getTicketData(period);

    const total = ticketData?.total || 0;
    const paymentMethods = ticketData?.paymentMethods || { cash: 0, credit: 0, debit: 0 };
    const items = ticketData?.items || [];
    const branch = this.ordenes.length > 0 ? this.ordenes[0].sucursal?.nombre : 'N/A';
    const totalDiscounts = Number(ticketData?.totalDiscounts || 0);
    const discountCount = Number(ticketData?.discountCount || 0);
    const totalNet = Number(ticketData?.totalNet || (total - totalDiscounts));

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 295], // Altura fija máxima (luego agregamos páginas)
    });

    const lineHeight = 4;
    let yPosition = 10;

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`CORTE FINAL ${period.toUpperCase()}`, 29, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`USUARIO: ${this.userName}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`FECHA DEL CORTE: ${new Date().toLocaleDateString()}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`HORA: ${new Date().toLocaleTimeString()}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Sucursal: ${branch}`, 5, yPosition);

    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`VENDIDO: $${total.toFixed(2)}`, 5, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`01-EFECTIVO: $${paymentMethods.cash.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`02-TARJETAS CRÉDITO: $${paymentMethods.credit.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`03-TARJETAS DÉBITO: $${paymentMethods.debit.toFixed(2)}`, 5, yPosition += lineHeight);

    // Descuentos y neto
    yPosition += 2;
    doc.setFont('helvetica', 'bold');
    doc.text(`DESCUENTOS 6ª: -$${totalDiscounts.toFixed(2)} (${discountCount})`, 5, yPosition += lineHeight);
    doc.text(`TOTAL NETO: $${totalNet.toFixed(2)}`, 5, yPosition += lineHeight);

    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PRODUCTOS:', 5, yPosition);

    yPosition += 4;
    items
      .sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
      .forEach((item: any, index: number) => {
        doc.setFont('helvetica', 'normal');
        const lineText = `${item.name} X ${item.quantity} - $${item.total.toFixed(2)}`;
        const splitLines = doc.splitTextToSize(lineText, 50);

        splitLines.forEach((line: string | string[]) => {
          if (yPosition >= 285) {
            doc.addPage([58, 295]);
            yPosition = 10;
          }
          doc.text(line, 5, yPosition);
          yPosition += lineHeight;
        });
      });

    // Línea final y totales
    if (yPosition >= 285) {
      doc.addPage([58, 295]);
      yPosition = 10;
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL VENDIDO: $${total.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`TOTAL TICKETS: ${ticketData?.totalSales || 0}`, 5, yPosition += lineHeight);
    doc.text(`TOTAL SERVICIOS: ${ticketData?.totalItems || 0}`, 5, yPosition += lineHeight);

    // Generar PDF como blob
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const iframe = document.getElementById('ticketIframe') as HTMLIFrameElement;
    iframe.src = pdfUrl;

    const modal = new (window as any).bootstrap.Modal(document.getElementById('ticketModal')!);
    modal.show();

    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }



  //Método de preparación de data para cortes de periodos establecidos today,yesterday,week y month
  getTicketData(period: string): any {
    if (this.currentSucursalId === null) {
      console.error('Sucursal actual no definida. No se pueden generar los datos del ticket.');
      return {};
    }

    // Filtrar órdenes por sucursal y período
    const data = this.ordenes.filter(order => {
      return (
        order.sucursal?.id === this.currentSucursalId &&
        (
          (period === 'today' && this.isOrderFromToday(order.fecha)) ||
          (period === 'yesterday' && this.isOrderFromYesterday(order.fecha)) ||
          (period === 'week' && this.isOrderFromThisWeek(order.fecha)) ||
          (period === 'month' && this.isOrderFromThisMonth(order.fecha))
        )
      );
    });

    // Inicializar variables para el resumen
    const paymentMethods = { cash: 0, credit: 0, debit: 0 };
    let total = 0;
    let totalItems = 0; // Nueva variable para contar el total de ítems vendidos
    let totalDiscounts = 0; // Total descuentos 6ª
    let discountCount = 0; // Conteo de ventas con descuento

    const productMap: { [key: number]: { name: string; quantity: number; total: number } } = {};

    // Inicializar el mapa con los productos
    this.productos.forEach(product => {
      productMap[product.id] = {
        name: product.nombre,
        quantity: 0,
        total: 0,
      };
    });

    // Procesar las órdenes
    data.forEach(order => {
      total += order.total || 0;

      // Sumar todos los tipos de descuentos
      let orderDiscount = 0;
      if (order.descuento6taVisitaAplicado) {
        orderDiscount += Number(order.descuento6taVisitaMonto || 0);
      }
      if (order.descuento7maVisitaAplicado) {
        orderDiscount += Number(order.descuento7maVisitaMonto || 0);
      }
      if (order.loyaltyApplied) {
        orderDiscount += Number(order.loyaltyDiscountAmount || 0);
      }

      if (orderDiscount > 0) {
        totalDiscounts += orderDiscount;
        discountCount++;
      }

      // Actualizar métodos de pago
      const metodo = (order.metodoPago || '').toLowerCase();
      if (metodo === 'efectivo') {
        paymentMethods.cash += order.total || 0;
      } else if (metodo.includes('credito') || metodo.includes('crédito')) {
        paymentMethods.credit += order.total || 0;
      } else if (metodo.includes('debito') || metodo.includes('débito') || metodo.includes('tarjeta')) {
        paymentMethods.debit += order.total || 0;
      }

      // Procesar productos vendidos
      order.productos?.forEach((product: any) => {
        const productId = product.producto?.id;
        const cantidad = product.cantidad || 0;
        const precio = product.precioProducto || 0;

        totalItems += cantidad; // Incrementar el total de ítems vendidos

        if (productMap[productId]) {
          productMap[productId].quantity += cantidad;
          productMap[productId].total += cantidad * precio;
        }
      });
    });

    // Convertir el mapa en un arreglo y ordenarlo
    const items = Object.keys(productMap).map(key => ({
      id: Number(key),
      name: productMap[Number(key)].name,
      quantity: productMap[Number(key)].quantity,
      total: productMap[Number(key)].total,
    }));

    return {
      total,
      paymentMethods,
      items: items.sort((a, b) => a.id - b.id), // Ordenar productos por ID
      totalSales: data.length,
      totalItems, // Agregar el total de ítems vendidos
      totalDiscounts,
      discountCount,
      totalNet: +(total - totalDiscounts)
    };
  }




  fetchProductos(): void {
    this.http.get<any>(`${this.apiUrl}/productos`).subscribe(
      (response: any) => {
        // Asegúrate de que el response sea un array antes de aplicar filtros
        if (Array.isArray(response)) {
          this.productos = response.filter(producto => producto.sucursal?.id === this.currentSucursalId);
          console.log('Productos cargados para la sucursal:', this.productos);
        } else {
          console.error('La respuesta de productos no es un array:', response);
        }
      },
      (error) => {
        console.error('Error al obtener los productos para la sucursal:', error);
      }
    );
  }






  // Métodos para verificar si una orden es de hoy, ayer, esta semana o este mes (usando hora local)
  isOrderFromToday(dateString: string): boolean {
    const today = this.getNowInMexico().startOf('day');
    const orderDate = this.parseOrderMomentMexico(dateString).startOf('day');
    return orderDate.isSame(today, 'day');
  }

  isOrderFromYesterday(dateString: string): boolean {
    const yesterday = this.getNowInMexico().subtract(1, 'day').startOf('day');
    const orderDate = this.parseOrderMomentMexico(dateString).startOf('day');
    return orderDate.isSame(yesterday, 'day');
  }

  isOrderFromThisWeek(dateString: string): boolean {
    const nowMexico = this.getNowInMexico();
    const startOfWeek = nowMexico.startOf('isoWeek');
    const endOfWeek = this.getNowInMexico().endOf('isoWeek');
    const orderDate = this.parseOrderMomentMexico(dateString).startOf('day');
    return orderDate.isBetween(startOfWeek, endOfWeek, 'day', '[]');
  }

  isOrderFromThisMonth(dateString: string): boolean {
    const nowMexico = this.getNowInMexico();
    const startOfMonth = nowMexico.startOf('month');
    const endOfMonth = this.getNowInMexico().endOf('month');
    const orderDate = this.parseOrderMomentMexico(dateString).startOf('day');
    return orderDate.isBetween(startOfMonth, endOfMonth, 'day', '[]');
  }




  toggleUserDropdown(event: Event) {
    event.preventDefault();
    this.showUserDropdown = !this.showUserDropdown;
  }

  timbrarFactura(): void {
    if (!this.selectedOrder || this.selectedOrder.productos.length === 0) {
      Swal.fire('Error', 'No hay productos en la orden para facturar.', 'error');
      return;
    }

    if (!this.datosFiscales.rfc || !this.datosFiscales.cp) {
      Swal.fire('Error', 'RFC y Código Postal son obligatorios para facturar.', 'warning');
      return;
    }

    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
    if (!rfcRegex.test(this.datosFiscales.rfc)) {
      Swal.fire('Error', 'El RFC del receptor no tiene un formato válido.', 'warning');
      return;
    }

    const cpRegex = /^\d{5}$/;
    if (!cpRegex.test(this.datosFiscales.cp)) {
      Swal.fire('Error', 'El Código Postal debe tener exactamente 5 dígitos.', 'warning');
      return;
    }

    // Validar timbres disponibles antes de timbrar
    if (this.currentSucursalId !== null) {
      const headers = this.buildAuthHeaders();
      this.http.get<any>(`${this.apiUrl}/timbres/disponibles/${this.currentSucursalId}`, { headers })
        .subscribe({
          next: (response) => {
            if (!response.tieneDisponibles) {
              Swal.fire({
                icon: 'warning',
                title: 'No hay timbres disponibles',
                html: `No te quedan más timbres disponibles para timbrar.<br><br>
                     <strong>Timbres disponibles:</strong> ${response.disponibles || 0}<br>
                     <strong>Timbres utilizados:</strong> ${response.utilizados || 0}<br><br>
                     Solicita a supervisión hacer una nueva recarga de timbres.`,
                confirmButtonText: 'Entendido'
              });
              return;
            }

            // Si hay timbres disponibles, continuar con el timbrado
            this.ejecutarTimbrado();
          },
          error: (error) => {
            console.error('Error al verificar timbres disponibles:', error);
            // En caso de error, permitir intentar timbrar (el backend también validará)
            this.ejecutarTimbrado();
          }
        });
    } else {
      // Si no hay sucursal ID, intentar timbrar de todas formas (el backend validará)
      this.ejecutarTimbrado();
    }
  }

  ejecutarTimbrado(): void {
    const payload = {
      ...this.generarDatosCFDIJsonSinXML(),
      email: this.datosFiscales.email || null
    };

    Swal.fire({
      title: 'Timbrando factura...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    console.log('Payload CFDI:', payload);

    // Usar endpoint asíncrono
    this.http.post<{ requestId: string, status: string }>(`${this.apiUrl}/factura/timbrar-async`, payload).subscribe({
      next: (response) => {
        const requestId = response.requestId;
        console.log('Timbrado iniciado, requestId:', requestId);

        // Iniciar polling
        this.pollTimbradoStatusOrders(requestId);
      },
      error: (error) => {
        Swal.close();
        console.error('Error al iniciar el timbrado:', error);

        // Verificar si el error es por falta de timbres
        const errorMessage = error.error?.message || error.message || '';
        if (errorMessage.includes('timbres disponibles') || errorMessage.includes('No hay timbres')) {
          Swal.fire({
            icon: 'warning',
            title: 'No hay timbres disponibles',
            html: `No te quedan más timbres disponibles para timbrar.<br><br>
                 Solicita a supervisión hacer una nueva recarga de timbres.`,
            confirmButtonText: 'Entendido'
          });
        } else {
          Swal.fire('Error', 'No se pudo iniciar el proceso de timbrado.', 'error');
        }
      }
    });
  }

  private pollTimbradoStatusOrders(requestId: string): void {
    const maxAttempts = 40; // 40 intentos * 3 segundos = 2 minutos máximo
    let attempts = 0;

    const interval = setInterval(() => {
      attempts++;

      this.http.get(`${this.apiUrl}/factura/status/${requestId}`, {
        observe: 'response',
        responseType: 'blob'
      }).subscribe({
        next: (response: any) => {
          const contentType = response.headers.get('content-type');

          if (response.status === 200 && contentType?.includes('application/octet-stream')) {
            // Factura completada, es un blob (ZIP)
            clearInterval(interval);
            Swal.close();

            const blob = response.body;
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `factura-${this.selectedOrder.numeroRecibo}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);

            let mensaje = 'Factura timbrada correctamente.';
            if (this.datosFiscales.email) {
              mensaje += ' También fue enviada al correo electrónico proporcionado.';
            }

            // Actualizar el estado de facturación en la base de datos
            this.http.post(`${this.apiUrl}/ordenes-compra/${this.selectedOrder.numeroRecibo}/facturada`, { facturada: true }).subscribe({
              next: () => {
                console.log('Estado de facturación actualizado a true en la base de datos para la orden:', this.selectedOrder.numeroRecibo);
              },
              error: (error) => {
                console.error('Error al actualizar el estado de facturación para la orden:', this.selectedOrder.numeroRecibo, error);
              }
            });

            this.datosFiscales = {
              rfc: '',
              nombre: '',
              cp: '',
              regimenFiscal: '612',
              usoCfdi: 'G03',
              email: ''
            };

            const facturaModal = document.getElementById('facturaModal');
            if (facturaModal) {
              const modal = bootstrap.Modal.getInstance(facturaModal);
              if (modal) {
                modal.hide();
              }
            }

            Swal.fire('¡Éxito!', mensaje, 'success');

            this.selectedOrder.facturada = true;
            this.ordenes = this.ordenes.map(order =>
              order.id === this.selectedOrder.id ? { ...order, facturada: true } : order
            );
            this.paginateOrders();

            // Actualizar contador de timbres utilizados
            this.cargarTimbresUtilizados();

          } else if (contentType?.includes('application/json')) {
            // Es JSON, parsear para obtener el estado
            response.body.text().then((text: string) => {
              const jsonResponse = JSON.parse(text);

              if (jsonResponse.status === 'processing') {
                // Sigue procesando
                console.log('Timbrado en proceso... intento', attempts);

              } else if (jsonResponse.status === 'error') {
                // Error en el timbrado
                clearInterval(interval);
                Swal.close();
                console.error('Error en el timbrado:', jsonResponse.message);

                // Verificar si el error es por falta de timbres
                const errorMessage = jsonResponse.message || '';
                if (errorMessage.includes('timbres disponibles') || errorMessage.includes('No hay timbres')) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'No hay timbres disponibles',
                    html: `No te quedan más timbres disponibles para timbrar.<br><br>
                         Solicita a supervisión hacer una nueva recarga de timbres.`,
                    confirmButtonText: 'Entendido'
                  });
                } else {
                  Swal.fire('Error', 'Ocurrió un error al timbrar: ' + errorMessage, 'error');
                }
              }
            });
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            Swal.close();
            Swal.fire('Timeout', 'El timbrado está tomando más tiempo del esperado. Intente nuevamente.', 'warning');
          }
        },
        error: (error) => {
          clearInterval(interval);
          Swal.close();
          console.error('Error al consultar estado del timbrado:', error);
          Swal.fire('Error', 'Error al verificar el estado del timbrado.', 'error');
        }
      });
    }, 3000); // Consultar cada 3 segundos
  }

  generarDatosCFDIJsonSinXML() {
    if (!this.selectedOrder || this.selectedOrder.productos.length === 0) {
      return null;
    }

    // Generar la fecha en zona horaria de México (igual que POS)
    const fechaMexico = new Date().toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' }).replace(' ', 'T');

    let totalImpuestos = 0;
    const conceptos = this.selectedOrder.productos.map((item: any) => {
      // Calcular el precio base (sin IVA)
      const precioBase = +(item.precioProducto / 1.16).toFixed(2);
      const importeBase = +(precioBase * item.cantidad).toFixed(2);
      const traslado = +(importeBase * 0.16).toFixed(2);
      totalImpuestos += traslado;

      return {
        ClaveProdServ: '01010101',
        NoIdentificacion: item.productoId ? item.productoId.toString() : (item.id ? item.id.toString() : ''), // Usar el ID real
        Cantidad: item.cantidad,
        ClaveUnidad: 'ACT',
        Unidad: 'Servicio',
        Descripcion: item.nombreProducto,
        ValorUnitario: precioBase,
        Importe: importeBase,
        Descuento: 0.00,
        ObjetoImp: '02',
        Impuestos: {
          Traslados: [
            {
              Base: importeBase,
              Impuesto: '002',
              TipoFactor: 'Tasa',
              TasaOCuota: 0.160000,
              Importe: traslado
            }
          ]
        }
      };
    });

    const subtotal = +conceptos.reduce((sum: number, concepto: any) => sum + concepto.Importe, 0).toFixed(2);
    totalImpuestos = +totalImpuestos.toFixed(2);
    const total = +(subtotal + totalImpuestos).toFixed(2);

    const sucursalId = this.authService.getSucursalId();

    return {
      SucursalId: sucursalId,
      Version: '4.0',
      Serie: 'A',
      Folio: this.selectedOrder.numeroRecibo,
      Fecha: fechaMexico, // Usar hora local de México
      FormaPago: this.getFormaPagoCFDI(),
      SubTotal: subtotal,
      Descuento: 0.00,
      Moneda: 'MXN',
      TipoCambio: 1,
      Total: total,
      TipoDeComprobante: 'I',
      Exportacion: '01',
      MetodoPago: 'PUE',
      LugarExpedicion: '52105',
      NoCertificado: '00001000000718090003',
      // ✅ EMISOR - ESTRUCTURA PLANA (igual que POS)
      EmisorRfc: 'ARL210713UK5',
      EmisorNombre: 'AUTOLAVADO RL', // Nombre correcto
      EmisorRegimenFiscal: '601',
      // ✅ RECEPTOR - ESTRUCTURA PLANA
      ReceptorRfc: this.datosFiscales.rfc,
      ReceptorNombre: this.datosFiscales.nombre,
      ReceptorDomicilioFiscal: this.datosFiscales.cp,
      ReceptorRegimenFiscal: this.datosFiscales.regimenFiscal,
      ReceptorUsoCFDI: this.datosFiscales.usoCfdi,
      Conceptos: conceptos,
      TotalImpuestosTrasladados: totalImpuestos,
      email: this.datosFiscales.email || null
    };
  }

  getFormaPagoCFDI(): string {
    switch (this.selectedOrder.metodoPago) {
      case 'Efectivo':
        return '01';
      case 'tarjetaCredito':
        return '04';
      case 'tarjetaDebito':
        return '28';
      default:
        return '01'; // Por defecto efectivo
    }
  }

  facturarOrden(orden: any): void {
    if (!orden || orden.productos.length === 0) {
      Swal.fire('Error', 'No hay productos en la orden para facturar.', 'error');
      return;
    }

    // Validar timbres disponibles antes de abrir el modal
    if (this.currentSucursalId !== null) {
      const headers = this.buildAuthHeaders();
      this.http.get<any>(`${this.apiUrl}/timbres/disponibles/${this.currentSucursalId}`, { headers })
        .subscribe({
          next: (response) => {
            if (!response.tieneDisponibles) {
              Swal.fire({
                icon: 'warning',
                title: 'No hay timbres disponibles',
                html: `No te quedan más timbres disponibles para timbrar.<br><br>
                       <strong>Timbres disponibles:</strong> ${response.disponibles || 0}<br>
                       <strong>Timbres utilizados:</strong> ${response.utilizados || 0}<br><br>
                       Solicita a supervisión hacer una nueva recarga de timbres.`,
                confirmButtonText: 'Entendido'
              });
              return;
            }

            // Si hay timbres disponibles, abrir el modal
            this.selectedOrder = orden;
            const facturaModal = document.getElementById('facturaModal');
            if (facturaModal) {
              const modal = new bootstrap.Modal(facturaModal);
              modal.show();
              // Limpiar al cerrar
              facturaModal.addEventListener('hidden.bs.modal', () => {
                this.resetFacturaForm();
              }, { once: true });
            }
          },
          error: (error) => {
            console.error('Error al verificar timbres disponibles:', error);
            // En caso de error, abrir el modal de todas formas (el backend también validará)
            this.selectedOrder = orden;
            const facturaModal = document.getElementById('facturaModal');
            if (facturaModal) {
              const modal = new bootstrap.Modal(facturaModal);
              modal.show();
              facturaModal.addEventListener('hidden.bs.modal', () => {
                this.resetFacturaForm();
              }, { once: true });
            }
          }
        });
    } else {
      // Si no hay sucursal ID, abrir el modal de todas formas
      this.selectedOrder = orden;
      const facturaModal = document.getElementById('facturaModal');
      if (facturaModal) {
        const modal = new bootstrap.Modal(facturaModal);
        modal.show();
        facturaModal.addEventListener('hidden.bs.modal', () => {
          this.resetFacturaForm();
        }, { once: true });
      }
    }
  }

  resetFacturaForm(): void {
    this.datosFiscales = {
      rfc: '',
      nombre: '',
      cp: '',
      regimenFiscal: '612',
      usoCfdi: 'G03',
      email: ''
    };
    this.customerQuery = '';
    this.customerInv = null;
  }

  cargarResumenMes(): void {
    const useGlobalDataset = this.globalInvoiceSucursalIds.length > 0;

    if (!this.selectedMonth) {
      if (useGlobalDataset && !this.globalInvoiceOrdersLoaded) {
        this.refreshGlobalInvoiceOrders(() => this.cargarResumenMes());
        return;
      }

      const sourceOrders = this.getOrdersForGlobalInvoice();
      this.resumenMes = this.calcularResumenOrdenesActuales({
        orders: sourceOrders,
        useGlobal: useGlobalDataset,
      });
      console.log('Resumen de órdenes actuales calculado (global):', this.resumenMes);
      if (this.resumenMes) {
        this.montoAFacturar = +(this.resumenMes.totalDisponible || 0);
      }
      return;
    }

    if (useGlobalDataset) {
      const periodKey = `${this.anioActual}-${this.selectedMonth}`;
      const cache = this.globalInvoicePeriodCache[periodKey];

      if (!cache?.loaded) {
        this.ensureGlobalOrdersForPeriod(this.selectedMonth, this.anioActual, () => this.cargarResumenMes());
        return;
      }

      const dataset = cache.orders;
      this.resumenMes = this.calcularResumenMesLocal(this.selectedMonth, this.anioActual, {
        orders: dataset,
        useGlobal: true,
      });
      console.log('Resumen del mes calculado (global, cache):', this.resumenMes);
      if (this.resumenMes) {
        this.montoAFacturar = +(this.resumenMes.totalDisponible || 0);
      }
      return;
    }

    this.resumenMes = this.calcularResumenMesLocal(this.selectedMonth, this.anioActual, {
      orders: this.ordenes,
      useGlobal: false,
    });
    console.log('Resumen del mes calculado (local):', this.resumenMes);
    if (this.resumenMes) {
      this.montoAFacturar = +(this.resumenMes.totalDisponible || 0);
    }
  }


  calcularResumenMesLocal(
    mes: string,
    anio: number,
    options?: { orders?: any[]; useGlobal?: boolean }
  ): any {
    const dataset = options?.orders ?? this.ordenes;
    const useGlobal = options?.useGlobal ?? false;

    const ordenesMes = dataset.filter(order => {
      const orderDate = this.parseOrderDateLocal(order.fecha);
      const mesOrden = (orderDate.getMonth() + 1).toString().padStart(2, '0');
      const anioOrden = orderDate.getFullYear();
      const sucursalValida = useGlobal
        ? this.isSucursalAllowedForGlobal(order.sucursal?.id)
        : order.sucursal?.id === this.currentSucursalId;
      const noFacturada = !order.facturada;
      return (
        mesOrden === mes &&
        anioOrden === anio &&
        sucursalValida &&
        noFacturada
      );
    });

    // Calcular totales
    const totalVendido = ordenesMes.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalFacturado = (options?.orders ?? this.ordenes)
      .filter(order => {
        const orderDate = this.parseOrderDateLocal(order.fecha);
        const mesOrden = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        const anioOrden = orderDate.getFullYear();
        const sucursalValida = useGlobal
          ? this.isSucursalAllowedForGlobal(order.sucursal?.id)
          : order.sucursal?.id === this.currentSucursalId;
        return mesOrden === mes && anioOrden === anio && sucursalValida && order.facturada;
      })
      .reduce((sum, order) => sum + (order.total || 0), 0);

    const totalNoFacturado = totalVendido; // Ya filtramos por !facturada

    const descuentos6a = ordenesMes.reduce((sum, order) => sum + Number(order.loyaltyDiscountAmount || 0), 0);
    const descuentos6aCount = ordenesMes.reduce((cnt, order) => cnt + (Number(order.loyaltyDiscountAmount || 0) > 0 ? 1 : 0), 0);
    const totalNeto = +(totalVendido - descuentos6a);
    const totalDisponible = Math.max(+(totalNeto), 0);

    console.log('Órdenes del mes encontradas:', ordenesMes.length);
    console.log('Total vendido:', totalVendido);
    console.log('Total facturado:', totalFacturado);
    console.log('Total no facturado:', totalNoFacturado);

    return {
      totalVendido,
      totalFacturado,
      totalNoFacturado,
      descuentos6a,
      descuentos6aCount,
      totalNeto,
      totalDisponible,
      cantidadOrdenes: ordenesMes.length,
      cantidadFacturadas: ordenesMes.filter(order => order.facturada).length,
      cantidadNoFacturadas: ordenesMes.filter(order => !order.facturada).length
    };
  }

  calcularResumenOrdenesActuales(options?: { orders?: any[]; useGlobal?: boolean }): any {
    const dataset = options?.orders ?? this.ordenes;
    const useGlobal = options?.useGlobal ?? false;

    const ordenesActuales = dataset.filter(order =>
      useGlobal
        ? this.isSucursalAllowedForGlobal(order.sucursal?.id) && !order.facturada
        : order.sucursal?.id === this.currentSucursalId && !order.facturada
    );

    // Calcular totales
    const totalVendido = ordenesActuales.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalFacturado = (options?.orders ?? this.ordenes)
      .filter(order => {
        const sucursalValida = useGlobal
          ? this.isSucursalAllowedForGlobal(order.sucursal?.id)
          : order.sucursal?.id === this.currentSucursalId;
        return sucursalValida && order.facturada;
      })
      .reduce((sum, order) => sum + (order.total || 0), 0);

    const totalNoFacturado = totalVendido; // se filtró !facturada

    const descuentos6a = ordenesActuales.reduce((sum, order) => sum + Number(order.loyaltyDiscountAmount || 0), 0);
    const descuentos6aCount = ordenesActuales.reduce((cnt, order) => cnt + (Number(order.loyaltyDiscountAmount || 0) > 0 ? 1 : 0), 0);
    const totalNeto = +(totalVendido - descuentos6a);
    const totalDisponible = Math.max(+(totalNeto), 0);

    console.log('Órdenes actuales procesadas:', ordenesActuales.length);
    console.log('Total vendido actual:', totalVendido);
    console.log('Total facturado actual:', totalFacturado);
    console.log('Total no facturado actual:', totalNoFacturado);

    return {
      totalVendido,
      totalFacturado,
      totalNoFacturado,
      descuentos6a,
      descuentos6aCount,
      totalNeto,
      totalDisponible,
      cantidadOrdenes: ordenesActuales.length,
      cantidadFacturadas: ordenesActuales.filter(order => order.facturada).length,
      cantidadNoFacturadas: ordenesActuales.filter(order => !order.facturada).length
    };
  }

  actualizarTotalSeleccionado(): void {
    this.totalSeleccionado = this.ventasSeleccionadas
      .filter(venta => !venta.excluir)
      .reduce((sum, venta) => sum + venta.total, 0);
  }

  // Algoritmo greedy optimizado para seleccionar ventas que se acerquen al monto objetivo
  findBestSalesSubset(ventas: any[], montoObjetivo: number): any[] {
    if (ventas.length === 0) return [];

    console.log(`Iniciando selección de ventas. Total ventas: ${ventas.length}, Monto objetivo: ${montoObjetivo}`);

    // Ordenar ventas por total (de mayor a menor) para algoritmo greedy
    const ventasOrdenadas = [...ventas].sort((a, b) => b.total - a.total);

    // Algoritmo greedy: seleccionar ventas que mejor se ajusten al monto objetivo
    const ventasSeleccionadas: any[] = [];
    let totalAcumulado = 0;

    // Primera pasada: intentar con ventas grandes
    for (const venta of ventasOrdenadas) {
      if (totalAcumulado + venta.total <= montoObjetivo) {
        ventasSeleccionadas.push(venta);
        totalAcumulado += venta.total;

        // Si estamos muy cerca del objetivo, parar
        if (totalAcumulado >= montoObjetivo * 0.95) {
          break;
        }
      }
    }

    // Segunda pasada: llenar con ventas más pequeñas si es necesario
    if (totalAcumulado < montoObjetivo * 0.90) {
      const ventasRestantes = ventasOrdenadas.filter(v => !ventasSeleccionadas.includes(v));
      const ventasPequenas = ventasRestantes.sort((a, b) => a.total - b.total);

      for (const venta of ventasPequenas) {
        if (totalAcumulado + venta.total <= montoObjetivo) {
          ventasSeleccionadas.push(venta);
          totalAcumulado += venta.total;

          if (totalAcumulado >= montoObjetivo * 0.95) {
            break;
          }
        }
      }
    }

    console.log(`Ventas seleccionadas: ${ventasSeleccionadas.length}, Total: ${totalAcumulado}, Objetivo: ${montoObjetivo}`);
    return ventasSeleccionadas;
  }

  seleccionarVentas(): void {
    if (this.montoAFacturar <= 0) {
      Swal.fire('Error', 'Por favor ingresa un monto válido.', 'error');
      return;
    }

    // Determinar el período a usar basado en el contexto actual
    let periodoInfo = '';
    if (this.selectedMonth) {
      // Si hay un mes seleccionado en el modal de factura global, usar ese
      periodoInfo = `mes seleccionado: ${this.selectedMonth}/${this.anioActual}`;
    } else if (this.isHistoricalView) {
      // Si estamos en vista histórica, usar el período histórico
      periodoInfo = `histórico: ${this.selectedHistoricalMonth}/${this.selectedHistoricalYear}`;
    } else {
      // Si estamos en vista normal, usar todas las órdenes cargadas (mes actual)
      periodoInfo = 'mes actual';
    }

    console.log('Seleccionando ventas para:', periodoInfo);
    console.log('Total órdenes disponibles:', this.ordenes.length);

    // Filtrar SOLO por ventas no facturadas de la sucursal actual
    // Las órdenes ya están filtradas por el período correcto según la vista actual
    const sourceOrders = this.getOrdersForGlobalInvoice();

    const ventasNoFacturadas = sourceOrders.filter(order => {
      // Excluir por defecto ventas con descuento de 6ª visita
      const excludeLoyalty = !!order.loyaltyApplied;
      const cumpleFiltro = !order.facturada && this.isSucursalAllowedForGlobal(order.sucursal?.id) && !excludeLoyalty;

      if (cumpleFiltro) {
        console.log('Venta válida encontrada:', {
          id: order.id,
          numeroRecibo: order.numeroRecibo,
          fecha: order.fecha,
          total: order.total,
          facturada: order.facturada,
          sucursal: order.sucursal?.nombre
        });
      }

      return cumpleFiltro;
    });

    // Si hay un mes específico seleccionado en el modal, aplicar filtro adicional
    if (this.selectedMonth) {
      const mesSeleccionado = this.selectedMonth;
      const anioSeleccionado = this.anioActual;

      const ventasFiltradas = ventasNoFacturadas.filter(order => {
        const orderDate = this.parseOrderDateLocal(order.fecha);
        const mes = (orderDate.getMonth() + 1).toString().padStart(2, '0');
        const anio = orderDate.getFullYear();
        return mes === mesSeleccionado && anio === anioSeleccionado;
      });

      console.log(`Filtro adicional aplicado para ${mesSeleccionado}/${anioSeleccionado}:`, ventasFiltradas.length, 'de', ventasNoFacturadas.length);
      ventasNoFacturadas.splice(0, ventasNoFacturadas.length, ...ventasFiltradas);
    }

    console.log('Ventas no facturadas encontradas:', ventasNoFacturadas.length);

    if (ventasNoFacturadas.length === 0) {
      Swal.fire('Información', 'No se encontraron ventas no facturadas para el mes seleccionado.', 'info');
      return;
    }

    // Mostrar loading para grandes cantidades de ventas
    if (ventasNoFacturadas.length > 1000) {
      Swal.fire({
        title: 'Procesando ventas...',
        text: `Analizando ${ventasNoFacturadas.length} ventas para encontrar la mejor combinación`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }

    // Usar setTimeout para no bloquear la UI
    setTimeout(() => {
      try {
        // Buscar la mejor combinación de ventas
        const subconjunto = this.findBestSalesSubset(ventasNoFacturadas, this.montoAFacturar);

        if (subconjunto.length === 0) {
          Swal.fire('Información', 'No se encontraron ventas que sumen el monto solicitado.', 'info');
          return;
        }

        this.ventasSeleccionadas = subconjunto.map(venta => ({ ...venta, excluir: false }));
        this.totalSeleccionado = this.ventasSeleccionadas.reduce((sum, venta) => sum + venta.total, 0);

        console.log('Ventas seleccionadas:', this.ventasSeleccionadas);
        console.log('Total seleccionado:', this.totalSeleccionado);

        Swal.fire('Éxito', `Se seleccionaron ${this.ventasSeleccionadas.length} ventas por un total de $${this.totalSeleccionado.toFixed(2)}`, 'success');
      } catch (error) {
        console.error('Error al seleccionar ventas:', error);
        Swal.fire('Error', 'Ocurrió un error al procesar las ventas. Intenta con un monto menor.', 'error');
      }
    }, 100);
  }

  generarDatosCFDIGlobalJson() {
    // Solo considerar ventas seleccionadas y no excluidas
    const ventasAIncluir = this.ventasSeleccionadas.filter(venta => !venta.excluir);
    if (ventasAIncluir.length === 0) {
      return null;
    }

    // Consolidar productos por ID (sumar cantidades e importes de productos iguales)
    const conceptosMap: { [key: string]: any } = {};
    ventasAIncluir.forEach(venta => {
      venta.productos.forEach((item: any) => {
        const key = item.productoId ? item.productoId.toString() : (item.id ? item.id.toString() : '');
        if (!conceptosMap[key]) {
          // Nuevo producto
          const precioBase = +(item.precioProducto / 1.16).toFixed(2);
          const importeBase = +(precioBase * item.cantidad).toFixed(2);
          conceptosMap[key] = {
            ClaveProdServ: '01010101',
            NoIdentificacion: key,
            Cantidad: item.cantidad,
            ClaveUnidad: 'ACT',
            Unidad: 'Servicio',
            Descripcion: item.nombreProducto,
            ValorUnitario: precioBase,
            Importe: importeBase,
            Descuento: 0.00,
            ObjetoImp: '02',
            // En global, NO se incluyen impuestos en el concepto
          };
        } else {
          // Sumar cantidades e importes
          conceptosMap[key].Cantidad += item.cantidad;
          const precioBase = +(item.precioProducto / 1.16).toFixed(2);
          conceptosMap[key].Importe = +(conceptosMap[key].Importe + (precioBase * item.cantidad)).toFixed(2);
        }
      });
    });

    const conceptos = Object.values(conceptosMap);
    const subtotal = +conceptos.reduce((sum: number, concepto: any) => sum + concepto.Importe, 0).toFixed(2);
    const totalImpuestos = +(subtotal * 0.16).toFixed(2);
    const total = +(subtotal + totalImpuestos).toFixed(2);

    // Fecha en zona horaria de México
    const fechaMexico = new Date().toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' }).replace(' ', 'T');

    // Obtener mes y año de la primera venta seleccionada
    const primerVenta = ventasAIncluir[0];
    const fechaVenta = this.parseOrderDateLocal(primerVenta.fecha);
    const mes = (fechaVenta.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaVenta.getFullYear().toString();

    return {
      Version: '4.0',
      Serie: 'A',
      Folio: `GLOBAL-${Date.now()}`,
      Fecha: fechaMexico,
      FormaPago: this.selectedFormaPago,
      MetodoPago: 'PUE',
      SubTotal: subtotal,
      Descuento: 0.00,
      Moneda: 'MXN',
      TipoCambio: 1,
      Total: total,
      TipoDeComprobante: 'I',
      Exportacion: '01',
      LugarExpedicion: '52105',
      NoCertificado: '00001000000718090003',
      // Emisor (fijo)
      EmisorRfc: 'ARL210713UK5',
      EmisorNombre: 'AUTOLAVADO RL',
      EmisorRegimenFiscal: '601',
      // Receptor público en general
      ReceptorRfc: 'XAXX010101000',
      ReceptorNombre: 'PUBLICO EN GENERAL',
      ReceptorDomicilioFiscal: '52105',
      ReceptorRegimenFiscal: '616',
      ReceptorUsoCFDI: 'S01',
      // Información global
      Periodicidad: '04',
      Meses: mes,
      Año: anio,
      Conceptos: conceptos,
      TotalImpuestosTrasladados: totalImpuestos,
      email: this.datosFiscales.email || null
    };
  }

  generarFacturaGlobal(): void {
    const ventasAIncluir = this.ventasSeleccionadas.filter(venta => !venta.excluir);
    const payload = {
      ...this.generarDatosCFDIGlobalJson(),
      ventas: ventasAIncluir.map(venta => venta.id),
      monto: this.montoAFacturar,
      email: this.datosFiscales.email || null,
      // Datos fijos del receptor global
      rfc: 'XAXX010101000',
      nombre: 'PUBLICO EN GENERAL',
      cp: '52105', // Cambia aquí si el CP puede variar
      usoCfdi: 'S01',
      regimenFiscal: '616',
      formaPago: this.selectedFormaPago
    };
    if (!payload.ventas || payload.ventas.length === 0) {
      Swal.fire('Error', 'No hay ventas seleccionadas para facturar.', 'error');
      return;
    }

    Swal.fire({
      title: 'Generando Factura Global...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.facturacionService.generarCFDIGlobal(payload).subscribe({
      next: (response: any) => {
        Swal.close();
        this.descargarFactura(response);
      },
      error: (error: any) => {
        Swal.close();
        Swal.fire('Error', error.error?.message || 'Error al generar la factura global', 'error');
      }
    });
  }

  descargarFactura(responseBlob: Blob): void {
    const blob = new Blob([responseBlob], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-global.zip`;
    a.click();
    window.URL.revokeObjectURL(url);

    // Actualizar el estado de facturación para todas las ventas incluidas
    const ventasAActualizar = this.ventasSeleccionadas.filter(venta => !venta.excluir);
    console.log('Ventas a actualizar:', ventasAActualizar.map(v => ({ id: v.id, numeroRecibo: v.numeroRecibo })));

    const promesasActualizacion = ventasAActualizar.map(venta =>
      this.http.post(`${this.apiUrl}/ordenes-compra/${venta.numeroRecibo}/facturada`, { facturada: true }).toPromise()
        .then(response => {
          console.log(`✅ Orden ${venta.numeroRecibo} actualizada correctamente:`, response);
          return { venta, success: true, error: null };
        })
        .catch(error => {
          console.error(`❌ Error al actualizar orden ${venta.numeroRecibo}:`, error);
          console.error('Detalles del error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });

          // Verificar si es un error de red temporal (status 0) o un 200/201 mal interpretado
          if (error.status === 0 || error.status === 200 || error.status === 201) {
            console.log(`⚠️  Posible falso error para orden ${venta.numeroRecibo} - considerando como exitoso`);
            return { venta, success: true, error: 'false_error' };
          }

          return { venta, success: false, error: error };
        })
    );

    // Esperar a que todas las actualizaciones se completen
    Promise.all(promesasActualizacion)
      .then((resultados) => {
        const exitosos = resultados.filter(r => r.success).length;
        const fallidos = resultados.filter(r => !r.success).length;
        const falsosErrores = resultados.filter(r => r.success && r.error === 'false_error').length;

        console.log(`Actualizaciones completadas: ${exitosos} exitosas, ${fallidos} fallidas, ${falsosErrores} falsos errores`);
        console.log('Detalles de resultados:', resultados);

        // Si todos fueron exitosos (incluyendo falsos errores)
        if (fallidos === 0) {
          if (falsosErrores > 0) {
            console.log('Todas las actualizaciones fueron exitosas (algunas con falsos errores de red)');
          }
          Swal.fire('¡Éxito!', 'Factura Global generada correctamente y todas las órdenes actualizadas.', 'success');
        } else {
          // Solo mostrar advertencia si hay errores reales
          const erroresReales = resultados.filter(r => !r.success);
          console.error('Errores reales encontrados:', erroresReales);
          Swal.fire('Advertencia', `Factura Global generada correctamente. ${exitosos} órdenes actualizadas, ${fallidos} tuvieron problemas reales.`, 'warning');
        }

        // Limpiar selección y recargar órdenes
        this.limpiarModalFacturaGlobal();
        this.cargarOrdenes();

        // Actualizar contador de timbres utilizados
        this.cargarTimbresUtilizados();
      })
      .catch(error => {
        console.error('Error general en las actualizaciones:', error);
        Swal.fire('Advertencia', 'La factura se generó correctamente, pero hubo un problema al actualizar el estado de las órdenes.', 'warning');

        // Aún así recargar las órdenes para reflejar cualquier cambio
        this.cargarOrdenes();

        // Actualizar contador de timbres utilizados
        this.cargarTimbresUtilizados();
      });
  }

  limpiarModalFacturaGlobal(): void {
    this.ventasSeleccionadas = [];
    this.totalSeleccionado = 0;
    this.montoAFacturar = 0;
    this.selectedMonth = '';
    this.resumenMes = null;
    this.datosFiscales.email = '';
    console.log('Modal de factura global limpiado');
  }

}
