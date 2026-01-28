import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-super-admin-menu',
  templateUrl: './super-admin-menu.component.html',
  styleUrls: ['./super-admin-menu.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class SuperAdminMenuComponent implements OnInit {
  role: any;

  constructor(private authService: AuthService, private router: Router) {
    console.log('SuperAdminMenuComponent constructor');
  }

  ngOnInit() {
    console.log('SuperAdminMenuComponent ngOnInit');
    const currentUser = this.authService.getCurrentUser();
    console.log('Usuario actual:', currentUser);

    this.role = typeof currentUser?.rol === 'string' ? currentUser?.rol : currentUser?.rol?.nombre;
    console.log('Rol del usuario:', this.role);

    // Redirigir si el usuario no es Super Admin
    if (this.role !== 'Super Admin') {
      console.log('Usuario no es Super Admin, redirigiendo...');
      switch (this.role) {
        case 'Admin':
          this.router.navigate(['/admin-menu']);
          break;
        case 'Operator':
          this.router.navigate(['/orders']);
          break;
        case 'Director':
          this.router.navigate(['/director-orders']);
          break;
        default:
          this.router.navigate(['/login']);
      }
    } else {
      console.log('Usuario es Super Admin, permaneciendo en la página');
    }
  }

  // Ya no necesitamos estos métodos ya que usamos routerLink
  // goToOrders() y goToPos() pueden ser eliminados
}
