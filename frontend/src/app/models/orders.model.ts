export interface Orders {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: any;  // Adjust this to the appropriate type if necessary
  cantidad: number;  // Add this to track how many items of this product are in the cart
}
