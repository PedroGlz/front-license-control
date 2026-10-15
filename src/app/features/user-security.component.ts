import { ButtonModule } from 'primeng/button';
import { Component, inject, input, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector:'app-user-security',standalone:true,imports:[ButtonModule],styleUrls:['./user-detail.scss'],
  template:`<section class="user-card"><h2>Recuperación de contraseña</h2>
    @if(!superAdmin()){<p>Solo un Super Administrador de License Control puede restablecer contraseñas.</p>}
    @else {
      @if(currentRequest();as request){<div class="detail-list"><div><span>Estado</span><strong>{{statusLabel(request)}}</strong></div><div><span>Sistema</span><strong>{{request['Requested_System']}}</strong></div><div><span>Creada</span><strong>{{mexicoDate(request['Created_At'])}}</strong></div><div><span>Vence</span><strong>{{mexicoDate(request['Expires_At'])}}</strong></div></div>}
      @else {<p>No existe una solicitud de recuperación. El usuario debe crearla desde «¿Olvidaste tu contraseña?».</p>}
      <div class="user-actions"><button pButton type="button" class="secondary" [disabled]="busy()||!canReset()" (click)="reject()">Rechazar solicitud</button><button pButton type="button" [disabled]="busy()||!canReset()" (click)="resetPassword()">Restablecer contraseña</button><button pButton type="button" [disabled]="busy()||!deliveryToken()||!canNotify()" (click)="notify()">Notificar al usuario</button></div>
      @if(deliveryToken()){<p class="requirements">La contraseña temporal fue confirmada. La entrega por correo estará disponible durante 15 minutos.</p>}
    }
  </section>`
})
export class UserSecurityComponent {
 userId=input.required<string>();private api=inject(ApiService);private alerts=inject(AlertService);private auth=inject(AuthService);
 requests=signal<Record<string,any>[]>([]);busy=signal(false);deliveryToken=signal('');canNotify=signal(false);
 superAdmin=()=>this.auth.user()?.roles?.includes('SUPER_ADMIN')===true;
 currentRequest=()=>this.requests().find(r=>r['Id_User']===this.userId());
 pending=()=>this.requests().find(r=>r['Id_User']===this.userId()&&r['Status']==='PENDING');
 canReset=()=>this.pending()!=null&&!this.pending()?.['Reset_At'];
 statusLabel=(request:Record<string,any>)=>request['Status']==='EXPIRED'?'Vencida':request['Status']==='COMPLETED'?'Atendida':request['Status']==='REJECTED'?'Rechazada':request['Reset_At']?'Restablecida, pendiente de cambio':'Pendiente';
 mexicoDate=(value:any)=>value?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',dateStyle:'medium',timeStyle:'short',hour12:true}).format(new Date(value)):'—';
 ngOnInit(){if(this.superAdmin())this.load();}
 load(){this.api.get<Record<string,any>[]>('/admin/password-reset-requests').subscribe({next:r=>this.requests.set(r),error:e=>void this.alerts.error('No fue posible cargar solicitudes',this.alerts.message(e))});}
 async resetPassword(){const request=this.pending();if(!request||request['Reset_At']||!(await this.alerts.confirm('¿Restablecer contraseña?','Se invalidarán las sesiones actuales y se generará una contraseña temporal vigente hasta el vencimiento mostrado.')).isConfirmed)return;this.busy.set(true);this.api.post('/admin/password-reset-requests/reset',{userId:this.userId(),requestId:request['Id_Request']}).subscribe({next:r=>{const v=r as Record<string,any>;this.busy.set(false);this.deliveryToken.set(String(v['deliveryToken']||''));this.canNotify.set(v['canNotify']===true);this.load();void this.alerts.success('Contraseña restablecida','Ya puedes notificar al usuario.');},error:e=>{this.busy.set(false);this.deliveryToken.set('');this.canNotify.set(false);this.load();void this.alerts.error('No fue posible restablecer',this.alerts.message(e));}});}
 async notify(){if(this.busy()||!this.deliveryToken())return;this.busy.set(true);this.api.post('/admin/password-reset-requests/notify',{deliveryToken:this.deliveryToken()}).subscribe({next:()=>{this.busy.set(false);this.deliveryToken.set('');this.canNotify.set(false);this.load();void this.alerts.success('Correo enviado');},error:e=>{this.busy.set(false);if(e?.status===410){this.deliveryToken.set('');this.canNotify.set(false);this.load();}void this.alerts.error('No fue posible enviar',this.alerts.message(e));}});}
 async reject(){const request=this.pending();if(!request||request['Reset_At']||!(await this.alerts.confirm('¿Rechazar solicitud?')).isConfirmed)return;this.api.put(`/admin/password-reset-requests/${request['Id_Request']}/reject`,{}).subscribe({next:()=>{this.load();void this.alerts.success('Solicitud rechazada');},error:e=>{this.load();void this.alerts.error('No fue posible rechazar',this.alerts.message(e));}});}
}
