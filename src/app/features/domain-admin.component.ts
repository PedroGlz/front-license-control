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
  'application-access': {
    title: 'Asignaciones de licencia',
    id: 'Id_Access',
    fields: [
      { key: 'Id_Usuario', label: 'Usuario', lookup: 'users' },
      { key: 'Id_System', label: 'Sistema', lookup: 'licensed-systems' },
      { key: 'Status', label: 'Estatus', options: ['ACTIVE', 'SUSPENDED', 'REVOKED'] },
      { key: 'Valid_From', label: 'Desde', type: 'date' },
      { key: 'Valid_Until', label: 'Hasta', type: 'date' },
      { key: 'Max_Devices', label: 'Máximo de dispositivos', type: 'number' },
    ],
  },
  licenses: {
    title: 'Licencias',
    id: 'Id_License',
    fields: [
      { key: 'Id_Usuario', label: 'Usuario', lookup: 'users' },
      { key: 'Id_System', label: 'Sistema', lookup: 'user-licensed-systems' },
      { key: 'Id_Device', label: 'Dispositivo', lookup: 'devices' },
      { key: 'Valid_From', label: 'Desde', type: 'date' },
      { key: 'Valid_Until', label: 'Hasta', type: 'date' },
      { key: 'Status', label: 'Estatus', options: ['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'] },
    ],
  },
  devices: {
    title: 'Dispositivos',
    id: 'Id_Device',
    fields: [
      { key: 'Device_UUID', label: 'Identificador' },
      { key: 'Display_Name', label: 'Nombre' },
      { key: 'Manufacturer', label: 'Fabricante' },
      { key: 'Model', label: 'Modelo' },
      { key: 'Android_Version', label: 'Android' },
      { key: 'Package_Name', label: 'Package' },
      { key: 'App_Version', label: 'Versión' },
      {
        key: 'Status',
        label: 'Estatus',
        options: ['PENDING', 'ENROLLED', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'INACTIVE'],
      },
      { key: 'Notes', label: 'Notas' },
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
  imports: [IconComponent, FormsModule, AttributeOptionsComponent],
  styleUrls: ['./forms.scss'],
  template: `
    <div class="toolbar">
      <div>
        <h1>{{ cfg.title }}</h1>
        <div class="table-filters"><input
          placeholder="Buscar"
          [(ngModel)]="search"
          (keyup.enter)="page.set(0); load()"
        />@if (!administrative()) {<select [(ngModel)]="filterStatus" (ngModelChange)="page.set(0); load()">
          <option value="">Todos los estatus</option>
          @for (status of statusOptions(); track status) {
            <option>{{ status }}</option>
          }
        </select>}
        @if (hasSystem()) {
          <select [(ngModel)]="filterSystem" (ngModelChange)="page.set(0); load()">
            <option value="">Todos los sistemas</option>
            @for (s of (resource === 'application-access' ? userLicensedSystems() : resource === 'licenses' ? lookups['user-licensed-systems'] : lookups['systems']) || []; track s.id) {
              <option [value]="s.id">{{ s.label }}</option>
            }
          </select>
        }
        <button type="button" class="secondary" (click)="search = ''; filterStatus = ''; filterSystem = ''; page.set(0); load()">Limpiar</button></div>
      </div>
      @if (resource !== 'devices') { <button (click)="open()">Nuevo</button> }
    </div>
    <div class="panel">
      <table>
        <thead>
          <tr>
            @for (f of tableFields(); track f.key) {
              <th (click)="sort(f.key)">{{ f.label }}</th>
            }
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (r of view(); track r[cfg.id]) {
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
              <td><button type="button" class="icon-button" title="Ver / Editar" aria-label="Ver / Editar" (click)="open(r)"><app-icon name="edit" /></button>@if (resource !== 'devices') { <button type="button" class="icon-button danger" title="Desactivar" aria-label="Desactivar" (click)="remove(r)"><app-icon name="trash" /></button> } @if (resource === 'devices' && r['Device_Only'] && r['Status'] !== 'REVOKED') { <button type="button" class="secondary" (click)="retire(r,'LOST')">Marcar perdido</button><button type="button" class="secondary" (click)="retire(r,'REPLACED')">Reemplazar</button> }</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="7">Sin registros</td>
            </tr>
          }
        </tbody>
      </table>
      <footer>
        <button [disabled]="page() === 0" (click)="page.set(page() - 1); load()">Anterior</button
        ><span>Página {{ page() + 1 }}</span
        ><button [disabled]="rows().length < 25" (click)="page.set(page() + 1); load()">
          Siguiente
        </button>
      </footer>
    </div>
    @if (model()) {
      <div class="modal">
        <form #domainForm="ngForm" (ngSubmit)="save()">
          <div class="dialog-heading"><h2>{{ formTitle() }}</h2><button type="button" class="icon-button close-button" title="Cerrar" aria-label="Cerrar formulario" (click)="model.set(null)"><app-icon name="close" /></button></div>
          <div class="grid">
            @switch (resource) {
              @case ('user-types') {
                <label
                  >Código<input
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="50"
                /></label>
                <label
                  >Nombre<input
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="100"
                /></label>
                <label
                  >Descripción<input
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                
              }
              @case ('systems') {
                <label
                  >Código<input
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="80"
                /></label>
                <label
                  >Nombre<input
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="150"
                /></label>
                <label
                  >Tipo<select [(ngModel)]="model()!['System_Type']" name="System_Type" required>
                    <option value="">Seleccione</option>
                    <option>WEB</option>
                    <option>ANDROID</option>
                    <option>DESKTOP</option>
                    <option>API</option>
                    <option>OTHER</option>
                  </select></label
                >
                <label
                  >Descripción<input
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                @if (model()!['System_Type'] === 'ANDROID') { <section style="grid-column:1/-1">
                  <h3>Licenciamiento Android opcional</h3>
                  <div class="grid">
                    <label>Modalidad<select [(ngModel)]="model()!['Licensing_Mode']" name="Licensing_Mode">
                      <option [ngValue]="null">Sin licenciamiento</option>
                      <option value="USER_DEVICE">Por usuario y dispositivo</option>
                      <option value="DEVICE_ONLY">Por dispositivo</option>
                    </select></label>
                    @if (model()!['Licensing_Mode'] || model()!['System_Type'] === 'ANDROID') {
                      <label>Package name<input [(ngModel)]="model()!['Package_Name']" name="Package_Name" maxlength="255" /></label>
                    }
                    @if (model()!['Licensing_Mode']) { <label>Días offline<input type="number" name="Offline_Validity_Days" [(ngModel)]="model()!['Offline_Validity_Days']" min="1" max="30" step="1" required /></label> }
                  </div>
                </section> }
                
              }
              @case ('roles') {
                <label
                  >Sistema *<select [(ngModel)]="model()!['Id_System']" name="Id_System" required>
                    <option [ngValue]="null">Seleccione</option>
                    @for (o of lookups['systems'] || []; track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                
                <label
                  >Nombre *<input
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="120"
                /></label>
                <label
                  >Descripción<input
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                
                
              }
              @case ('permissions') {
                <label
                  >Sistema<select [(ngModel)]="model()!['Id_System']" name="Id_System" required>
                    <option [ngValue]="null">Seleccione</option>
                    @for (o of lookups['systems'] || []; track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                <label
                  >Código<input
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="120"
                /></label>
                <label
                  >Nombre<input
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="150"
                /></label>
                <label
                  >Descripción<input
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                <label
                  >Recurso<input
                    type="text"
                    [(ngModel)]="model()!['Resource_Name']"
                    name="Resource_Name"
                    maxlength="100"
                /></label>
                <label
                  >Acción<input
                    type="text"
                    [(ngModel)]="model()!['Action_Name']"
                    name="Action_Name"
                    maxlength="50"
                /></label>
                
              }
              @case ('attributes') {
                <label
                  >Sistema<select [(ngModel)]="model()!['Id_System']" name="Id_System" required>
                    <option [ngValue]="null">Seleccione</option>
                    @for (o of lookups['systems'] || []; track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                <label
                  >Código<input
                    type="text"
                    [ngModel]="code()" readonly
                    name="Code"
                    required
                    maxlength="100"
                /></label>
                <label
                  >Nombre<input
                    type="text"
                    [(ngModel)]="model()!['Name']"
                    name="Name"
                    required
                    maxlength="150"
                /></label>
                <label
                  >Descripción<input
                    type="text"
                    [(ngModel)]="model()!['Description']"
                    name="Description"
                    maxlength="500"
                /></label>
                <label
                  >Tipo<select [(ngModel)]="model()!['Data_Type']" name="Data_Type" required>
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
                  >Predeterminado<input
                    type="text"
                    [(ngModel)]="model()!['Default_Value']"
                    name="Default_Value"
                    maxlength="150"
                /></label>
                <label
                  >Expresión regular<input
                    type="text"
                    [(ngModel)]="model()!['Validation_Regex']"
                    name="Validation_Regex"
                    maxlength="500"
                /></label>
                <label
                  >Mínimo<input
                    type="number"
                    [(ngModel)]="model()!['Min_Value']"
                    name="Min_Value"
                    maxlength="150"
                    step="any"
                /></label>
                <label
                  >Máximo<input
                    type="number"
                    [(ngModel)]="model()!['Max_Value']"
                    name="Max_Value"
                    maxlength="150"
                    step="any"
                /></label>
                <label
                  >Orden<input
                    type="number"
                    [(ngModel)]="model()!['Sort_Order']"
                    name="Sort_Order"
                    maxlength="150"
                    min="0"
                    step="1"
                /></label>
                
              }

              @case ('application-access') {
                <label
                  >Usuario<select [(ngModel)]="model()!['Id_Usuario']" name="Id_Usuario" [disabled]="!!model()!['Id_Access']" required>
                    <option [ngValue]="null">Seleccione</option>
                    @if (model()!['Id_Usuario'] && !knownUser(model()!['Id_Usuario'])) {
                      <option [value]="model()!['Id_Usuario']">
                        Usuario legado no disponible
                      </option>
                    }
                    @for (o of lookups['users'] || []; track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                <label
                  >Sistema<select [(ngModel)]="model()!['Id_System']" name="Id_System" [disabled]="!!model()!['Id_Access']" required>
                    <option [ngValue]="null">Seleccione</option>
                    @for (o of userLicensedSystems(); track o.id) {
                      <option [value]="o.id">{{ o.label }}</option>
                    }
                  </select></label
                >
                <label
                  >Estado<select [(ngModel)]="model()!['Status']" name="Status" required>
                    <option value="">Seleccione</option>
                    <option value="ACTIVE">Activo</option>
                    <option value="SUSPENDED">Suspendido</option>
                    <option value="REVOKED">Revocado</option>
                  </select></label
                >
                <label
                  >Desde<input
                    type="date"
                    [(ngModel)]="model()!['Valid_From']"
                    name="Valid_From"
                    required
                    maxlength="150"
                /></label>
                <label
                  >Hasta<input
                    type="date"
                    [(ngModel)]="model()!['Valid_Until']"
                    name="Valid_Until"
                    [min]="model()!['Valid_From'] || null"
                    maxlength="150"
                /></label>
                <label
                  >Máximo de dispositivos *<input
                    type="number"
                    [(ngModel)]="model()!['Max_Devices']"
                    name="Max_Devices"
                    required
                    maxlength="150"
                    min="1"
                    step="1"
                /></label>
              }

              @case ('licenses') {
                <label>Sistema *<select [(ngModel)]="model()!['Id_System']" name="Id_System" required>
                  <option [ngValue]="null">Seleccione</option>
                  @for (o of lookups['user-licensed-systems'] || []; track o.id) { <option [value]="o.id">{{ o.label }}</option> }
                </select></label>
                <label>Dispositivo *<select [(ngModel)]="model()!['Id_Device']" name="Id_Device" required>
                  <option [ngValue]="null">Seleccione</option>
                  @for (o of lookups['devices'] || []; track o.id) { <option [value]="o.id">{{ o.label }}</option> }
                </select></label>
                @if (selectedDevice() && !['ACTIVE','ENROLLED'].includes(selectedDevice()!.Status || '')) {
                  <p class="error">Este dispositivo todavía no ha sido enrolado. La licencia no podrá utilizarse hasta completar el enrolamiento.</p>
                }
                @if (selectedApplication()?.Licensing_Mode === 'USER_DEVICE') {
                  <label>Usuario *<select [(ngModel)]="model()!['Id_Usuario']" name="Id_Usuario" required>
                    <option [ngValue]="null">Seleccione</option>
                    @if (model()!['Id_Usuario'] && !knownUser(model()!['Id_Usuario'])) { <option [value]="model()!['Id_Usuario']">Usuario legado no disponible</option> }
                    @for (o of lookups['users'] || []; track o.id) { <option [value]="o.id">{{ o.label }}</option> }
                  </select></label>
                }
                <label>Inicio *<input type="date" [(ngModel)]="model()!['Valid_From']" name="Valid_From" required /></label>
                <label>Vencimiento *<input type="date" [(ngModel)]="model()!['Valid_Until']" name="Valid_Until" [min]="model()!['Valid_From'] || null" required /></label>
                <label>Estado<select [(ngModel)]="model()!['Status']" name="Status" required><option value="ACTIVE">Activa</option><option value="SUSPENDED">Suspendida</option><option value="REVOKED">Revocada</option><option value="EXPIRED">Vencida</option></select></label>
              }

              @case ('devices') {
                <label>Nombre opcional<input [(ngModel)]="model()!['Display_Name']" name="Display_Name" maxlength="150" /></label>
                <label>Fabricante<input [(ngModel)]="model()!['Manufacturer']" name="Manufacturer" maxlength="100" /></label>
                <label>Modelo<input [(ngModel)]="model()!['Model']" name="Model" maxlength="100" /></label>
                <label>Versión Android<input [(ngModel)]="model()!['Android_Version']" name="Android_Version" maxlength="50" /></label>
                @if (!model()!['Id_Device']) {
                  <label>Estado inicial<select [(ngModel)]="model()!['Status']" name="Status" required><option value="PENDING">Pendiente de enrolamiento</option><option value="SUSPENDED">Suspendido</option></select></label>
                }
                <label>Notas<textarea [(ngModel)]="model()!['Notes']" name="Notes" maxlength="2000" rows="3"></textarea></label>
                @if (model()!['Id_Device']) {
                  <label>Estado<select [(ngModel)]="model()!['Status']" name="Status"><option value="PENDING">Pendiente</option><option value="ACTIVE" [disabled]="!model()!['Public_Key_Fingerprint']">Activo</option><option value="SUSPENDED">Suspendido</option>@if (!model()!['Device_Only'] || model()!['Status'] === 'REVOKED') { <option value="REVOKED">Revocado</option> }<option value="INACTIVE">Inactivo</option></select></label>
                  <label>Origen<input [value]="model()!['Origin']" readonly /></label>
                  <label>Registro<input [value]="model()!['Registered_At'] || '—'" readonly /></label>
                  <label>Enrolamiento<input [value]="model()!['Enrolled_At'] || 'Pendiente'" readonly /></label>
                  <label>Última validación<input [value]="model()!['Last_Validation_At'] || 'Sin validar'" readonly /></label>
                }
              }
            }
          </div>
          @if (
            resource === 'attributes' &&
            model()!['Id_Attribute'] &&
            ['SELECT', 'MULTISELECT'].includes(model()!['Data_Type'])
          ) {
            <app-attribute-options [attributeId]="model()!['Id_Attribute']" />
          }
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <div class="actions">
            <button type="button" class="secondary" (click)="model.set(null)">Cancelar</button
            ><button [disabled]="domainForm.invalid">Guardar</button>
          </div>
        </form>
      </div>
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
    const titles: Record<string,string[]> = {'licenses':['Nueva licencia','Editar licencia'],'devices':['Nuevo dispositivo','Editar dispositivo'],'application-access':['Nueva asignación de licencia','Editar asignación de licencia']};
    return titles[this.resource] ? titles[this.resource][this.model()?.[this.cfg.id] ? 1 : 0] : (this.model()?.[this.cfg.id] ? 'Editar ' : 'Nuevo ') + this.cfg.title;
  }
  async retire(row: Record<string,any>, reason: string) {
    if (!(await this.alerts.confirm(reason === 'LOST' ? '¿Marcar perdido?' : '¿Reemplazar dispositivo?', 'Se revocarán sus asignaciones, se liberará el cupo y no podrá volver a renovar. El historial se conserva.')).isConfirmed) return;
    this.api.post('/admin/devices/' + row['Id_Device'] + '/retire', {reason}).subscribe({
      next: () => { this.load(); void this.alerts.success('Dispositivo revocado'); },
      error: e => void this.alerts.error('No fue posible revocar', this.alerts.message(e)),
    });
  }
  selectedApplication() { return (this.lookups['user-licensed-systems'] || this.lookups['licensed-systems'])?.find(a => a.id === this.model()?.['Id_System']); }
  userLicensedSystems() { return (this.lookups['licensed-systems'] || []).filter(s => s.Licensing_Mode === 'USER_DEVICE'); }
  selectedDevice() { return this.lookups['devices']?.find(d => d.id === this.model()?.['Id_Device']); }
  statusLabel(value: string) { return ({ACTIVE:'Activo',INACTIVE:'Inactivo',PENDING:'Pendiente',ENROLLED:'Enrolado',SUSPENDED:'Suspendido',REVOKED:'Revocado',EXPIRED:'Vencido'} as Record<string,string>)[value] || value; }
  knownUser(id: string) {
    return this.lookups['users']?.some((user) => user.id === id);
  }
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
    if (this.resource === 'devices')
      return [
        { key: 'Display_Name', label: 'Dispositivo' },
        { key: 'Manufacturer', label: 'Fabricante' },
        { key: 'Model', label: 'Modelo' },
        { key: 'Android_Version', label: 'Android' },
        { key: 'App_Version', label: 'Versión APK' },
        { key: 'Enrolled_At', label: 'Activación' },
        { key: 'Last_Validation_At', label: 'Última validación' },
        { key: 'Status', label: 'Estatus' },
      ];
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
        'Valid_From',
        'Max_Devices',
      ].includes(f.key) ||
      (f.key === 'Valid_Until' && this.resource === 'licenses')
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
            Status: this.resource === 'devices' ? 'PENDING' : 'ACTIVE',
            Valid_From: ['licenses','application-access'].includes(this.resource) ? new Date().toISOString().slice(0,10) : undefined,
            Licensing_Mode: this.resource === 'systems' ? null : 'USER_DEVICE',
            Offline_Validity_Days: 7,
            Max_Devices: 1,
            Sort_Order: 0,
            Is_Required: false,
            Is_Multivalue: false,
            Is_System_Admin: false,
            Origin: 'MANUAL',
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
    if (this.resource === 'licenses') {
      const app = this.selectedApplication();
      if (!app) { void this.alerts.warning('Validación', 'Seleccione un sistema con licenciamiento activo'); return; }
      if (app.Licensing_Mode === 'DEVICE_ONLY') m['Id_Usuario'] = null;
      else if (!m['Id_Usuario']) { void this.alerts.warning('Validación', 'Seleccione un usuario para USER_DEVICE'); return; }
    }
    if (this.administrative()) delete m['Status'];
    if (this.resource === 'roles') { delete m['Code']; delete m['Is_System_Admin']; }
    if (m['Valid_From'] && m['Valid_Until'] && m['Valid_From'] > m['Valid_Until']) {
      void this.alerts.warning('Validación', 'Hasta debe ser posterior a Desde');
      return;
    }
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
