import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';

@Component({
  selector: 'app-user-security', standalone: true, imports: [ButtonModule, InputTextModule, FormsModule],
  styleUrls: ['./user-detail.scss'],
  template: `<section class="user-card">
    <h2>Cambiar contraseña</h2><p>Actualiza la contraseña sin modificar los datos ni los accesos del usuario.</p>
    <form #securityForm="ngForm" (ngSubmit)="submit()">
      <div class="user-grid">
        <label>Nueva contraseña <span class="required-marker" aria-hidden="true">*</span><input pInputText [type]="visible ? 'text' : 'password'" name="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password" /></label>
        <label>Confirmar contraseña <span class="required-marker" aria-hidden="true">*</span><input pInputText [type]="visible ? 'text' : 'password'" name="confirmation" [(ngModel)]="confirmation" required autocomplete="new-password" /></label>
      </div>
      <button pButton type="button" class="secondary" style="margin-top:12px" [attr.aria-pressed]="visible" (click)="visible = !visible">{{ visible ? 'Ocultar contraseñas' : 'Mostrar contraseñas' }}</button>
      <ul class="requirements" aria-live="polite">
        <li [class.met]="password.length >= 8">{{ password.length >= 8 ? '✓' : '○' }} Al menos 8 caracteres</li>
        <li [class.met]="matches()">{{ matches() ? '✓' : '○' }} Ambas contraseñas coinciden</li>
      </ul>
      @if (confirmation && !matches()) { <p class="form-error">Las contraseñas no coinciden.</p> }
      <div class="user-actions"><button pButton type="button" class="secondary" [disabled]="busy" (click)="reset()">Cancelar</button><button pButton [disabled]="securityForm.invalid || !matches() || busy">Actualizar contraseña</button></div>
    </form>
  </section>`,
})
export class UserSecurityComponent {
  userId = input.required<string>();
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  password = ''; confirmation = ''; visible = false; busy = false;
  matches() { return !!this.password && this.password === this.confirmation; }
  reset() { this.password = ''; this.confirmation = ''; this.visible = false; }
  async submit() {
    if (this.busy || this.password.length < 8 || !this.matches()) return;
    this.busy = true;
    if (!(await this.alerts.confirm('¿Actualizar contraseña?', 'El usuario deberá utilizar la nueva contraseña para iniciar sesión.')).isConfirmed) { this.busy = false; return; }
    this.api.put(`/admin/users/${this.userId()}/password`, { password: this.password }).subscribe({
      next: () => { this.reset(); this.busy = false; void this.alerts.success('Contraseña actualizada'); },
      error: (e) => { this.busy = false; void this.alerts.error('No fue posible actualizar la contraseña', this.alerts.message(e)); },
    });
  }
}
