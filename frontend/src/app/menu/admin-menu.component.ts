import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';  // Importa el servicio Router
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service'; 

@Component({
  selector: 'app-admin-menu',
  templateUrl: './admin-menu.component.html',
  styleUrls: ['./admin-menu.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AdminMenuComponent {
  constructor(private authService: AuthService, private router: Router) {}  // Inyecta el Router
  
  private currentUser: string = '';
  role: any;

  ngOnInit() {
    
    this.currentUser = this.authService.getCurrentUser();
    this.role = this.authService.getRoles();
    console.log(this.role);

    switch (this.role) {
      case 1:
        this.router.navigate(['/super-admin-menu']);
        break;
      case 2:
        break;
      case 3:
        this.router.navigate(['/operator-menu']);
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
