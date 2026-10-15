import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AlertService } from '../core/alert.service';
import { ThemeService } from '../core/theme.service';
@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<main class="login">
    <button
      class="theme"
      type="button"
      (click)="theme.toggle()"
      [title]="theme.mode() === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'"
    >
      {{ theme.mode() === 'dark' ? '☀' : '☾' }}
    </button>
    <form class="card" [formGroup]="requiredForm" (ngSubmit)="changeRequired()" [hidden]="!mustChange()">
      <div class="brand">LC</div><h1>Crea una nueva contraseña</h1><p>Debes actualizar la contraseña temporal antes de continuar.</p>
      <label>Contraseña temporal <span class="required-marker">*</span><input type="password" formControlName="currentPassword" autocomplete="current-password" /></label>
      <label>Nueva contraseña <span class="required-marker">*</span><input type="password" formControlName="newPassword" autocomplete="new-password" /></label>
      <label>Confirmar contraseña <span class="required-marker">*</span><input type="password" formControlName="confirmation" autocomplete="new-password" /></label>
      <button [disabled]="requiredForm.invalid || loading()">Actualizar contraseña</button>
    </form>
    <form class="card" [formGroup]="form" (ngSubmit)="submit()" [hidden]="mustChange()">
      <div class="brand">LC</div>
      <h1>License Control</h1>
      <p>Administración central de accesos y licencias</p>
      <label>Usuario <span class="required-marker" aria-hidden="true">*</span><input formControlName="username" autocomplete="username" /></label
      ><label
        >Contraseña <span class="required-marker" aria-hidden="true">*</span><input
          type="password"
          formControlName="password"
          autocomplete="current-password" /></label
      ><button [disabled]="form.invalid || loading()">
        Iniciar sesión
      </button>
    </form>
  </main>`,
  styles: [
    `
      .login {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--page-bg), var(--primary-soft));
        position: relative;
      }
      .card {
        width: min(390px, calc(100% - 32px));
        background: var(--surface);
        padding: 40px;
        border: 1px solid var(--border);
        border-radius: 14px;
        box-shadow: var(--shadow);
      }
      .brand {
        width: 46px;
        height: 46px;
        display: grid;
        place-items: center;
        background: #1753e7;
        color: #fff;
        border-radius: 10px;
        font-weight: 700;
      }
      h1 {
        margin: 18px 0 6px;
      }
      p {
        margin: 0 0 28px;
      }
      label {
        display: grid;
        gap: 7px;
        margin: 16px 0;
        color: var(--text);
        font-weight: 600;
      }
      input {
        padding: 12px;
        border: 1px solid var(--input-border);
        border-radius: 7px;
      }
      form button {
        width: 100%;
        padding: 13px;
        border: 0;
        border-radius: 7px;
        background: var(--primary);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      .theme {
        position: absolute;
        top: 22px;
        right: 22px;
        width: 42px;
        height: 42px;
        border: 1px solid var(--border);
        border-radius: 50%;
        background: var(--surface);
        color: var(--primary);
        font-size: 22px;
        cursor: pointer;
      }
    `,
  ],
})
export class LoginComponent {
  private a = inject(AuthService);
  private r = inject(Router);
  private alerts = inject(AlertService);
  theme = inject(ThemeService);
  loading = signal(false);
  mustChange = signal(false);
  form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  requiredForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.a.login(v.username, v.password).subscribe({
      next: (result) => { this.loading.set(false); if(result.passwordChangeRequired){this.requiredForm.controls.currentPassword.setValue(v.password);this.mustChange.set(true);return;}void this.r.navigateByUrl('/usuarios'); },
      error: (e) => {
        this.loading.set(false);
        void this.alerts.error(
          'Acceso denegado',
          this.alerts.message(e, 'Usuario o contraseña incorrectos'),
        );
      },
    });
  }
  changeRequired() {
    if(this.requiredForm.invalid||this.loading())return;
    const v=this.requiredForm.getRawValue();
    if(v.newPassword!==v.confirmation){void this.alerts.warning('Revisa las contraseñas','La confirmación no coincide.');return;}
    this.loading.set(true);
    this.a.changePassword(v.currentPassword,v.newPassword,true).subscribe({next:()=>{this.loading.set(false);this.mustChange.set(false);this.form.reset();this.requiredForm.reset();void this.alerts.success('Contraseña actualizada','Inicia sesión con tu nueva contraseña.');},error:e=>{this.loading.set(false);void this.alerts.error('No fue posible actualizarla',this.alerts.message(e,'Verifica la contraseña temporal y los requisitos.'));}});
  }
}
