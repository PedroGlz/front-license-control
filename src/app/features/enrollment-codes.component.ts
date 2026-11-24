import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AlertService } from '../core/alert.service';
import { ApiService } from '../core/api.service';
import { licenseOwner } from '../core/license-owner';
import { MexicoDatePipe } from '../core/mexico-date.pipe';

@Component({
  standalone: true,
  imports: [ButtonModule, MexicoDatePipe, DialogModule, FormsModule, InputTextModule, RouterLink, TableModule],
  template: `
    <div class="page-heading">
      <div><h1>Códigos de activación</h1><p>Consulta y genera códigos para vincular dispositivos con licencias disponibles.</p></div>
      <button pButton type="button" (click)="generating.set(true)"><i class="pi pi-plus"></i> Generar códigos</button>
    </div>

    <section class="panel">
      <div class="table-context-filter"><a pButton class="secondary" routerLink="/licencias"><i class="pi pi-id-card"></i> Ver licencias</a></div>
      <p-table [value]="codes()" styleClass="etic-table" [scrollable]="true">
        <ng-template #header><tr><th>Licencia <p-columnFilter field="Id_License" type="text" display="menu" matchMode="startsWith" /></th><th>Cliente <p-columnFilter field="Customer_Name" type="text" display="menu" matchMode="contains" /></th><th>Sistema <p-columnFilter field="System_Name" type="text" display="menu" matchMode="contains" /></th><th>Estado <p-columnFilter field="Code_Status" display="menu" matchMode="equals"><ng-template #filter let-value let-filter="filterCallback"><select aria-label="Filtrar estado del código" [ngModel]="value" (ngModelChange)="filter($event)"><option value="">Todos</option><option value="PENDING">Pendiente</option><option value="USED">Usado</option><option value="EXPIRED">Vencido</option><option value="REVOKED">Revocado</option></select></ng-template></p-columnFilter></th><th>Expira <p-columnFilter field="Expires_At" display="menu" matchMode="startsWith"><ng-template #filter let-value let-filter="filterCallback"><input type="date" aria-label="Filtrar expiración" [ngModel]="value" (ngModelChange)="filter($event)" /></ng-template></p-columnFilter></th><th>Usado <p-columnFilter field="Used_At" display="menu" matchMode="startsWith"><ng-template #filter let-value let-filter="filterCallback"><input type="date" aria-label="Filtrar fecha de uso" [ngModel]="value" (ngModelChange)="filter($event)" /></ng-template></p-columnFilter></th><th>Dispositivo <p-columnFilter field="Display_Name" type="text" display="menu" matchMode="contains" /></th><th>Creado <p-columnFilter field="Created_At" display="menu" matchMode="startsWith"><ng-template #filter let-value let-filter="filterCallback"><input type="date" aria-label="Filtrar fecha de creación" [ngModel]="value" (ngModelChange)="filter($event)" /></ng-template></p-columnFilter></th></tr></ng-template>
        <ng-template #body let-c><tr>
          <td class="main-cell" [title]="c['Id_License']">{{licenseReference(c)}}</td><td>{{c['Customer_Name'] || 'Sin cliente'}}</td><td>{{c['System_Name']}}</td>
          <td><span class="status-badge" [class.active]="codeStatus(c)==='PENDING'">{{codeStatusLabel(c)}}</span></td>
          <td>{{c['Expires_At'] | mexicoDate}}</td><td>{{c['Used_At'] ? (c['Used_At'] | mexicoDate) : 'No'}}</td><td>{{c['Display_Name'] || 'Sin asignar'}}</td><td>{{c['Created_At'] | mexicoDate}}</td>
        </tr></ng-template>
        <ng-template #emptymessage><tr><td colspan="8"><div class="empty-state">No hay códigos que coincidan con los filtros.</div></td></tr></ng-template>
      </p-table>
    </section>

    <p-dialog [visible]="generating()" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(94vw, 700px)'}">
      <form (ngSubmit)="generate()" #f="ngForm">
        <div class="dialog-heading"><div><h2>Generar código de activación</h2><p>El código es de un solo uso y no reserva cupo.</p></div><button pButton type="button" class="icon-button secondary" aria-label="Cerrar" (click)="closeGenerator()"><i class="pi pi-times"></i></button></div>
        <div class="grid">
          <section class="form-section"><h3>Generación</h3><div class="grid">
          <label class="full-width">Licencia <span class="required-marker" aria-hidden="true">*</span><select name="license" [(ngModel)]="license" (ngModelChange)="licenseChanged()" required><option value="">Selecciona</option>@for(e of licenses();track e['Id_License']){@if(e['Effective_Status']==='ACTIVE'){<option [value]="e['Id_License']">{{owner(e)}} · {{e['System_Name']}} · {{e['Available_Seats']}} disponibles</option>}}</select></label>
          <label>Cantidad <span class="required-marker" aria-hidden="true">*</span><input pInputText type="number" name="quantity" [(ngModel)]="quantity" min="1" [max]="availableSeats()" step="1" required /></label>
          <label>Expiración (hora local) <span class="required-marker" aria-hidden="true">*</span><input pInputText type="datetime-local" name="expires" [(ngModel)]="expires" required /></label>
          @if(selectedLicense(); as selected){<div class="full-width seat-summary"><span>Adquiridos: <strong>{{selected['Seat_Count']}}</strong></span><span>En uso: <strong>{{selected['Used_Seats']}}</strong></span><span>Disponibles: <strong>{{availableSeats()}}</strong></span></div>}
          </div></section>
          <section class="form-section"><h3>Envío por correo</h3><p class="secondary-cell">Correo del cliente</p><div class="readonly-value">{{customerEmail() || 'Sin correo configurado'}}</div></section>
        </div>
        <footer><button pButton type="button" class="secondary" (click)="closeGenerator()">Cancelar</button><button pButton [disabled]="f.invalid || busy() || availableSeats()<1">Generar</button><button pButton type="button" [disabled]="f.invalid || busy() || availableSeats()<1 || !customerEmail()" (click)="generate(true)">Generar y enviar</button></footer>
      </form>
    </p-dialog>

    <p-dialog [visible]="!!issued()" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(92vw, 580px)'}">
      @if(issued(); as result){<div aria-live="polite">
        <div class="dialog-heading"><div><h2>Código generado</h2><p>Entrégalo de forma segura. Solo se muestra ahora.</p></div><button pButton type="button" class="icon-button secondary" aria-label="Cerrar" (click)="issued.set(null)"><i class="pi pi-times"></i></button></div>
        @for(code of result['codes'];track $index){<code class="result-code">{{code}}</code>}
        <div class="detail-list"><div><span class="secondary-cell">Sistema</span><div>{{result['system']}}</div></div><div><span class="secondary-cell">Vence</span><div>{{result['expiresAt'] | mexicoDate}}</div></div></div>
        <footer><button pButton type="button" class="secondary" (click)="issued.set(null)">Cerrar</button></footer>
      </div>}
    </p-dialog>
  `,
  styleUrls: ['./forms.scss', './record-tables.scss']
})
export class EnrollmentCodesComponent {
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  private route = inject(ActivatedRoute);
  licenses = signal<Record<string, any>[]>([]);
  codes = signal<Record<string, any>[]>([]);
  issued = signal<Record<string, any> | null>(null);
  busy = signal(false);
  search = signal('');
  statusFilter = signal('');
  license = this.route.snapshot.queryParamMap.get('license') || '';
  quantity = 1;
  expires = '';
  generating = signal(!!this.license);
  filteredCodes = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    return this.codes().filter(c => {
      const matchesText = !query || [c['Id_License'], c['Customer_Name'], c['System_Name'], c['Display_Name']].some(v => String(v || '').toLocaleLowerCase().includes(query));
      return matchesText && (!this.statusFilter() || this.codeStatus(c) === this.statusFilter());
    }).map(c => ({...c, Code_Status: this.codeStatus(c)}));
  });

  constructor() {
    this.api.get<Record<string, any>[]>('/admin/licenses').subscribe({next: r => this.licenses.set(r.filter(l => l['Licensing_Mode'] === 'DEVICE_ONLY')), error: e => this.error(e)});
    this.load();
  }
  load() { this.api.get<Record<string, any>[]>('/admin/enrollment-codes').subscribe({next: r => this.codes.set(r), error: e => this.error(e)}); }
  expired(value: string) { return new Date(value).getTime() <= Date.now(); }
  selectedLicense() { return this.licenses().find(e => e['Id_License'] === this.license); }
  owner(value: Record<string, any>) { return licenseOwner(value); }
  availableSeats() { return Number(this.selectedLicense()?.['Available_Seats'] || 0); }
  licenseChanged() { if (this.quantity > this.availableSeats()) this.quantity = Math.max(1, this.availableSeats()); }
  codeStatus(c: Record<string, any>) { return c['Used_At'] ? 'USED' : c['License_Status'] === 'REVOKED' ? 'REVOKED' : this.expired(c['Expires_At']) ? 'EXPIRED' : 'PENDING'; }
  codeStatusLabel(c: Record<string, any>) { return ({PENDING: 'Pendiente', USED: 'Usado', EXPIRED: 'Vencido', REVOKED: 'Revocado'} as Record<string, string>)[this.codeStatus(c)]; }
  licenseReference(c: Record<string, any>) { const value = String(c['Id_License'] || ''); return value.length > 8 ? value.slice(0, 8) + '…' : value; }
  closeGenerator() { this.generating.set(false); this.expires = ''; this.quantity = 1; }
  customerEmail() { return String(this.licenses().find(e => e['Id_License'] === this.license)?.['Customer_Email'] || '').trim(); }
  async generate(sendEmail = false) {
    if (this.busy() || !this.license) return;
    if (!Number.isInteger(this.quantity) || this.quantity < 1 || this.quantity > this.availableSeats()) { void this.alerts.warning('Revisa la cantidad', 'Selecciona una cantidad entre 1 y ' + this.availableSeats() + '.'); return; }
    if (sendEmail && !this.customerEmail()) { void this.alerts.warning('Correo no configurado', 'El cliente no tiene un correo configurado.'); return; }
    const until = new Date(this.expires);
    if (!Number.isFinite(until.getTime()) || until.getTime() <= Date.now() || until.getTime() > Date.now() + 7 * 86400000) { void this.alerts.warning('Revisa el vencimiento', 'Debe estar dentro de los próximos 7 días.'); return; }
    if (!(await this.alerts.confirm(sendEmail ? '¿Generar y enviar por correo?' : '¿Generar código?', sendEmail ? 'Se enviará el nuevo código al correo configurado del cliente.' : 'No reserva cupo ni revoca otros códigos pendientes.')).isConfirmed) return;
    this.busy.set(true);
    this.issued.set(null);
    this.api.post('/admin/enrollment-codes', {licenseId: this.license, quantity: this.quantity, expiresAt: until.toISOString(), sendEmail}).subscribe({
      next: r => { this.busy.set(false); this.generating.set(false); this.issued.set(r as Record<string, any>); this.load(); const result = r as Record<string, any>; if (result['emailRequested'] && !result['emailSent']) void this.alerts.warning('Código generado', result['message']); else void this.alerts.success(result['message']); },
      error: e => { this.busy.set(false); this.error(e); }
    });
  }
  private error(e: unknown) { void this.alerts.error('No fue posible completar la operación', this.alerts.message(e)); }
}
