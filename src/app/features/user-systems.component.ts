import { Component, input, inject, signal, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';

@Component({
  standalone: true,
  selector: 'app-user-systems',
  imports: [FormsModule],
  styleUrls: ['./user-detail.scss'],
  templateUrl: './user-systems.component.html',
})
export class UserSystemsComponent implements OnInit {
  userId = input.required<string>();
  section = input('systems');
  sectionChange = output<string>();
  systemSearch = '';
  loading = signal(true);
  rolesLoading = signal(false);
  attributesLoading = signal(false);
  assignmentBusy = signal(false);
  name(label: string) { return label; }
  accessFor(id: string) { return this.assigned().find(a => a['Id_System'] === id); }
  systemName() { return this.accessFor(this.selectedSystem())?.['System_Name'] || 'este sistema'; }
  visibleSystems() {
    const items = [...this.systems()];
    for (const access of this.assigned()) if (!items.some(s => s.id === access['Id_System'])) items.push({id:access['Id_System'],label:access['System_Name']});
    return items.filter(s => this.name(s.label).toLocaleLowerCase().includes(this.systemSearch.toLocaleLowerCase()));
  }
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
    this.api.get<any[]>('/admin/lookups/systems').subscribe({next: (x) => this.systems.set(x), error: (e) => this.fail(e)});
    this.load();
  }
  load() {
    this.api.get<any[]>(`/admin/users/${this.userId()}/systems`).subscribe({next: (x) => { this.assigned.set(x); this.loading.set(false); }, error: (e) => { this.loading.set(false); this.fail(e); }});
  }
  async assign() {
    if (this.assignmentBusy()) return;
    const system = this.newSystem;
    this.assignmentBusy.set(true);
    if (!(await this.alerts.confirm('¿Asignar sistema?', 'El usuario tendrá acceso al sistema seleccionado.')).isConfirmed) { this.assignmentBusy.set(false); return; }
    this.api
      .post(`/admin/users/${this.userId()}/systems`, {
        Id_System: system,
      })
      .subscribe({
        next: () => {
          this.newSystem = '';
          this.assignmentBusy.set(false);
          this.load();
          void this.alerts.success('Sistema asignado');
        },
        error: (e) => { this.assignmentBusy.set(false); this.fail(e); },
      });
  }
  async removeSystem(a: any) {
    if (this.assignmentBusy()) return;
    this.assignmentBusy.set(true);
    if (!(await this.alerts.confirm('¿Quitar sistema?', 'La asignación será desactivada.')).isConfirmed) { this.assignmentBusy.set(false); return; }
    this.api.delete(`/admin/users/${this.userId()}/systems/${a.Id_System}`).subscribe({
      next: () => { this.assignmentBusy.set(false); this.selectedSystem.set(''); this.load(); void this.alerts.success('Sistema quitado'); },
      error: (e) => { this.assignmentBusy.set(false); this.fail(e); },
    });
  }
  select(s: string) {
    this.selectedSystem.set(s);
    this.roles.set([]); this.attributes.set([]);
    this.rolesLoading.set(!!s); this.attributesLoading.set(!!s);
    if (!s) return;
    this.api.get<any[]>(`/admin/users/${this.userId()}/systems/${s}/roles`).subscribe({next: (x) => {
      if (this.selectedSystem() !== s) return;
      this.rolesLoading.set(false);
      x.forEach((r) => (r.Assigned = !!r.Assigned));
      this.roles.set(x);
    }, error: (e) => { if (this.selectedSystem() === s) { this.rolesLoading.set(false); this.fail(e); } }});
    this.api.get<any[]>(`/admin/users/${this.userId()}/systems/${s}/attributes`).subscribe({next: (x) => {
      if (this.selectedSystem() !== s) return;
      this.attributesLoading.set(false);
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
    }, error: (e) => { if (this.selectedSystem() === s) { this.attributesLoading.set(false); this.fail(e); } }});
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
