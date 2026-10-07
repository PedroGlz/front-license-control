import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { IconComponent } from '../core/icon.component';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({
  standalone: true,
  imports: [SelectModule, TableModule, DialogModule, ButtonModule, InputTextModule, TextareaModule, IconComponent, FormsModule],
  styleUrls: ['./forms.scss'],
  template: `
    <div class="page-heading tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4"><h1>Versiones APK</h1><button pButton
        (click)="open()"
      >
        Subir APK
      </button></div>
    <div class="panel"><div class="table-tools"><div class="table-filters"><p-select [(ngModel)]="application" (ngModelChange)="page = 0; load()" [options]="[{id: '', label: 'Seleccione sistema'}].concat(applications())" optionLabel="label" optionValue="id" ariaLabel="Sistema" /><input pInputText
        placeholder="Buscar versión o archivo"
        [(ngModel)]="search"
        (keyup.enter)="page = 0; load()"
      /><button pButton type="button" class="secondary" (click)="search = ''; application = ''; page = 0; rows.set([])">Limpiar</button></div></div>
      <p-table [value]="rows()" styleClass="etic-table" [scrollable]="true">
        <ng-template #header>
          <tr>
            <th (click)="sortBy('Version_Name')">Versión</th>
            <th>Archivo</th>
            <th>Tamaño</th>
            <th>SHA256</th>
            <th (click)="sortBy('Created_At')">Fecha</th>
            <th>Estatus</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template #body let-v>
          
            <tr>
              <td>{{ v['Version_Name'] }}</td>
              <td>{{ v['Original_File_Name'] }}</td>
              <td>{{ v['File_Size'] }}</td>
              <td><span class="hash-cell" [title]="v['Sha256']">{{ v['Sha256'] }}</span></td>
              <td>{{ v['Created_At'] }}</td>
              <td>
                <span class="badge" [class.inactive]="!v['Published']">{{
                  v['Published'] ? 'PUBLICADA' : 'NO PUBLICADA'
                }}</span>
              </td>
              <td><button pButton type="button" class="icon-button" title="Ver / Editar" aria-label="Ver / Editar" (click)="open(v)"><app-icon name="edit" /></button><button pButton type="button" class="icon-button danger" title="Desactivar" aria-label="Desactivar" (click)="remove(v)"><app-icon name="trash" /></button></td>
            </tr>
          </ng-template>
      </p-table>
      <footer>
        <button pButton [disabled]="page === 0" (click)="page = page - 1; load()">Anterior</button
        ><span>Página {{ page + 1 }}</span
        ><button pButton [disabled]="rows().length < 25" (click)="page = page + 1; load()">
          Siguiente
        </button>
      </footer>
    </div>
    @if (edit()) {
      <p-dialog [visible]="true" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width: 'min(92vw, 820px)'}">
        <form #f="ngForm" (ngSubmit)="save()">
          <div class="dialog-heading"><h2>{{ edit()!['Id_Version'] ? 'Editar versión' : 'Subir versión APK' }}</h2><button pButton type="button" class="icon-button close-button" title="Cerrar" aria-label="Cerrar formulario" (click)="edit.set(null)"><app-icon name="close" /></button></div>
          <div class="grid tw:grid tw:grid-cols-1 tw:md:grid-cols-2">
            <label>Sistema <span class="required-marker" aria-hidden="true">*</span><select [(ngModel)]="edit()!['Id_System']" name="applicationId" [disabled]="!!edit()!['Id_Version']" required><option value="">Seleccione</option>@for (app of applications(); track app.id) { <option [value]="app.id">{{ app.label }}</option> }</select></label>
            <label>Versión <span class="required-marker" aria-hidden="true">*</span><input pInputText [(ngModel)]="edit()!['Version_Name']" name="versionName" required maxlength="80" /></label>
            @if (!edit()!['Id_Version']) { <label>Archivo APK <span class="required-marker" aria-hidden="true">*</span><input type="file" accept=".apk" (change)="choose($event)" required /></label> }
            <label>Android mínimo<input pInputText [(ngModel)]="edit()!['Minimum_Android']" name="minimumAndroid" maxlength="40" /></label>
            <label>Notas de versión<textarea pTextarea [(ngModel)]="edit()!['Release_Notes']" name="releaseNotes" rows="3"></textarea></label>
            <label class="check"><input type="checkbox" [(ngModel)]="edit()!['Mandatory']" name="mandatory" />Actualización obligatoria</label>
            <label class="check"><input type="checkbox" [(ngModel)]="edit()!['Published']" name="published" />{{ edit()!['Id_Version'] ? 'Publicada' : 'Publicar al subir' }}</label>
          </div>
          <p>{{ message() }}</p>
          <div class="actions">
            <button pButton type="button" class="secondary" (click)="edit.set(null)">Cancelar</button
            ><button pButton [disabled]="f.invalid || busy()">
              Guardar
            </button>
          </div>
        </form>
      </p-dialog>
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
    this.api.get<any[]>('/admin/lookups/licensed-systems').subscribe((x) => this.applications.set(x));
  }
  load() {
    if (this.application)
      this.api
        .list(`systems/${this.application}/versions`, this.search, this.page, 25, {
          sort: this.order,
          direction: this.direction,
        })
        .subscribe((x) => this.rows.set(x));
  }
  async remove(version: any) {
    if (!(await this.alerts.confirm('¿Eliminar versión?', 'La versión será desactivada; el archivo APK se conservará.')).isConfirmed) return;
    this.api.delete(`/admin/systems/${this.application}/versions/${version.Id_Version}`).subscribe({
      next: () => { this.edit.set(null); this.load(); void this.alerts.success('Versión desactivada'); },
      error: (e) => void this.alerts.error('No fue posible eliminar', this.alerts.message(e)),
    });
  }
  open(v?: any) {
    this.file = null; this.message.set('');
    this.edit.set(v ? {...v} : {Id_System:this.application, Version_Name:'', Minimum_Android:'', Release_Notes:'', Mandatory:false, Published:false});
  }
  choose(e: Event) {
    this.file = (e.target as HTMLInputElement).files?.[0] || null;
  }
  save() {
    if (this.busy()) return;
    const v = this.edit();
    if (!v?.Version_Name?.trim()) { void this.alerts.warning('Validación', 'Debes indicar la versión.'); return; }
    const application = v.Id_System || this.application;
    if (!application) { void this.alerts.warning('Validación', 'Seleccione un sistema'); return; }
    let request;
    if (v.Id_Version)
      request = this.api.put(`/admin/systems/${application}/versions/${v.Id_Version}`, {
        Version_Name: v.Version_Name,
        Minimum_Android: v.Minimum_Android,
        Release_Notes: v.Release_Notes,
        Mandatory: v.Mandatory,
        Published: v.Published,
      });
    else {
      if (!this.file) {
        void this.alerts.warning('Validación', 'Seleccione un APK');
        return;
      }
      const body = new FormData();
      body.append('file', this.file);
      body.append('versionName', v.Version_Name);
      body.append('mandatory', String(!!v.Mandatory));
      body.append('published', String(!!v.Published));
      if (v.Minimum_Android) body.append('minimumAndroid', v.Minimum_Android);
      if (v.Release_Notes) body.append('releaseNotes', v.Release_Notes);
      request = this.api.post(`/admin/systems/${application}/versions`, body);
    }
    this.busy.set(true);
    request.subscribe({
      next: () => {
        this.edit.set(null);
        this.busy.set(false);
        this.file = null;
        this.application = application;
        this.load();
        void this.alerts.success(v.Id_Version ? 'Versión actualizada' : 'APK cargado correctamente');
      },
      error: (e) => {
        this.busy.set(false);
        void this.alerts.error('No fue posible guardar', this.alerts.message(e));
      },
    });
  }
}
