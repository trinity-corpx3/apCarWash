import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importa FormsModule para usar ngForm y ngModel

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true, // Componente standalone
  imports: [CommonModule, FormsModule], // Asegúrate de agregar FormsModule aquí
})
export class LoginComponent implements OnInit {
  email: string = '';
  password: string = '';

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // Verifica si el usuario ya está autenticado
    if (this.authService.isLoggedIn()) {
      const currentUser = this.authService.getCurrentUser();
      const role = currentUser?.rol;
      console.log('Usuario autenticado:', currentUser);
      this.redirectUser(role);
    }
  }

  /**
   * Maneja el inicio de sesión del usuario
   */
  onLogin(): void {
    if (!this.email || !this.password) {
      alert('Por favor, ingresa tu email y contraseña.');
      return;
    }

    this.authService.login(this.email, this.password).subscribe(
      (response) => {
        console.log('🔹 Login exitoso, usuario:', response);
        this.authService.setCurrentUser(response);

        // Verificamos qué rol tiene el usuario después de loguearse
        console.log('🔹 Rol recibido en login:', response.rol);

        this.redirectUser(response.rol);
      },
      (error) => {
        console.error('Error en el login:', error);
        alert('Usuario o contraseña incorrectos.');
      }
    );
  }


  /**
   * Redirige al usuario según su rol
   * @param role Rol del usuario
   */
  private redirectUser(role: any): void {
    const normalizedRole = role.toString().toLowerCase();
    switch (normalizedRole) {
      case 'super admin':
      case '1':
        this.router.navigate(['/super-admin-menu']);
        break;
      case 'admin':
      case '2':
        this.router.navigate(['/admin-menu']);
        break;
      case 'operador':
      case 'operator': // Added support for English 'operator'
      case '3':
        this.router.navigate(['/pos']);
        break;
      case 'director':
      case '4':
        this.router.navigate(['/director-orders']);
        break;
      default:
        console.error('Rol desconocido:', role);
        this.router.navigate(['/login']);
    }
  }



}
