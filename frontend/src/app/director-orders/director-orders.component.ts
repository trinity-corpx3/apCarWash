import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Router, RouterModule } from '@angular/router';
import moment from 'moment';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
declare const bootstrap: any;

interface Sale {
  id: number;
  fecha: string;
  total: number;
  estado: string;
  totalItems: number;
  metodoPago: string;
  productos?: Array<{
    nombreProducto: string;
    cantidad: number;
    precioProducto: number;
  }>;
  sucursal?: {
    id: number;
    nombre: string;
  };
}

interface CutSummary {
  periodText: string;
  generationDate: string;
  totalSales: number;
  totalAmount: number;
  sales: Sale[];
}

@Component({
  selector: 'app-director-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    RouterModule
  ],
  templateUrl: './director-orders.component.html',
  styleUrls: ['./director-orders.component.css']
})
export class DirectorOrdersComponent implements OnInit {
  activeTab: string = 'orders';
  orders: any[] = [];
  products: any[] = [];
  users: any[] = [];
  sucursales: any[] = [];
  selectedSucursal: number | null = null;
  filteredOrders: any[] = [];
  filteredProducts: any[] = [];
  filteredUsers: any[] = [];
  isLoading: boolean = true;

  todaySalesCount: number = 0;
  todaySalesAmount: number = 0;
  yesterdaySalesCount: number = 0;
  yesterdaySalesAmount: number = 0;
  weekSalesCount: number = 0;
  weekSalesAmount: number = 0;
  monthSalesCount: number = 0;
  monthSalesAmount: number = 0;
  selectedOrder: any = {
    productos: []
  };
  productos: any[] = [];
  userName: string = '';
  userEmail: string = '';
  userRole: string = '';
currentPage: number = 1;
recordsPerPage: number = 10;
totalPages: number = 1;
paginatedOrders: any[] = [];
  customStartDate: string = '';
  customEndDate: string = '';
  @ViewChild('cutModal') cutModal!: ElementRef;
  currentCut: CutSummary = {
    periodText: '',
    generationDate: '',
    totalSales: 0,
    totalAmount: 0,
    sales: []
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getCurrentUser();
    if (userData) {
        this.userName = userData.nombreCompleto || 'Usuario no identificado';
        this.userEmail = userData.email || 'Correo no disponible';
        this.userRole = typeof userData.rol === 'string' ? userData.rol : (userData.rol?.nombre || 'Rol no asignado');

      // Guardar la sucursal del usuario si existe
      if (userData.sucursal?.id) {
        this.selectedSucursal = userData.sucursal.id;
      }
    }

    // Cargar las sucursales inmediatamente
    this.fetchSucursales();
  }

  fetchSucursales(): void {
    this.http.get<any[]>(`${environment.apiUrl}/sucursales`).subscribe({
      next: (data) => {
        console.log('Sucursales cargadas:', data);
        this.sucursales = data;
        
        // Si no hay sucursal seleccionada o la seleccionada no existe en la lista
        if (!this.selectedSucursal || !data.some(s => s.id === Number(this.selectedSucursal))) {
          const userData = this.authService.getCurrentUser();
          // Intentar usar la sucursal del usuario primero
          if (userData?.sucursal?.id && data.some(s => s.id === Number(userData.sucursal.id))) {
            console.log('Usando sucursal del usuario:', userData.sucursal);
            this.selectedSucursal = Number(userData.sucursal.id);
          } else if (data.length > 0) {
            // Si no hay sucursal del usuario, usar la primera disponible
            console.log('Usando primera sucursal disponible:', data[0]);
            this.selectedSucursal = Number(data[0].id);
          }
        } else {
          // Asegurar que selectedSucursal sea número incluso si ya existe
          this.selectedSucursal = Number(this.selectedSucursal);
        }

        console.log('Sucursal seleccionada:', this.selectedSucursal);
        if (this.selectedSucursal) {
          this.updateDataForSucursal();
        }
      },
      error: (error) => {
        console.error('Error al obtener sucursales:', error);
      }
    });
  }

  updateDataForSucursal(): void {
    if (!this.selectedSucursal) return;
    
    // Asegurar que selectedSucursal sea número
    this.selectedSucursal = Number(this.selectedSucursal);
    console.log('🔄 Cambiando a sucursal:', this.selectedSucursal);

    this.fetchOrders(() => {
        this.filterDataBySucursal();
    });
}

  fetchOrders(callback?: () => void): void {
    this.isLoading = true;

    const sucursalId = Number(this.selectedSucursal);
    if (!sucursalId) { this.isLoading = false; return; }

    this.http.get<any[]>(`${environment.apiUrl}/ordenes-compra/por-sucursal`, {
      params: { sucursalId: String(sucursalId) },
      headers: new HttpHeaders({ Authorization: 'Basic ' + btoa('uniqueAdmin:admin123') })
    }).subscribe(
      data => {
        this.orders = (data || []).map(order => ({
          ...order,
          totalItems: order.productos?.reduce((sum: number, product: any) => sum + (product.cantidad || 0), 0) || 0,
        }));

        console.log('📌 Órdenes por sucursal obtenidas:', this.orders?.length || 0);

        if (callback) callback();
        this.isLoading = false;
      },
      error => {
        console.error('❌ Error al obtener órdenes por sucursal:', error);
        this.isLoading = false;
      }
    );
  }

  filterDataBySucursal(): void {
    if (!this.selectedSucursal) return;
  
    this.filteredOrders = this.orders
      .filter(order => order.sucursal?.id == this.selectedSucursal)
      .sort((a, b) => moment(b.fecha).valueOf() - moment(a.fecha).valueOf());
  
    console.log('📌 Órdenes filtradas y ordenadas por fecha:', this.selectedSucursal, this.filteredOrders);
  
    this.calculateSalesSummary();
    this.updatePagination();
  }

calculateSalesSummary(): void {
  const today = moment().startOf('day');
  const yesterday = moment().subtract(1, 'day').startOf('day');
  const startOfWeek = moment().startOf('isoWeek');
  const startOfMonth = moment().startOf('month');

  this.todaySalesCount = 0;
  this.todaySalesAmount = 0;
  this.yesterdaySalesCount = 0;
  this.yesterdaySalesAmount = 0;
  this.weekSalesCount = 0;
  this.weekSalesAmount = 0;
  this.monthSalesCount = 0;
  this.monthSalesAmount = 0;

  this.filteredOrders.forEach(order => {
      const orderDate = moment(order.fecha);
      const orderTotal = order.total || 0;

      if (orderDate.isSame(today, 'day')) {
          this.todaySalesCount++;
          this.todaySalesAmount += orderTotal;
      }
      if (orderDate.isSame(yesterday, 'day')) {
          this.yesterdaySalesCount++;
          this.yesterdaySalesAmount += orderTotal;
      }
      if (orderDate.isSameOrAfter(startOfWeek)) {
          this.weekSalesCount++;
          this.weekSalesAmount += orderTotal;
      }
      if (orderDate.isSameOrAfter(startOfMonth)) {
          this.monthSalesCount++;
          this.monthSalesAmount += orderTotal;
      }
  });

  console.log('📊 Resumen de ventas actualizado:', {
      sucursal: this.selectedSucursal,
      todaySalesCount: this.todaySalesCount,
      todaySalesAmount: this.todaySalesAmount,
      weekSalesCount: this.weekSalesCount,
      weekSalesAmount: this.weekSalesAmount,
      monthSalesCount: this.monthSalesCount,
      monthSalesAmount: this.monthSalesAmount
  });
}

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.recordsPerPage);
    this.currentPage = 1;
    this.paginateOrders();
  }

  paginateOrders(): void {
    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const endIndex = startIndex + this.recordsPerPage;
    this.paginatedOrders = this.filteredOrders.slice(startIndex, endIndex);
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
    this.updatePagination();
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('jwt');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error al cerrar sesión:', error);
        // Aún así, redirigir al login ya que queremos cerrar la sesión
        localStorage.removeItem('currentUser');
        localStorage.removeItem('jwt');
        this.router.navigate(['/login']);
      }
    });
  }

  // Director Global: rol "Director" y sin sucursal
  isDirectorGlobal(): boolean {
    const user = this.authService.getCurrentUser();
    const roleName = typeof user?.rol === 'string' ? user.rol : user?.rol?.nombre;
    const hasNoBranch = !user?.sucursalId && !user?.sucursal?.id;
    return roleName === 'Director' && hasNoBranch;
  }

  // Vista previa de reporte mensual (mes anterior) para Director Global
  previewMonthlyReport(): void {
    if (!this.isDirectorGlobal()) return;
    // Usar MES ACTUAL
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1..12

    Swal.fire({ title: 'Generando vista previa...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const params: any = { year: String(year), month: String(month) };
    if (this.selectedSucursal) params.sucursalId = String(this.selectedSucursal);
    this.http.get(`${environment.apiUrl}/analytics/monthly`, { params }).subscribe({
      next: (resp: any) => {
        Swal.close();
        const k = resp?.kpis || {};
        Swal.fire('Reporte Mensual', `Periodo: ${resp?.period || year + '-' + month}\nÁmbito: ${resp?.scope || 'GLOBAL'}\nSubtotal: $${(k.subtotal||0).toFixed?.(2) || k.subtotal}\nDescuentos: -$${(k.discounts||0).toFixed?.(2) || k.discounts}\nNeto: $${(k.net||0).toFixed?.(2) || k.net}\nTickets: ${k.tickets||0}\nTicket Prom: $${(k.avgTicket||0).toFixed?.(2) || k.avgTicket}`, 'success');
      },
      error: (err) => {
        Swal.close();
        Swal.fire('Error', 'No fue posible generar la vista previa del reporte.', 'error');
        console.error('Analytics monthly error', err);
      }
    });
  }

  downloadMonthlyPdf(individual: boolean): void {
    if (!this.isDirectorGlobal()) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const params: any = { year: String(year), month: String(month) };
    if (individual && this.selectedSucursal) params.sucursalId = String(this.selectedSucursal);
    this.http.get(`${environment.apiUrl}/analytics/monthly/pdf`, {
      params,
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const scope = individual ? `individual-${this.getSucursalName()}` : 'global';
        a.download = `reporte-mensual-${scope}-${year}-${String(month).padStart(2,'0')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        Swal.fire('Error', 'No fue posible descargar el PDF mensual.', 'error');
        console.error('Analytics monthly PDF error', err);
      }
    });
  }

  sendMonthlyNow(): void {
    if (!this.isDirectorGlobal()) return;
    Swal.fire({ title: 'Enviando reporte...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    this.http.post(`${environment.apiUrl}/analytics/send-monthly`, {}, { responseType: 'json' }).subscribe({
      next: (resp: any) => {
        Swal.close();
        Swal.fire('Enviado', 'Se aceptó la solicitud de envío del reporte mensual.', 'success');
      },
      error: (err) => {
        Swal.close();
        Swal.fire('Error', 'No fue posible solicitar el envío del reporte.', 'error');
        console.error('send-monthly error', err);
      }
    });
  }

  exportToCSV(period: string): void {
    if (!this.selectedSucursal) return;

    const data = this.getDataForPeriod(period);
    const filename = `ventas_${period}_${moment().format('YYYY-MM-DD')}.csv`;
    
    let csvContent = 'ID,Fecha,Total,Estado,Items\n';
    
    data.forEach(order => {
      csvContent += `${order.id},${moment(order.fecha).format('DD/MM/YYYY HH:mm')},${order.total},${order.estado},${order.totalItems}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  generateCut(period: string): void {
    if (!this.selectedSucursal) return;

    const data = this.getDataForPeriod(period);
    this.currentCut = {
      periodText: this.getPeriodText(period),
      generationDate: moment().format('DD/MM/YYYY HH:mm'),
      totalSales: data.length,
      totalAmount: this.calculateTotal(data),
      sales: data
    };

    this.modalService.open(this.cutModal, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
  }

  printTicket(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; }
        .text-center { text-align: center; }
        .mb-4 { margin-bottom: 1.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .border-bottom { border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; }
        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        th, td { text-align: left; padding: 0.25rem; }
        th { border-bottom: 1px solid #ddd; }
      </style>
    `;

    const content = `
      <div class="text-center mb-4">
        <h3>${this.getSucursalName()}</h3>
        <p>${this.currentCut.periodText}</p>
        <p>Fecha de generación: ${this.currentCut.generationDate}</p>
      </div>
      <div class="mb-4">
        <h4 class="border-bottom">Resumen de Ventas</h4>
        <p>Total de ventas: ${this.currentCut.totalSales}</p>
        <p>Monto total: $${this.currentCut.totalAmount.toFixed(2)}</p>
      </div>
      <div>
        <h4 class="border-bottom">Detalle de Ventas</h4>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentCut.sales.map(sale => `
              <tr>
                <td>${sale.id}</td>
                <td>${moment(sale.fecha).format('DD/MM/YYYY HH:mm')}</td>
                <td>$${sale.total.toFixed(2)}</td>
                <td>${sale.totalItems}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          ${styles}
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  downloadPDF(): void {
  const doc = new jsPDF({
    unit: 'mm',
      format: [80, 297] // Ancho de ticket térmico estándar
    });

    const margin = 5;
    let yPos = margin;
    const lineHeight = 5;
    const width = 70; // Ancho disponible para texto

    // Configuración de fuente
  doc.setFontSize(10);
    
    // Encabezado
  doc.setFont('helvetica', 'bold');
    this.centerText(doc, this.getSucursalName(), yPos);
    yPos += lineHeight * 2;

  doc.setFont('helvetica', 'normal');
    this.centerText(doc, 'CORTE DE CAJA', yPos);
    yPos += lineHeight * 2;

    this.centerText(doc, this.currentCut.periodText, yPos);
    yPos += lineHeight;
    this.centerText(doc, `Fecha: ${this.currentCut.generationDate}`, yPos);
    yPos += lineHeight * 2;

    // Línea separadora
    doc.setLineWidth(0.1);
    doc.line(margin, yPos, width + margin, yPos);
    yPos += lineHeight;

    // Resumen
    doc.text(`Total Ventas: ${this.currentCut.totalSales}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Monto Total: $${this.currentCut.totalAmount.toFixed(2)}`, margin, yPos);
    yPos += lineHeight * 2;

    // Detalle de ventas
  doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE VENTAS', margin, yPos);
    yPos += lineHeight * 1.5;

    doc.setFont('helvetica', 'normal');
    this.currentCut.sales.forEach(sale => {
      // Verificar si necesitamos una nueva página
      if (yPos > 280) {
        doc.addPage([80, 297]);
        yPos = margin;
      }

      doc.text(`ID: ${sale.id}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Fecha: ${moment(sale.fecha).format('DD/MM/YY HH:mm')}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Total: $${sale.total.toFixed(2)}`, margin, yPos);
      yPos += lineHeight;
      doc.text(`Items: ${sale.totalItems}`, margin, yPos);
      yPos += lineHeight;

      // Línea separadora entre ventas
      doc.setLineWidth(0.1);
      doc.line(margin, yPos, width + margin, yPos);
      yPos += lineHeight;
    });

    // Pie de página
    yPos += lineHeight;
    this.centerText(doc, '* * * Fin del Corte * * *', yPos);

    // Guardar el PDF
    const filename = `corte_${moment().format('YYYY-MM-DD_HHmm')}.pdf`;
    doc.save(filename);
  }

  private centerText(doc: jsPDF, text: string, y: number): void {
    const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
    const x = (80 - textWidth) / 2; // 80mm es el ancho del ticket
    doc.text(text, x, y);
  }

  private getDataForPeriod(period: string): Sale[] {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');
    const startOfWeek = moment().startOf('isoWeek');
    const startOfMonth = moment().startOf('month');

    return this.filteredOrders.filter(order => {
      const orderDate = moment(order.fecha);
      switch (period) {
        case 'today':
          return orderDate.isSame(today, 'day');
        case 'yesterday':
          return orderDate.isSame(yesterday, 'day');
        case 'week':
          return orderDate.isSameOrAfter(startOfWeek);
        case 'month':
          return orderDate.isSameOrAfter(startOfMonth);
        case 'custom':
          if (!this.customStartDate || !this.customEndDate) return false;
          const startDate = moment(this.customStartDate).startOf('day');
          const endDate = moment(this.customEndDate).endOf('day');
          return orderDate.isBetween(startDate, endDate, 'day', '[]');
        default:
          return false;
      }
    });
  }

  private getPeriodText(period: string): string {
    switch (period) {
      case 'today':
        return `Corte del Día (${moment().format('DD/MM/YYYY')})`;
      case 'yesterday':
        return `Corte de Ayer (${moment().subtract(1, 'day').format('DD/MM/YYYY')})`;
      case 'week':
        return `Corte Semanal (${moment().startOf('isoWeek').format('DD/MM/YYYY')} - ${moment().format('DD/MM/YYYY')})`;
      case 'month':
        return `Corte Mensual (${moment().startOf('month').format('DD/MM/YYYY')} - ${moment().format('DD/MM/YYYY')})`;
      case 'custom':
        if (!this.customStartDate || !this.customEndDate) return '';
        const startDate = moment(this.customStartDate).format('DD/MM/YYYY');
        const endDate = moment(this.customEndDate).format('DD/MM/YYYY');
        return `Corte Personalizado (${startDate} - ${endDate})`;
      default:
        return '';
    }
  }

  getSucursalName(): string {
    console.log('Obteniendo nombre de sucursal:', {
      selectedSucursal: this.selectedSucursal,
      sucursales: this.sucursales
    });
    
    if (!this.selectedSucursal || !this.sucursales?.length) {
      return 'No especificada';
    }
    
    // Asegurar que la comparación sea numérica
    const selectedId = Number(this.selectedSucursal);
    const sucursal = this.sucursales.find(s => s.id === selectedId);
    console.log('Sucursal encontrada:', sucursal);
    
    return sucursal?.nombre || 'No especificada';
  }

  private calculateTotal(orders: any[]): number {
    return orders.reduce((sum, order) => sum + (order.total || 0), 0);
  }

  generateTicket(period: string): void {
    const ticketData = this.getTicketData(period);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, 295]
    });

    const lineHeight = 4;
    let yPosition = 10;

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    let titulo = '';
    switch (period) {
      case 'today':
        titulo = 'CORTE DEL DÍA';
        break;
      case 'yesterday':
        titulo = 'CORTE DE AYER';
        break;
      case 'week':
        titulo = 'CORTE SEMANAL';
        break;
      case 'month':
        titulo = 'CORTE MENSUAL';
        break;
      default:
        titulo = 'CORTE DE CAJA';
    }
    doc.text(titulo, 29, yPosition, { align: 'center' });

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`USUARIO: ${this.userName}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`FECHA DEL CORTE: ${new Date().toLocaleDateString()}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`HORA: ${new Date().toLocaleTimeString()}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Sucursal: ${this.getSucursalName()}`, 5, yPosition);

    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`VENDIDO: $${ticketData.total.toFixed(2)}`, 5, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(`01-EFECTIVO: $${ticketData.paymentMethods.cash.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`02-TARJETAS CRÉDITO: $${ticketData.paymentMethods.credit.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`03-TARJETAS DÉBITO: $${ticketData.paymentMethods.debit.toFixed(2)}`, 5, yPosition += lineHeight);

    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PRODUCTOS:', 5, yPosition);

    yPosition += 4;
    ticketData.items
      .sort((a: Sale, b: Sale) => (a.id || 0) - (b.id || 0))
      .forEach((item: any) => {
        doc.setFont('helvetica', 'normal');
        const lineText = `${item.name} X ${item.quantity} - $${item.total.toFixed(2)}`;
        const splitLines = doc.splitTextToSize(lineText, 50);

        splitLines.forEach((line: string) => {
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
    doc.text(`TOTAL VENDIDO: $${ticketData.total.toFixed(2)}`, 5, yPosition += lineHeight);
    doc.text(`TOTAL TICKETS: ${ticketData.totalSales}`, 5, yPosition += lineHeight);
    doc.text(`TOTAL SERVICIOS: ${ticketData.totalItems}`, 5, yPosition += lineHeight);

    // Generar PDF como blob y mostrar en el modal
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    const iframe = document.getElementById('ticketIframe') as HTMLIFrameElement;
            iframe.src = pdfUrl;

    const modal = new bootstrap.Modal(document.getElementById('ticketModal')!);
            modal.show();

    setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
  }

  private getTicketData(period: string): any {
    const data = this.getDataForPeriod(period);
    const paymentMethods = { cash: 0, credit: 0, debit: 0 };
  let total = 0;
  let totalItems = 0;
    let totalSales = data.length;

    // Objeto para agrupar productos
    const productSummary: { [key: string]: { quantity: number, total: number } } = {};

    // Procesar las órdenes
    data.forEach(order => {
    total += order.total || 0;

      // Actualizar métodos de pago
      if (order.metodoPago?.toLowerCase() === 'efectivo') {
      paymentMethods.cash += order.total || 0;
      } else if (order.metodoPago?.toLowerCase().includes('credito')) {
      paymentMethods.credit += order.total || 0;
      } else if (order.metodoPago?.toLowerCase().includes('debito')) {
      paymentMethods.debit += order.total || 0;
    }

      // Procesar productos de cada orden
      order.productos?.forEach((producto: any) => {
        const nombreProducto = producto.nombreProducto || 'Producto sin nombre';
        const cantidad = producto.cantidad || 0;
        const precioUnitario = producto.precioProducto || 0;
        const subtotal = cantidad * precioUnitario;

        if (productSummary[nombreProducto]) {
          productSummary[nombreProducto].quantity += cantidad;
          productSummary[nombreProducto].total += subtotal;
        } else {
          productSummary[nombreProducto] = {
            quantity: cantidad,
            total: subtotal
          };
        }

      totalItems += cantidad;
      });
    });

    // Convertir el resumen de productos a un array
    const items = Object.entries(productSummary).map(([name, data]) => ({
      name,
      quantity: data.quantity,
      total: data.total
  }));

  return {
    total,
    paymentMethods,
      items,
      totalSales,
      totalItems
    };
  }
}
