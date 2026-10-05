import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertResult } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private processes = new Set<symbol>();
  private waiting: (() => void)[] = [];

  loading(title = 'Procesando', message = 'Por favor espera…'): symbol {
    const process = Symbol();
    this.processes.add(process);
    if (this.processes.size === 1) {
      void Swal.fire({ title, text: message, allowOutsideClick: false, allowEscapeKey: false,
        showConfirmButton: false, showCloseButton: false, didOpen: () => Swal.showLoading() });
    }
    return process;
  }

  closeLoading(process: symbol): void {
    if (!this.processes.delete(process) || this.processes.size) return;
    Swal.close();
    this.waiting.splice(0).forEach(resolve => resolve());
  }

  private async waitForProcesses(): Promise<void> {
    await Promise.resolve();
    while (this.processes.size) await new Promise<void>(resolve => this.waiting.push(resolve));
  }

  async success(title: string, message?: string): Promise<SweetAlertResult> {
    await this.waitForProcesses();
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

  async confirm(title: string, message?: string): Promise<SweetAlertResult> {
    await this.waitForProcesses();
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
    const message = error?.error?.message ?? error?.error?.detail;
    return typeof message === 'string' && message.trim() && message.length <= 350 &&
      !/select\s|insert\s+into|update\s+\w+\s+set|delete\s+from|unknown column|duplicate entry|foreign key|jdbc:|stacktrace|password_hash|\$argon2|\$2[aby]\$|bearer\s|secret\s*[:=]|password\s*[:=]|[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/i.test(message)
      ? message : fallback;
  }

  private async show(icon: SweetAlertIcon, title: string, text?: string): Promise<SweetAlertResult> {
    await this.waitForProcesses();
    return Swal.fire({ icon, title, text, confirmButtonText: 'Aceptar' });
  }
}
