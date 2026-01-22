import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // No adjuntar Authorization en login ni en preflight
  if (req.method === 'OPTIONS' || req.url.includes('/api/usuarios/login')) {
    return next(req);
  }

  // Leer credenciales Basic de la sesión
  const authHeader = localStorage.getItem('basicAuth') || '';

  const clonedRequest = req.clone({
    headers: authHeader ? req.headers.set('Authorization', authHeader) : req.headers,
  });

  return next(clonedRequest);
};
