import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({standalone:true,template:`<h1>Dashboard</h1><div class="cards">@for(c of cards;track c[0]){<article><span>{{c[1]}}</span><strong>{{data()?.[c[0]] ?? '—'}}</strong></article>}</div>`,
styles:[`.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem}.cards article{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:1.25rem}strong{display:block;font-size:2rem}`]})
export class DashboardComponent {
  private api=inject(ApiService);private alerts=inject(AlertService);data=signal<Record<string,any>|null>(null);
  cards=[['activeCustomers','Clientes activos'],['activeLicenses','Licencias activas'],['suspendedLicenses','Licencias suspendidas'],['expiringLicenses','Licencias próximas a vencer'],['availableSeats','Seats disponibles'],['activeDevices','Dispositivos activos']];
  constructor(){this.api.get<Record<string,any>>('/admin/dashboard').subscribe({next:r=>this.data.set(r),error:e=>void this.alerts.error('No fue posible consultar métricas',this.alerts.message(e))});}
}
