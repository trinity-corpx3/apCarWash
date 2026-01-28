import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';  // Importa el servicio Router
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-operator-menu',
  templateUrl: './operator-menu.component.html',
  styleUrls: ['operator-menu.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class OperatorMenuComponent {
  private currentUser: string = '';
  role: any;

  constructor(private authService: AuthService, private router: Router) { }  // Inyecta el Router
  ngOnInit() {

    this.currentUser = this.authService.getCurrentUser();
    this.role = this.authService.getRoles();
    console.log(this.role);

    switch (this.role) {
      case 1:
        this.router.navigate(['/super-admin-menu']);
        break;
      case 2:
        this.router.navigate(['/admin-menu']);
        break;
      case 3:
        // Operador va a orders donde tiene acceso al sidebar
        this.router.navigate(['/orders']);
        break;
      default:
        this.router.navigate(['/login']);
    }
  }
  goToPos() {
    console.log('Redirigiendo a POS...');
    this.router.navigate(['/pos']);
  }

}
