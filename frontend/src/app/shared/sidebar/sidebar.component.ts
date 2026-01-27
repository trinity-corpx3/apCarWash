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

  // Estructura de navegación agrupada
  navSections = [
    {
      title: 'Principal',
      items: [
        { route: '/super-admin-menu', icon: 'fa-home', label: 'INICIO' }
      ]
    },
    {
      title: 'Ventas',
      items: [
        { route: '/orders', icon: 'fa-dollar-sign', label: 'ÓRDENES' },
        { route: '/plates', icon: 'fa-car', label: 'PLACAS' }
      ]
    },
    {
      title: 'Gestión',
      items: [
        { route: '/products', icon: 'fa-store', label: 'CATÁLOGO' },
        { route: '/expenses', icon: 'fa-receipt', label: 'GASTOS' },
        { route: '/employees', icon: 'fa-users', label: 'EMPLEADOS' },
        { route: '/customers', icon: 'fa-address-book', label: 'CLIENTES' }
      ]
    }
  ];

  constructor(
    public router: Router,
    private authService: AuthService
  ) { }

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

