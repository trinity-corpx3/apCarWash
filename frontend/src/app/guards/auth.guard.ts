import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles = route.data['expectedRoles'] as string[] | undefined;

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Obtiene el usuario autenticado
    const user = this.authService.getCurrentUser();
    const userRole = user?.rol?.trim().toLowerCase(); // Elimina espacios extra y pasa a minúsculas

    console.log(`🔹 Verificando acceso: Rol del usuario -> ${userRole}, Roles esperados -> ${expectedRoles?.join(', ')}`);

    // Si no hay roles esperados, permitir acceso
    if (!expectedRoles || expectedRoles.length === 0) {
      console.log('✅ Acceso permitido (sin restricciones de rol)');
      return true;
    }

    // Verificar si el rol del usuario está en la lista de roles permitidos
    const hasAccess = expectedRoles.some(role => role.toLowerCase() === userRole);

    if (hasAccess) {
      console.log(`✅ Acceso permitido: ${userRole} está autorizado`);
      return true;
    }

    // Acceso denegado
    console.warn(`🚫 Acceso denegado: Se esperaba uno de [${expectedRoles.join(', ')}], pero el usuario tiene ${userRole}`);
    this.router.navigate(['/unauthorized']);
    return false;
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
