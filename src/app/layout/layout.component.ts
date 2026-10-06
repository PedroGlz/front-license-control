import { IconComponent } from '../core/icon.component';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
@Component({
  standalone: true,
  imports: [IconComponent, RouterLink, RouterLinkActive, RouterOutlet],
  template: `<div class="shell">
    <button
      class="backdrop"
      [class.visible]="open()"
      aria-label="Cerrar menú"
      (click)="open.set(false)"
    ></button>
    <aside [class.open]="open()">
      <div class="logo"><b>LC</b><span>License Control</span></div>
      @for (g of menu; track g.title) {
        <h3>{{ g.title }}</h3>
        @for (i of g.items; track i.path) {
          <a [routerLink]="i.path" routerLinkActive="active" (click)="open.set(false)"><app-icon [name]="i.icon" /><span>{{ i.label }}</span></a>
        }
      }
    </aside>
    <section>
      <header>
        <button class="hamb" aria-label="Abrir menú" (click)="open.set(!open())">☰</button>
        <div></div>
        <button
          class="theme"
          (click)="theme.toggle()"
          [attr.aria-label]="theme.mode() === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'"
          [title]="theme.mode() === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'"
        >
          {{ theme.mode() === 'dark' ? '☀' : '☾' }}</button
        ><span class="user">{{ auth.user()?.firstName }} {{ auth.user()?.lastName }}</span
        ><button class="link logout" title="Cerrar sesión" aria-label="Cerrar sesión" (click)="auth.logout()"><app-icon name="logout" /></button>
      </header>
      <main><router-outlet /></main>
    </section>
  </div>`,
  styles: [
    `
      .shell {
        min-height: 100dvh;
        display: grid;
        grid-template-columns: 245px minmax(0, 1fr);
        background: var(--page-bg);
      }
      aside {
        position: sticky;
        top: 0;
        height: 100dvh;
        background: var(--sidebar);
        color: var(--sidebar-text);
        padding: 22px 16px;
        overflow: auto;
      }
      .logo {
        display: flex;
        gap: 12px;
        align-items: center;
        color: #fff;
        font-size: 18px;
        margin: 0 8px 28px;
      }
      .logo b {
        background: #1753e7;
        padding: 10px;
        border-radius: 8px;
      }
      h3 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #84a1b3;
        margin: 24px 10px 8px;
      }
      a {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 4px 0;
        color: inherit;
        text-decoration: none;
        padding: 9px 12px;
        border-radius: 7px;
        font-size: 14px;
      }
      .active,
      a:hover {
        background: var(--sidebar-active);
        box-shadow: inset 3px 0 0 #60a5fa;
        color: #fff;
      }
      section {
        min-width: 0;
        background: var(--page-bg);
      }
      header {
        height: 64px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 0 24px;
        position: sticky;
        top: 0;
        z-index: 3;
      }
      header div {
        flex: 1;
      }
      .link,
      .hamb,
      .theme {
        background: none;
        border: 0;
        color: var(--primary);
        cursor: pointer;
      }
      .theme {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        font-size: 22px;
      }
      .theme:hover {
        background: var(--primary-soft);
      }
      .hamb {
        display: none;
        font-size: 22px;
      }
      .user {
        color: var(--text);
        font-weight: 600;
        font-size: 14px;
      }
      .logout { display: inline-flex; padding: 9px; border-radius: 50%; }
      .logout:hover { background: var(--primary-soft); }
      main {
        padding: 26px;
      }
      .backdrop {
        display: none;
      }
      @media (max-width: 800px) {
        .shell {
          grid-template-columns: 1fr;
        }
        aside {
          position: fixed;
          z-index: 5;
          inset: 0 auto 0 0;
          width: 245px;
          transform: translateX(-100%);
          transition: 0.2s;
        }
        .open {
          transform: none;
        }
        .hamb {
          display: block;
        }
        .backdrop.visible {
          display: block;
          position: fixed;
          z-index: 4;
          inset: 0;
          background: var(--overlay);
          border: 0;
        }
        main {
          padding: 16px;
        }
        .user {
          display: none;
        }
      }
    `,
  ],
})
export class LayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  open = signal(false);
  menu = [
//     { title: '', items: [{ label: 'Dashboard', path: '/dashboard', icon: 'home' }] },
    {
      title: 'Administración',
      items: [
        { label: 'Usuarios', path: '/usuarios', icon: 'users' },
        { label: 'Sistemas', path: '/sistemas', icon: 'monitor' },
        { label: 'Roles', path: '/roles', icon: 'admin' },
//         { label: 'Permisos', path: '/permisos', icon: 'key' },
//         { label: 'Rol → permisos', path: '/roles-permisos', icon: 'rolePermissions' },
        { label: 'Atributos', path: '/atributos', icon: 'tune' },
        { label: 'Tipos de usuario', path: '/tipos-usuario', icon: 'badge' },
      ],
    },
    {
      title: 'Licenciamiento',
      items: [
        { label: 'Versiones', path: '/versiones', icon: 'package' },
        { label: 'Accesos', path: '/accesos', icon: 'access' },
        { label: 'Licencias', path: '/licencias', icon: 'license' },
        { label: 'Dispositivos', path: '/dispositivos', icon: 'phone' },
      ],
    },
//     { title: 'Seguridad', items: [{ label: 'Auditoría', path: '/auditoria', icon: 'history' }] },
  ];
}
