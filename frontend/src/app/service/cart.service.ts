import { Injectable } from '@angular/core';
import { Producto } from '../models/producto.model';  // Importa el modelo Producto
import { HttpClient } from '@angular/common/http';   // Importa HttpClient para hacer solicitudes HTTP
import { Observable } from 'rxjs';  // Importa Observable desde 'rxjs'
import { environment } from '../../environments/environment';  // Importar la URL base del entorno

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cart: Producto[] = [];  // Define el array como Producto[]
  private paymentMethod: string = '';  // Nueva propiedad para almacenar el método de pago
  private amountReceived: number = 0;  // Propiedad para manejar la cantidad recibida del cliente
  private change: number = 0;  // Propiedad para almacenar el cambio

  constructor(private http: HttpClient) {}  // Asegúrate de inyectar HttpClient
  
  // Crear una orden
  createOrder(orderData: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/ordenes-compra`, orderData);
  }

  // Añadir producto al carrito
  addToCart(product: Producto): void {
    this.cart.push(product);  // Añadir el producto de tipo Producto al carrito
  }

  // Remover producto del carrito
  removeFromCart(product: Producto): void {
    this.cart = this.cart.filter(item => item.id !== product.id);  // Filtra los productos por ID
  }

  // Obtener el carrito
  getCart(): Producto[] {
    return this.cart;  // Asegúrate de que está retornando el array de productos
  }

  // Vaciar el carrito
  clearCart(): void {
    this.cart = [];  // Vacía el carrito
  }

  // Calcular el total del carrito
  calculateTotal(): number {
    return this.cart.reduce((total, product) => total + (product.precio || 0) * (product.cantidad || 1), 0);  // Suma los precios de los productos con cantidades
  }

  // Métodos para el método de pago
  setPaymentMethod(method: string): void {
    this.paymentMethod = method;
  }

  getPaymentMethod(): string {
    return this.paymentMethod;
  }

  // Métodos para manejar la cantidad recibida
  setAmountReceived(amount: number): void {
    this.amountReceived = amount;
    this.calculateChange();  // Recalcula el cambio cada vez que se establece la cantidad recibida
  }

  getAmountReceived(): number {
    return this.amountReceived;
  }

  // Método para calcular el cambio
  calculateChange(): void {
    const total = this.calculateTotal();
    this.change = this.amountReceived - total;
  }

  getChange(): number {
    return this.change;
  }
}
