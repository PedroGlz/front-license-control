import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, EMPTY, finalize, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlertService } from './alert.service';

const pendingActions = new Set<string>();

function processMessage(method: string, path: string): [string, string] {
  if (method === 'GET') return ['Cargando información', 'Estamos consultando la información. Por favor espera…'];
  if (path.endsWith('/auth/login')) return ['Iniciando sesión', 'Estamos validando tu acceso. Por favor espera…'];
  if (method === 'DELETE') return ['Desactivando registro', 'Estamos actualizando el registro sin eliminar sus datos…'];
  if (path.endsWith('/password')) return ['Actualizando contraseña', 'Estamos protegiendo y guardando la nueva contraseña…'];
  if (/\/versions$/.test(path) && method === 'POST') return ['Subiendo APK', 'Estamos cargando y procesando el archivo. Esto puede tardar unos segundos…'];
  if (/\/versions\//.test(path)) return ['Actualizando versión', 'Estamos guardando los cambios de la versión…'];
  if (/\/systems\/[^/]+\/roles$/.test(path)) return ['Guardando roles', 'Estamos actualizando los roles asignados…'];
  if (/\/systems\/[^/]+\/attributes\//.test(path)) return ['Guardando información', 'Estamos actualizando los atributos del sistema…'];
  if (/\/users\/[^/]+\/systems$/.test(path)) return ['Asignando sistema', 'Estamos actualizando los accesos del usuario…'];
  const resource = path.split('/')[2];
  const names: Record<string, string> = { users: 'usuario', systems: 'sistema', roles: 'rol', attributes: 'atributo',
    'user-types': 'tipo de usuario', applications: 'aplicación', licenses: 'licencia', devices: 'dispositivo',
    'application-access': 'acceso', permissions: 'permiso' };
  const name = names[resource] || 'registro';
  return method === 'POST' ? [`Creando ${name}`, `Estamos registrando ${['aplicación', 'licencia'].includes(name) ? 'la' : 'el'} ${name}. Por favor espera…`]
    : [`Actualizando ${name}`, 'Estamos guardando los cambios. Por favor espera…'];
}

export const processInterceptor: HttpInterceptorFn = (req, next) => {
  const alerts = inject(AlertService);
  if (!req.url.startsWith(environment.apiUrl + '/')) return next(req);
  return defer(() => {
    const mutation = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
    const key = `${req.method} ${req.urlWithParams}`;
    if (mutation && pendingActions.has(key)) return EMPTY;
    if (mutation) pendingActions.add(key);
    const process = alerts.loading(...processMessage(req.method, req.url.slice(environment.apiUrl.length).split('?')[0]));
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      pendingActions.delete(key);
      alerts.closeLoading(process);
    };
    return defer(() => next(req)).pipe(
      tap({ next: event => { if (event instanceof HttpResponse) finish(); }, error: error => {
        finish();
        if (!mutation) void alerts.error('No fue posible cargar la información', alerts.message(error));
      } }),
      finalize(finish),
    );
  });
};
