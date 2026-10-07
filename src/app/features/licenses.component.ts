import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AlertService } from '../core/alert.service';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [ButtonModule, DatePipe, DialogModule, FormsModule, InputTextModule, RouterLink, TableModule],
  template: `
    <div class="page-heading">
      <div><h1>Licencias Android</h1><p>Licencias por usuario o cliente, con vigencia calculada por el servidor.</p></div>
      <button pButton type="button" (click)="creating.set(true)"><i class="pi pi-plus"></i> Nueva licencia</button>
    </div>

    <section class="panel">
      <div class="table-tools"><div class="table-filters">
        <input pInputText aria-label="Buscar licencias" placeholder="Buscar por sistema, usuario o cliente" [ngModel]="search()" (ngModelChange)="search.set($event)" />
        <select aria-label="Filtrar por estado" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)"><option value="">Todos los estados</option><option value="ACTIVE">Activas</option><option value="SUSPENDED">Suspendidas</option><option value="REVOKED">Revocadas</option><option value="EXPIRED">Vencidas</option></select>
      </div></div>
      <p-table [value]="filteredRows()" styleClass="etic-table" [scrollable]="true">
        <ng-template #header><tr><th>Sistema</th><th>Modalidad</th><th>Usuario / cliente</th><th>Vigencia</th><th>Estado</th><th>Dispositivos</th><th>En uso</th><th>Disponibles</th><th>Activada</th><th>Vence</th><th>Acciones</th></tr></ng-template>
        <ng-template #body let-l><tr>
          <td class="main-cell">{{l['System_Name']}}</td><td>{{modeLabel(l['Licensing_Mode'])}}</td><td>{{owner(l)}}</td><td>{{term(l['Term_Type'])}}</td>
          <td><span class="status-badge" [class.active]="l['Effective_Status']==='ACTIVE'">{{status(l['Effective_Status'])}}</span></td>
          <td>{{l['Seat_Count']}}</td><td>{{l['Used_Seats']}}</td><td>{{l['Available_Seats']}}</td><td>{{l['Activated_At'] | date:'dd/MM/yyyy HH:mm'}}</td><td>{{l['Expires_At'] ? (l['Expires_At'] | date:'dd/MM/yyyy HH:mm') : 'Sin vencimiento'}}</td>
          <td><div class="actions-cell">
            <button pButton type="button" class="icon-button secondary" aria-label="Ver detalle" title="Ver detalle" (click)="show(l)"><i class="pi pi-eye"></i></button>
            @if(l['Effective_Status']==='ACTIVE'){<button pButton type="button" class="icon-button secondary" aria-label="Suspender" title="Suspender" [disabled]="busy()" (click)="change(l,'SUSPENDED')"><i class="pi pi-pause"></i></button>}
            @if(l['Effective_Status']==='SUSPENDED'){<button pButton type="button" class="icon-button secondary" aria-label="Reactivar" title="Reactivar" [disabled]="busy()" (click)="change(l,'ACTIVE')"><i class="pi pi-play"></i></button>}
            @if(l['Status']!=='REVOKED'){<button pButton type="button" class="icon-button secondary" aria-label="Revocar" title="Revocar" [disabled]="busy()" (click)="change(l,'REVOKED')"><i class="pi pi-ban"></i></button>}
          </div></td>
        </tr></ng-template>
        <ng-template #emptymessage><tr><td colspan="11"><div class="empty-state">No hay licencias que coincidan con los filtros.</div></td></tr></ng-template>
      </p-table>
    </section>

    <p-dialog [visible]="creating()" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(94vw, 760px)'}">
      <form (ngSubmit)="create()" #f="ngForm">
        <div class="dialog-heading"><div><h2>Nueva licencia</h2><p>Define el sistema, propietario y vigencia comercial.</p></div><button pButton type="button" class="icon-button secondary" aria-label="Cerrar" (click)="creating.set(false)"><i class="pi pi-times"></i></button></div>
        <div class="grid">
          <section class="form-section"><h3>Datos de licencia</h3><div class="grid">
            <label>Sistema Android <span class="required-marker" aria-hidden="true">*</span><select name="system" [(ngModel)]="model['Id_System']" (ngModelChange)="systemChanged()" required><option value="">Selecciona</option>@for(s of systems();track s['id']){<option [value]="s['id']">{{s['label']}}</option>}</select></label>
            <label>Modalidad<div class="readonly-value">{{mode() ? modeLabel(mode()) : 'Selecciona un sistema'}}</div></label>
            @if(mode()==='USER_DEVICE'){<label>Usuario <span class="required-marker" aria-hidden="true">*</span><select name="user" [(ngModel)]="model['Id_User']" required><option value="">Selecciona</option>@for(u of users();track u['id']){<option [value]="u['id']">{{u['label']}}</option>}</select></label>}
            @if(mode()){<label>Cliente @if(mode()==='DEVICE_ONLY'){<span class="required-marker" aria-hidden="true">*</span>}@else{<span class="optional-label">(opcional)</span>}<select name="customer" [(ngModel)]="model['Id_Customer']" [required]="mode()==='DEVICE_ONLY'"><option value="">Selecciona</option>@for(c of customers();track c['Id_Customer']){@if(c['Is_Active']){<option [value]="c['Id_Customer']">{{c['Name']}}</option>}}</select></label>}
            <label>Vigencia <span class="required-marker" aria-hidden="true">*</span><select name="term" [(ngModel)]="model['Term_Type']" required><option value="MONTHLY">Mensual</option><option value="ANNUAL">Anual</option><option value="PERPETUAL">Permanente</option></select></label>
            <label>Número de dispositivos <span class="required-marker" aria-hidden="true">*</span><input pInputText type="number" name="seats" [(ngModel)]="model['Seat_Count']" min="1" step="1" required /></label>
          </div></section>
          <section class="form-section"><h3>Resumen</h3><div class="detail-list"><div><span class="secondary-cell">Estado inicial</span><div>Activa</div></div><div><span class="secondary-cell">Vencimiento</span><div>{{termSummary()}}</div></div></div></section>
        </div>
        <footer><button pButton type="button" class="secondary" (click)="creating.set(false)">Cancelar</button><button pButton [disabled]="f.invalid || busy() || !mode()">Crear licencia</button></footer>
      </form>
    </p-dialog>

    <p-dialog [visible]="!!detail()" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(94vw, 760px)'}">
      @if(detail(); as d){
        <div class="dialog-heading"><div><h2>{{d['System_Name']}}</h2><p>Dispositivos vinculados a la licencia.</p></div><button pButton type="button" class="icon-button secondary" aria-label="Cerrar" (click)="detail.set(null)"><i class="pi pi-times"></i></button></div>
        @if(d['Effective_Status']==='ACTIVE' && d['Licensing_Mode']==='DEVICE_ONLY'){<section class="form-section"><a class="action-link" routerLink="/codigos-activacion" [queryParams]="{license:d['Id_License']}">Generar código de activación</a><p class="secondary-cell">Generar códigos no reserva cupo.</p></section>}
        @if(d['Licensing_Mode']==='USER_DEVICE' && d['Effective_Status']==='ACTIVE'){<section class="form-section"><label>Dispositivo registrado<select [(ngModel)]="selectedDevice"><option value="">Selecciona</option>@for(device of devices();track device['id']){@if(device['Status']==='ACTIVE'){<option [value]="device['id']">{{device['label']}}</option>}}</select></label><button pButton type="button" [disabled]="!selectedDevice || busy() || d['Available_Seats']<1" (click)="link(d)">Vincular dispositivo</button></section>}
        <div class="detail-list">@for(device of d['devices'];track device['Id_License_Device']){<article class="detail-item"><strong>{{device['Display_Name'] || device['Model'] || 'Dispositivo'}}</strong><p>{{device['Manufacturer']}} {{device['Model']}} · Android {{device['Android_Version']}} · APK {{device['App_Version']}}</p><p>Vínculo: {{status(device['License_Status'])}} · Dispositivo: {{status(device['Status'])}}</p><p>Activación: {{device['Activated_At'] | date:'dd/MM/yyyy HH:mm'}} · Última validación: {{device['Last_Validation_At'] ? (device['Last_Validation_At'] | date:'dd/MM/yyyy HH:mm') : 'Sin validaciones'}}</p></article>}@empty{<div class="empty-state">Aún no hay dispositivos vinculados.</div>}</div>
        <footer><button pButton type="button" class="secondary" (click)="detail.set(null)">Cerrar</button></footer>
      }
    </p-dialog>
  `,
  styleUrls: ['./forms.scss', './record-tables.scss']
})
export class LicensesComponent {
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  private route = inject(ActivatedRoute);
  rows = signal<Record<string, any>[]>([]);
  customers = signal<Record<string, any>[]>([]);
  systems = signal<Record<string, any>[]>([]);
  users = signal<Record<string, any>[]>([]);
  detail = signal<Record<string, any> | null>(null);
  creating = signal(false);
  busy = signal(false);
  devices = signal<Record<string, any>[]>([]);
  search = signal('');
  statusFilter = signal('');
  selectedDevice = '';
  model: Record<string, any> = {Id_Customer: '', Id_User: this.route.snapshot.queryParamMap.get('user') || '', Id_System: '', Term_Type: 'MONTHLY', Seat_Count: 1};
  filteredRows = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.rows().filter(l => (!query || [l['System_Name'], this.owner(l)].some(v => String(v || '').toLocaleLowerCase().includes(query))) && (!this.statusFilter() || l['Effective_Status'] === this.statusFilter()));
  });

  constructor() {
    this.load();
    this.api.get<Record<string, any>[]>('/admin/lookups/devices').subscribe({next: r => this.devices.set(r), error: e => this.error(e)});
    this.api.get<Record<string, any>[]>('/admin/customers').subscribe({next: r => this.customers.set(r), error: e => this.error(e)});
    this.api.get<Record<string, any>[]>('/admin/lookups/licensed-systems').subscribe({next: r => this.systems.set(r), error: e => this.error(e)});
    this.api.get<Record<string, any>[]>('/admin/lookups/users').subscribe({next: r => this.users.set(r), error: e => this.error(e)});
  }
  mode() { return this.systems().find(s => s['id'] === this.model['Id_System'])?.['Licensing_Mode'] || ''; }
  modeLabel(value: string) { return value === 'USER_DEVICE' ? 'Usuario y dispositivo' : value === 'DEVICE_ONLY' ? 'Solo dispositivo' : value; }
  owner(l: Record<string, any>) { return l['Licensing_Mode'] === 'USER_DEVICE' ? (l['User_Name'] || 'Sin usuario') : (l['Customer_Name'] || 'Sin cliente'); }
  termSummary() { return ({MONTHLY: 'Un mes desde la activación', ANNUAL: 'Un año desde la activación', PERPETUAL: 'Permanente'} as Record<string, string>)[this.model['Term_Type']] || ''; }
  systemChanged() { if (this.mode() === 'DEVICE_ONLY') this.model['Id_User'] = ''; }
  load() { this.api.get<Record<string, any>[]>('/admin/licenses').subscribe({next: r => this.rows.set(r), error: e => this.error(e)}); }
  show(l: Record<string, any>) { this.api.get<Record<string, any>>('/admin/licenses/' + l['Id_License']).subscribe({next: r => this.detail.set(r), error: e => this.error(e)}); }
  async create() {
    if (this.busy() || !(await this.alerts.confirm('¿Crear licencia?', 'La vigencia comienza ahora.')).isConfirmed) return;
    this.busy.set(true);
    const body = {...this.model, Id_User: this.mode() === 'USER_DEVICE' ? this.model['Id_User'] : null};
    this.api.create('licenses', body).subscribe({next: r => { this.busy.set(false); this.creating.set(false); this.load(); this.show(r); void this.alerts.success('Licencia creada'); }, error: e => { this.busy.set(false); this.error(e); }});
  }
  async change(l: Record<string, any>, status: string) {
    if (this.busy() || !(await this.alerts.confirm('¿Cambiar estado?', status === 'REVOKED' ? 'La revocación es definitiva y libera los dispositivos.' : 'Se actualizará la autorización online.')).isConfirmed) return;
    this.busy.set(true);
    this.api.post('/admin/licenses/' + l['Id_License'] + '/status', {status}).subscribe({next: () => { this.busy.set(false); this.detail.set(null); this.load(); void this.alerts.success('Estado actualizado'); }, error: e => { this.busy.set(false); this.error(e); }});
  }
  async link(l: Record<string, any>) {
    if (this.busy() || !(await this.alerts.confirm('¿Vincular dispositivo?', 'Se consumirá un seat disponible.')).isConfirmed) return;
    this.busy.set(true);
    this.api.post('/admin/licenses/' + l['Id_License'] + '/devices', {deviceId: this.selectedDevice}).subscribe({next: () => { this.busy.set(false); this.selectedDevice = ''; this.show(l); this.load(); void this.alerts.success('Dispositivo vinculado'); }, error: e => { this.busy.set(false); this.error(e); }});
  }
  term(v: string) { return ({MONTHLY: 'Mensual', ANNUAL: 'Anual', PERPETUAL: 'Permanente'} as Record<string, string>)[v] || v; }
  status(v: string) { return ({ACTIVE: 'Activa', SUSPENDED: 'Suspendida', REVOKED: 'Revocada', EXPIRED: 'Vencida', LOST: 'Perdido', REPLACED: 'Reemplazado'} as Record<string, string>)[v] || v; }
  private error(e: unknown) { void this.alerts.error('No fue posible completar la operación', this.alerts.message(e)); }
}
