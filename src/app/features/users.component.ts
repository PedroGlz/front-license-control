import { IconComponent } from '../core/icon.component';
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UserSecurityComponent } from './user-security.component';
import { UserLicensingComponent } from './user-licensing.component';
import { UserSystemsComponent } from './user-systems.component';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({
  standalone: true,
  imports: [IconComponent, FormsModule, UserSystemsComponent, UserSecurityComponent, UserLicensingComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./forms.scss', './user-detail.scss', './users.component.scss'],
})
export class UsersComponent {
  changeDetector = inject(ChangeDetectorRef);
  api = inject(ApiService);
  alerts = inject(AlertService);
  users = signal<Record<string, any>[]>([]);
  model = signal<Record<string, any> | null>(null);
  assigned = signal<Record<string, any>[]>([]);
  availableRoles = signal<Record<string, any>[]>([]);
  roleSystem = signal('');
  selectedRoles = new Set<string>();
  types: { id: string; label: string }[] = [];
  systems: { id: string; label: string }[] = [];
  search = '';
  filterType = '';
  order = 'Username';
  direction = 'asc';
  page = signal(0);
  tab = signal('general');
  editing = signal(false);
  tabs = [{key:'general',label:'General'},{key:'security',label:'Seguridad'},{key:'systems',label:'Sistemas'},{key:'roles',label:'Roles'},{key:'attributes',label:'Atributos'},{key:'licensing',label:'Licenciamiento'}];
  initialConfirmation = '';
  showInitialPassword = false;
  newPassword = '';
  newSystem = '';
  error = signal('');
  fields = [
    { key: 'Username', label: 'Usuario', required: true, max: 100 },
    { key: 'First_Name', label: 'Nombre', required: true, max: 150 },
    { key: 'Last_Name', label: 'Apellido paterno', max: 150 },
    { key: 'Second_Last_Name', label: 'Apellido materno', max: 150 },
    { key: 'Email', label: 'Email', type: 'email', max: 254 },
    { key: 'Id_User_Type', label: 'Tipo de usuario', required: true },
    { key: 'Password', label: 'Contraseña', type: 'password', max: 72, required: true },
  ];
  visibleFields() { return this.fields.filter((f) => f.key !== 'Password'); }
  labelName(label: string) { return label; }
  fullName() { const m = this.model(); return [m?.['First_Name'],m?.['Last_Name'],m?.['Second_Last_Name']].filter(Boolean).join(' '); }
  isActive() { const m = this.model(); return m?.['Is_Active'] !== false && m?.['Is_Active'] !== 0 && (!m?.['Status'] || m['Status'] === 'ACTIVE'); }
  initialMatches() { return !!this.model()?.['Password'] && this.model()!['Password'] === this.initialConfirmation; }
  cancelEdit() { const id = this.model()?.['Id_User']; const original = this.users().find(u => u['Id_User'] === id); if (original) { this.model.set({...original}); this.editing.set(false); } else this.model.set(null); }
  constructor() {
    this.api.get<any[]>('/admin/lookups/user-types').subscribe((x) => {
      this.types = x;
      this.changeDetector.markForCheck();
    });
    this.api.get<any[]>('/admin/lookups/systems').subscribe((x) => {
      this.systems = x;
      this.changeDetector.markForCheck();
    });
    this.load();
  }
  load() {
    this.api
      .list('users', this.search, this.page(), 25, {
        Id_User_Type: this.filterType,
        sort: this.order,
        direction: this.direction,
      })
      .subscribe((x) => this.users.set(x));
  }
  sortBy(key: string) {
    this.direction = this.order === key && this.direction === 'asc' ? 'desc' : 'asc';
    this.order = key;
    this.load();
  }
  typeName(id: string) {
    return this.types.find((x) => x.id === id)?.label ? this.labelName(this.types.find((x) => x.id === id)!.label) : 'Tipo no disponible';
  }
  edit(u?: Record<string, any>) {
    this.error.set('');
    this.newPassword = '';
    this.initialConfirmation = ''; this.showInitialPassword = false;
    this.tab.set('general'); this.editing.set(!u);
    this.model.set(
      u
        ? { ...u }
        : {
            Id_User_Type: '',
            Username: '',
            First_Name: '',
            Last_Name: '',
            Second_Last_Name: '',
            Email: '',
            Password: '',
          },
    );
    this.assigned.set([]);
    if (u) this.loadSystems();
  }
  async save() {
    if (!this.model()?.['Id_User'] && !this.initialMatches()) return;
    const m = { ...this.model() };
    for (const key of ['Status', 'Is_Active', 'Employee_Number', 'External_Reference']) delete m[key];
    if (m['Id_User']) delete m['Password'];
    const q = m['Id_User']
      ? this.api.update('users', m['Id_User'], m)
      : this.api.create('users', m);
    q.subscribe({
      next: (u) => {
        this.model.set(u);
        this.editing.set(false); this.initialConfirmation = ''; this.showInitialPassword = false;
        this.load();
        this.loadSystems();
        void this.alerts.success(m['Id_User'] ? 'Usuario actualizado' : 'Usuario creado');
      },
      error: (e) => {
        let message = this.alerts.message(e);
        if (e.status === 409 && ['El nombre de usuario ya existe','El correo electrónico ya está registrado'].includes(message)) message += '.';
        void this.alerts.error('No fue posible guardar el usuario', message);
      },
    });
  }
  async remove(user: Record<string, any>) {
    if (!(await this.alerts.confirm('¿Eliminar usuario?', 'El usuario será desactivado.')).isConfirmed) return;
    this.api.delete(`/admin/users/${user['Id_User']}`).subscribe({
      next: () => { this.model.set(null); this.load(); void this.alerts.success('Usuario desactivado'); },
      error: (e) => void this.alerts.error('No fue posible eliminar', this.alerts.message(e)),
    });
  }
  password() {
    this.api
      .put(`/admin/users/${this.model()!['Id_User']}/password`, { password: this.newPassword })
      .subscribe({
        next: () => {
          this.newPassword = '';
          void this.alerts.success('Contraseña actualizada');
        },
        error: (e) =>
          void this.alerts.error('No fue posible actualizar la contraseña', this.alerts.message(e)),
      });
  }
  loadSystems() {
    this.api
      .get<any[]>(`/admin/users/${this.model()!['Id_User']}/systems`)
      .subscribe((x) => this.assigned.set(x));
  }
  assignSystem() {
    this.api
      .post(`/admin/users/${this.model()!['Id_User']}/systems`, {
        Id_System: this.newSystem,
      })
      .subscribe({
        next: () => {
          this.loadSystems();
          void this.alerts.success('Sistema asignado');
        },
        error: (e) =>
          void this.alerts.error('No fue posible asignar el sistema', this.alerts.message(e)),
      });
  }
  roles(s: string) {
    this.roleSystem.set(s);
    this.api
      .get<any[]>(`/admin/users/${this.model()!['Id_User']}/systems/${s}/roles`)
      .subscribe((x) => {
        this.availableRoles.set(x);
        this.selectedRoles = new Set(x.filter((r) => r.Assigned).map((r) => r.Id_Role));
      });
  }
  toggleRole(id: string, e: Event) {
    (e.target as HTMLInputElement).checked
      ? this.selectedRoles.add(id)
      : this.selectedRoles.delete(id);
  }
  saveRoles(s: string) {
    this.api
      .put(`/admin/users/${this.model()!['Id_User']}/systems/${s}/roles`, [...this.selectedRoles])
      .subscribe({
        next: () => {
          this.roles(s);
          void this.alerts.success('Roles guardados');
        },
        error: (e) =>
          void this.alerts.error('No fue posible guardar los roles', this.alerts.message(e)),
      });
  }
}
