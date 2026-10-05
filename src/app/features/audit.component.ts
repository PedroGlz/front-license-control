import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['./forms.scss'],
  template: `
    <h1>Auditoría</h1>
    <input
      placeholder="Buscar evento o usuario"
      [(ngModel)]="search"
      (keyup.enter)="page = 0; load()"
    /><button (click)="direction = direction === 'desc' ? 'asc' : 'desc'; load()">
      Fecha {{ direction === 'desc' ? '↓' : '↑' }}
    </button>
    <div class="grid" style="margin:18px 0">
      <label>Desde<input type="date" [(ngModel)]="filters.from" /></label
      ><label>Hasta<input type="date" [(ngModel)]="filters.to" /></label
      ><label
        >Usuario<select [(ngModel)]="filters.user">
          <option value="">Todos</option>
          @for (u of users(); track u.id) {
            <option [value]="u.id">{{ u.label }}</option>
          }
        </select></label
      ><label
        >Sistema<select [(ngModel)]="filters.system">
          <option value="">Todos</option>
          @for (s of systems(); track s.id) {
            <option [value]="s.id">{{ s.label }}</option>
          }
        </select></label
      ><label
        >Tipo de evento<input
          [(ngModel)]="filters.eventType"
          placeholder="LOGIN, CREATE, UPDATE…" /></label
      ><label
        >Resultado<input
          [(ngModel)]="filters.result"
          list="audit-results"
          placeholder="Todos o resultado exacto"
        /><datalist id="audit-results">
          <option value="SUCCESS">Correcto</option>
          <option value="FAILURE">Fallido</option>
        </datalist></label
      >
    </div>
    <button (click)="page = 0; load()">Aplicar filtros</button>
    <p class="error">{{ error() }}</p>
    @for (section of sections; track section.key) {
      <div class="panel" style="padding:18px;margin-top:18px">
        <h2>{{ section.label }}</h2>
        <table>
          <thead>
            <tr>
              @for (c of section.columns; track c.key) {
                <th>{{ c.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of data()?.[section.key] || []; track $index) {
              <tr>
                @for (c of section.columns; track c.key) {
                  <td>{{ display(row[c.key]) }}</td>
                }
              </tr>
            } @empty {
              <tr>
                <td>Sin eventos</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    <footer>
      <button [disabled]="page === 0" (click)="page = page - 1; load()">Anterior</button
      ><span>Página {{ page + 1 }}</span
      ><button [disabled]="!hasNext()" (click)="page = page + 1; load()">Siguiente</button>
    </footer>
  `,
})
export class AuditComponent {
  page = 0;
  search = '';
  direction = 'desc';
  hasNext() {
    return Object.values(this.data() || {}).some((rows) => rows.length === 25);
  }
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  data = signal<Record<string, any[]> | null>(null);
  users = signal<any[]>([]);
  systems = signal<any[]>([]);
  error = signal('');
  filters = { from: '', to: '', user: '', system: '', eventType: '', result: '' };
  sections = [
    {
      key: 'authentication',
      label: 'Autenticación',
      columns: [
        { key: 'Username_Attempted', label: 'Usuario' },
        { key: 'Event_Type', label: 'Evento' },
        { key: 'Success', label: 'Resultado' },
        { key: 'Failure_Reason', label: 'Motivo' },
        { key: 'Occurred_At', label: 'Fecha' },
      ],
    },
    {
      key: 'audit',
      label: 'Administración',
      columns: [
        { key: 'Action', label: 'Acción' },
        { key: 'Entity_Type', label: 'Entidad' },
        { key: 'Entity_Id', label: 'Registro' },
        { key: 'Id_User', label: 'Usuario' },
        { key: 'Created_At', label: 'Fecha' },
      ],
    },
    {
      key: 'licenseValidation',
      label: 'Licenciamiento',
      columns: [
        { key: 'Event_Type', label: 'Evento' },
        { key: 'Result', label: 'Resultado' },
        { key: 'Reason', label: 'Motivo' },
        { key: 'Id_Usuario', label: 'Usuario' },
        { key: 'Created_At', label: 'Fecha' },
      ],
    },
  ];
  constructor() {
    this.api.get<any[]>('/admin/lookups/users').subscribe((x) => this.users.set(x));
    this.api.get<any[]>('/admin/lookups/systems').subscribe((x) => this.systems.set(x));
    this.load();
  }
  load() {
    this.api
      .get<Record<string, any[]>>('/admin/audit', {
        ...this.filters,
        page: this.page,
        size: 25,
        search: this.search,
        direction: this.direction,
      })
      .subscribe({
        next: (x) => this.data.set(x),
        error: (e) => void this.alerts.error('No fue posible consultar', this.alerts.message(e)),
      });
  }
  display(v: any) {
    return typeof v === 'boolean' ? (v ? 'Correcto' : 'Fallido') : (v ?? '—');
  }
}
