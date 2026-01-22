import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ExpensesService } from '../service/expenses.service';
import { AuthService } from '../auth/auth.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { environment } from '../../environments/environment';
import moment from 'moment';
import * as bootstrap from 'bootstrap';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.css']
})
export class ExpensesComponent implements OnInit {
  expenses: any[] = [];
  filtered: any[] = [];
  loading = false;
  error: string | null = null;
  sucursalName: string = '';

  // resumen por estado
  todayRegistered = 0; todayPaid = 0; todayAnnulled = 0;
  yesterdayRegistered = 0; yesterdayPaid = 0; yesterdayAnnulled = 0;
  weekRegistered = 0; weekPaid = 0; weekAnnulled = 0;
  monthRegistered = 0; monthPaid = 0; monthAnnulled = 0;

  // paginación (cliente)
  recordsPerPage = 100;
  currentPage = 1;
  totalPages = 0;
  paginated: any[] = [];

  showUserDropdown = false;
  customStartDate: string = '';
  customEndDate: string = '';

  // filtros
  filter = {
    vendor: '',
    category: '',
    paymentMethod: '',
    status: '',
    minAmount: '',
    maxAmount: '',
    q: ''
  };
  vendors: string[] = [];
  categories: string[] = [];
  paymentMethods: string[] = [];
  statuses: string[] = ['registrado','pagado','anulado'];

  constructor(
    private expensesService: ExpensesService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getCurrentUser();
    const userRole = typeof userData?.rol === 'string' ? userData?.rol : userData?.rol?.nombre;
    if (!userData || !userRole || userRole !== 'Super Admin') {
      this.router.navigate(['/unauthorized']);
      return;
    }

    const sucursalId = this.authService.getSucursalId();
    if (!sucursalId) { this.router.navigate(['/unauthorized']); return; }

    // Obtener nombre de sucursal y luego cargar gastos
    this.authService.getSucursalNombre(sucursalId).subscribe({
      next: (resp: any) => {
        this.sucursalName = resp?.nombre || 'Sucursal';
        this.loadExpenses(sucursalId);
      },
      error: () => {
        this.sucursalName = 'Sucursal';
        this.loadExpenses(sucursalId);
      }
    });
  }

  loadExpenses(sucursalId: number) {
    this.loading = true;
    this.expensesService.getBySucursal(sucursalId).subscribe({
      next: data => {
        this.expenses = data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.buildFilterOptions();
        this.applyFilter();
        this.calculateSummary();
        this.loading = false;
      },
      error: err => { this.loading = false; this.error = 'Error al cargar gastos'; }
    });
  }

  volverMesActual(): void {
    const sucursalId = this.authService.getSucursalId();
    if (!sucursalId) return;
    this.loadExpenses(sucursalId);
  }

  loadRange(): void {
    const sucursalId = this.authService.getSucursalId();
    if (!sucursalId || !this.customStartDate || !this.customEndDate) return;
    this.loading = true;
    this.expensesService.getBySucursalRango(sucursalId, this.customStartDate, this.customEndDate).subscribe({
      next: data => {
        this.expenses = data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.buildFilterOptions();
        this.applyFilter();
        this.calculateSummary();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  paginate() {
    const start = (this.currentPage - 1) * this.recordsPerPage;
    const end = start + this.recordsPerPage;
    this.paginated = this.filtered.slice(start, end);
    this.totalPages = Math.ceil(this.filtered.length / this.recordsPerPage);
  }

  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.paginate(); } }
  previousPage() { if (this.currentPage > 1) { this.currentPage--; this.paginate(); } }
  onRecordsPerPageChange() { this.currentPage = 1; this.paginate(); }

  calculateSummary() {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');
    const startOfWeek = moment().startOf('isoWeek');
    const startOfMonth = moment().startOf('month');

    this.todayRegistered = this.todayPaid = this.todayAnnulled = 0;
    this.yesterdayRegistered = this.yesterdayPaid = this.yesterdayAnnulled = 0;
    this.weekRegistered = this.weekPaid = this.weekAnnulled = 0;
    this.monthRegistered = this.monthPaid = this.monthAnnulled = 0;

    this.expenses.forEach(e => {
      const d = moment(e.date);
      const amt = Number(e.amountMxn || 0);
      const s = (e.status || '').toLowerCase();

      if (d.isSame(today, 'day')) {
        if (s === 'pagado') this.todayPaid += amt;
        else if (s === 'registrado') this.todayRegistered += amt;
        else if (s === 'anulado') this.todayAnnulled += amt;
      }
      if (d.isSame(yesterday, 'day')) {
        if (s === 'pagado') this.yesterdayPaid += amt;
        else if (s === 'registrado') this.yesterdayRegistered += amt;
        else if (s === 'anulado') this.yesterdayAnnulled += amt;
      }
      if (d.isSameOrAfter(startOfWeek)) {
        if (s === 'pagado') this.weekPaid += amt;
        else if (s === 'registrado') this.weekRegistered += amt;
        else if (s === 'anulado') this.weekAnnulled += amt;
      }
      if (d.isSameOrAfter(startOfMonth)) {
        if (s === 'pagado') this.monthPaid += amt;
        else if (s === 'registrado') this.monthRegistered += amt;
        else if (s === 'anulado') this.monthAnnulled += amt;
      }
    });
  }

  toggleUserDropdown(event: Event) {
    event.preventDefault();
    this.showUserDropdown = !this.showUserDropdown;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('jwt');
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  // === Export CSV ===
  exportToCSV(): void {
    const headers = ['ID','Fecha','Proveedor','Categoría','Concepto','Método de Pago','Importe','Estado','Usuario'];
    const rows = this.expenses.map(e => [
      e.id,
      new Date(e.date).toLocaleString(),
      e.vendorName || '',
      e.category || '',
      e.concept || '',
      e.paymentMethod || '',
      e.amountMxn ?? 0,
      e.status || '',
      e.usuario?.nombreCompleto || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gastos_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private filterByPeriod(period: 'today'|'yesterday'|'week'|'month'): any[] {
    const today = moment().startOf('day');
    const yesterday = moment().subtract(1, 'day').startOf('day');
    const startOfWeek = moment().startOf('isoWeek');
    const startOfMonth = moment().startOf('month');

    return this.expenses.filter(e => {
      const d = moment(e.date);
      if (period === 'today') { return d.isSame(today, 'day'); }
      if (period === 'yesterday') { return d.isSame(yesterday, 'day'); }
      if (period === 'week') { return d.isSameOrAfter(startOfWeek); }
      if (period === 'month') { return d.isSameOrAfter(startOfMonth); }
      return true;
    });
  }

  exportPeriodCSV(period: 'today'|'yesterday'|'week'|'month'): void {
    const data = this.filterByPeriod(period);
    const headers = ['ID','Fecha','Proveedor','Categoría','Concepto','Método de Pago','Importe','Estado','Usuario'];
    const rows = data.map(e => [
      e.id,
      new Date(e.date).toLocaleString(),
      e.vendorName || '',
      e.category || '',
      e.concept || '',
      e.paymentMethod || '',
      e.amountMxn ?? 0,
      e.status || '',
      e.usuario?.nombreCompleto || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `gastos_${period}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // construir opciones para selects de filtros
  buildFilterOptions(): void {
    const uniq = (a: any[]) => Array.from(new Set(a.filter(Boolean)));
    this.vendors = uniq(this.expenses.map(e => e.vendorName));
    this.categories = uniq(this.expenses.map(e => e.category));
    this.paymentMethods = uniq(this.expenses.map(e => e.paymentMethod));
  }

  // aplicar filtros locales
  applyFilter(): void {
    const min = this.filter.minAmount ? parseFloat(this.filter.minAmount) : undefined;
    const max = this.filter.maxAmount ? parseFloat(this.filter.maxAmount) : undefined;
    const q = (this.filter.q || '').toLowerCase();
    this.filtered = this.expenses.filter(e => {
      if (this.filter.vendor && e.vendorName !== this.filter.vendor) return false;
      if (this.filter.category && e.category !== this.filter.category) return false;
      if (this.filter.paymentMethod && e.paymentMethod !== this.filter.paymentMethod) return false;
      if (this.filter.status && e.status !== this.filter.status) return false;
      const amt = Number(e.amountMxn || 0);
      if (min !== undefined && amt < min) return false;
      if (max !== undefined && amt > max) return false;
      if (q && !(e.concept || '').toLowerCase().includes(q)) return false;
      return true;
    });
    this.currentPage = 1;
    this.paginate();
  }

  // Acciones de estado
  markPaid(e: any): void {
    this.expensesService.markPaid(e.id).subscribe({
      next: (res) => { e.status = res.status || 'pagado'; this.applyFilter(); this.calculateSummary(); },
      error: () => {}
    });
  }

  annul(e: any): void {
    this.expensesService.annul(e.id).subscribe({
      next: (res) => { e.status = res.status || 'anulado'; this.applyFilter(); this.calculateSummary(); },
      error: () => {}
    });
  }

  // === Ticket PDF individual ===
  private buildTicketDoc(expense: any): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, 200] });
    let y = 10; const lh = 5;
    doc.setFont('helvetica','bold'); doc.setFontSize(10);
    doc.text('GASTO', 29, y, { align: 'center' }); y += lh;
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(`Sucursal: ${expense.sucursal?.nombre || 'N/A'}`, 5, y); y += lh;
    doc.text(`Usuario: ${expense.usuario?.nombreCompleto || 'N/A'}`, 5, y); y += lh;
    doc.text(`Fecha: ${new Date(expense.date).toLocaleString()}` , 5, y); y += lh;
    doc.text(`Proveedor: ${expense.vendorName || '-'}` , 5, y); y += lh;
    doc.text(`Categoría: ${expense.category || '-'}` , 5, y); y += lh;
    doc.text(`Concepto: ${expense.concept || '-'}` , 5, y); y += lh;
    doc.text(`Método: ${expense.paymentMethod || '-'}` , 5, y); y += lh;
    doc.text(`Importe: $${Number(expense.amountMxn||0).toFixed(2)}` , 5, y); y += lh;
    doc.text(`Estado: ${expense.status || '-'}` , 5, y); y += lh;
    return doc;
  }

  generateTicket(expense: any): void {
    const doc = this.buildTicketDoc(expense);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    // Abrir SIEMPRE modal interno con iframe
    this.openTicketModal(url);
  }

  downloadTicket(expense: any): void {
    const doc = this.buildTicketDoc(expense);
    doc.save(`ticket_gasto_${expense?.id || ''}.pdf`);
  }

  // Modal de ticket
  ticketUrl: string = '';
  openTicketModal(url: string): void {
    this.ticketUrl = url;
    const iframe = document.getElementById('expenseTicketIframe') as HTMLIFrameElement | null;
    if (iframe) { iframe.src = url; }
    const el = document.getElementById('expenseTicketModal');
    if (el) new (bootstrap as any).Modal(el).show();
  }

  // Imprimir tickets por período en un solo PDF dentro del modal
  generatePeriodTickets(period: 'today'|'yesterday'|'week'|'month'): void {
    const data = this.filterByPeriod(period);
    if (!data || data.length === 0) { return; }

    const pageWidth = 58;
    const pageHeight = 200;
    const marginX = 4;
    const startY = 6;
    const lh = 4; // línea compacta

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pageWidth, pageHeight] });

    let y = startY;
    // Encabezado del período
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text(`GASTOS - ${period.toUpperCase()}`, pageWidth / 2, y, { align: 'center' });
    y += lh + 1;

    doc.setFont('helvetica','normal'); doc.setFontSize(7);

    const drawExpenseBlock = (exp: any) => {
      const lines = [
        `Sucursal: ${exp.sucursal?.nombre || 'N/A'}`,
        `Usuario: ${exp.usuario?.nombreCompleto || 'N/A'}`,
        `Fecha: ${new Date(exp.date).toLocaleString()}`,
        `Prov: ${exp.vendorName || '-'}`,
        `Cat: ${exp.category || '-'}`,
        `Conc: ${exp.concept || '-'}`,
        `Método: ${exp.paymentMethod || '-'}`,
        `Importe: $${Number(exp.amountMxn||0).toFixed(2)}`,
        `Estado: ${exp.status || '-'}`
      ];
      const needed = lines.length * lh + 3; // + separador
      if (y + needed > pageHeight - lh) {
        doc.addPage([pageWidth, pageHeight]);
        y = startY;
        doc.setFont('helvetica','bold'); doc.setFontSize(9);
        doc.text(`GASTOS - ${period.toUpperCase()} (cont.)`, pageWidth / 2, y, { align: 'center' });
        y += lh + 1;
        doc.setFont('helvetica','normal'); doc.setFontSize(7);
      }
      lines.forEach(line => { doc.text(line, marginX, y); y += lh; });
      y += 1; // espacio
      doc.setDrawColor(200);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 1;
    };

    data.forEach(expense => drawExpenseBlock(expense));

    // Total del período
    const total = data.reduce((sum, e) => sum + Number(e.amountMxn || 0), 0);
    if (y + lh > pageHeight - lh) {
      doc.addPage([pageWidth, pageHeight]);
      y = startY;
    }
    doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text(`Total período: $${total.toFixed(2)}`, marginX, y);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    this.openTicketModal(url);
  }

  // ===== Adjuntos =====
  attachments: any[] = [];
  selectedExpense: any = null;
  uploading = false;

  openAttachments(expense: any): void {
    this.selectedExpense = expense;
    this.expensesService.listAttachments(expense.id).subscribe({
      next: (list) => {
        this.attachments = list || [];
        const el = document.getElementById('attachmentsModal');
        if (el) new (bootstrap as any).Modal(el).show();
      },
      error: () => {
        this.attachments = [];
        const el = document.getElementById('attachmentsModal');
        if (el) new (bootstrap as any).Modal(el).show();
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file || !this.selectedExpense) return;
    this.uploading = true;
    this.expensesService.uploadAttachment(this.selectedExpense.id, file).subscribe({
      next: (saved) => {
        this.attachments.push(saved);
        this.uploading = false;
        (event.target as HTMLInputElement).value = '';
      },
      error: () => { this.uploading = false; }
    });
  }

  downloadAttachment(attId: number): void {
    this.expensesService.downloadAttachment(attId).subscribe((blob: any) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'adjunto';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  deleteAttachment(attId: number): void {
    this.expensesService.deleteAttachment(attId).subscribe({
      next: () => { this.attachments = this.attachments.filter((a: any) => a.id !== attId); },
      error: () => {}
    });
  }

  // ===== Nuevo gasto =====
  newExpense: any = { vendorName: '', category: '', concept: '', amountMxn: '', paymentMethod: '', notes: '' };

  openNewExpense(): void {
    const el = document.getElementById('newExpenseModal');
    if (el) new (bootstrap as any).Modal(el).show();
  }

  printTicket(): void {
    const iframe = document.getElementById('expenseTicketIframe') as HTMLIFrameElement | null;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }
  
  saveNewExpense(): void {
    const sucursalId = this.authService.getSucursalId();
    const userId = this.authService.getCurrentUser()?.id;
    if (!sucursalId || !userId) return;
    const payload = {
      sucursalId,
      userId,
      date: new Date().toISOString(),
      vendorName: this.newExpense.vendorName,
      category: this.newExpense.category,
      concept: this.newExpense.concept,
      amountMxn: parseFloat(this.newExpense.amountMxn),
      paymentMethod: this.newExpense.paymentMethod,
      notes: this.newExpense.notes || null,
      status: 'registrado'
    };
    this.expensesService.createExpense(payload).subscribe({
      next: () => {
        const el = document.getElementById('newExpenseModal');
        if (el) (bootstrap as any).Modal.getInstance(el)?.hide();
        this.newExpense = { vendorName: '', category: '', concept: '', amountMxn: '', paymentMethod: '', notes: '' };
        this.volverMesActual();
      },
      error: () => {}
    });
  }
}


