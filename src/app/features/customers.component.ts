import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AlertService } from '../core/alert.service';
import { ApiService } from '../core/api.service';
import { IconComponent } from '../core/icon.component';

@Component({
  standalone: true,
  imports: [ButtonModule, DialogModule, FormsModule, IconComponent, InputTextModule, TableModule],
  template: `
    <div class="page-heading">
      <div><h1>Clientes</h1><p>Propietarios comerciales de licencias DEVICE_ONLY.</p></div>
      <button pButton type="button" (click)="newCustomer()"><i class="pi pi-plus"></i> Nuevo cliente</button>
    </div>

    <section class="panel">
      <div class="table-tools">
        <div class="table-filters">
          <input pInputText aria-label="Buscar clientes" placeholder="Buscar por nombre, contacto o correo" [ngModel]="search()" (ngModelChange)="search.set($event)" />
          <select aria-label="Filtrar por estado" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Todos los estados</option><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option>
          </select>
        </div>
      </div>
      <p-table [value]="filteredRows()" styleClass="etic-table" [scrollable]="true">
        <ng-template #header><tr><th>Nombre</th><th>Contacto</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></ng-template>
        <ng-template #body let-c><tr>
          <td class="main-cell">{{c['Name']}}</td><td>{{c['Contact_Name'] || 'Sin contacto'}}</td><td class="cell-wrap">{{c['Email'] || 'Sin correo'}}</td><td>{{c['Phone'] || 'Sin teléfono'}}</td>
          <td><span class="status-badge" [class.active]="c['Is_Active']">{{c['Is_Active'] ? 'Activo' : 'Inactivo'}}</span></td>
          <td><div class="actions-cell"><button pButton type="button" class="icon-button secondary" aria-label="Usuarios asociados" title="Usuarios asociados" (click)="openUsers(c)"><i class="pi pi-users"></i></button><button pButton type="button" class="icon-button secondary" aria-label="Editar cliente" title="Editar" (click)="open(c)"><app-icon name="edit" /></button></div></td>
        </tr></ng-template>
        <ng-template #emptymessage><tr><td colspan="6"><div class="empty-state">No hay clientes que coincidan con los filtros.</div></td></tr></ng-template>
      </p-table>
    </section>

    <p-dialog [visible]="!!edit()" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(92vw, 650px)'}">
      @if(edit(); as m){<form (ngSubmit)="save()" #f="ngForm">
        <div class="dialog-heading"><div><h2>{{m['Id_Customer'] ? 'Editar cliente' : 'Nuevo cliente'}}</h2><p>Captura la información comercial del cliente.</p></div><button pButton type="button" class="icon-button secondary" aria-label="Cerrar" (click)="edit.set(null)"><i class="pi pi-times"></i></button></div>
        <div class="grid">
          <label class="full-width">Nombre <span class="required-marker" aria-hidden="true">*</span><input pInputText name="Name" [(ngModel)]="m['Name']" required maxlength="200" /></label>
          <label>Contacto<input pInputText name="Contact_Name" [(ngModel)]="m['Contact_Name']" maxlength="200" /></label>
          <label>Correo<input pInputText name="Email" type="email" [(ngModel)]="m['Email']" maxlength="255" email /></label>
          <label>Teléfono<input pInputText name="Phone" [(ngModel)]="m['Phone']" maxlength="50" /></label>
          <label class="checkbox-field"><input type="checkbox" name="Is_Active" [(ngModel)]="m['Is_Active']" /> Activo</label>
        </div>
        <footer><button pButton type="button" class="secondary" (click)="edit.set(null)">Cancelar</button><button pButton [disabled]="f.invalid || saving()">Guardar</button></footer>
      </form>}
    </p-dialog>

    <p-dialog [visible]="!!usersCustomer()" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(92vw, 720px)'}">
      @if(usersCustomer(); as customer){
        <div class="dialog-heading"><div><h2>Usuarios asociados</h2><p>{{customer['Name']}}</p></div><button pButton type="button" class="icon-button secondary" aria-label="Cerrar" (click)="usersCustomer.set(null)"><i class="pi pi-times"></i></button></div>
        <div class="table-tools"><div class="table-filters"><select [(ngModel)]="selectedUser"><option value="">Selecciona un usuario</option>@for(u of availableUsers();track u['id']){<option [value]="u['id']">{{u['label']}}</option>}</select><button pButton type="button" [disabled]="!selectedUser || saving()" (click)="associate()"><i class="pi pi-plus"></i> Asociar</button></div></div>
        <p-table [value]="customerUsers()" styleClass="etic-table"><ng-template #header><tr><th>Usuario</th><th>Nombre</th><th>Correo</th><th>Acciones</th></tr></ng-template><ng-template #body let-u><tr><td>{{u['Username']}}</td><td>{{fullName(u)}}</td><td>{{u['Email'] || 'Sin correo'}}</td><td><button pButton type="button" class="icon-button secondary" aria-label="Quitar asociación" title="Quitar" [disabled]="saving()" (click)="removeAssociation(u)"><i class="pi pi-times"></i></button></td></tr></ng-template><ng-template #emptymessage><tr><td colspan="4"><div class="empty-state">No hay usuarios asociados.</div></td></tr></ng-template></p-table>
        <footer><button pButton type="button" class="secondary" (click)="usersCustomer.set(null)">Cerrar</button></footer>
      }
    </p-dialog>
  `,
  styleUrls: ['./forms.scss', './record-tables.scss']
})
export class CustomersComponent {
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  rows = signal<Record<string, any>[]>([]);
  edit = signal<Record<string, any> | null>(null);
  saving = signal(false);
  search = signal('');
  statusFilter = signal('');
  usersCustomer = signal<Record<string, any> | null>(null);
  customerUsers = signal<Record<string, any>[]>([]);
  allUsers = signal<Record<string, any>[]>([]);
  selectedUser = '';
  availableUsers = computed(() => { const assigned = new Set(this.customerUsers().map(u => u['Id_User'])); return this.allUsers().filter(u => !assigned.has(u['id'])); });
  filteredRows = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.rows().filter(c => {
      const matchesText = !query || ['Name', 'Contact_Name', 'Email', 'Phone'].some(key => String(c[key] || '').toLocaleLowerCase().includes(query));
      const matchesStatus = !this.statusFilter() || (this.statusFilter() === 'ACTIVE' ? !!c['Is_Active'] : !c['Is_Active']);
      return matchesText && matchesStatus;
    });
  });

  constructor() { this.load(); this.api.get<Record<string, any>[]>('/admin/lookups/users').subscribe({next: r => this.allUsers.set(r), error: e => void this.alerts.error('No fue posible consultar usuarios', this.alerts.message(e))}); }
  load() { this.api.get<Record<string, any>[]>('/admin/customers').subscribe({next: r => this.rows.set(r), error: e => void this.alerts.error('No fue posible consultar clientes', this.alerts.message(e))}); }
  newCustomer() { this.edit.set({Name: '', Is_Active: true}); }
  open(c: Record<string, any>) { this.edit.set({...c}); }
  openUsers(c: Record<string, any>) { this.usersCustomer.set(c); this.selectedUser = ''; this.loadCustomerUsers(c['Id_Customer']); }
  loadCustomerUsers(id: string) { this.api.get<Record<string, any>[]>('/admin/customers/' + id + '/users').subscribe({next: r => this.customerUsers.set(r), error: e => void this.alerts.error('No fue posible consultar asociaciones', this.alerts.message(e))}); }
  fullName(u: Record<string, any>) { return [u['First_Name'], u['Last_Name'], u['Second_Last_Name']].filter(Boolean).join(' ') || 'Sin nombre'; }
  async associate() { const c = this.usersCustomer(); if (!c || !this.selectedUser || this.saving()) return; this.saving.set(true); this.api.post('/admin/customers/' + c['Id_Customer'] + '/users', {userId: this.selectedUser}).subscribe({next: () => { this.saving.set(false); this.selectedUser = ''; this.loadCustomerUsers(c['Id_Customer']); void this.alerts.success('Usuario asociado'); }, error: e => { this.saving.set(false); void this.alerts.error('No fue posible asociar', this.alerts.message(e)); }}); }
  async removeAssociation(u: Record<string, any>) { const c = this.usersCustomer(); if (!c || this.saving() || !(await this.alerts.confirm('¿Quitar asociación?', 'Las licencias existentes no serán modificadas.')).isConfirmed) return; this.saving.set(true); this.api.delete('/admin/customers/' + c['Id_Customer'] + '/users/' + u['Id_User']).subscribe({next: () => { this.saving.set(false); this.loadCustomerUsers(c['Id_Customer']); void this.alerts.success('Asociación eliminada'); }, error: e => { this.saving.set(false); void this.alerts.error('No fue posible eliminar', this.alerts.message(e)); }}); }
  async save() {
    const m = this.edit();
    if (!m || this.saving()) return;
    if (!(await this.alerts.confirm('¿Guardar cliente?')).isConfirmed) return;
    this.saving.set(true);
    (m['Id_Customer'] ? this.api.update('customers', m['Id_Customer'], m) : this.api.create('customers', m)).subscribe({
      next: () => { this.saving.set(false); this.edit.set(null); this.load(); void this.alerts.success('Cliente guardado'); },
      error: e => { this.saving.set(false); void this.alerts.error('No fue posible guardar', this.alerts.message(e)); }
    });
  }
}
