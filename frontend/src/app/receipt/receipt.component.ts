import { Component, OnInit } from '@angular/core';
import { CartService } from '../service/cart.service';
import { Producto } from '../models/producto.model';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';  // Importar AuthService para obtener el usuario

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.css'],
})
export class ReceiptComponent implements OnInit {
  cart: Producto[] = [];
  total: number = 0;
  paymentMethod: string = '';  // Propiedad para el método de pago
  today: Date = new Date();  // Fecha actual
  receiptNumber: string = '';  // Número de recibo
  userName: string = '';  // Nombre del cajero
  amountReceived: number = 0;  // Cantidad recibida por efectivo
  change: number = 0;  // Cambio a devolver

  constructor(
    private cartService: CartService,
    private authService: AuthService  // AuthService para obtener el nombre del usuario
  ) {}

  ngOnInit(): void {
    this.cart = this.cartService.getCart();
    this.total = this.cartService.calculateTotal();
    this.paymentMethod = this.cartService.getPaymentMethod();
    this.userName = this.authService.getCurrentUser()?.nombreCompleto || 'Cajero';  // Obtener el nombre del usuario

    // Generar el número de recibo
    this.receiptNumber = `REC-${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${new Date()
      .getTime()
      .toString()
      .slice(-4)}`;

    // Si el método de pago es efectivo, calcular el cambio
    if (this.paymentMethod === 'Efectivo') {
      this.amountReceived = this.cartService.getAmountReceived();  // Cantidad recibida
      this.calculateChange();
    }
  }

  calculateChange(): void {
    this.change = this.amountReceived - this.total;  // Calcular el cambio
  }
}
