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
    <form class="card" [formGroup]="form" (ngSubmit)="submit()">
      <div class="brand">LC</div>
      <h1>License Control</h1>
      <p>Administración central de accesos y licencias</p>
      <label>Usuario<input formControlName="username" autocomplete="username" /></label
      ><label
        >Contraseña<input
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
  form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.a.login(v.username, v.password).subscribe({
      next: () => this.r.navigateByUrl('/usuarios'),
      error: (e) => {
        this.loading.set(false);
        void this.alerts.error(
          'Acceso denegado',
          this.alerts.message(e, 'Usuario o contraseña incorrectos'),
        );
      },
    });
  }
}
