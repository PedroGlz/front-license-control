import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({standalone:true,imports:[FormsModule,DatePipe,RouterLink],template:`
  <h1>Códigos de activación</h1><p>DEVICE_ONLY: los códigos no consumen seats. El cupo se valida al completar la activación.</p><a routerLink="/licencias">Ver licencias comerciales</a>
  <form class="user-card" (ngSubmit)="generate()" #f="ngForm">
    <label>Licencia<select name="entitlement" [(ngModel)]="entitlement" required><option value="">Selecciona</option>@for(e of entitlements();track e['Id_Entitlement']){@if(e['Effective_Status']==='ACTIVE'){<option [value]="e['Id_Entitlement']">{{e['Customer_Name']}} · {{e['System_Name']}} · {{e['Available_Seats']}} disponibles</option>}}</select></label>
    <label>Vencimiento del código (hora local)<input type="datetime-local" name="expires" [(ngModel)]="expires" required /></label>
    <p>Un solo uso, con expiración máxima de 7 días. No necesita un dispositivo previamente registrado.</p>
    <footer><button type="button" class="secondary" (click)="cancel()">Cancelar</button><button [disabled]="f.invalid||busy()">Generar código</button></footer>
  </form>
  @if(issued();as c){<section class="user-card" aria-live="polite"><h2>Código generado</h2><p>Entrégalo de forma segura. Solo se muestra ahora.</p><code>{{c['code']}}</code><p>Sistema: {{c['system']}} · Package: {{c['packageName']}}</p><p>Vence: {{c['expiresAt'] | date:'dd/MM/yyyy HH:mm'}}</p><button class="secondary" (click)="issued.set(null)">Cerrar</button></section>}
  <h2>Historial reciente</h2>@for(c of codes();track c['Id_Enrollment']){<article class="user-card"><strong>{{c['Customer_Name']}} · {{c['System_Name']}}</strong><p>{{c['Display_Name'] || 'Sin dispositivo asignado'}} · {{c['Used_At']?'Usado':c['Revoked_At']?'Revocado':expired(c['Expires_At'])?'Vencido':'Pendiente'}}</p><p>Vence: {{c['Expires_At'] | date:'dd/MM/yyyy HH:mm'}}</p></article>}@empty{<p>No hay códigos de activación.</p>}
`,styleUrls:['./user-detail.scss'],styles:[`form{display:grid;gap:1rem;max-width:700px}footer{display:flex;justify-content:flex-end;gap:.7rem}code{display:block;overflow-wrap:anywhere}`]})
export class EnrollmentCodesComponent {
  private api=inject(ApiService);private alerts=inject(AlertService);private route=inject(ActivatedRoute);
  entitlements=signal<Record<string,any>[]>([]);codes=signal<Record<string,any>[]>([]);issued=signal<Record<string,any>|null>(null);busy=signal(false);
  entitlement=this.route.snapshot.queryParamMap.get('entitlement')||'';expires='';
  constructor(){this.api.get<Record<string,any>[]>('/admin/entitlements').subscribe({next:r=>this.entitlements.set(r),error:e=>this.error(e)});this.load();}
  load(){this.api.get<Record<string,any>[]>('/admin/enrollment-codes').subscribe({next:r=>this.codes.set(r),error:e=>this.error(e)});}
  expired(value:string){return new Date(value).getTime()<=Date.now();}
  cancel(){this.expires='';this.issued.set(null);}
  async generate(){
    if(this.busy()||!this.entitlement)return;const until=new Date(this.expires);
    if(!Number.isFinite(until.getTime())||until.getTime()<=Date.now()||until.getTime()>Date.now()+7*86400000){void this.alerts.warning('Revisa el vencimiento','Debe estar dentro de los próximos 7 días.');return;}
    if(!(await this.alerts.confirm('¿Generar código?','No reserva cupo ni revoca otros códigos pendientes.')).isConfirmed)return;
    this.busy.set(true);this.issued.set(null);this.api.post('/admin/enrollment-codes',{entitlementId:this.entitlement,expiresAt:until.toISOString()}).subscribe({next:r=>{this.busy.set(false);this.issued.set(r as Record<string,any>);this.load();void this.alerts.success('Código generado');},error:e=>{this.busy.set(false);this.error(e);}});
  }
  private error(e:unknown){void this.alerts.error('No fue posible completar la operación',this.alerts.message(e));}
}
