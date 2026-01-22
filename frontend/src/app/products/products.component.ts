import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';  // Import FormsModule for ngModel
import { environment } from '../../environments/environment';  // Importar el entorno
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
declare var bootstrap: any;  // Import Bootstrap for modal control
import Swal from 'sweetalert2';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterModule, FormsModule, SidebarComponent],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']  // Fix typo 'styleUrl' to 'styleUrls'
})
export class ProductsComponent implements OnInit {
  [x: string]: any;
  title = 'Products';
  private currentUser: string = '';
  role: any;

  productos: any[] = [];  // List of products fetched from the backend
  newProducto = {
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    categoria: { id: 0 },
    sucursal: { id: 0, nombre: '' }, // Incluye id y nombre
    activo: true,
  };

  sucursalName: string = ''; // Declarar la propiedad sucursalName

  productoId: any = [];
  selectedProducto: any = {};  // For editing a selected product
  selectedProductoId: number | null = null;  // Hold selected product ID for deletion
  categorias: any[] = [];  // Categories fetched from the backend
  productId: any = [];

  // Utiliza la URL base del entorno configurada en environment
  private apiUrl = environment.apiUrl;

  showUserDropdown = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    // Obtener el usuario actual y su rol
    this.currentUser = this.authService.getCurrentUser();
    this.role = this.authService.getRoles();

    // Validar si el rol está asignado
    if (!this.role || !this.role.id) {
      console.error('Rol no asignado o inválido.');
      Swal.fire('Error', 'No tiene un rol asignado. Contacte al administrador.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    console.log('Rol del usuario:', this.role);

    // Redirigir según el rol del usuario
    switch (this.role.id) {
      case 1:
        console.log('Acceso como Super Admin');
        break;
      case 2:
        console.log('Acceso como Admin');
        this.router.navigate(['/admin-menu']);
        break;
      case 3:
        console.log('Acceso como Operador');
        this.router.navigate(['/operator-menu']);
        break;
      default:
        console.error('Rol no reconocido.');
        this.router.navigate(['/login']);
        return;
    }

    // Obtener ID de la sucursal desde el usuario actual
    const sucursalId = this.authService.getSucursalId();

    if (!sucursalId) {
      console.error('Sucursal ID no encontrado. No se puede cargar el nombre de la sucursal.');
      Swal.fire('Error', 'No se pudo determinar la sucursal asignada.', 'error');
      return;
    }

    // Obtener el nombre de la sucursal
    this.authService.getSucursalNombre(sucursalId).subscribe({
      next: (response: any) => {
        // Asignar el nombre de la sucursal
        this.sucursalName = response.nombre || 'Sucursal no encontrada';
        console.log('Nombre de la sucursal:', this.sucursalName);

        // Configurar el nombre de la sucursal para el nuevo producto
        this.newProducto.sucursal = {
          id: sucursalId,
          nombre: this.sucursalName, // Asignar el nombre en lugar del ID
        };

        // Cargar productos y categorías después de obtener la sucursal
        this.fetchProductos(); // Cargar productos filtrados por sucursal
        this.fetchCategorias(); // Cargar categorías
      },
      error: (error) => {
        console.error('Error al obtener el nombre de la sucursal:', error);
        Swal.fire('Error', 'No se pudo obtener el nombre de la sucursal.', 'error');
      },
    });
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

  // Fetch products by sucursal
  fetchProductos(): void {
    const sucursalId = this.authService.getSucursalId(); // Obtén el ID de la sucursal desde AuthService

    if (sucursalId) {
      this.http.get<any[]>(`${this.apiUrl}/productos/sucursal/${sucursalId}`).subscribe(
        (productos) => {
          // Filtrar los productos para que solo incluya los activos
          this.productos = productos
            .filter((producto) => producto.activo) // Solo productos activos
            .sort((a, b) => a.id - b.id); // Ordena los productos por ID de manera ascendente

          console.log('Productos activos cargados:', this.productos);
        },
        (error) => {
          console.error('Error al obtener los productos por sucursal:', error);
          Swal.fire(
            'Error',
            'No se pudieron cargar los productos para la sucursal seleccionada.',
            'error'
          );
        }
      );
    } else {
      console.error('ID de sucursal no está disponible.');
      Swal.fire('Error', 'El ID de la sucursal no está disponible.', 'error');
    }
  }




  // Fetch all categories from the backend
  fetchCategorias(): void {
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe(
      (categorias) => {
        this.categorias = categorias;
      },
      (error) => {
        console.error('Error fetching categories:', error);
      }
    );
  }

  // Add a new product
  addProducto(): void {
    if (!this.newProducto.sucursal?.id) {
      Swal.fire('Error', 'Por favor, selecciona una sucursal.', 'error');
      return;
    }

    this.http.post(`${this.apiUrl}/productos`, this.newProducto).subscribe(
      (response) => {
        console.log('Product added:', response);
        Swal.fire('Producto Añadido', 'El producto se ha añadido correctamente', 'success');
        this.fetchProductos(); // Refresca la lista de productos
        this.newProducto = {
          nombre: '',
          descripcion: '',
          precio: 0,
          stock: 0,
          categoria: { id: 0 },
          sucursal: { id: 0, nombre: '' }, // Incluye id y nombre
          activo: true,
        };
        const addProductsModal = bootstrap.Modal.getInstance(document.getElementById('addProductsModal'));
        addProductsModal.hide(); // Cierra el modal
      },
      (error) => {
        console.error('Error adding product:', error);
        // Mostrar el mensaje específico del servidor si está disponible
        const errorMessage = typeof error.error === 'string'
          ? error.error
          : 'Ocurrió un error al añadir el producto.';
        Swal.fire('Error', errorMessage, 'error');
      }
    );
  }



  // Delete a product
  deleteProducto(): void {
    if (this.selectedProductoId) {
      this.http.delete(`${this.apiUrl}/productos/${this.selectedProductoId}`).subscribe(
        (response) => {
          console.log('Producto eliminado correctamente', response);
          Swal.fire('Producto Eliminado', 'El producto ha sido eliminado correctamente', 'success');
          this.fetchProductos();  // Refresh products after deletion
          const deleteProductsModal = bootstrap.Modal.getInstance(document.getElementById('deleteProductsModal'));
          deleteProductsModal.hide();
        },
        (error) => {
          console.error('Error al eliminar el producto:', error);
          Swal.fire('Error', 'Ocurrió un error al eliminar el producto', 'error');
        }
      );
    }
  }

  // Update Product
  updateProducto(): void {
    const updateData = {
      id: this.selectedProducto.id,
      nombre: this.selectedProducto.nombre,
      descripcion: this.selectedProducto.descripcion,
      precio: this.selectedProducto.precio,
      stock: this.selectedProducto.stock,
      categoria: {
        id: this.selectedProducto.categoria.id
      },
      activo: this.selectedProducto.activo,
      sucursal: this.selectedProducto.sucursal
    };

    this.http.put(`${this.apiUrl}/productos/${this.selectedProducto.id}`, updateData).subscribe(
      (response) => {
        Swal.fire('Producto Actualizado', 'El producto se ha actualizado correctamente', 'success');
        this.fetchProductos();  // Actualiza la lista de productos desde el backend
        this.productos.sort((a, b) => a.id - b.id); // Ordena los productos por ID
        const modal = document.getElementById('editProductsModal') as HTMLElement;
        const modalInstance = bootstrap.Modal.getInstance(modal);
        modalInstance.hide();
      },
      (error) => {
        console.error('Error updating product:', error);
        // Mostrar el mensaje específico del servidor si está disponible
        const errorMessage = typeof error.error === 'string'
          ? error.error
          : 'Ocurrió un error al actualizar el producto';
        Swal.fire('Error', errorMessage, 'error');
      }
    );
  }


  // Show modals
  showAddModal(): void {
    const addProductsModal = new bootstrap.Modal(document.getElementById('addProductsModal'));
    addProductsModal.show();
  }

  // Mostrar modal para editar productos
  showEditModal(product: any): void {
    this.selectedProducto = { ...product };  // Copiar los datos del producto seleccionado
    const editProductsModal = new bootstrap.Modal(document.getElementById('editProductsModal'));
    editProductsModal.show();
  }

  // Show the delete modal and set the selected product ID
  showDeleteModal(productId: number): void {
    this.selectedProductoId = productId;  // Store product ID
    const deleteProductsModal = new bootstrap.Modal(document.getElementById('deleteProductsModal'));
    deleteProductsModal.show();
  }

  toggleUserDropdown(event: Event) {
    event.preventDefault();
    this.showUserDropdown = !this.showUserDropdown;
  }
}
