import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ProductService } from '../service/producto.service';
import { CartService } from '../service/cart.service';
import { Producto } from '../models/producto.model';
import { environment } from '../../environments/environment';
import { NgbModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgbModule,
    NgbDropdownModule
  ],
})
export class PosComponent implements OnInit {
  userName: string = '';  // Cambia el uso de currentUserName por userName
  userEmail: string = '';
  userRole: string = '';
  userStore: string = '';

  products: Producto[] = [];
  cart: Producto[] = [];
  showPaymentView: boolean = false;
  paymentMethod: string = 'efectivo';
  totalAmount = 0;
  showSaleCompletedPopup = false;

  placa: string = ''; // Añade la propiedad para la placa
  contadorVentas: number = 0; // Contador de ventas para la placa actual
  // descuentoAplicado: boolean = false;
  descuentoAplicado: number = 0;
  ventasTotales: number = 0; // Total histórico de visitas acumuladas

  sucursales: string[] = [];
  selectedSucursal: string = '';

  nota: string = ''; // Nueva propiedad para la nota
  nombreClienteNota: string = '';
  cajuela: string = 'si';
  aroma: string = 'si';
  brillo: string = 'si';
  aspirado: string = 'si'; // Selector Sí/No para Aspirado ('si' o 'no'), default 'si'
  //receiptNumber: number = Math.floor(Math.random() * 10000);  // Genera un número aleatorio para el recibo
  lastReceiptNumber: string = 'AA0000'; // Último número de recibo inicial (obtener del backend)

  saleInProgress = false;

  amountReceived: number = 0;  // Cantidad recibida del cliente
  change: number = 0;  // Cambio que se debe devolver al cliente

  // Estadísticas del día
  dailyTickets: number = 0;
  dailyServicios: number = 0;

  datosFiscales = {
    rfc: '',
    nombre: '',
    cp: '',
    regimenFiscal: '612', // Valor por defecto
    usoCfdi: 'G03',
    email: ''
  };

  // Opción para guardar cliente al facturar
  guardarCliente: boolean = false;

  // Info rápida de placa para badge
  plateQuickInfo: any = null;
  loadingPlateInfo: boolean = false;

  ticketId: string = '';
  // Variable para almacenar los datos de la última venta
  lastSaleData: any = null;
  // Fecha/hora de la última venta devuelta por el backend
  lastSaleDate: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private http: HttpClient
  ) { }

  // Autocomplete clientes por RFC en el POS
  customerQuery: string = '';
  customerInv: any | null = null;
  rfcSuggestions: any[] = [];
  showRfcSuggestions = false;
  clienteSeleccionadoId: number | null = null; // ID del cliente seleccionado del autocompletado

  onCustomerRfcInput(ev: any) {
    const val = (ev?.target?.value || '').trim();
    this.customerQuery = val;
    // Si el RFC cambia manualmente, resetear el ID del cliente seleccionado
    if (val !== this.datosFiscales.rfc) {
      this.clienteSeleccionadoId = null;
    }
    if (val.length < 3) {
      this.customerInv = null;
      this.rfcSuggestions = [];
      this.showRfcSuggestions = false;
      return;
    }
    // Búsqueda predictiva por RFC
    this.http.get<any[]>(`${environment.apiUrl}/clientes/search`, { params: { q: val } }).subscribe({
      next: (list: any[]) => {
        const upper = val.toUpperCase();
        const filtered = (list || []).filter(c => (c.rfc || '').toUpperCase().includes(upper));
        this.rfcSuggestions = filtered.slice(0, 6);
        this.showRfcSuggestions = true;
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
    // Guardar el ID del cliente seleccionado
    this.clienteSeleccionadoId = c.id || null;
    // Si se selecciona un cliente existente, marcar automáticamente el checkbox para actualizarlo
    if (c.id) {
      this.guardarCliente = true;
    }
  }

  private applyCustomerToInvoice(c: any): void {
    this.datosFiscales.rfc = c.rfc || this.datosFiscales.rfc;
    this.datosFiscales.nombre = c.razonSocial || c.nombreCompleto || this.datosFiscales.nombre;
    this.datosFiscales.cp = c.codigoPostal || this.datosFiscales.cp;
    this.datosFiscales.email = c.email || this.datosFiscales.email;
    // Aplicar también datos fiscales si existen
    if (c.regimenFiscal) this.datosFiscales.regimenFiscal = c.regimenFiscal;
    if (c.usoCfdi) this.datosFiscales.usoCfdi = c.usoCfdi;
  }

  onRfcBlur(): void {
    setTimeout(() => this.showRfcSuggestions = false, 150);
  }


  ngOnInit(): void {
    this.obtenerUltimoReciboPorSucursal(); // Obtener el último recibo de la sucursal
    this.getProducts(); // Cargar productos al inicializar
    this.loadDailyStats(); // Cargar estadísticas del día

    const userData = this.authService.getCurrentUser();
    console.log('Datos del usuario:', userData);

    if (userData) {
      this.userName = userData.nombreCompleto || '';
      this.userEmail = userData.email || '';
      this.userRole = userData.rol || 'Sin Rol';
      this.userStore = userData.sucursalId ? `Sucursal ID: ${userData.sucursalId}` : 'Sin Sucursal';

      if (userData.sucursalId) {
        this.http.get(`${environment.apiUrl}/sucursales/${userData.sucursalId}`).subscribe(
          (response: any) => {
            this.selectedSucursal = response.nombre; // Asignar el nombre de la sucursal
          },
          (error) => {
            console.error('Error al obtener el nombre de la sucursal:', error);
          }
        );
      } else {
        console.error('No se encontró la sucursal asignada al usuario.');
      }
    }

    // Escuchar el evento de cierre del modal y eliminar backdrop
    const receiptModalElement = document.getElementById('receiptModal');
    receiptModalElement?.addEventListener('hidden.bs.modal', () => {
      // Elimina cualquier fondo sobrante (backdrop)
      document.querySelectorAll('.modal-backdrop').forEach((backdrop) => backdrop.remove());
      // Restaura el scroll del cuerpo
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    });
  }



  getProducts(): void {
    const sucursalId = this.authService.getSucursalId(); // Obtén el ID de la sucursal desde AuthService
    if (sucursalId) {
      this.productService.getProductsBySucursal(sucursalId.toString()).subscribe(
        (products: Producto[]) => {
          // Filtrar productos activos y ordenarlos por ID
          this.products = products
            .filter(product => product.activo) // Solo productos con activo = true
            .sort((a, b) => a.id - b.id); // Ordenar por ID ascendente
          console.log('Productos activos cargados para POS:', this.products);
        },
        (error) => {
          console.error('Error al obtener los productos para la sucursal:', error);
        }
      );
    } else {
      console.error('No se puede cargar productos. Sucursal ID no encontrado.');
    }
  }

  // Cargar estadísticas del día actual
  loadDailyStats(): void {
    const sucursalId = this.authService.getSucursalId();
    if (sucursalId) {
      this.http.get<any>(`${environment.apiUrl}/ordenes-compra/estadisticas-dia?sucursalId=${sucursalId}`).subscribe(
        (stats) => {
          this.dailyTickets = stats.totalTickets || 0;
          this.dailyServicios = stats.totalServicios || 0;
          console.log('Estadísticas del día cargadas:', stats);
        },
        (error) => {
          console.error('Error al obtener estadísticas del día:', error);
          this.dailyTickets = 0;
          this.dailyServicios = 0;
        }
      );
    }
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

  goToPos() {
    this.router.navigate(['/pos']);
  }

  goToHome() {
    switch (this.userRole) {
      case 'Super Admin':
        this.router.navigate(['/super-admin-menu']);
        break;
      case 'Admin':
        this.router.navigate(['/admin-menu']);
        break;
      case 'Operator':
        this.router.navigate(['/operator-menu']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }

  goToSuperAdminMenu() {
    this.router.navigate(['/super-admin-menu']);
  }

  addToCart(product: Producto): void {
    const existingProduct = this.cart.find(item => item.id === product.id);

    if (existingProduct) {
      // Increase the quantity if the product is already in the cart
      existingProduct.cantidad++;
    } else {
      // Add the product to the cart with a default quantity of 1
      this.cart.push({ ...product, cantidad: 1 });
    }
  }


  removeFromCart(product: Producto): void {
    this.cart = this.cart.filter(item => item.id !== product.id);
  }

  calculateTotal(): number {
    return this.cart.reduce((total, item) => total + (item.precio * item.cantidad), 0);  // Total with quantity
  }

  clearCart(): void {
    this.cart = [];
    this.placa = '';
    this.nota = '';
    this.nombreClienteNota = '';
    this.cajuela = 'si';
    this.aroma = 'si';
    this.brillo = 'si';
    this.aspirado = 'si';
    this.amountReceived = 0;
    this.change = 0;
    this.paymentMethod = '';
    this.saleInProgress = false;

    // Limpiar información de lealtad/placa cuando se limpia el carrito
    this.ventasTotales = 0;
    this.descuentoAplicado = 0;
    this.plateQuickInfo = null;

    // Limpia el estado del modal y el backdrop
    document.body.classList.remove('modal-open');
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
  }



  goToPayment(): void {
    if (this.cart.length > 0) {
      this.showPaymentView = true;

      // Si no hay placa, asegurarse de limpiar información del ciclo de lealtad
      if (!this.placa || this.placa.trim() === '') {
        this.ventasTotales = 0;
        this.descuentoAplicado = 0;
        this.plateQuickInfo = null;
      }
    } else {
      console.log('No puedes ir al pago. El carrito está vacío.');
    }
  }

  goBackToCart(): void {
    this.showPaymentView = false;
  }

  setPaymentMethod(method: string): void {
    this.paymentMethod = method;

    if (method === 'Efectivo') {
      // Recalcular el cambio si el método es efectivo
      this.calculateChange();
    } else {
      // Para métodos distintos de efectivo, resetear el cambio y habilitar la venta
      this.change = 0;
      this.saleInProgress = false;
    }
  }



  // Método para calcular el cambio
  calculateChange(): void {
    if (this.paymentMethod === 'Efectivo') {
      const total = this.calcularTotalConDescuento();
      this.change = this.amountReceived > 0 ? this.amountReceived - total : 0;

      this.saleInProgress = this.amountReceived < total; // Bloquear venta si el monto recibido es insuficiente
    } else {
      this.change = 0; // Sin cambio para otros métodos de pago
      this.saleInProgress = false; // Habilitar venta para otros métodos
    }
  }


  finishSale(): void {
    if (!this.cart || this.cart.length === 0) {
      Swal.fire('Error', 'No hay productos en el carrito. No se puede finalizar la venta.', 'error');
      return;
    }
    if (this.saleInProgress) return;
    this.saleInProgress = true;

    if (!this.cart || this.cart.length === 0) {
      console.error('El carrito está vacío. Añade productos antes de finalizar la venta.');
      this.saleInProgress = false;
      return;
    }

    const sucursalId = this.authService.getSucursalId();
    if (!sucursalId) {
      console.error('Sucursal ID no está definido. No se puede completar la venta.');
      this.saleInProgress = false;
      return;
    }

    const orderData = {
      fecha: new Date().toISOString(),
      cajero: this.userName,
      sucursalId: sucursalId,
      sucursalNombre: this.selectedSucursal || 'Sucursal no especificada',
      placa: this.placa || '',
      nota: this.getNotaCompleta() || '',
      metodoPago: this.paymentMethod,
      total: this.calculateTotal(),
      productos: this.cart.map((item) => ({
        id: item.id,
        cantidad: item.cantidad,
      })),
      cantidadRecibida: this.amountReceived || 0,
      cambio: this.change || 0,
      facturada: false // No marcar como facturada por defecto
    };

    this.http.post(`${environment.apiUrl}/ordenes-compra`, orderData).subscribe(
      (response: any) => {
        console.log('Venta completada con éxito', response);
        this.lastReceiptNumber = response.numeroRecibo;
        // Guardar la fecha/hora real de la venta desde el backend (fuente de verdad)
        this.lastSaleDate = (response?.order?.fecha) || this.lastSaleDate || null;

        // Aplicar descuento si el backend lo marcó en la orden
        try {
          const applied = response?.loyaltyApplied === true || response?.order?.loyaltyApplied === true;
          const amount = Number(response?.loyaltyDiscountAmount || response?.order?.loyaltyDiscountAmount || 0);
          this.descuentoAplicado = applied ? amount : 0;
        } catch (e) {
          console.warn('No se pudo leer la marca de lealtad aplicada.', e);
          this.descuentoAplicado = 0;
        }

        const proceedToPrint = () => {
          // Guardar los datos de la venta con descuento aplicado
          this.lastSaleData = this.getTicketData();
          this.showReceiptModal();
          // 🚩 NO limpies el carrito aquí todavía si vas a facturar
          this.goBackToCart();

          // Actualizar estadísticas del día
          this.loadDailyStats();

          // Backend ya redime automáticamente; omitimos confirmación redundante
        };

        // Si hay placa, refrescar información de lealtad antes de imprimir para obtener el conteo actualizado
        if (this.placa && this.placa.trim() !== '') {
          this.http.get<any>(`${environment.apiUrl}/plates/${this.placa}/quick-info`, {
            params: { sucursalId: sucursalId.toString() }
          }).subscribe({
            next: (info) => {
              console.log('Info de placa actualizada tras venta:', info);
              this.plateQuickInfo = info;
              if (info.totalVisits !== undefined) this.ventasTotales = info.totalVisits;
              proceedToPrint();
            },
            error: (err) => {
              console.warn('Error al refrescar info de placa tras venta. Se usará info anterior.', err);
              proceedToPrint();
            }
          });
        } else {
          proceedToPrint();
        }
      },
      (error) => {
        console.error('Error al completar la venta', error);
        this.saleInProgress = false;
      }
    );
  }









  resetSaleState(): void {
    this.clearCart(); // Limpia el carrito
    this.saleInProgress = false; // Permite nuevas ventas
  }

  hidePopup(): void {
    this.showSaleCompletedPopup = false;
    this.clearCart(); // Limpia el carrito cuando se le da "No, gracias"
  }









  onPlacaChange(): void {
    this.consultarVentasPorPlaca(this.placa);
    // Cargar info rápida para el badge
    if (this.placa && this.placa.trim() !== '') {
      this.loadPlateQuickInfo();
    } else {
      this.plateQuickInfo = null;
    }
  }

  loadPlateQuickInfo(): void {
    if (!this.placa || this.placa.trim() === '') {
      this.plateQuickInfo = null;
      return;
    }

    this.loadingPlateInfo = true;
    const userData = this.authService.getCurrentUser();
    const sucursalId = userData?.sucursalId || 1;

    this.http.get<any>(`${environment.apiUrl}/plates/${this.placa}/quick-info`, {
      params: { sucursalId: sucursalId.toString() }
    }).subscribe({
      next: (response) => {
        this.plateQuickInfo = response;
        this.loadingPlateInfo = false;
      },
      error: (error) => {
        console.error('Error al cargar info de placa:', error);
        this.plateQuickInfo = null;
        this.loadingPlateInfo = false;
      }
    });
  }





  showReceiptModal(): void {
    const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));

    const ticketData = this.getTicketData();
    console.log('Datos para el recibo:', ticketData);

    if (!ticketData || !ticketData.items || ticketData.items.length === 0) {
      console.error('No hay productos disponibles para imprimir el recibo.');
      return;
    }

    setTimeout(() => {
      this.printReceipt(ticketData);
      receiptModal.show();

      // Escuchar el evento de cierre del modal
      const modalElement = document.getElementById('receiptModal');
      modalElement?.addEventListener('hidden.bs.modal', () => {
        // Mostrar el popup de facturación después de cerrar el ticket
        this.showSaleCompletedPopup = true;
      }, { once: true }); // El evento se ejecutará solo una vez
    }, 500);
  }



  printReceipt(ticketData: any): void {
    if (!ticketData || !ticketData.items || ticketData.items.length === 0) {
      console.error('No hay productos disponibles para imprimir.');
      console.log('Datos del recibo:', ticketData);

      return;
    }

    const lineHeight = 5;
    let yPosition = 10;

    // Calcular la altura dinámica del documento (holgada para evitar cortes al final)
    const totalHeight = 300 + ticketData.items.length * 12; // margen extra para pie
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, totalHeight],
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);

    // Encabezado: Domicilio Fiscal
    doc.text('AUTOLAVADO RL', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('¡Gracias por su Compra!', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Domicilio Fiscal:', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Calle: RIVA PALACIO No. 1139', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('Col. SAN ISIDRO, CP: 52105', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('SAN MATEO ATENCO,', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('MEXICO, MEXICO.', 29, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('RFC: ARL210713UK5', 29, yPosition, { align: 'center' });

    doc.setLineWidth(0.5);
    yPosition += 2;
    doc.line(5, yPosition, 53, yPosition); // Línea horizontal
    yPosition += lineHeight;

    // Información General
    doc.text(`Sucursal:`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`${ticketData.branch}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Recibo:`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`${ticketData.receiptNumber}`, 5, yPosition);
    yPosition += lineHeight;
    // Fecha y Hora de la venta
    doc.text(`Fecha y Hora:`, 5, yPosition);
    yPosition += lineHeight;
    // Determinar cómo formatear la fecha según si trae zona horaria
    const rawFecha = ticketData?.fechaVenta as string | null;
    const fechaHoraStr = (rawFecha && /Z|[+-]\d{2}:\d{2}$/.test(rawFecha))
      ? new Date(rawFecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
      : (rawFecha
        ? rawFecha.replace('T', ' ').slice(0, 19)
        : new Date().toLocaleString('es-MX'));
    doc.text(`${fechaHoraStr}`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`Atendido por:`, 5, yPosition);
    yPosition += lineHeight;
    doc.text(`${ticketData.userName}`, 5, yPosition);
    yPosition += lineHeight;

    if (ticketData.licensePlate) {
      doc.text(`Placas: ${ticketData.licensePlate}`, 5, yPosition);
      yPosition += lineHeight;
    }

    doc.text(`Método de Pago:`, 5, yPosition);
    yPosition += lineHeight;

    doc.text(`${ticketData.paymentMethod}`, 5, yPosition);
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

    ticketData.items.forEach((item: any) => {
      doc.setFont('helvetica', 'normal');
      doc.text(`Producto: ${item.name}`, 5, yPosition);
      yPosition += lineHeight;
      doc.text(`Cantidad: ${item.quantity}`, 5, yPosition);
      yPosition += lineHeight;
      doc.text(`Total: $${item.total.toFixed(2)}`, 5, yPosition);
      yPosition += lineHeight;
    });

    doc.line(5, yPosition, 53, yPosition); // Línea horizontal final
    yPosition += lineHeight;

    // Total general
    doc.setFont('helvetica', 'bold');
    if (this.descuentoAplicado && this.descuentoAplicado > 0) {
      doc.text(`Descuento 6ª visita: -$${this.descuentoAplicado.toFixed(2)}`, 5, yPosition);
      yPosition += lineHeight;
    }
    doc.text(`Total Vendido: $${ticketData.total.toFixed(2)}`, 5, yPosition);
    yPosition += lineHeight;

    // Pie de ticket centrado
    doc.setLineWidth(0.5);
    doc.line(5, yPosition, 53, yPosition);
    yPosition += lineHeight;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    const centerX = 29; // ancho/2 del ticket de 58mm (~54mm imprimibles)
    // Envolver líneas largas para que no se corten y mantener centrado
    const maxTextWidth = 48; // ~ margen horizontal útil
    const aviso1 = doc.splitTextToSize('FAVOR DE NO DEJAR EN EL VEHÍCULO OBJETOS DE VALOR.', maxTextWidth);
    const aviso2 = doc.splitTextToSize('LA EMPRESA NO SE HACE RESPONSABLE', maxTextWidth);
    aviso1.forEach((l: string) => { doc.text(l, centerX, yPosition, { align: 'center' }); yPosition += lineHeight; });
    aviso2.forEach((l: string) => { doc.text(l, centerX, yPosition, { align: 'center' }); yPosition += lineHeight; });

    doc.setFont('helvetica', 'bold');
    doc.text('GRACIAS POR SU VISITA', centerX, yPosition, { align: 'center' });
    yPosition += lineHeight;
    doc.text('VUELVA PRONTO', centerX, yPosition, { align: 'center' });

    // Generar blob y URL del PDF
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Asignar el PDF al iframe del modal
    const iframe: HTMLIFrameElement = document.getElementById('receiptIframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = pdfUrl;
    } else {
      console.error('El iframe del recibo no fue encontrado en el DOM.');
    }
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


  getTicketData() {
    if (!this.cart || this.cart.length === 0) {
      console.error('No hay productos en el carrito para generar el recibo.');
      return null;
    }

    return {
      branch: this.selectedSucursal || 'Sucursal no asignada',
      receiptNumber: this.lastReceiptNumber || 'Sin número de recibo',
      userName: this.userName || 'Cajero no identificado',
      licensePlate: this.placa || 'Sin placa registrada',
      paymentMethod: this.paymentMethod || 'Sin método de pago',
      change: this.change || 0,
      totalVisits: this.ventasTotales || 0,
      cyclesCompleted: this.plateQuickInfo?.cyclesCompleted || 0,
      nextInCycle: this.plateQuickInfo?.nextInCycle || 0,
      cantidadRecibida: this.amountReceived || 0,
      note: this.getNotaCompleta(),
      // Pasar la fecha/hora de venta desde backend para que el ticket no dependa del reloj local
      fechaVenta: this.lastSaleDate || null,
      items: this.cart.map((item) => ({
        name: item.nombre || 'Producto desconocido',
        quantity: item.cantidad || 1,
        total: (item.precio || 0) * (item.cantidad || 1),
      })),
      total: this.calculateTotal() - (this.descuentoAplicado || 0),
    };
  }









  calculateHighestPackageDiscount(): number {
    // Verificar si la placa es elegible para descuento usando el sistema de lealtad
    if (this.plateQuickInfo && this.plateQuickInfo.eligibleForDiscount && this.cart.length > 0) {
      // Encuentra el producto con el precio más alto en el carrito
      const highestPricedItem = this.cart.reduce((prev, current) => {
        return current.precio > prev.precio ? current : prev;
      }, this.cart[0]);

      // Si hay un producto, retorna su precio como descuento
      return highestPricedItem ? highestPricedItem.precio : 0;
    }
    // Si no aplica descuento, retorna 0
    return 0;
  }




  consultarVentasPorPlaca(placa: string): void {
    if (!placa || placa.trim() === '') {
      // Si no hay placa, resetea la información de lealtad
      this.ventasTotales = 0;
      this.descuentoAplicado = 0;
      this.plateQuickInfo = null;
      return;
    }

    this.loadingPlateInfo = true;

    // Obtener ID de sucursal del localStorage
    const currentUser = localStorage.getItem('currentUser');
    let sucursalId = 1;
    if (currentUser) {
      const user = JSON.parse(currentUser);
      sucursalId = user.sucursal?.id || 1;
    }

    // Consultar información de lealtad de la placa desde el endpoint correcto
    this.http.get<any>(`${environment.apiUrl}/plates/${placa}/quick-info?sucursalId=${sucursalId}`).subscribe(
      (info) => {
        this.plateQuickInfo = info;
        this.ventasTotales = info.totalVisits || 0;

        // Si es elegible para descuento (tiene 6 o más visitas), aplicar descuento
        if (info.eligibleForDiscount) {
          this.aplicarDescuento();
        } else {
          this.descuentoAplicado = 0;
        }

        this.loadingPlateInfo = false;
      },
      (error) => {
        console.error('Error al consultar información de lealtad de la placa:', error);
        this.ventasTotales = 0;
        this.descuentoAplicado = 0;
        this.plateQuickInfo = null;
        this.loadingPlateInfo = false;
      }
    );
  }


  aplicarDescuento(): void {
    const productoMayorValor = this.cart.reduce((prev, curr) =>
      prev.precio > curr.precio ? prev : curr
    );
    this.descuentoAplicado = productoMayorValor ? productoMayorValor.precio : 0;
  }



  calcularTotalConDescuento(): number {
    return this.calculateTotal() - this.descuentoAplicado;
  }

  // Método para obtener la nota completa combinando texto manual y selector de aspirado
  getNotaCompleta(): string {
    const partes: string[] = [];

    // Primero agregar la nota manual si existe
    if (this.nota && this.nota.trim() !== '') {
      partes.push(this.nota.trim());
    }

    const formatoSiNo = (valor: string) => valor === 'si' ? 'SI' : 'NO';

    if (this.nombreClienteNota && this.nombreClienteNota.trim() !== '') {
      partes.push(`NOMBRE: ${this.nombreClienteNota.trim().toUpperCase()}`);
    }

    partes.push(`CAJUELA: ${formatoSiNo(this.cajuela)}`);
    partes.push(`AROMA: ${formatoSiNo(this.aroma)}`);
    partes.push(`BRILLO: ${formatoSiNo(this.brillo)}`);
    partes.push(`ASPIRADO: ${formatoSiNo(this.aspirado)}`);

    // Unir con salto de línea para que aparezcan en renglones separados
    return partes.join('\n');
  }


  discardSale(): void {
    // Limpiar el carrito y los campos asociados a la venta
    this.clearCart();

    // Resetear el descuento
    this.descuentoAplicado = 0;

    // Resetear los contadores de ventas
    this.contadorVentas = 0; // Reinicia el contador de ventas para la placa
    this.ventasTotales = 0;   // Resetea el total histórico de ventas

    // Resetear otros campos como la placa y la sucursal
    this.placa = '';
    // this.selectedSucursal = '';

    // Ocultar la vista de pago si estaba activa
    this.showPaymentView = false;
  }

  obtenerUltimoReciboPorSucursal(): void {
    const sucursalId = this.authService.getSucursalId(); // Obtener la sucursal del usuario
    if (sucursalId) {
      this.http.get(`${environment.apiUrl}/ordenes-compra/ultimo-recibo?sucursalId=${sucursalId}`).subscribe(
        (response: any) => {

          this.lastReceiptNumber = response.numeroRecibo || 'AA0000'; // Actualizar el último número de recibo
          console.log('Último número de recibo:', this.lastReceiptNumber);
        },
        (error) => {
          console.error('Error al obtener el último recibo:', error);
        }
      );
    } else {
      console.error('Sucursal ID no encontrado. No se puede obtener el último recibo.');
    }
  }
  prepararDatosFactura() {
    this.ticketId = this.lastReceiptNumber;
  }


  // Modificación en timbrarFactura para usar los datos de la última venta
  timbrarFactura(): void {
    if (!this.cart || this.cart.length === 0) {
      Swal.fire('Error', 'No hay productos en el carrito para facturar.', 'error');
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

    // Si está marcado guardar cliente, primero guardar/actualizar el cliente
    if (this.guardarCliente) {
      this.guardarClienteAntesDeTimbrar().then(() => {
        this.procesarTimbrado();
      }).catch((error) => {
        console.error('Error al guardar cliente:', error);
        // Continuar con el timbrado aunque falle guardar el cliente
        this.procesarTimbrado();
      });
    } else {
      this.procesarTimbrado();
    }
  }

  private guardarClienteAntesDeTimbrar(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Si ya tenemos el ID del cliente seleccionado, actualizar directamente
      if (this.clienteSeleccionadoId) {
        const clienteActualizado = {
          id: this.clienteSeleccionadoId,
          nombreCompleto: this.datosFiscales.nombre,
          email: this.datosFiscales.email || '',
          telefono: '',
          domicilio: '',
          rfc: this.datosFiscales.rfc,
          razonSocial: this.datosFiscales.nombre,
          regimenFiscal: this.datosFiscales.regimenFiscal,
          usoCfdi: this.datosFiscales.usoCfdi,
          codigoPostal: this.datosFiscales.cp
        };

        this.http.put<any>(`${environment.apiUrl}/clientes/${this.clienteSeleccionadoId}`, clienteActualizado).subscribe({
          next: () => {
            console.log('Cliente actualizado correctamente');
            resolve();
          },
          error: (error) => {
            console.error('Error al actualizar cliente:', error);
            reject(error);
          }
        });
        return;
      }

      // Si no hay ID, buscar si el cliente ya existe por RFC
      this.http.get<any>(`${environment.apiUrl}/clientes/by-rfc/${encodeURIComponent(this.datosFiscales.rfc)}`).subscribe({
        next: (clienteExistente) => {
          // Cliente existe, actualizarlo
          const clienteActualizado = {
            id: clienteExistente.id,
            nombreCompleto: this.datosFiscales.nombre || clienteExistente.nombreCompleto,
            email: this.datosFiscales.email || clienteExistente.email,
            telefono: clienteExistente.telefono || '',
            domicilio: clienteExistente.domicilio || '',
            rfc: this.datosFiscales.rfc,
            razonSocial: this.datosFiscales.nombre,
            regimenFiscal: this.datosFiscales.regimenFiscal,
            usoCfdi: this.datosFiscales.usoCfdi,
            codigoPostal: this.datosFiscales.cp
          };

          this.http.put<any>(`${environment.apiUrl}/clientes/${clienteExistente.id}`, clienteActualizado).subscribe({
            next: () => {
              console.log('Cliente actualizado correctamente');
              resolve();
            },
            error: (error) => {
              console.error('Error al actualizar cliente:', error);
              reject(error);
            }
          });
        },
        error: (error) => {
          // Cliente no existe o error al buscar, crear nuevo
          if (error.status === 404) {
            const nuevoCliente = {
              nombreCompleto: this.datosFiscales.nombre,
              email: this.datosFiscales.email || '',
              telefono: '',
              domicilio: '',
              rfc: this.datosFiscales.rfc,
              razonSocial: this.datosFiscales.nombre,
              regimenFiscal: this.datosFiscales.regimenFiscal,
              usoCfdi: this.datosFiscales.usoCfdi,
              codigoPostal: this.datosFiscales.cp
            };

            this.http.post<any>(`${environment.apiUrl}/clientes`, nuevoCliente).subscribe({
              next: () => {
                console.log('Cliente creado correctamente');
                resolve();
              },
              error: (error) => {
                console.error('Error al crear cliente:', error);
                reject(error);
              }
            });
          } else {
            reject(error);
          }
        }
      });
    });
  }

  private procesarTimbrado(): void {
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
    this.http.post<{ requestId: string, status: string }>(`${environment.apiUrl}/factura/timbrar-async`, payload).subscribe({
      next: (response) => {
        const requestId = response.requestId;
        console.log('Timbrado iniciado, requestId:', requestId);

        // Iniciar polling
        this.pollTimbradoStatus(requestId);
      },
      error: (error) => {
        Swal.close();
        console.error('Error al iniciar el timbrado:', error);
        Swal.fire('Error', 'No se pudo iniciar el proceso de timbrado.', 'error');
      }
    });
  }

  private pollTimbradoStatus(requestId: string): void {
    const maxAttempts = 40; // 40 intentos * 3 segundos = 2 minutos máximo
    let attempts = 0;

    const interval = setInterval(() => {
      attempts++;

      this.http.get(`${environment.apiUrl}/factura/status/${requestId}`, {
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
            a.download = `factura-${this.lastSaleData.receiptNumber}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);

            let mensaje = 'Factura timbrada correctamente.';
            if (this.datosFiscales.email) {
              mensaje += ' También fue enviada al correo electrónico proporcionado.';
            }

            // Actualizar el estado de facturación en la base de datos
            const saleId = this.lastSaleData.receiptNumber;
            this.http.post(`${environment.apiUrl}/ordenes-compra/${saleId}/facturada`, { facturada: true }).subscribe({
              next: () => {
                console.log('Estado de facturación actualizado a true en la base de datos para la venta:', saleId);
              },
              error: (error) => {
                console.error('Error al actualizar el estado de facturación para la venta:', saleId, error);
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
            this.guardarCliente = false; // Resetear el checkbox
            this.clienteSeleccionadoId = null; // Resetear el ID del cliente seleccionado

            const facturaModal = document.getElementById('facturaModal');
            if (facturaModal) {
              const modal = bootstrap.Modal.getInstance(facturaModal);
              if (modal) {
                modal.hide();
              }
            }

            this.clearCart();
            Swal.fire('¡Éxito!', mensaje, 'success');

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
                Swal.fire('Error', 'Ocurrió un error al timbrar: ' + (jsonResponse.message || 'Error desconocido'), 'error');
              }
            });
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            Swal.close();
            Swal.fire('Timeout', 'El timbrado está tomando más tiempo del esperado. Por favor verifica en Orders.', 'warning');
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


  // Método para obtener el código SAT del método de pago
  private getFormaPagoCFDI(): string {
    switch (this.paymentMethod) {
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

  generarDatosCFDIJsonSinXML() {
    if (!this.cart || this.cart.length === 0) {
      return null;
    }

    let totalImpuestos = 0;
    const conceptos = this.cart.map(item => {
      // Calcular el precio base (sin IVA)
      const precioBase = +(item.precio / 1.16).toFixed(2);
      const importeBase = +(precioBase * item.cantidad).toFixed(2);
      // Calcular el traslado (IVA) y acumularlo
      const traslado = +(importeBase * 0.16).toFixed(2);
      totalImpuestos += traslado;
      return {
        ClaveProdServ: '01010101',
        NoIdentificacion: item.id.toString(),
        Cantidad: item.cantidad,
        ClaveUnidad: 'ACT',
        Unidad: 'Servicio',
        Descripcion: item.nombre,
        ValorUnitario: precioBase,  // Precio SIN IVA
        Importe: importeBase,       // Importe SIN IVA
        Descuento: 0.00,
        ObjetoImp: '02',
        Impuestos: {
          Traslados: [
            {
              Base: importeBase,              // Base SIN IVA para cálculo de impuestos
              Impuesto: '002',
              TipoFactor: 'Tasa',
              TasaOCuota: 0.160000,
              Importe: traslado
            }
          ]
        }
      };
    });

    // SubTotal = suma de importes SIN IVA
    const subtotal = +conceptos.reduce((sum, concepto) => sum + concepto.Importe, 0).toFixed(2);
    totalImpuestos = +totalImpuestos.toFixed(2);
    const total = +(subtotal + totalImpuestos).toFixed(2);

    // ✅ Usar la fecha/hora de venta del servidor como fuente de verdad
    const baseDate = this.lastSaleDate ? new Date(this.lastSaleDate) : new Date();
    const fechaMexico = baseDate
      .toLocaleString('sv-SE', { timeZone: 'America/Mexico_City' })
      .replace(' ', 'T');

    const sucursalId = this.authService.getSucursalId();

    return {
      SucursalId: sucursalId,
      Version: '4.0',
      Serie: 'A',
      Folio: this.lastReceiptNumber,
      Fecha: fechaMexico, // ✅ Fecha en zona horaria de México
      FormaPago: this.getFormaPagoCFDI(),
      SubTotal: subtotal,  // ✅ SIN IVA
      Descuento: 0.00,
      Moneda: 'MXN',
      TipoCambio: 1,
      Total: total,     // ✅ SubTotal + IVA
      TipoDeComprobante: 'I',
      Exportacion: '01',
      MetodoPago: 'PUE',
      LugarExpedicion: '52105',
      NoCertificado: '00001000000718090003',
      // ✅ EMISOR - ESTRUCTURA PLANA (como FacturacionService)
      EmisorRfc: 'ARL210713UK5',
      EmisorNombre: 'AUTOLAVADO RL',  // ✅ Nombre correcto registrado en SAT
      EmisorRegimenFiscal: '601',
      // ✅ RECEPTOR - ESTRUCTURA PLANA (como FacturacionService)
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


  generarCFDIJson() {
    if (!this.cart || this.cart.length === 0) {
      return null;
    }

    const conceptos = this.cart.map(item => {
      const importe = +(item.precio * item.cantidad).toFixed(2);
      const traslado = +(importe * 0.16).toFixed(2);
      return {
        ClaveProdServ: '01010101',
        NoIdentificacion: item.id.toString(),
        Cantidad: item.cantidad,
        ClaveUnidad: 'ACT',
        Unidad: 'Servicio',
        Descripcion: item.nombre,
        ValorUnitario: +item.precio.toFixed(2),
        Importe: importe,
        Descuento: 0.00,
        ObjetoImp: '02',
        Impuestos: {
          Traslados: [
            {
              Base: importe, // ✅ Aquí también agregamos el Base
              Impuesto: '002',
              TipoFactor: 'Tasa',
              TasaOCuota: 0.160000,
              Importe: traslado
            }
          ]
        }
      };
    });

    const subtotal = this.calculateTotal();
    const impuestos = +(subtotal * 0.16).toFixed(2);
    const total = +(subtotal + impuestos).toFixed(2);

    const baseDate = this.lastSaleDate ? new Date(this.lastSaleDate) : new Date();
    const sucursalId = this.authService.getSucursalId();

    return {
      SucursalId: sucursalId,
      Version: '4.0',
      Serie: 'A',
      Folio: this.lastReceiptNumber,
      Fecha: baseDate.toISOString(),
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
      NoCertificado: '00001000000718090003',  // ✅ Correcto
      Emisor: {
        Rfc: 'ARL210713UK5',                   // ✅ RFC real del emisor
        Nombre: 'AUTOLAVADO RL',               // ✅ Nombre real del emisor
        RegimenFiscal: '601'
      },
      Receptor: {
        Rfc: this.datosFiscales.rfc,
        Nombre: this.datosFiscales.nombre,
        DomicilioFiscalReceptor: this.datosFiscales.cp,
        RegimenFiscalReceptor: this.datosFiscales.regimenFiscal,
        UsoCFDI: this.datosFiscales.usoCfdi
      },
      InformacionGlobal: {
        Periodicidad: '01', // Para facturas individuales es '01' (diario)
        Meses: (baseDate.getMonth() + 1).toString().padStart(2, '0'),
        Año: baseDate.getFullYear()
      },
      Conceptos: conceptos,
      Impuestos: {
        TotalImpuestosTrasladados: impuestos,
        Traslados: [
          {
            Base: subtotal,                   // ✅ Aseguramos Base también aquí
            Impuesto: '002',
            TipoFactor: 'Tasa',
            TasaOCuota: 0.160000,
            Importe: impuestos
          }
        ]
      },
      email: this.datosFiscales.email || null
    };
  }





  finalizarVentaConFactura(factura: boolean) {
    // Verificar si esta venta completará el ciclo de 6 visitas (eligibleForDiscount O nextInCycle == 6)
    const willCompleteDiscount = this.plateQuickInfo && this.placa && this.placa.trim() !== '' &&
      (this.plateQuickInfo.eligibleForDiscount || this.plateQuickInfo.nextInCycle === 6);

    if (willCompleteDiscount) {
      // Mostrar pop-up de confirmación antes de proceder
      Swal.fire({
        title: '🎉 ¡Descuento de 6ta Visita!',
        html: `
        <div style="text-align: left; padding: 10px;">
          <p style="font-size: 16px; margin-bottom: 15px;">
            <strong>La placa ${this.placa}</strong> ${this.plateQuickInfo.eligibleForDiscount ? 'es elegible' : 'completará el ciclo'} para descuento de 6ta visita.
          </p>
          <p style="font-size: 14px; margin-bottom: 10px;">
            <i class="fas fa-check-circle" style="color: #28a745;"></i> 
            Visitas actuales: <strong>${this.plateQuickInfo.totalVisits}</strong> → Esta será la visita <strong>${this.plateQuickInfo.nextInCycle}</strong>
          </p>
          <p style="font-size: 14px; margin-bottom: 15px;">
            <i class="fas fa-gift" style="color: #ff6b6b;"></i> 
            Se aplicará descuento del <strong>100%</strong> sobre el producto de mayor valor
          </p>
          <hr>
          <p style="font-size: 13px; color: #666;">
            Presione OK para continuar con la venta y aplicar el descuento.
          </p>
        </div>
      `,
        icon: 'success',
        confirmButtonText: 'OK, Continuar',
        confirmButtonColor: '#28a745',
        allowOutsideClick: false,
        width: '500px'
      }).then((result) => {
        if (result.isConfirmed) {
          // Proceder con la venta después de confirmar
          this.finishSale();
          this.totalAmount = this.calculateTotal();
          this.showSaleCompletedPopup = true;
        }
      });
    } else {
      // No hay descuento, proceder normalmente
      this.finishSale();
      this.totalAmount = this.calculateTotal();
      this.showSaleCompletedPopup = true;
    }
  }

  abrirModalFactura() {
    const modalFactura = new bootstrap.Modal(document.getElementById('facturaModal'));
    modalFactura.show();
  }

  finalizarVenta(): void {
    // Verificar si esta venta completará el ciclo de 6 visitas (eligibleForDiscount O nextInCycle == 6)
    const willCompleteDiscount = this.plateQuickInfo && this.placa && this.placa.trim() !== '' &&
      (this.plateQuickInfo.eligibleForDiscount || this.plateQuickInfo.nextInCycle === 6);

    if (willCompleteDiscount) {
      // Mostrar pop-up de confirmación antes de proceder
      Swal.fire({
        title: '🎉 ¡Descuento de 6ta Visita!',
        html: `
        <div style="text-align: left; padding: 10px;">
          <p style="font-size: 16px; margin-bottom: 15px;">
            <strong>La placa ${this.placa}</strong> ${this.plateQuickInfo.eligibleForDiscount ? 'es elegible' : 'completará el ciclo'} para descuento de 6ta visita.
          </p>
          <p style="font-size: 14px; margin-bottom: 10px;">
            <i class="fas fa-check-circle" style="color: #28a745;"></i> 
            Visitas actuales: <strong>${this.plateQuickInfo.totalVisits}</strong> → Esta será la visita <strong>${this.plateQuickInfo.nextInCycle}</strong>
          </p>
          <p style="font-size: 14px; margin-bottom: 15px;">
            <i class="fas fa-gift" style="color: #ff6b6b;"></i> 
            Se aplicará descuento del <strong>100%</strong> sobre el producto de mayor valor
          </p>
          <hr>
          <p style="font-size: 13px; color: #666;">
            Presione OK para continuar con la venta y aplicar el descuento.
          </p>
        </div>
      `,
        icon: 'success',
        confirmButtonText: 'OK, Continuar',
        confirmButtonColor: '#28a745',
        allowOutsideClick: false,
        width: '500px'
      }).then((result) => {
        if (result.isConfirmed) {
          // Proceder con la venta después de confirmar
          this.finishSale();
        }
      });
    } else {
      // No hay descuento, proceder normalmente
      this.finishSale();
    }
  }

}
