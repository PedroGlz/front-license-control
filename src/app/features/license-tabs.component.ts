import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
@Component({standalone:true,imports:[RouterLink,RouterLinkActive,RouterOutlet],template:`
  <h1>Licencias Android</h1><nav aria-label="Modalidades de licenciamiento">
    <a routerLink="usuario-dispositivo" routerLinkActive="selected">Usuario + dispositivo</a>
    <a routerLink="solo-dispositivo" routerLinkActive="selected">Solo dispositivo</a>
  </nav><router-outlet />`,styles:[`nav{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:1.5rem}a{padding:.75rem 1rem;border-radius:8px;background:var(--surface);color:var(--text);border:1px solid var(--border);text-decoration:none}a.selected{border-color:var(--text);font-weight:600}`]})
export class LicenseTabsComponent {}
