import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({standalone:true,imports:[ButtonModule, InputTextModule, FormsModule,DatePipe,RouterLink],template:`
  <h1>Códigos de activación</h1><p>DEVICE_ONLY: los códigos no consumen seats. El cupo se valida al completar la activación.</p><a routerLink="/licencias">Ver licencias</a>
  <form class="user-card" (ngSubmit)="generate()" #f="ngForm">
    <label>Licencia <span class="required-marker" aria-hidden="true">*</span><select name="license" [(ngModel)]="license" required><option value="">Selecciona</option>@for(e of licenses();track e['Id_License']){@if(e['Effective_Status']==='ACTIVE'){<option [value]="e['Id_License']">{{e['Customer_Name']}} · {{e['System_Name']}} · {{e['Available_Seats']}} disponibles</option>}}</select></label>
    <label>Vencimiento del código (hora local) <span class="required-marker" aria-hidden="true">*</span><input pInputText type="datetime-local" name="expires" [(ngModel)]="expires" required /></label>
    <p>Un solo uso, con expiración máxima de 7 días. No necesita un dispositivo previamente registrado.</p>
    <footer><button pButton type="button" class="secondary" (click)="cancel()">Cancelar</button><button pButton [disabled]="f.invalid||busy()">Generar códigos</button><button pButton type="button" [disabled]="f.invalid||busy()||!customerEmail()" (click)="generate(true)">Generar y enviar por correo</button></footer>
    @if (license && !customerEmail()) { <p>El cliente no tiene un correo configurado.</p> }
  </form>
  @if(issued();as c){<section class="user-card" aria-live="polite"><h2>Código generado</h2><p>Entrégalo de forma segura. Solo se muestra ahora.</p>@for(code of c['codes'];track $index){<code>{{code}}</code>}<p>Sistema: {{c['system']}}</p><p>Vence: {{c['expiresAt'] | date:'dd/MM/yyyy HH:mm'}}</p><button pButton class="secondary" (click)="issued.set(null)">Cerrar</button></section>}
  <h2>Historial reciente</h2>@for(c of codes();track c['Id_Enrollment']){<article class="user-card"><strong>{{c['Customer_Name']}} · {{c['System_Name']}}</strong><p>{{c['Display_Name'] || 'Sin dispositivo asignado'}} · {{c['Used_At']?'Usado':c['License_Status']==='REVOKED'?'Revocado':expired(c['Expires_At'])?'Vencido':'Pendiente'}}</p><p>Vence: {{c['Expires_At'] | date:'dd/MM/yyyy HH:mm'}}</p></article>}@empty{<p>No hay códigos de activación.</p>}
`,styleUrls:['./user-detail.scss'],styles:[`form{display:grid;gap:1rem;max-width:700px}footer{display:flex;justify-content:flex-end;gap:.7rem}code{display:block;overflow-wrap:anywhere}`]})
export class EnrollmentCodesComponent {
  private api=inject(ApiService);private alerts=inject(AlertService);private route=inject(ActivatedRoute);
  licenses=signal<Record<string,any>[]>([]);codes=signal<Record<string,any>[]>([]);issued=signal<Record<string,any>|null>(null);busy=signal(false);
  license=this.route.snapshot.queryParamMap.get('license')||'';expires='';
  constructor(){this.api.get<Record<string,any>[]>('/admin/licenses').subscribe({next:r=>this.licenses.set(r.filter(l=>l['Licensing_Mode']==='DEVICE_ONLY')),error:e=>this.error(e)});this.load();}
  load(){this.api.get<Record<string,any>[]>('/admin/enrollment-codes').subscribe({next:r=>this.codes.set(r),error:e=>this.error(e)});}
  expired(value:string){return new Date(value).getTime()<=Date.now();}
  cancel(){this.expires='';this.issued.set(null);}
  customerEmail(){return String(this.licenses().find(e=>e['Id_License']===this.license)?.['Customer_Email'] || '').trim();}
  async generate(sendEmail=false){
    if(this.busy()||!this.license)return;
    if(sendEmail&&!this.customerEmail()){void this.alerts.warning('Correo no configurado','El cliente no tiene un correo configurado.');return;}const until=new Date(this.expires);
    if(!Number.isFinite(until.getTime())||until.getTime()<=Date.now()||until.getTime()>Date.now()+7*86400000){void this.alerts.warning('Revisa el vencimiento','Debe estar dentro de los próximos 7 días.');return;}
    if(!(await this.alerts.confirm(sendEmail?'¿Generar y enviar por correo?':'¿Generar códigos?',sendEmail?'Se enviarán los nuevos códigos al correo configurado del cliente.':'No reserva cupo ni revoca otros códigos pendientes.')).isConfirmed)return;
    this.busy.set(true);this.issued.set(null);this.api.post('/admin/enrollment-codes',{licenseId:this.license,expiresAt:until.toISOString(),sendEmail}).subscribe({next:r=>{this.busy.set(false);this.issued.set(r as Record<string,any>);this.load();const result=r as Record<string,any>;if(result['emailRequested']&&!result['emailSent'])void this.alerts.warning('Códigos generados',result['message']);else void this.alerts.success(result['message']);},error:e=>{this.busy.set(false);this.error(e);}});
  }
  private error(e:unknown){void this.alerts.error('No fue posible completar la operación',this.alerts.message(e));}
}
