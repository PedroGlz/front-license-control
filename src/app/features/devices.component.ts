import { ButtonModule } from 'primeng/button';
import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';

@Component({standalone:true,imports:[ButtonModule, DatePipe],template:`
<h1>Dispositivos</h1><p>Se registran mediante enrollment. No existe alta manual.</p>
@for(d of rows();track d['Id_Device']){<article class="user-card"><h2>{{d['Display_Name']||'Dispositivo sin nombre'}}</h2>
<p>{{d['Manufacturer']}} {{d['Model']}} · Android {{d['Android_Version']}} · APK {{d['App_Version']}}</p>
<p>Estado: {{d['Status']}} · Licencia asociada: {{d['Associated_Licenses']||'Sin licencia'}}</p>
<p>Activación: {{d['Activated_At']|date:'dd/MM/yyyy HH:mm'}} · Última validación: {{d['Last_Validation_At']?(d['Last_Validation_At']|date:'dd/MM/yyyy HH:mm'):'Sin validaciones'}}</p>
@if(d['Status']==='ACTIVE'||d['Status']==='SUSPENDED'){<footer><button pButton class="secondary" [disabled]="busy()" (click)="retire(d,'LOST')">Marcar perdido</button><button pButton class="secondary" [disabled]="busy()" (click)="retire(d,'REPLACED')">Reemplazar</button><button pButton class="secondary" [disabled]="busy()" (click)="retire(d,'REVOKED')">Revocar</button></footer>}
</article>}@empty{<p>No hay dispositivos registrados.</p>}
<footer><button pButton [disabled]="page()===0" (click)="page.set(page()-1);load()">Anterior</button><span>Página {{page()+1}}</span><button pButton [disabled]="rows().length<25" (click)="page.set(page()+1);load()">Siguiente</button></footer>
`,styleUrls:['./user-detail.scss'],styles:[`footer{display:flex;gap:.75rem;flex-wrap:wrap;align-items:center}`]})
export class DevicesComponent {
  private api=inject(ApiService);private alerts=inject(AlertService);
  rows=signal<Record<string,any>[]>([]);page=signal(0);busy=signal(false);
  constructor(){this.load();}
  load(){this.api.list('devices','',this.page(),25,{sort:'Activated_At',direction:'desc'}).subscribe({next:r=>this.rows.set(r),error:e=>void this.alerts.error('No fue posible consultar dispositivos',this.alerts.message(e))});}
  async retire(d:Record<string,any>,reason:string){if(this.busy()||!(await this.alerts.confirm('¿Retirar dispositivo?','Se conservará el historial y se liberarán sus seats.')).isConfirmed)return;this.busy.set(true);this.api.post('/admin/devices/'+d['Id_Device']+'/retire',{reason}).subscribe({next:()=>{this.busy.set(false);this.load();void this.alerts.success('Dispositivo retirado');},error:e=>{this.busy.set(false);void this.alerts.error('No fue posible retirar',this.alerts.message(e));}});}
}
