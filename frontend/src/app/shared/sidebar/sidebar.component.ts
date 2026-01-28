import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {
  showUserDropdown = false;
  isCollapsed = false;

  // Estructura de navegación agrupada con control de roles
  navSections = [
    {
      title: 'Principal',
      items: [
        { route: '/super-admin-menu', icon: 'fa-home', label: 'INICIO', allowedRoles: ['super admin', 'operador'] }
      ]
    },
    {
      title: 'Ventas',
      items: [
        { route: '/orders', icon: 'fa-dollar-sign', label: 'ÓRDENES', allowedRoles: ['super admin', 'operador'] },
        { route: '/plates', icon: 'fa-car', label: 'PLACAS', allowedRoles: ['super admin', 'operador'] }
      ]
    },
    {
      title: 'Gestión',
      items: [
        { route: '/products', icon: 'fa-store', label: 'CATÁLOGO', allowedRoles: ['super admin'] },
        { route: '/expenses', icon: 'fa-receipt', label: 'GASTOS', allowedRoles: ['super admin', 'operador'] },
        { route: '/employees', icon: 'fa-users', label: 'EMPLEADOS', allowedRoles: ['super admin'] },
        { route: '/customers', icon: 'fa-address-book', label: 'CLIENTES', allowedRoles: ['super admin', 'operador'] }
      ]
    }
  ];

  constructor(
    public router: Router,
    private authService: AuthService
  ) { }

  // Método para obtener secciones filtradas según el rol del usuario
  getFilteredSections() {
    const user = this.authService.getCurrentUser();
    const userRole = user?.rol?.trim().toLowerCase();

    return this.navSections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.allowedRoles?.includes(userRole || '')
      )
    })).filter(section => section.items.length > 0); // Eliminar secciones vacías
  }

  toggleUserDropdown(event: Event): void {
    event.preventDefault();
    this.showUserDropdown = !this.showUserDropdown;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    // Añadir/remover clase al body para ajustar el contenido
    if (this.isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }

  logout(): void {
    // Primero limpiar el almacenamiento local
    localStorage.removeItem('currentUser');
    localStorage.removeItem('jwt');
    localStorage.removeItem('basicAuth');

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

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}

