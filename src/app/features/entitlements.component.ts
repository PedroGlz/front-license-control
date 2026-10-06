import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY,expand,reduce } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({standalone:true,imports:[FormsModule,DatePipe,RouterLink],template:`
  <h1>Licencias</h1><p>Licencias comerciales DEVICE_ONLY. Para USER_DEVICE utiliza <a routerLink="/accesos">Asignaciones de licencia</a>.</p><button (click)="creating.set(true)">Nueva licencia</button>
  @if(creating()){<form class="user-card" (ngSubmit)="create()" #f="ngForm"><h2>Nueva licencia DEVICE_ONLY</h2>
    <label>Cliente<select name="customer" [(ngModel)]="model['Id_Customer']" required><option value="">Selecciona</option>@for(c of customers();track c['Id_Customer']){@if(c['Is_Active']){<option [value]="c['Id_Customer']">{{c['Name']}}</option>}}</select></label>
    <label>Sistema<select name="system" [(ngModel)]="model['Id_System']" required><option value="">Selecciona</option>@for(s of systems();track s['Id_System']){<option [value]="s['Id_System']">{{s['Name']}}</option>}</select></label>
    <label>Vigencia<select name="term" [(ngModel)]="model['Term_Type']"><option value="MONTHLY">Mensual</option><option value="ANNUAL">Anual</option><option value="PERPETUAL">Permanente</option></select></label>
    <label>Cantidad de dispositivos<input type="number" name="seats" [(ngModel)]="model['Seat_Count']" min="1" step="1" required /></label>
    <p>La vigencia comienza al crear la licencia. El servidor calcula el vencimiento.</p><footer><button type="button" class="secondary" (click)="creating.set(false)">Cancelar</button><button [disabled]="f.invalid||busy()">Crear</button></footer></form>}
  @for(e of rows();track e['Id_Entitlement']){<article class="user-card"><h2>{{e['Customer_Name']}} · {{e['System_Name']}}</h2><p>{{term(e['Term_Type'])}} · {{status(e['Effective_Status'])}}</p>
    <p>Dispositivos adquiridos: {{e['Seat_Count']}} · En uso: {{e['Used_Seats']}} · Disponibles: {{e['Available_Seats']}}</p>
    <p>Activación: {{e['Activated_At'] | date:'dd/MM/yyyy HH:mm'}} · Vencimiento: {{e['Expires_At'] ? (e['Expires_At'] | date:'dd/MM/yyyy HH:mm') : 'Sin vencimiento comercial'}}</p>
    <footer><button class="secondary" (click)="show(e)">Ver detalle</button>
    @if(e['Effective_Status']==='ACTIVE'){<button class="secondary" [disabled]="busy()" (click)="change(e,'SUSPENDED')">Suspender</button>}
    @if(e['Effective_Status']==='SUSPENDED'){<button [disabled]="busy()" (click)="change(e,'ACTIVE')">Reactivar</button>}
    @if(e['Status']!=='REVOKED'){<button class="secondary" [disabled]="busy()" (click)="change(e,'REVOKED')">Revocar</button>}</footer>
  </article>}@empty{<p>No hay licencias comerciales. No necesitas crearlas para accesos web ni asignaciones USER_DEVICE.</p>}
  @if(detail();as d){<section class="user-card"><header><h2>{{d['Customer_Name']}} · {{d['System_Name']}}</h2><button class="secondary" (click)="detail.set(null)">Cerrar</button></header>
    @if(d['Effective_Status']==='ACTIVE'){<a class="action-link" routerLink="/codigos-activacion" [queryParams]="{entitlement:d['Id_Entitlement']}">Generar código de activación</a>}
    <p>Generar códigos no reserva dispositivos. El cupo se comprueba al activar la APK.</p><h3>Dispositivos y activaciones</h3>
    @for(device of d['devices'];track device['Id_License']){<article><strong>{{device['Display_Name'] || device['Model'] || 'Dispositivo'}}</strong><p>{{device['Manufacturer']}} {{device['Model']}} · Android {{device['Android_Version']}} · APK {{device['App_Version']}}</p><p>Asignación: {{status(device['License_Status'])}} · Dispositivo: {{status(device['Status'])}}</p><p>Activación: {{device['Enrolled_At']}} · Última validación: {{device['Last_Validation_At'] || 'Sin validaciones'}}</p></article>}@empty{<p>Aún no hay dispositivos activados.</p>}</section>}
`,styleUrls:['./user-detail.scss'],styles:[`form{display:grid;gap:1rem;max-width:650px}footer,header{display:flex;gap:.7rem;flex-wrap:wrap;align-items:center}header{justify-content:space-between}article article{padding:.75rem 0}`]})
export class EntitlementsComponent {
  private api=inject(ApiService);private alerts=inject(AlertService);rows=signal<Record<string,any>[]>([]);customers=signal<Record<string,any>[]>([]);systems=signal<Record<string,any>[]>([]);detail=signal<Record<string,any>|null>(null);creating=signal(false);busy=signal(false);
  model:Record<string,any>={Id_Customer:'',Id_System:'',Term_Type:'MONTHLY',Seat_Count:1};
  constructor(){this.load();this.api.get<Record<string,any>[]>('/admin/customers').subscribe({next:r=>this.customers.set(r),error:e=>this.error(e)});this.api.list('systems','',0,100).pipe(expand((r,p)=>r.length===100?this.api.list('systems','',p+1,100):EMPTY),reduce((all,r)=>[...all,...r],[] as Record<string,any>[])).subscribe({next:r=>this.systems.set(r.filter(s=>s['System_Type']==='ANDROID'&&s['Licensing_Mode']==='DEVICE_ONLY')),error:e=>this.error(e)});}
  load(){this.api.get<Record<string,any>[]>('/admin/entitlements').subscribe({next:r=>this.rows.set(r),error:e=>this.error(e)});}
  show(e:Record<string,any>){this.api.get<Record<string,any>>('/admin/entitlements/'+e['Id_Entitlement']).subscribe({next:r=>this.detail.set(r),error:e=>this.error(e)});}
  async create(){if(this.busy()||!(await this.alerts.confirm('¿Crear licencia comercial?','La vigencia comienza ahora.')).isConfirmed)return;this.busy.set(true);this.api.create('entitlements',this.model).subscribe({next:r=>{this.busy.set(false);this.creating.set(false);this.load();this.show(r);void this.alerts.success('Licencia creada');},error:e=>{this.busy.set(false);this.error(e);}});}
  async change(e:Record<string,any>,status:string){if(this.busy()||!(await this.alerts.confirm('¿Cambiar estado?',status==='REVOKED'?'La revocación es definitiva y libera las asignaciones.':'Se actualizará la autorización online.')).isConfirmed)return;this.busy.set(true);this.api.post('/admin/entitlements/'+e['Id_Entitlement']+'/status',{status}).subscribe({next:()=>{this.busy.set(false);this.detail.set(null);this.load();void this.alerts.success('Estado actualizado');},error:e=>{this.busy.set(false);this.error(e);}});}
  term(v:string){return ({MONTHLY:'Mensual',ANNUAL:'Anual',PERPETUAL:'Permanente'} as Record<string,string>)[v]||v;}
  status(v:string){return ({ACTIVE:'Activa',SUSPENDED:'Suspendida',REVOKED:'Revocada',EXPIRED:'Vencida'} as Record<string,string>)[v]||v;}
  private error(e:unknown){void this.alerts.error('No fue posible completar la operación',this.alerts.message(e));}
}
