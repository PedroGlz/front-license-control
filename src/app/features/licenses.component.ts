import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({standalone:true,imports:[ButtonModule, InputTextModule, FormsModule,DatePipe,RouterLink],template:`
  <h1>Licencias Android</h1><p>Licencias por usuario o cliente, con vigencia calculada por el servidor.</p><button pButton (click)="creating.set(true)">Nueva licencia</button>
  @if(creating()){<form class="user-card" (ngSubmit)="create()" #f="ngForm"><h2>Nueva licencia</h2>
    <label>Sistema Android *<select name="system" [(ngModel)]="model['Id_System']" (ngModelChange)="systemChanged()" required><option value="">Selecciona</option>@for(s of systems();track s['id']){<option [value]="s['id']">{{s['label']}}</option>}</select></label>
    @if(mode()){<p>Modalidad: {{mode()}}</p>}
    @if(mode()==='USER_DEVICE'){<label>Usuario *<select name="user" [(ngModel)]="model['Id_User']" required><option value="">Selecciona</option>@for(u of users();track u['id']){<option [value]="u['id']">{{u['label']}}</option>}</select></label>}
    @if(mode()){<label>{{mode()==='DEVICE_ONLY'?'Cliente *':'Cliente (opcional)'}}<select name="customer" [(ngModel)]="model['Id_Customer']" [required]="mode()==='DEVICE_ONLY'"><option value="">Selecciona</option>@for(c of customers();track c['Id_Customer']){@if(c['Is_Active']){<option [value]="c['Id_Customer']">{{c['Name']}}</option>}}</select></label>}
    <label>Vigencia *<select name="term" [(ngModel)]="model['Term_Type']" required><option value="MONTHLY">Mensual</option><option value="ANNUAL">Anual</option><option value="PERPETUAL">Permanente</option></select></label>
    <label>Número de dispositivos *<input pInputText type="number" name="seats" [(ngModel)]="model['Seat_Count']" min="1" step="1" required /></label>
    <p>La vigencia comienza al crear la licencia. No requiere fechas manuales.</p><footer><button pButton type="button" class="secondary" (click)="creating.set(false)">Cancelar</button><button pButton [disabled]="f.invalid||busy()||!mode()">Crear</button></footer></form>}
  @for(l of rows();track l['Id_License']){<article class="user-card"><h2>{{l['System_Name']}} · {{l['Licensing_Mode']==='USER_DEVICE'?l['User_Name']:l['Customer_Name']}}</h2>
    <p>{{l['Licensing_Mode']}} · {{term(l['Term_Type'])}} · {{status(l['Effective_Status'])}}</p>
    <p>Seats: {{l['Seat_Count']}} · En uso: {{l['Used_Seats']}} · Disponibles: {{l['Available_Seats']}}</p>
    <p>Activada: {{l['Activated_At'] | date:'dd/MM/yyyy HH:mm'}} · Vence: {{l['Expires_At'] ? (l['Expires_At'] | date:'dd/MM/yyyy HH:mm') : 'Sin vencimiento comercial'}}</p>
    <footer><button pButton class="secondary" (click)="show(l)">Ver dispositivos</button>
    @if(l['Effective_Status']==='ACTIVE'){<button pButton class="secondary" [disabled]="busy()" (click)="change(l,'SUSPENDED')">Suspender</button>}
    @if(l['Effective_Status']==='SUSPENDED'){<button pButton [disabled]="busy()" (click)="change(l,'ACTIVE')">Reactivar</button>}
    @if(l['Status']!=='REVOKED'){<button pButton class="secondary" [disabled]="busy()" (click)="change(l,'REVOKED')">Revocar</button>}</footer>
  </article>}@empty{<p>No hay licencias registradas.</p>}
  @if(detail();as d){<section class="user-card"><header><h2>{{d['System_Name']}} · Dispositivos</h2><button pButton class="secondary" (click)="detail.set(null)">Cerrar</button></header>
    @if(d['Effective_Status']==='ACTIVE'&&d['Licensing_Mode']==='DEVICE_ONLY'){<a class="action-link" routerLink="/codigos-activacion" [queryParams]="{license:d['Id_License']}">Generar código de activación</a><p>Generar códigos no reserva cupo.</p>}
    @if(d['Licensing_Mode']==='USER_DEVICE'&&d['Effective_Status']==='ACTIVE'){
      <label>Dispositivo registrado<select [(ngModel)]="selectedDevice"><option value="">Selecciona</option>@for(device of devices();track device['id']){@if(device['Status']==='ACTIVE'){<option [value]="device['id']">{{device['label']}}</option>}}</select></label>
      <button pButton [disabled]="!selectedDevice||busy()||d['Available_Seats']<1" (click)="link(d)">Vincular dispositivo</button>
    }
    @for(device of d['devices'];track device['Id_License_Device']){<article><strong>{{device['Display_Name'] || device['Model'] || 'Dispositivo'}}</strong><p>{{device['Manufacturer']}} {{device['Model']}} · Android {{device['Android_Version']}} · APK {{device['App_Version']}}</p><p>Vínculo: {{status(device['License_Status'])}} · Dispositivo: {{status(device['Status'])}}</p><p>Activación: {{device['Activated_At'] | date:'dd/MM/yyyy HH:mm'}} · Última validación: {{device['Last_Validation_At'] ? (device['Last_Validation_At'] | date:'dd/MM/yyyy HH:mm') : 'Sin validaciones'}}</p></article>}@empty{<p>Aún no hay dispositivos vinculados.</p>}
  </section>}
`,styleUrls:['./user-detail.scss'],styles:[`form{display:grid;gap:1rem;max-width:650px}footer,header{display:flex;gap:.7rem;flex-wrap:wrap;align-items:center}header{justify-content:space-between}article article{padding:.75rem 0}`]})
export class LicensesComponent {
  private api=inject(ApiService);private alerts=inject(AlertService);private route=inject(ActivatedRoute);
  rows=signal<Record<string,any>[]>([]);customers=signal<Record<string,any>[]>([]);systems=signal<Record<string,any>[]>([]);users=signal<Record<string,any>[]>([]);detail=signal<Record<string,any>|null>(null);creating=signal(false);busy=signal(false);
  devices=signal<Record<string,any>[]>([]);selectedDevice='';
  model:Record<string,any>={Id_Customer:'',Id_User:this.route.snapshot.queryParamMap.get('user')||'',Id_System:'',Term_Type:'MONTHLY',Seat_Count:1};
  constructor(){this.load();this.api.get<Record<string,any>[]>('/admin/lookups/devices').subscribe({next:r=>this.devices.set(r),error:e=>this.error(e)});this.api.get<Record<string,any>[]>('/admin/customers').subscribe({next:r=>this.customers.set(r),error:e=>this.error(e)});this.api.get<Record<string,any>[]>('/admin/lookups/licensed-systems').subscribe({next:r=>this.systems.set(r),error:e=>this.error(e)});this.api.get<Record<string,any>[]>('/admin/lookups/users').subscribe({next:r=>this.users.set(r),error:e=>this.error(e)});}
  mode(){return this.systems().find(s=>s['id']===this.model['Id_System'])?.['Licensing_Mode']||'';}
  systemChanged(){if(this.mode()==='DEVICE_ONLY')this.model['Id_User']='';}
  load(){this.api.get<Record<string,any>[]>('/admin/licenses').subscribe({next:r=>this.rows.set(r),error:e=>this.error(e)});}
  show(l:Record<string,any>){this.api.get<Record<string,any>>('/admin/licenses/'+l['Id_License']).subscribe({next:r=>this.detail.set(r),error:e=>this.error(e)});}
  async create(){if(this.busy()||!(await this.alerts.confirm('¿Crear licencia?','La vigencia comienza ahora.')).isConfirmed)return;this.busy.set(true);const body={...this.model,Id_User:this.mode()==='USER_DEVICE'?this.model['Id_User']:null};this.api.create('licenses',body).subscribe({next:r=>{this.busy.set(false);this.creating.set(false);this.load();this.show(r);void this.alerts.success('Licencia creada');},error:e=>{this.busy.set(false);this.error(e);}});}
  async change(l:Record<string,any>,status:string){if(this.busy()||!(await this.alerts.confirm('¿Cambiar estado?',status==='REVOKED'?'La revocación es definitiva y libera los dispositivos.':'Se actualizará la autorización online.')).isConfirmed)return;this.busy.set(true);this.api.post('/admin/licenses/'+l['Id_License']+'/status',{status}).subscribe({next:()=>{this.busy.set(false);this.detail.set(null);this.load();void this.alerts.success('Estado actualizado');},error:e=>{this.busy.set(false);this.error(e);}});}
  async link(l:Record<string,any>){if(this.busy()||!(await this.alerts.confirm('¿Vincular dispositivo?','Se consumirá un seat disponible.')).isConfirmed)return;this.busy.set(true);this.api.post('/admin/licenses/'+l['Id_License']+'/devices',{deviceId:this.selectedDevice}).subscribe({next:()=>{this.busy.set(false);this.selectedDevice='';this.show(l);this.load();void this.alerts.success('Dispositivo vinculado');},error:e=>{this.busy.set(false);this.error(e);}});}
  term(v:string){return ({MONTHLY:'Mensual',ANNUAL:'Anual',PERPETUAL:'Permanente'} as Record<string,string>)[v]||v;}
  status(v:string){return ({ACTIVE:'Activa',SUSPENDED:'Suspendida',REVOKED:'Revocada',EXPIRED:'Vencida',LOST:'Perdido',REPLACED:'Reemplazado'} as Record<string,string>)[v]||v;}
  private error(e:unknown){void this.alerts.error('No fue posible completar la operación',this.alerts.message(e));}
}
