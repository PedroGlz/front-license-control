import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  success(title: string, message?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'success',
      title,
      text: message,
      timer: 1500,
      showConfirmButton: false,
    });
  }

  error(title: string, message?: string): Promise<SweetAlertResult> {
    return this.show('error', title, message);
  }

  warning(title: string, message?: string): Promise<SweetAlertResult> {
    return this.show('warning', title, message);
  }

  info(title: string, message?: string): Promise<SweetAlertResult> {
    return this.show('info', title, message);
  }

  confirm(title: string, message?: string): Promise<SweetAlertResult> {
    return Swal.fire({
      icon: 'warning',
      title,
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b42318',
      reverseButtons: true,
    });
  }

  message(error: any, fallback = 'No fue posible completar la operación'): string {
    return error?.error?.detail || error?.error?.message || fallback;
  }

  private show(icon: SweetAlertIcon, title: string, text?: string): Promise<SweetAlertResult> {
    return Swal.fire({ icon, title, text, confirmButtonText: 'Aceptar' });
  }
}
