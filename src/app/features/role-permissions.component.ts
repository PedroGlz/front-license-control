import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['./forms.scss'],
  template: `<h1>Rol → Permisos</h1>
    <div class="panel">
      <label
        >Sistema<select [(ngModel)]="system" (ngModelChange)="loadRoles()">
          <option value="">Seleccione</option>
          @for (s of systems(); track s.id) {
            <option [value]="s.id">{{ s.label }}</option>
          }
        </select></label
      ><label
        >Rol<select [(ngModel)]="role" (ngModelChange)="loadPermissions()">
          <option value="">Seleccione</option>
          @for (r of roles(); track r['Id_Role']) {
            <option [value]="r['Id_Role']">{{ r['Name'] }}</option>
          }
        </select></label
      >
      <div class="permissions">
        @for (p of permissions(); track p['Id_Permission']) {
          <label
            ><input
              type="checkbox"
              [checked]="selected.has(p['Id_Permission'])"
              (change)="toggle(p['Id_Permission'], $event)"
            />{{ p['Code'] }} — {{ p['Name'] }}</label
          >
        }
      </div>
      <button [disabled]="!role" (click)="save()">Guardar permisos</button>
    </div>`,
  styles: [
    `
      .panel {
        padding: 22px;
        display: grid;
        gap: 16px;
        max-width: 800px;
      }
      .panel > label {
        display: grid;
        gap: 6px;
      }
      .permissions {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      .permissions label {
        border: 1px solid var(--border);
        padding: 10px;
        border-radius: 7px;
      }
      @media (max-width: 600px) {
        .permissions {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class RolePermissionsComponent {
  api = inject(ApiService);
  alerts = inject(AlertService);
  systems = signal<{ id: string; label: string }[]>([]);
  roles = signal<any[]>([]);
  permissions = signal<any[]>([]);
  selected = new Set<string>();
  system = '';
  role = '';
  constructor() {
    this.api.get<any[]>('/admin/lookups/systems').subscribe((x) => this.systems.set(x));
  }
  loadRoles() {
    this.role = '';
    this.permissions.set([]);
    this.api
      .list('roles', '', 0, 100, { Id_System: this.system })
      .subscribe((x) => this.roles.set(x.filter((r) => r['Id_System'] === this.system)));
  }
  loadPermissions() {
    if (!this.role) return;
    this.api.get<any[]>(`/admin/roles/${this.role}/permissions`).subscribe((x) => {
      this.permissions.set(x);
      this.selected = new Set(x.filter((p) => p.Assigned).map((p) => p.Id_Permission));
    });
  }
  toggle(id: string, e: Event) {
    (e.target as HTMLInputElement).checked ? this.selected.add(id) : this.selected.delete(id);
  }
  async save() {
    if (!(await this.alerts.confirm('¿Guardar permisos?', 'Los permisos desmarcados serán quitados mediante baja lógica.')).isConfirmed) return;
    this.api.put(`/admin/roles/${this.role}/permissions`, [...this.selected]).subscribe({
      next: () => {
        void this.alerts.success('Permisos guardados');
        this.loadPermissions();
      },
      error: (e) => void this.alerts.error('No fue posible guardar', this.alerts.message(e)),
    });
  }
}
