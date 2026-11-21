import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
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
      <div class="brand">CM</div><h1>Crea una nueva contraseña</h1><p>La contraseña temporal debe seguir vigente. Al guardar, cerrarás esta sesión temporal y deberás iniciar sesión nuevamente.</p>
      @if(notice()){<p class="status-message" [class.success]="noticeType()==='success'" [class.info]="noticeType()==='info'" [class.warning]="noticeType()==='warning'" [class.error]="noticeType()==='error'" [attr.role]="noticeType()==='error' ? 'alert' : 'status'">{{notice()}}</p>}
      <label>Contraseña temporal <span class="required-marker">*</span><input type="password" formControlName="currentPassword" autocomplete="current-password" /></label>
      <label>Nueva contraseña <span class="required-marker">*</span><input type="password" formControlName="newPassword" autocomplete="new-password" /></label>
      <small class="field-help">Usa al menos 8 caracteres.</small>
      <label>Confirmar contraseña <span class="required-marker">*</span><input type="password" formControlName="confirmation" autocomplete="new-password" /></label>
      @if(requiredForm.controls.confirmation.touched && requiredForm.controls.newPassword.value!==requiredForm.controls.confirmation.value){<small class="field-error">La confirmación no coincide.</small>}
      <button [disabled]="requiredForm.invalid || loading()">{{loading() ? 'Actualizando…' : 'Actualizar contraseña'}}</button>
    </form>
    <form class="card" [formGroup]="form" (ngSubmit)="submit()" [hidden]="mustChange() || recovery()">
      <div class="brand">CM</div>
      <h1>Central Manager</h1>
      <p>Administración central de accesos y licencias</p>
      @if(notice()){<p class="status-message" [class.success]="noticeType()==='success'" [class.info]="noticeType()==='info'" [class.warning]="noticeType()==='warning'" [class.error]="noticeType()==='error'" [attr.role]="noticeType()==='error' ? 'alert' : 'status'">{{notice()}}</p>}
      <label>Usuario <span class="required-marker" aria-hidden="true">*</span><input formControlName="username" autocomplete="username" /></label
      ><label
        >Contraseña <span class="required-marker" aria-hidden="true">*</span><input
          type="password"
          formControlName="password"
          autocomplete="current-password" /></label
      ><button [disabled]="form.invalid || loading()">
        {{loading() ? 'Ingresando…' : 'Iniciar sesión'}}
      </button><button class="text-button" type="button" (click)="openRecovery()">¿Olvidaste tu contraseña?</button>
    </form>
    <form class="card" [formGroup]="recoveryForm" (ngSubmit)="requestReset()" [hidden]="!recovery() || mustChange()">
      <div class="brand">CM</div><h1>Recuperar contraseña</h1><p>Ingresa tu usuario o correo para solicitar la recuperación. La respuesta no confirma la existencia de una cuenta.</p>
      @if(notice()){<p class="status-message" [class.success]="noticeType()==='success'" [class.info]="noticeType()==='info'" [class.warning]="noticeType()==='warning'" [class.error]="noticeType()==='error'" [attr.role]="noticeType()==='error' ? 'alert' : 'status'">{{notice()}}</p>}
      <label for="recoveryIdentifier">Usuario o correo <span class="required-marker" aria-hidden="true">*</span><input id="recoveryIdentifier" formControlName="identifier" autocomplete="username" [attr.aria-invalid]="recoveryForm.controls.identifier.touched && recoveryForm.controls.identifier.invalid" /></label>
      @if(recoveryForm.controls.identifier.touched && recoveryForm.controls.identifier.invalid){<small class="field-error">Ingresa tu usuario o correo.</small>}
      <p class="cooldown-note">Por seguridad, solo se procesa una recuperación cada 15 minutos entre los portales. Si ya la solicitaste, revisa el primer correo o vuelve a intentarlo después.</p>
      <button [disabled]="recoveryForm.invalid || loading()">{{loading() ? 'Procesando solicitud…' : 'Solicitar recuperación'}}</button>
      <button class="text-button" type="button" (click)="recovery.set(false)">Volver al inicio de sesión</button>
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
        background: var(--primary);
        color: var(--button-contrast, #fff);
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
        background: var(--surface);
        color: var(--text);
      }
      input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent); outline: 0; }
      input[aria-invalid='true'] { border-color: var(--danger); }
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
      form button.text-button { margin-top: 10px; background: transparent; color: var(--primary); }
      .status-message, .cooldown-note { padding: 11px 12px; border: 1px solid transparent; border-radius: 8px; font-size: .86rem; line-height: 1.45; }
      .status-message { margin: 14px 0; background: var(--info-bg); color: var(--info-text); border-color: var(--info-border); }
      .status-message.success { background: var(--success-bg); color: var(--success-text); border-color: var(--success-border); }
      .status-message.warning, .cooldown-note { background: var(--warning-bg); color: var(--warning-text); border-color: var(--warning-border); }
      .status-message.error { background: var(--danger-bg); color: var(--danger); border-color: var(--danger-border); }
      .cooldown-note { margin: 8px 0 16px; }
      .field-error { display: block; margin-top: -8px; color: var(--danger); }
      .field-help { display: block; margin-top: -8px; color: var(--text-secondary); }
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
  theme = inject(ThemeService);
  loading = signal(false);
  mustChange = signal(false);
  recovery = signal(false);
  notice = signal('');
  noticeType = signal<'success'|'info'|'warning'|'error'>('info');
  form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  requiredForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  recoveryForm = new FormGroup({ identifier: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });
  openRecovery() { this.recoveryForm.controls.identifier.setValue(this.form.controls.username.value); this.notice.set(''); this.recovery.set(true); }
  requestReset() {
    if (this.recoveryForm.invalid || this.loading()) { this.recoveryForm.markAllAsTouched(); return; }
    this.loading.set(true);
    this.a.requestPasswordReset(this.recoveryForm.controls.identifier.value.trim()).subscribe({
      next: result => { this.loading.set(false); if(result.status==='ACCEPTED'){this.recovery.set(false);this.recoveryForm.reset();this.noticeType.set('info');this.notice.set(result.message);}else if(result.status==='RATE_LIMITED'){this.noticeType.set('warning');this.notice.set(`${result.message} ${this.waitText(result.retryAfterSeconds)}`);}else{this.noticeType.set('error');this.notice.set(result.message);} },
      error: () => { this.loading.set(false); this.noticeType.set('error');this.notice.set('No fue posible procesar la solicitud. Intenta nuevamente más tarde.'); }
    });
  }
  private waitText(seconds:number){const value=Math.max(1,Math.ceil(seconds));return value>=60?`Intenta nuevamente en ${Math.ceil(value/60)} min.`:`Intenta nuevamente en ${value} s.`;}
  submit() {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.a.login(v.username, v.password).subscribe({
      next: (result) => { this.loading.set(false); if(result.passwordChangeRequired){this.requiredForm.controls.currentPassword.setValue(v.password);this.mustChange.set(true);return;}void this.r.navigateByUrl('/usuarios'); },
      error: (e) => {
        this.loading.set(false);
        this.noticeType.set('error');this.notice.set(e?.error?.detail ?? e?.error?.message ?? 'Usuario o contraseña incorrectos.');
      },
    });
  }
  changeRequired() {
    if(this.requiredForm.invalid||this.loading())return;
    const v=this.requiredForm.getRawValue();
    if(v.newPassword!==v.confirmation){this.noticeType.set('warning');this.notice.set('La confirmación no coincide con la nueva contraseña.');return;}
    this.loading.set(true);
    this.notice.set('');this.a.changePassword(v.currentPassword,v.newPassword,true).subscribe({next:()=>{this.loading.set(false);this.mustChange.set(false);this.form.reset();this.requiredForm.reset();this.noticeType.set('success');this.notice.set('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');},error:e=>{this.loading.set(false);this.noticeType.set('error');this.notice.set(e?.error?.detail ?? e?.error?.message ?? 'No fue posible actualizar la contraseña. Verifica la contraseña temporal y vuelve a intentarlo.');}});
  }
}
