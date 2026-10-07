import { ButtonModule } from 'primeng/button';
import { Component, input, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({selector:'app-user-licensing',standalone:true,imports:[ButtonModule, RouterLink,DatePipe],templateUrl:'./user-licensing.component.html',styleUrls:['./user-detail.scss']})
export class UserLicensingComponent implements OnInit {
  userId=input.required<string>();private api=inject(ApiService);private alerts=inject(AlertService);
  loading=signal(false);licenses=signal<Record<string,any>[]>([]);detail=signal<Record<string,any>|null>(null);
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.api.get<Record<string,any>[]>('/admin/licenses?Id_User='+encodeURIComponent(this.userId())).subscribe({next:r=>{this.licenses.set(r);this.loading.set(false);},error:e=>{this.loading.set(false);void this.alerts.error('No fue posible consultar licencias',this.alerts.message(e));}});}
  show(l:Record<string,any>){this.api.get<Record<string,any>>('/admin/licenses/'+l['Id_License']).subscribe({next:r=>this.detail.set(r),error:e=>void this.alerts.error('No fue posible consultar dispositivos',this.alerts.message(e))});}
}
