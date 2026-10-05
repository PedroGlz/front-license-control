import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['./forms.scss'],
  template: `<h1>Versiones APK</h1>
    <div class="toolbar">
      <select [(ngModel)]="application" (ngModelChange)="page = 0; load()">
        <option value="">Seleccione aplicación</option>
        @for (a of applications(); track a.id) {
          <option [value]="a.id">{{ a.label }}</option>
        }</select
      ><input
        placeholder="Buscar versión o archivo"
        [(ngModel)]="search"
        (keyup.enter)="page = 0; load()"
      /><button
        [disabled]="!application"
        (click)="edit.set({ Version_Name: '', Minimum_Android: '', Release_Notes: '' })"
      >
        Subir APK
      </button>
    </div>
    <div class="panel">
      <table>
        <thead>
          <tr>
            <th (click)="sortBy('Version_Name')">Versión</th>
            <th>Archivo</th>
            <th>Tamaño</th>
            <th>SHA256</th>
            <th (click)="sortBy('Created_At')">Fecha</th>
            <th>Estatus</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (v of rows(); track v['Id_Version']) {
            <tr>
              <td>{{ v['Version_Name'] }}</td>
              <td>{{ v['Original_File_Name'] }}</td>
              <td>{{ v['File_Size'] }}</td>
              <td>{{ v['Sha256'] }}</td>
              <td>{{ v['Created_At'] }}</td>
              <td>
                <span class="badge" [class.inactive]="!v['Is_Published']">{{
                  v['Is_Published'] ? 'PUBLICADA' : 'NO PUBLICADA'
                }}</span>
              </td>
              <td><button class="link" (click)="open(v)">Ver / Editar</button><button class="link" (click)="remove(v)">Eliminar</button></td>
            </tr>
          }
        </tbody>
      </table>
      <footer>
        <button [disabled]="page === 0" (click)="page = page - 1; load()">Anterior</button
        ><span>Página {{ page + 1 }}</span
        ><button [disabled]="rows().length < 25" (click)="page = page + 1; load()">
          Siguiente
        </button>
      </footer>
    </div>
    @if (edit()) {
      <div class="modal">
        <form #f="ngForm" (ngSubmit)="save()">
          <h2>{{ edit()!['Id_Version'] ? 'Editar versión' : 'Cargar APK' }}</h2>
          <div class="grid">
            <label
              >Nombre de versión<input
                [(ngModel)]="edit()!['Version_Name']"
                name="name"
                required
                maxlength="80" /></label
            ><label
              >Android mínimo<input
                [(ngModel)]="edit()!['Minimum_Android']"
                name="android"
                maxlength="40" /></label
            ><label
              >Notas de versión<textarea
                [(ngModel)]="edit()!['Release_Notes']"
                name="notes"
              ></textarea>
            </label>
            @if (!edit()!['Id_Version']) {
              <label
                >Archivo APK<input type="file" accept=".apk" (change)="choose($event)" required
              /></label>
            }
          </div>
          <p>{{ message() }}</p>
          <div class="actions">
            <button type="button" class="secondary" (click)="edit.set(null)">Cancelar</button
            ><button [disabled]="f.invalid || busy()">
              {{ busy() ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    }`,
})
export class VersionsComponent {
  api = inject(ApiService);
  alerts = inject(AlertService);
  applications = signal<any[]>([]);
  rows = signal<any[]>([]);
  edit = signal<any>(null);
  message = signal('');
  busy = signal(false);
  application = '';
  page = 0;
  search = '';
  order = 'Created_At';
  direction = 'desc';
  sortBy(key: string) {
    this.direction = this.order === key && this.direction === 'asc' ? 'desc' : 'asc';
    this.order = key;
    this.load();
  }
  file: File | null = null;
  constructor() {
    this.api.get<any[]>('/admin/lookups/applications').subscribe((x) => this.applications.set(x));
  }
  load() {
    if (this.application)
      this.api
        .list(`applications/${this.application}/versions`, this.search, this.page, 25, {
          sort: this.order,
          direction: this.direction,
        })
        .subscribe((x) => this.rows.set(x));
  }
  async remove(version: any) {
    if (!(await this.alerts.confirm('¿Eliminar versión?', 'La versión será desactivada; el archivo APK se conservará.')).isConfirmed) return;
    this.api.delete(`/admin/applications/${this.application}/versions/${version.Id_Version}`).subscribe({
      next: () => { this.edit.set(null); this.load(); void this.alerts.success('Versión desactivada'); },
      error: (e) => void this.alerts.error('No fue posible eliminar', this.alerts.message(e)),
    });
  }
  open(v: any) {
    this.edit.set({ ...v });
  }
  choose(e: Event) {
    this.file = (e.target as HTMLInputElement).files?.[0] || null;
  }
  save() {
    const v = this.edit();
    let request;
    if (v.Id_Version)
      request = this.api.put(`/admin/applications/${this.application}/versions/${v.Id_Version}`, {
        Version_Name: v.Version_Name,
        Minimum_Android: v.Minimum_Android,
        Release_Notes: v.Release_Notes,
      });
    else {
      if (!this.file) {
        void this.alerts.warning('Validación', 'Seleccione un APK');
        return;
      }
      const body = new FormData();
      body.append('file', this.file);
      body.append('versionName', v.Version_Name);
      if (v.Minimum_Android) body.append('minimumAndroid', v.Minimum_Android);
      if (v.Release_Notes) body.append('releaseNotes', v.Release_Notes);
      request = this.api.post(`/admin/applications/${this.application}/versions`, body);
    }
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.edit.set(null);
        this.busy.set(false);
        this.file = null;
        this.load();
        void this.alerts.success(v.Id_Version ? 'Versión actualizada' : 'APK cargado');
      },
      error: (e) => {
        this.busy.set(false);
        void this.alerts.error('No fue posible guardar', this.alerts.message(e));
      },
    });
  }
}
