import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AlertService } from '../core/alert.service';
import { ApiService } from '../core/api.service';
import { MexicoDatePipe } from '../core/mexico-date.pipe';

@Component({
  standalone: true,
  imports: [ButtonModule, MexicoDatePipe, DialogModule, FormsModule, InputTextModule, TableModule],
  template: `
    <div class="page-heading"><div><h1>Dispositivos</h1><p>Consulta los dispositivos vinculados a cuentas y licencias, junto con su estado de activación.</p></div></div>

    <section class="panel">
      <p-table [value]="rows()" styleClass="etic-table" [scrollable]="true">
        <ng-template #header><tr>
          <th><button type="button" class="column-sort" (click)="sortBy('Display_Name')">Nombre</button><input pInputText aria-label="Filtrar nombre" [(ngModel)]="filters['Display_Name']" (keyup.enter)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Owner')">Propietario actual</button><input pInputText aria-label="Filtrar propietario" [(ngModel)]="filters['Owner']" (keyup.enter)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Association')">Aplicación / licencia</button><input pInputText aria-label="Filtrar asociación" [(ngModel)]="filters['Association']" (keyup.enter)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Manufacturer')">Fabricante</button><input pInputText aria-label="Filtrar fabricante" [(ngModel)]="filters['Manufacturer']" (keyup.enter)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Model')">Modelo</button><input pInputText aria-label="Filtrar modelo" [(ngModel)]="filters['Model']" (keyup.enter)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Android_Version')">Android</button><input pInputText aria-label="Filtrar versión Android" [(ngModel)]="filters['Android_Version']" (keyup.enter)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('App_Version')">APK</button><input pInputText aria-label="Filtrar versión APK" [(ngModel)]="filters['App_Version']" (keyup.enter)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Status')">Estado</button><select aria-label="Filtrar estado por columna" [(ngModel)]="status" (ngModelChange)="applyFilters()"><option value="">Todos</option><option value="ACTIVE">Activo</option><option value="SUSPENDED">Suspendido</option><option value="REVOKED">Revocado</option><option value="LOST">Perdido</option><option value="REPLACED">Reemplazado</option></select></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Activated_At')">Activación</button><input type="date" aria-label="Filtrar fecha de activación" [(ngModel)]="filters['Activated_At']" (ngModelChange)="applyFilters()" /></th>
          <th><button type="button" class="column-sort" (click)="sortBy('Last_Validation_At')">Última validación</button><input type="date" aria-label="Filtrar última validación" [(ngModel)]="filters['Last_Validation_At']" (ngModelChange)="applyFilters()" /></th>
          <th class="actions-column">Acciones</th></tr></ng-template>
        <ng-template #body let-d><tr>
          <td class="main-cell">{{d['Display_Name'] || 'Dispositivo sin nombre'}}</td><td>{{d['Current_Owners'] || 'Sin propietario'}}</td><td>{{d['Current_Associations'] || 'Sin asociación vigente'}}</td><td>{{d['Manufacturer'] || '—'}}</td><td>{{d['Model'] || '—'}}</td><td>{{d['Android_Version'] || '—'}}</td><td>{{d['App_Version'] || '—'}}</td>
          <td><span class="status-badge" [class.active]="d['Status']==='ACTIVE'">{{stateLabel(d['Status'])}}</span></td>
          <td>{{d['Activated_At'] | mexicoDate}}</td><td>{{d['Last_Validation_At'] ? (d['Last_Validation_At'] | mexicoDate) : 'Sin validaciones'}}</td>
          <td><div class="actions-cell">
            <button pButton type="button" class="icon-button secondary" aria-label="Ver detalle" title="Ver detalle" (click)="detail.set(d)"><i class="pi pi-eye"></i></button>
            @if(d['Status']==='ACTIVE'){
              <button pButton type="button" class="icon-button secondary" aria-label="Suspender" title="Suspender" [disabled]="busy()" (click)="changeStatus(d,'SUSPENDED')"><i class="pi pi-pause"></i></button>
              <button pButton type="button" class="icon-button secondary" aria-label="Marcar perdido" title="Marcar perdido" [disabled]="busy()" (click)="retire(d,'LOST')"><i class="pi pi-exclamation-triangle"></i></button>
              <button pButton type="button" class="icon-button secondary" aria-label="Reemplazar" title="Reemplazar" [disabled]="busy()" (click)="retire(d,'REPLACED')"><i class="pi pi-sync"></i></button>
              <button pButton type="button" class="icon-button danger" aria-label="Revocar" title="Revocar" [disabled]="busy()" (click)="retire(d,'REVOKED')"><i class="pi pi-ban"></i></button>
            }
            @if(d['Status']==='SUSPENDED'){
              <button pButton type="button" class="icon-button secondary" aria-label="Reactivar" title="Reactivar" [disabled]="busy()" (click)="changeStatus(d,'ACTIVE')"><i class="pi pi-play"></i></button>
              <button pButton type="button" class="icon-button secondary" aria-label="Marcar perdido" title="Marcar perdido" [disabled]="busy()" (click)="retire(d,'LOST')"><i class="pi pi-exclamation-triangle"></i></button>
              <button pButton type="button" class="icon-button secondary" aria-label="Reemplazar" title="Reemplazar" [disabled]="busy()" (click)="retire(d,'REPLACED')"><i class="pi pi-sync"></i></button>
              <button pButton type="button" class="icon-button danger" aria-label="Revocar" title="Revocar" [disabled]="busy()" (click)="retire(d,'REVOKED')"><i class="pi pi-ban"></i></button>
            }
          </div></td>
        </tr></ng-template>
        <ng-template #emptymessage><tr><td colspan="11"><div class="empty-state">No hay dispositivos que coincidan con los filtros.</div></td></tr></ng-template>
      </p-table>

      <footer class="pager"><button pButton class="secondary" [disabled]="page()===0" (click)="previous()"><i class="pi pi-chevron-left"></i> Anterior</button><span>Página {{page()+1}}</span><button pButton class="secondary" [disabled]="rows().length<25" (click)="next()">Siguiente <i class="pi pi-chevron-right"></i></button></footer>
    </section>

    <p-dialog [visible]="!!detail()" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(92vw, 650px)'}">
      @if(detail(); as d){
        <div class="dialog-heading"><div><h2>{{d['Display_Name'] || 'Dispositivo sin nombre'}}</h2><p>Información técnica registrada durante la activación.</p></div><button pButton type="button" class="icon-button secondary" aria-label="Cerrar" (click)="detail.set(null)"><i class="pi pi-times"></i></button></div>
        <div class="detail-list">
          <div class="detail-item"><span class="secondary-cell">Id del dispositivo</span><div class="cell-wrap">{{d['Id_Device']}}</div></div>
          <div class="detail-item"><span class="secondary-cell">Fingerprint</span><div class="cell-wrap">{{d['Fingerprint'] || 'No disponible'}}</div></div>
          <div class="detail-item"><span class="secondary-cell">Estado</span><div>{{stateLabel(d['Status'])}}</div></div>
          <div class="detail-item"><span class="secondary-cell">Propietario vigente</span><div>{{d['Current_Owners'] || 'Sin propietario'}}</div></div>
          <div class="detail-item"><span class="secondary-cell">Asociaciones vigentes</span><div>{{d['Current_Associations'] || 'Sin asociación vigente'}}</div></div>
          <div class="detail-item"><span class="secondary-cell">Historial de asociaciones</span><div>{{d['Historical_Associations'] || 'Sin historial'}}</div></div>
          <div class="detail-item"><span class="secondary-cell">Registro / activación</span><div>{{(d['Created_At'] || d['Activated_At']) | mexicoDate}}</div></div>
          <div class="detail-item"><span class="secondary-cell">Última validación</span><div>{{d['Last_Validation_At'] ? (d['Last_Validation_At'] | mexicoDate) : 'Sin validaciones'}}</div></div>
        </div>
        <footer><button pButton type="button" class="secondary" (click)="detail.set(null)">Cerrar</button></footer>
      }
    </p-dialog>
  `,
  styleUrls: ['./forms.scss', './record-tables.scss', './devices.component.scss'],
  styles: [`.pager{display:flex;justify-content:center;align-items:center;gap:.75rem;margin-top:1rem}`]
})
export class DevicesComponent {
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  rows = signal<Record<string, any>[]>([]);
  page = signal(0);
  busy = signal(false);
  detail = signal<Record<string, any> | null>(null);
  search = '';
  status = '';
  filters: Record<string, string> = {Display_Name: '', Owner: '', Association: '', Manufacturer: '', Model: '', Android_Version: '', App_Version: '', Activated_At: '', Last_Validation_At: ''};
  order = 'Activated_At';
  direction = 'desc';

  constructor() { this.load(); }
  load() { this.api.list('devices', this.search, this.page(), 25, {Status: this.status, ...this.filters, sort: this.order, direction: this.direction}).subscribe({next: r => this.rows.set(r), error: e => void this.alerts.error('No fue posible consultar dispositivos', this.alerts.message(e))}); }
  sortBy(key: string) { this.direction = this.order === key && this.direction === 'asc' ? 'desc' : 'asc'; this.order = key; this.page.set(0); this.load(); }
  applyFilters() { this.page.set(0); this.load(); }
  clearFilters() { this.search = ''; this.status = ''; Object.keys(this.filters).forEach(key => this.filters[key] = ''); this.applyFilters(); }
  previous() { this.page.update(value => value - 1); this.load(); }
  next() { this.page.update(value => value + 1); this.load(); }
  stateLabel(value: string) { return ({ACTIVE: 'Activo', SUSPENDED: 'Suspendido', REVOKED: 'Revocado', LOST: 'Perdido', REPLACED: 'Reemplazado'} as Record<string, string>)[value] || value; }
  async changeStatus(d: Record<string, any>, status: string) { if (this.busy() || !(await this.alerts.confirm(status === 'SUSPENDED' ? '¿Suspender dispositivo?' : '¿Reactivar dispositivo?', status === 'SUSPENDED' ? 'Conservará su seat, pero no podrá renovar su licencia.' : 'Volverá a autorizarse únicamente si su licencia comercial sigue vigente.')).isConfirmed) return; this.busy.set(true); this.api.post('/admin/devices/' + d['Id_Device'] + '/status', {status}).subscribe({next: () => { this.busy.set(false); this.load(); void this.alerts.success('Estado actualizado'); }, error: e => { this.busy.set(false); void this.alerts.error('No fue posible actualizar', this.alerts.message(e)); }}); }
  async retire(d: Record<string, any>, reason: string) {
    if (this.busy() || !(await this.alerts.confirm('¿Retirar dispositivo?', 'Se conservará el historial y se liberarán sus seats.')).isConfirmed) return;
    this.busy.set(true);
    this.api.post('/admin/devices/' + d['Id_Device'] + '/retire', {reason}).subscribe({next: () => { this.busy.set(false); this.detail.set(null); this.load(); void this.alerts.success('Dispositivo retirado'); }, error: e => { this.busy.set(false); void this.alerts.error('No fue posible retirar', this.alerts.message(e)); }});
  }
}
