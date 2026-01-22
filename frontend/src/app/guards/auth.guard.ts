import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRole = route.data['expectedRole'];
  
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }
  
    // Obtiene el usuario autenticado
    const user = this.authService.getCurrentUser();
    const userRole = user?.rol?.trim().toLowerCase(); // Elimina espacios extra y pasa a minúsculas
  
    console.log(`🔹 Verificando acceso: Rol del usuario -> ${userRole}, Rol esperado -> ${expectedRole}`);
  
    // ✅ Permitir acceso al POS si el usuario es "Operador" o "Super Admin"
    if (route.routeConfig?.path?.includes('pos') && (userRole === 'operador' || userRole === 'super admin')) {
      console.log('✅ Acceso permitido al POS');
      return true;
    }
  
    // 🔴 Validación estándar para otras rutas
    if (expectedRole && userRole !== expectedRole.toLowerCase()) {
      console.warn(`🚫 Acceso denegado: Se esperaba ${expectedRole}, pero el usuario tiene ${userRole}`);
      this.router.navigate(['/unauthorized']);
      return false;
    }
  
    return true;
  }
  
  
  
  

  private redirectUser(role: string, sucursalId: any): void {
    switch (role) {
      case 'Super Admin':
        this.router.navigate(['/super-admin-menu']);
        break;
      case 'Admin':
        this.router.navigate(['/admin-menu']);
        break;
      case 'Operador':
        if (sucursalId) {
          this.router.navigate(['/pos'], { queryParams: { sucursalId } });
        } else {
          this.router.navigate(['/login']);
        }
        break;
      default:
        this.router.navigate(['/login']);
    }
  }
}
