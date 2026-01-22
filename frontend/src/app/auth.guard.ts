import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const user = this.authService.getCurrentUser();

    if (!user) {
      console.error('🚫 Usuario no autenticado');
      this.router.navigate(['/login']);
      return false;
    }

    const expectedRoles: string[] = route.data['expectedRoles'];
    const userRole = typeof user.rol === 'string' ? user.rol : user.rol?.nombre;

    if (expectedRoles && !expectedRoles.includes(userRole)) {
      console.error(`🚫 Acceso denegado: Se esperaba uno de [${expectedRoles.join(', ')}], pero el usuario tiene ${userRole}`);
      this.router.navigate(['/login']);
      return false;
    }

    return true;
  }
}
