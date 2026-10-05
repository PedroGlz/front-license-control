import { Component, input, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';

@Component({
  standalone: true,
  selector: 'app-user-systems',
  imports: [FormsModule],
  styleUrls: ['./forms.scss'],
  template: `
    <h3>Sistemas y atributos</h3>
    <div class="toolbar">
      <select [(ngModel)]="newSystem">
        <option value="">Seleccione sistema</option>
        @for (s of systems(); track s.id) {
          <option [value]="s.id">{{ s.label }}</option>
        }</select
      ><button type="button" [disabled]="!newSystem" (click)="assign()">Asignar sistema</button>
    </div>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @for (access of assigned(); track access['Id_System']) {
      <section class="panel" style="padding:16px;margin-bottom:14px">
        <h4>{{ access['System_Code'] }} — {{ access['System_Name'] }}</h4>
        <div class="actions">
          <button type="button" (click)="removeSystem(access)">Quitar</button
          ><button type="button" class="secondary" (click)="select(access['Id_System'])">
            Roles y atributos
          </button>
        </div>
        @if (selectedSystem() === access['Id_System']) {
          <h4>Roles del sistema</h4>
          @for (role of roles(); track role['Id_Role']) {
            <label style="display:block;margin:8px"
              ><input
                type="checkbox"
                [(ngModel)]="role['Assigned']"
              />
              {{ role['Name'] }}</label
            >
          }
          <button type="button" (click)="saveRoles()">Guardar roles</button>
          <h4>Atributos del sistema</h4>
          <div class="grid">
            @for (a of attributes(); track a['Id_Attribute']) {
              <label
                >{{ a['Name'] }}{{ a['Is_Required'] ? ' *' : '' }}
                @if (
                  a['Data_Type'] === 'MULTISELECT' ||
                  (a['Is_Multivalue'] && a['Data_Type'] === 'SELECT')
                ) {
                  <select multiple [(ngModel)]="a['_value']">
                    @for (o of a['_options']; track o['Value_Code']) {
                      <option [value]="o['Value_Code']">{{ o['Display_Name'] }}</option>
                    }
                  </select>
                } @else if (a['Data_Type'] === 'SELECT') {
                  <select [(ngModel)]="a['_value']" [required]="a['Is_Required']">
                    <option [ngValue]="null">Sin valor</option>
                    @for (o of a['_options']; track o['Value_Code']) {
                      <option [value]="o['Value_Code']">{{ o['Display_Name'] }}</option>
                    }
                  </select>
                } @else if (a['Data_Type'] === 'BOOLEAN' && !a['Is_Multivalue']) {
                  <select [(ngModel)]="a['_value']">
                    <option [ngValue]="null">Sin valor</option>
                    <option [ngValue]="true">Sí</option>
                    <option [ngValue]="false">No</option>
                  </select>
                } @else if (a['Data_Type'] === 'JSON' || a['Is_Multivalue']) {
                  <textarea [(ngModel)]="a['_value']" placeholder="JSON" rows="3"></textarea>
                } @else {
                  <input
                    [type]="inputType(a['Data_Type'])"
                    [(ngModel)]="a['_value']"
                    [required]="a['Is_Required']"
                    [min]="a['Min_Value']"
                    [max]="a['Max_Value']"
                    [step]="a['Data_Type'] === 'DECIMAL' ? 'any' : '1'"
                  />
                }
              </label>
            }
          </div>
          <div class="actions">
            <button type="button" (click)="saveAttributes()">Guardar atributos</button>
          </div>
        }
      </section>
    }
  `,
})
export class UserSystemsComponent implements OnInit {
  userId = input.required<string>();
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  systems = signal<any[]>([]);
  assigned = signal<any[]>([]);
  roles = signal<any[]>([]);
  attributes = signal<any[]>([]);
  selectedSystem = signal('');
  message = signal('');
  newSystem = '';
  ngOnInit() {
    this.api.get<any[]>('/admin/lookups/systems').subscribe((x) => this.systems.set(x));
    this.load();
  }
  load() {
    this.api.get<any[]>(`/admin/users/${this.userId()}/systems`).subscribe((x) => {
      this.assigned.set(x);
    });
  }
  assign() {
    this.api
      .post(`/admin/users/${this.userId()}/systems`, {
        Id_System: this.newSystem,
      })
      .subscribe({
        next: () => {
          this.newSystem = '';
          this.load();
          void this.alerts.success('Sistema asignado');
        },
        error: (e) => this.fail(e),
      });
  }
  async removeSystem(a: any) {
    if (!(await this.alerts.confirm('¿Quitar sistema?', 'La asignación será desactivada.')).isConfirmed) return;
    this.api.delete(`/admin/users/${this.userId()}/systems/${a.Id_System}`).subscribe({
      next: () => { this.selectedSystem.set(''); this.load(); void this.alerts.success('Sistema quitado'); },
      error: (e) => this.fail(e),
    });
  }
  select(s: string) {
    this.selectedSystem.set(s);
    this.api.get<any[]>(`/admin/users/${this.userId()}/systems/${s}/roles`).subscribe((x) => {
      x.forEach((r) => (r.Assigned = !!r.Assigned));
      this.roles.set(x);
    });
    this.api.get<any[]>(`/admin/users/${this.userId()}/systems/${s}/attributes`).subscribe((x) => {
      for (const a of x) {
        const multi = !!a.Is_Multivalue || a.Data_Type === 'MULTISELECT';
        const k = multi
          ? 'Value_Json'
          : (
              {
                INTEGER: 'Value_Integer',
                DECIMAL: 'Value_Decimal',
                BOOLEAN: 'Value_Boolean',
                DATE: 'Value_Date',
                DATETIME: 'Value_Datetime',
                JSON: 'Value_Json',
              } as Record<string, string>
            )[a.Data_Type] || 'Value_Text';
        a._value = a[k] ?? a.Default_Value ?? null;
        if (a.Data_Type === 'BOOLEAN' && a._value !== null) a._value = !!a._value;
        if (a.Data_Type === 'DATETIME' && a._value)
          a._value = a._value.replace(' ', 'T').slice(0, 16);
        if (multi && a._value && typeof a._value === 'string') {
          try {
            a._value = JSON.parse(a._value);
          } catch {}
        }
        if (
          multi &&
          a.Data_Type !== 'MULTISELECT' &&
          a.Data_Type !== 'SELECT' &&
          typeof a._value !== 'string'
        )
          a._value = JSON.stringify(a._value);
        if (a.Data_Type === 'JSON' && typeof a._value === 'object' && a._value !== null)
          a._value = JSON.stringify(a._value);
        a._options = [];
        if (['SELECT', 'MULTISELECT'].includes(a.Data_Type))
          this.api
            .get<any[]>(`/admin/attributes/${a.Id_Attribute}/options`)
            .subscribe((o) =>
              this.attributes.update((items) =>
                items.map((item) =>
                  item.Id_Attribute === a.Id_Attribute
                    ? { ...item, _options: o.filter((v) => v.Is_Active === true) }
                    : item,
                ),
              ),
            );
      }
      this.attributes.set(x);
    });
  }
  async saveRoles() {
    if (!(await this.alerts.confirm('¿Guardar roles?', 'Los roles desmarcados serán quitados mediante baja lógica.')).isConfirmed) return;
    this.api
      .put(
        `/admin/users/${this.userId()}/systems/${this.selectedSystem()}/roles`,
        this.roles()
          .filter((r) => r.Assigned)
          .map((r) => r.Id_Role),
      )
      .subscribe({
        next: () => void this.alerts.success('Roles guardados'),
        error: (e) => this.fail(e),
      });
  }
  saveAttributes() {
    const requests = this.attributes().map((a) =>
      this.api.put(
        `/admin/users/${this.userId()}/systems/${this.selectedSystem()}/attributes/${a.Id_Attribute}`,
        { value: a._value ?? null },
      ),
    );
    if (requests.length)
      forkJoin(requests).subscribe({
        next: () => {
          void this.alerts.success('Atributos guardados');
          this.select(this.selectedSystem());
        },
        error: (e) => this.fail(e),
      });
  }
  inputType(t: string) {
    return (
      (
        {
          INTEGER: 'number',
          DECIMAL: 'number',
          DATE: 'date',
          DATETIME: 'datetime-local',
        } as Record<string, string>
      )[t] || 'text'
    );
  }
  fail(e: any) {
    void this.alerts.error('No fue posible guardar', this.alerts.message(e));
  }
}
