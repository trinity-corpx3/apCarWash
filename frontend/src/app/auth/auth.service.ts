import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, of, tap, finalize } from 'rxjs';
import { environment } from '../../environments/environment'; // Importa el entorno

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl; // Usa la URL base del entorno
  private currentUser: any;
  private roles: any;

  constructor(private http: HttpClient) {}

  // Método para el login
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios/login`, { email, password }).pipe(
      tap((response: any) => {
        this.setCurrentUser(response); // Guardar los datos del usuario después del login
        localStorage.setItem('jwt', response.token); // Guardar el token
        localStorage.setItem('currentUser', JSON.stringify(response)); // Almacenar en localStorage
        this.roles = response.roles; // Cache roles in memory
        // Guardar credenciales en Basic para llamadas protegidas por Spring Security
        const basic = 'Basic ' + btoa(`${email}:${password}`);
        localStorage.setItem('basicAuth', basic);
      })
    );
  }

  // Establecer el usuario actual
  setCurrentUser(user: any): void {
    this.currentUser = user;
  }

  // Verificar si el usuario está autenticado
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  // Obtener los datos del usuario actual
  getCurrentUser(): any {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || !currentUser.id) {
      console.warn('No se encontró un usuario en el almacenamiento local.');
      return null; // Manejo seguro
    }
    return currentUser;
  }
  
  

  // Obtener el ID de la sucursal del usuario autenticado
  getSucursalId(): number | null {
    const currentUser = this.getCurrentUser();
    console.log('Sucursal ID obtenido del usuario:', currentUser?.sucursalId);
    return currentUser?.sucursalId || null;
}

  // Obtener el nombre de la sucursal desde el backend
getSucursalNombreFromBackend(sucursalId: number): Observable<string | null> {
  if (!sucursalId) {
    return new Observable((observer) => {
      observer.next(null);
      observer.complete();
    });
  }
  return this.http.get<{ nombre: string }>(`${this.apiUrl}/sucursales/${sucursalId}`).pipe(
    tap((response) => {
      console.log('Nombre de la sucursal obtenido del backend:', response.nombre);
    }),
    // Devuelve el nombre o null si no existe
    map((response) => response.nombre || null),
    catchError((error) => {
      console.error('Error al obtener el nombre de la sucursal:', error);
      return of(null);
    })
  );
}

// Obtener el nombre de la sucursal del usuario autenticado
getSucursalNombre(sucursalId: number): Observable<any> {
  const token = localStorage.getItem('jwt');
  return this.http.get(`${this.apiUrl}/sucursales/${sucursalId}`, {
    headers: new HttpHeaders({
      Authorization: `Bearer ${token}`,
    }),
  });
}



  
  

  // Cerrar sesión
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/usuarios/logout`, {}).pipe(
      finalize(() => {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('jwt');
        this.currentUser = null;
      })
    );
  }

  // Obtener roles desde memoria o localStorage
 getRoles(): any {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (currentUser && currentUser.rol) {
    if (typeof currentUser.rol === 'string') {
      // Convertir el string en un objeto con nombre y asignar un id por defecto
      return { id: 1, nombre: currentUser.rol };
    }
    return currentUser.rol;
  }
  console.warn('El usuario no tiene un rol asignado.');
  return { id: null, nombre: 'Sin rol' };
}

  

  // Verificar si un usuario tiene un rol específico
  hasRole(role: string): boolean {
  const user = this.getCurrentUser();
  if (!user || !user.rol) {
    return false;
  }

  // Comparación insensible a mayúsculas/minúsculas
  return user.rol.toLowerCase() === role.toLowerCase();
}

}
