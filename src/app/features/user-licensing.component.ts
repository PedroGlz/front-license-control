import { Component, input, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, expand, reduce, forkJoin, finalize } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';

@Component({
  selector: 'app-user-licensing', standalone: true, imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './user-licensing.component.html', styleUrls: ['./user-detail.scss'],
})
export class UserLicensingComponent implements OnInit {
  userId = input.required<string>();
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  loading = signal(true);
  failed = signal(false);
  saving = signal(false);
  accesses = signal<Record<string, any>[]>([]);
  licenses = signal<Record<string, any>[]>([]);
  applications = signal<Record<string, any>[]>([]);
  editor = signal<{resource: string; row: Record<string, any>} | null>(null);
  deviceApplication = signal('');
  devices = signal<Record<string, any>[]>([]);
  devicesLoading = signal(false);
  deviceRequest = 0;
  ngOnInit() { this.load(); }
  private all(resource: string, filters: Record<string,string> = {}) {
    return this.api.list(resource, '', 0, 100, filters).pipe(
      expand((rows, page) => rows.length === 100 ? this.api.list(resource, '', page + 1, 100, filters) : EMPTY),
      reduce((all, rows) => [...all, ...rows], [] as Record<string, any>[]),
    );
  }
  load() {
    this.loading.set(true); this.failed.set(false);
    const filter = {Id_Usuario: this.userId()};
    forkJoin({accesses: this.all('application-access', filter), licenses: this.all('licenses', filter), applications: this.all('applications')})
      .pipe(finalize(() => this.loading.set(false))).subscribe({
        next: (data) => { this.accesses.set(data.accesses); this.licenses.set(data.licenses); this.applications.set(data.applications); },
        error: (e) => { this.failed.set(true); void this.alerts.error('No fue posible consultar licenciamiento', this.alerts.message(e)); },
      });
  }
  assignedApplications() {
    const ids = new Set([...this.accesses(), ...this.licenses()].map(row => row['Id_Application']));
    return [...ids].map(id => ({id, name: this.applications().find(app => app['Id_Application'] === id)?.['Name'] || 'Aplicación no disponible'}));
  }
  access(app: string) { return this.accesses().find(a => a['Id_Application'] === app); }
  appLicenses(app: string) { return this.licenses().filter(l => l['Id_Application'] === app); }
  deviceCount(app: string) { return new Set(this.appLicenses(app).map(l => l['Id_Device']).filter(Boolean)).size; }
  status(value: string) { return ({ACTIVE:'Activa',INACTIVE:'Inactiva',SUSPENDED:'Suspendida',REVOKED:'Revocada',EXPIRED:'Vencida',PENDING:'Pendiente',ENROLLED:'Registrado'} as Record<string,string>)[value] || 'Sin información'; }
  open(resource: string, row: Record<string,any>) { this.editor.set({resource, row: {...row}}); }
  async save() {
    const edit = this.editor(); if (!edit || this.saving()) return;
    const row = edit.row;
    if (row['Valid_Until'] && row['Valid_From'] > row['Valid_Until']) { void this.alerts.warning('Revisa la vigencia', 'Hasta debe ser posterior a Desde.'); return; }
    if (!(await this.alerts.confirm('¿Guardar cambios?', 'Se actualizará la vigencia y configuración del licenciamiento.')).isConfirmed) return;
    const keys = edit.resource === 'licenses' ? ['Id_Usuario','Id_Application','Id_Device','Status','Valid_From','Valid_Until'] : ['Id_Usuario','Id_Application','Status','Valid_From','Valid_Until','Max_Devices'];
    const body = Object.fromEntries(keys.map(key => [key, row[key] ?? null]));
    const id = edit.resource === 'licenses' ? row['Id_License'] : row['Id_Access'];
    this.saving.set(true);
    this.api.update(edit.resource, id, body).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.editor.set(null); this.load(); void this.alerts.success('Licenciamiento actualizado'); },
      error: (e) => void this.alerts.error('No fue posible guardar', this.alerts.message(e)),
    });
  }
  showDevices(app: string) {
    this.deviceApplication.set(app); this.devices.set([]); this.devicesLoading.set(true);
    const request = ++this.deviceRequest;
    const ids = [...new Set(this.appLicenses(app).map(l => l['Id_Device']).filter(Boolean))];
    if (!ids.length) { this.devicesLoading.set(false); return; }
    forkJoin(ids.map(id => this.api.get<Record<string,any>>(`/admin/devices/${id}`))).subscribe({
      next: (devices) => { if (request === this.deviceRequest) { this.devices.set(devices); this.devicesLoading.set(false); } },
      error: (e) => { if (request === this.deviceRequest) { this.devicesLoading.set(false); this.deviceApplication.set(''); void this.alerts.error('No fue posible consultar dispositivos', this.alerts.message(e)); } },
    });
  }
}
