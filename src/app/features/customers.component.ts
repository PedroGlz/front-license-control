import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({standalone:true,imports:[ButtonModule, InputTextModule, FormsModule],template:`
  <h1>Clientes</h1><p>Propietarios comerciales de licencias DEVICE_ONLY.</p><button pButton (click)="edit.set({Name:'',Is_Active:true})">Nuevo cliente</button>
  @if(edit();as m){<form class="user-card" (ngSubmit)="save()" #f="ngForm"><h2>{{m['Id_Customer']?'Editar cliente':'Nuevo cliente'}}</h2>
    <label>Nombre <span class="required-marker" aria-hidden="true">*</span><input pInputText name="Name" [(ngModel)]="m['Name']" required maxlength="200" /></label>
    <label>Contacto<input pInputText name="Contact_Name" [(ngModel)]="m['Contact_Name']" maxlength="200" /></label>
    <label>Correo<input pInputText name="Email" type="email" [(ngModel)]="m['Email']" maxlength="255" email /></label>
    <label>Teléfono<input pInputText name="Phone" [(ngModel)]="m['Phone']" maxlength="50" /></label>
    <label><input type="checkbox" name="Is_Active" [(ngModel)]="m['Is_Active']" /> Activo</label>
    <footer><button pButton type="button" class="secondary" (click)="edit.set(null)">Cancelar</button><button pButton [disabled]="f.invalid||saving()">Guardar</button></footer></form>}
  @for(c of rows();track c['Id_Customer']){<article class="user-card"><h2>{{c['Name']}}</h2><p>{{c['Contact_Name'] || 'Sin contacto'}} · {{c['Email'] || 'Sin correo'}} · {{c['Phone'] || 'Sin teléfono'}}</p><p>{{c['Is_Active']?'Activo':'Inactivo'}}</p><button pButton class="secondary" (click)="open(c)">Editar</button></article>}@empty{<p>No hay clientes registrados.</p>}
`,styleUrls:['./user-detail.scss'],styles:[`form{display:grid;gap:1rem;max-width:650px}footer{display:flex;justify-content:flex-end;gap:.75rem}input[type=checkbox]{width:auto}`]})
export class CustomersComponent {
  private api=inject(ApiService);private alerts=inject(AlertService);rows=signal<Record<string,any>[]>([]);edit=signal<Record<string,any>|null>(null);saving=signal(false);
  constructor(){this.load();}
  load(){this.api.get<Record<string,any>[]>('/admin/customers').subscribe({next:r=>this.rows.set(r),error:e=>void this.alerts.error('No fue posible consultar clientes',this.alerts.message(e))});}
  open(c:Record<string,any>){this.edit.set({...c});}
  async save(){const m=this.edit();if(!m||this.saving())return;if(!(await this.alerts.confirm('¿Guardar cliente?')).isConfirmed)return;this.saving.set(true);(m['Id_Customer']?this.api.update('customers',m['Id_Customer'],m):this.api.create('customers',m)).subscribe({next:()=>{this.saving.set(false);this.edit.set(null);this.load();void this.alerts.success('Cliente guardado');},error:e=>{this.saving.set(false);void this.alerts.error('No fue posible guardar',this.alerts.message(e));}});}
}
