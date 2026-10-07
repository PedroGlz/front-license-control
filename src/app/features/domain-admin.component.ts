import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { generatedCode } from '../core/generated-code';
import { IconComponent } from '../core/icon.component';
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AttributeOptionsComponent } from './attribute-options.component';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';

type Field = { key: string; label: string; type?: string; lookup?: string; options?: string[] };
const status = ['ACTIVE', 'INACTIVE'];
const CONFIG: Record<string, { title: string; id: string; fields: Field[] }> = {
  'user-types': {
    title: 'Tipos de usuario',
    id: 'Id_User_Type',
    fields: [
      { key: 'Code', label: 'Código' },
      { key: 'Name', label: 'Nombre' },
      { key: 'Description', label: 'Descripción' },
      { key: 'Status', label: 'Estatus', options: status },
    ],
  },
  systems: {
    title: 'Sistemas',
    id: 'Id_System',
    fields: [
      { key: 'Code', label: 'Código' },
      { key: 'Name', label: 'Nombre' },
      { key: 'System_Type', label: 'Tipo', options: ['WEB', 'ANDROID', 'DESKTOP', 'API', 'OTHER'] },
      { key: 'Description', label: 'Descripción' },
      { key: 'Package_Name', label: 'Package name' },
      { key: 'Status', label: 'Estatus', options: status },
    ],
  },
  roles: {
    title: 'Roles',
    id: 'Id_Role',
    fields: [
      { key: 'Id_System', label: 'Sistema', lookup: 'systems' },
      { key: 'Code', label: 'Código' },
      { key: 'Name', label: 'Nombre' },
      { key: 'Description', label: 'Descripción' },
      { key: 'Is_System_Admin', label: 'Administrador', type: 'checkbox' },
      { key: 'Status', label: 'Estatus', options: status },
    ],
  },
  permissions: {
    title: 'Permisos',
    id: 'Id_Permission',
    fields: [
      { key: 'Id_System', label: 'Sistema', lookup: 'systems' },
      { key: 'Code', label: 'Código' },
      { key: 'Name', label: 'Nombre' },
      { key: 'Description', label: 'Descripción' },
      { key: 'Resource_Name', label: 'Recurso' },
      { key: 'Action_Name', label: 'Acción' },
      { key: 'Status', label: 'Estatus', options: status },
    ],
  },
  attributes: {
    title: 'Atributos por sistema',
    id: 'Id_Attribute',
    fields: [
      { key: 'Id_System', label: 'Sistema', lookup: 'systems' },
      { key: 'Code', label: 'Código' },
      { key: 'Name', label: 'Nombre' },
      { key: 'Description', label: 'Descripción' },
      {
        key: 'Data_Type',
        label: 'Tipo',
        options: [
          'TEXT',
          'INTEGER',
          'DECIMAL',
          'BOOLEAN',
          'DATE',
          'DATETIME',
          'SELECT',
          'MULTISELECT',
          'JSON',
        ],
      },
      { key: 'Is_Required', label: 'Obligatorio', type: 'checkbox' },
      { key: 'Is_Multivalue', label: 'Multivalor', type: 'checkbox' },
      { key: 'Default_Value', label: 'Predeterminado' },
      { key: 'Validation_Regex', label: 'Expresión regular' },
      { key: 'Min_Value', label: 'Mínimo', type: 'number' },
      { key: 'Max_Value', label: 'Máximo', type: 'number' },
      { key: 'Sort_Order', label: 'Orden', type: 'number' },
      { key: 'Status', label: 'Estatus', options: status },
    ],
  },

};

const ADMINISTRATIVE = new Set(['user-types', 'systems', 'roles', 'permissions', 'attributes']);
for (const [resource, config] of Object.entries(CONFIG)) {
  if (ADMINISTRATIVE.has(resource)) config.fields = config.fields.filter((field) =>
    field.key !== 'Status' && !(resource === 'roles' && ['Code', 'Is_System_Admin'].includes(field.key)));
}

@Component({
  standalone: true,
  imports: [SelectModule, TableModule, DialogModule, ButtonModule, InputTextModule, IconComponent, FormsModule, AttributeOptionsComponent],
  styleUrls: ['./forms.scss', './attribute-options.component.scss'],
  template: `
    <div class="page-heading tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4"><h1>{{ cfg.title }}</h1><button pButton (click)="open()">Nuevo</button></div>
    <div class="panel"><div class="table-tools"><div class="table-filters"><input pInputText
          placeholder="Buscar"
          [(ngModel)]="search"
          (keyup.enter)="page.set(0); load()"
        />@if (!administrative()) {<p-select [(ngModel)]="filterStatus" (ngModelChange)="page.set(0); load()" [options]="[''].concat(statusOptions())" ariaLabel="Estatus"><ng-template #item let-status>{{ status || 'Todos los estatus' }}</ng-template><ng-template #selectedItem let-status>{{ status || 'Todos los estatus' }}</ng-template></p-select>}
        @if (hasSystem()) {
          <p-select [(ngModel)]="filterSystem" (ngModelChange)="page.set(0); load()" [options]="[{id: '', label: 'Todos los sistemas'}].concat(lookups['systems'] || [])" optionLabel="label" optionValue="id" ariaLabel="Sistema" />
        }
        <button pButton type="button" class="secondary" (click)="search = ''; filterStatus = ''; filterSystem = ''; page.set(0); load()">Limpiar</button></div></div>
      <p-table [value]="view()" styleClass="etic-table" [scrollable]="true">
        <ng-template #header>
          <tr>
            @for (f of tableFields(); track f.key) {
              <th (click)="sort(f.key)">{{ f.label }}</th>
            }
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template #body let-r>
          
            <tr>
              @for (f of tableFields(); track f.key) {
                <td>
                  @if (f.key === 'Status') {
                    <span class="badge" [class.inactive]="r[f.key] !== 'ACTIVE'">{{
                      show(r[f.key], f)
                    }}</span>
                  } @else {
                    {{ show(r[f.key], f) }}
                  }
                </td>
              }
              <td><button pButton type="button" class="icon-button" title="Ver / Editar" aria-label="Ver / Editar" (click)="open(r)"><app-icon name="edit" /></button><button pButton type="button" class="icon-button danger" title="Desactivar" aria-label="Desactivar" (click)="remove(r)"><app-icon name="trash" /></button> </td>
            </tr>
          </ng-template>
        <ng-template #emptymessage><tr><td colspan="7" class="empty">Sin registros</td></tr></ng-template>
      </p-table>
      <footer>
        <button pButton [disabled]="page() === 0" (click)="page.set(page() - 1); load()">Anterior</button
        ><span>Página {{ page() + 1 }}</span
        ><button pButton [disabled]="rows().length < 25" (click)="page.set(page() + 1); load()">
          Siguiente
        </button>
      </footer>
    </div>
    @if (model()) {
      <p-dialog [visible]="true" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width: 'min(92vw, 820px)'}">
        <form #domainForm="ngForm" (ngSubmit)="save()">
          <div class="dialog-heading"><h2>{{ formTitle() }}</h2><button pButton type="button" class="icon-button close-button" title="Cerrar" aria-label="Cerrar formulario" (click)="model.set(null)"><app-icon name="close" /></button></div>
          <section [class.attribute-section]="resource === 'attributes'">
          @if(resource === 'attributes'){<h3>Datos del atributo</h3>}
          <div class="grid tw:grid tw:grid-cols-1 tw:md:grid-cols-2" [class.attribute-grid]="resource === 'attributes'">
            @switch (resource) {
              @case ('user-types') {
                <label
                  >Código <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="50"
                /></label>
                <label
                  >Nombre <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="100"
                /></label>
                <label
                  >Descripción<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                
              }
              @case ('systems') {
                <section class="form-section">
                  <h3>Datos generales</h3>
                  <div class="grid tw:grid tw:grid-cols-1 tw:md:grid-cols-2">
                <label
                  >Código <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="80"
                /></label>
                <label
                  >Nombre <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="150"
                /></label>
                <label
                  >Tipo de sistema <span class="required-marker" aria-hidden="true">*</span><select [(ngModel)]="model()!['System_Type']" name="System_Type" required>
                    <option value="">Seleccione</option>
                    <option>WEB</option>
                    <option>ANDROID</option>
                    <option>DESKTOP</option>
                    <option>API</option>
                    <option>OTHER</option>
                  </select></label
                >
                <label
                  >Descripción<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                <label class="check"><input type="checkbox" [checked]="model()!['Is_Active'] !== false" disabled />Activo</label>
                  </div>
                </section>
                @if (model()!['System_Type'] === 'ANDROID') { <section class="form-section licensing-section">
                  <h3>Licenciamiento Android</h3>
                  <div class="grid tw:grid tw:grid-cols-1 tw:md:grid-cols-2">
                    <label>Package Name <span class="required-marker" aria-hidden="true">*</span><input pInputText [(ngModel)]="model()!['Package_Name']" name="Package_Name" maxlength="255" required /></label>
                    <label>Modalidad de licenciamiento <span class="required-marker" aria-hidden="true">*</span><select [(ngModel)]="model()!['Licensing_Mode']" name="Licensing_Mode" required>
                      <option value="">Seleccione</option>
                      <option value="USER_DEVICE">Por usuario y dispositivo</option>
                      <option value="DEVICE_ONLY">Por dispositivo</option>
                    </select></label>
                    <label>Días offline <span class="required-marker" aria-hidden="true">*</span><input pInputText type="number" name="Offline_Validity_Days" [(ngModel)]="model()!['Offline_Validity_Days']" min="1" max="365" step="1" required /><small>Máximo de días que la aplicación puede funcionar sin renovar su licencia en línea.</small></label>
                  </div>
                </section> }
                
              }
              @case ('roles') {
                <label
                  >Sistema <span class="required-marker" aria-hidden="true">*</span><select [(ngModel)]="model()!['Id_System']" name="Id_System" required>
                    <option [ngValue]="null">Seleccione</option>
                    @for (o of lookups['systems'] || []; track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                
                <label
                  >Nombre <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="120"
                /></label>
                <label
                  >Descripción<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                
                
              }
              @case ('permissions') {
                <label
                  >Sistema <span class="required-marker" aria-hidden="true">*</span><select [(ngModel)]="model()!['Id_System']" name="Id_System" required>
                    <option [ngValue]="null">Seleccione</option>
                    @for (o of lookups['systems'] || []; track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                <label
                  >Código <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="120"
                /></label>
                <label
                  >Nombre <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="150"
                /></label>
                <label
                  >Descripción<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                <label
                  >Recurso<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Resource_Name']"
                    name="Resource_Name"
                    maxlength="100"
                /></label>
                <label
                  >Acción<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Action_Name']"
                    name="Action_Name"
                    maxlength="50"
                /></label>
                
              }
              @case ('attributes') {
                <label class="check"><input type="checkbox" [checked]="model()!['Is_Active'] !== false" disabled />Activo</label>
                <label
                  >Sistema <span class="required-marker" aria-hidden="true">*</span><select [(ngModel)]="model()!['Id_System']" name="Id_System" required>
                    <option [ngValue]="null">Seleccione</option>
                    @for (o of lookups['systems'] || []; track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                <label
                  >Código <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="100"
                /></label>
                <label
                  >Nombre <span class="required-marker" aria-hidden="true">*</span><input pInputText
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="150"
                /></label>
                <label
                  >Descripción<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                <label
                  >Tipo <span class="required-marker" aria-hidden="true">*</span><select [(ngModel)]="model()!['Data_Type']" name="Data_Type" required>
                    <option value="">Seleccione</option>
                    <option>TEXT</option>
                    <option>INTEGER</option>
                    <option>DECIMAL</option>
                    <option>BOOLEAN</option>
                    <option>DATE</option>
                    <option>DATETIME</option>
                    <option>SELECT</option>
                    <option>MULTISELECT</option>
                    <option>JSON</option>
                  </select></label
                >
                <label class="check"
                  >Obligatorio<input
                    type="checkbox"
                    [(ngModel)]="model()!['Is_Required']"
                    name="Is_Required"
                /></label>
                <label class="check"
                  >Multivalor<input
                    type="checkbox"
                    [(ngModel)]="model()!['Is_Multivalue']"
                    name="Is_Multivalue"
                /></label>
                <label
                  >Predeterminado<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Default_Value']"
                    name="Default_Value"
                    maxlength="150"
                /></label>
                <label
                  >Expresión regular<input pInputText
                    type="text"
                    [(ngModel)]="model()!['Validation_Regex']"
                    name="Validation_Regex"
                    maxlength="500"
                /></label>
                <label
                  >Mínimo<input pInputText
                    type="number"
                    [(ngModel)]="model()!['Min_Value']"
                    name="Min_Value"
                    maxlength="150"
                    step="any"
                /></label>
                <label
                  >Máximo<input pInputText
                    type="number"
                    [(ngModel)]="model()!['Max_Value']"
                    name="Max_Value"
                    maxlength="150"
                    step="any"
                /></label>
                <label
                  >Orden<input pInputText
                    type="number"
                    [(ngModel)]="model()!['Sort_Order']"
                    name="Sort_Order"
                    maxlength="150"
                    min="0"
                    step="1"
                /></label>
                
              }

            }
          </div>
          </section>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <div class="actions">
            <button pButton type="button" class="secondary" (click)="model.set(null)">Cancelar</button
            ><button pButton [disabled]="domainForm.invalid">Guardar</button>
          </div>
        </form>
          @if (
            resource === 'attributes' &&
            model()!['Id_Attribute'] &&
            ['SELECT', 'MULTISELECT'].includes(model()!['Data_Type'])
          ) {
            <app-attribute-options [attributeId]="model()!['Id_Attribute']" />
          }
          @if(resource === 'attributes' && !model()!['Id_Attribute'] && ['SELECT','MULTISELECT'].includes(model()!['Data_Type'])) { <section class="attribute-section"><h3>Valores del atributo</h3><p>Guarda primero el atributo para agregar sus valores.</p></section> }
      </p-dialog>
    }
  `,
})
export class DomainAdminComponent {
  private changeDetector = inject(ChangeDetectorRef);
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  private route = inject(ActivatedRoute);
  filterStatus = '';
  filterSystem = '';
  direction = 'asc';
  cfg = CONFIG['systems'];
  resource = 'systems';
  rows = signal<Record<string, any>[]>([]);
  model = signal<Record<string, any> | null>(null);
  page = signal(0);
  error = signal('');
  search = '';
  order = '';
  lookups: Record<string, { id: string; label: string; Licensing_Mode?: string; Status?: string }[]> = {};
  constructor() {
    this.route.data.subscribe((d) => {
      this.resource = d['domain'];
      this.cfg = CONFIG[this.resource];
      for (const f of this.cfg.fields)
        if (f.lookup)
          this.api.get<any[]>(`/admin/lookups/${f.lookup}`).subscribe((x) => {
            this.lookups[f.lookup!] = x;
            this.changeDetector.markForCheck();
          });
      this.load();
    });
  }
  formTitle() {
    return (this.model()?.[this.cfg.id] ? 'Editar ' : 'Nuevo ') + this.cfg.title;
  }
  statusLabel(value: string) { return ({ACTIVE:'Activo',INACTIVE:'Inactivo',PENDING:'Pendiente',ENROLLED:'Enrolado',SUSPENDED:'Suspendido',REVOKED:'Revocado',EXPIRED:'Vencido'} as Record<string,string>)[value] || value; }
  load() {
    this.api
      .list(this.resource, this.search, this.page(), 25, {
        Status: this.filterStatus,
        Id_System: this.filterSystem,
        sort: this.order || this.cfg.id,
        direction: this.direction,
      })
      .subscribe({
        next: (x) => this.rows.set(x),
        error: (e) => void this.alerts.error('Error al consultar', this.alerts.message(e)),
      });
  }
  view() {
    return this.rows();
  }
  sort(k: string) {
    this.direction = this.order === k && this.direction === 'asc' ? 'desc' : 'asc';
    this.order = k;
    this.load();
  }
  administrative() { return ADMINISTRATIVE.has(this.resource); }
  statusOptions() {
    return this.cfg.fields.find((f) => f.key === 'Status')?.options || [];
  }
  hasSystem() {
    return this.cfg.fields.some((f) => f.key === 'Id_System');
  }
  visible(f: Field) {
    return (
      !(
        f.key === 'Package_Name' &&
        this.resource === 'systems' &&
        this.model()?.['System_Type'] !== 'ANDROID'
      )
    );
  }
  tableFields() {
    const fields = this.cfg.fields.filter((f) => f.key !== 'Status').slice(0, 5);
    return [...fields, ...this.cfg.fields.filter((f) => f.key === 'Status')];
  }
  required(f: Field) {
    return (
      [
        'Code',
        'Name',
        'System_Type',
        'Data_Type',
        'Version_Name',
      ].includes(f.key)
    );
  }
  maxLength(f: Field) {
    return f.key === 'Description'
      ? 500
      : f.key === 'Code'
        ? 80
        : f.key === 'Package_Name'
          ? 255
          : 150;
  }
  open(r?: Record<string, any>) {
    this.error.set('');
    this.model.set(
      r
        ? { ...r }
        : {
            Status: 'ACTIVE',
            Licensing_Mode: this.resource === 'systems' ? null : 'USER_DEVICE',
            Offline_Validity_Days: 7,
            Sort_Order: 0,
            Is_Required: false,
            Is_Multivalue: false,
            Is_System_Admin: false,
          },
    );
  }
  code(): string {
    const m = this.model();
    if (m?.[this.cfg.id]) return m['Code'] || '';
    const max = this.resource === 'user-types' ? 50 : this.resource === 'attributes' ? 100 : this.resource === 'permissions' ? 120 : 80;
    return generatedCode(m?.['Name'], max);
  }
  async save() {
    this.error.set('');
    const m = { ...this.model() };
    if (this.administrative()) m['Code'] = this.code();
    delete m['Is_Active'];
    if (this.resource === 'systems' && m['System_Type'] !== 'ANDROID') { m['Licensing_Mode'] = null; m['Package_Name'] = null; delete m['Offline_Validity_Days']; }
    if (this.administrative()) delete m['Status'];
    if (this.resource === 'roles') { delete m['Code']; delete m['Is_System_Admin']; }
    const original = m[this.cfg.id]
      ? this.rows().find((r) => r[this.cfg.id] === m[this.cfg.id])
      : null;
    if (
      original?.['Status'] !== m['Status'] &&
      ['SUSPENDED', 'REVOKED', 'INACTIVE'].includes(m['Status'])
    ) {
      const result = await this.alerts.confirm(
        '¿Confirmar cambio de estatus?',
        `El registro cambiará a ${m['Status']}.`,
      );
      if (!result.isConfirmed) return;
    }
    const id = m[this.cfg.id],
      q = id ? this.api.update(this.resource, id, m) : this.api.create(this.resource, m);
    q.subscribe({
      next: () => {
        this.model.set(null);
        this.load();
        void this.alerts.success(id ? 'Registro actualizado' : 'Registro creado');
      },
      error: (e) => void this.alerts.error('No fue posible guardar', this.alerts.message(e)),
    });
  }
  async remove(row: Record<string, any>) {
    if (!(await this.alerts.confirm('¿Eliminar registro?', 'El registro será desactivado sin eliminar sus datos.')).isConfirmed) return;
    this.api.delete(`/admin/${this.resource}/${row[this.cfg.id]}`).subscribe({
      next: () => { this.model.set(null); this.load(); void this.alerts.success('Registro desactivado'); },
      error: (e) => void this.alerts.error('No fue posible eliminar', this.alerts.message(e)),
    });
  }
  show(v: any, f: Field) {
    if (f.lookup) return this.lookups[f.lookup]?.find((x) => x.id === v)?.label || v;
    if (f.type === 'checkbox') return v ? 'Sí' : 'No';
    return v ?? '—';
  }
}
