import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({
  standalone: true,
  imports: [FormsModule],
  template: `<div class="head">
      <div>
        <h1>{{ title() }}</h1>
        <p>Consulta y administración de registros</p>
      </div>
      <button (click)="newItem()">Nuevo registro</button>
    </div>
    <div class="panel">
      <div class="tools">
        <input placeholder="Buscar…" [(ngModel)]="search" (keyup.enter)="load()" /><button
          class="secondary"
          (click)="load()"
        >
          Buscar
        </button>
      </div>
      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
      <div class="scroll">
        <table>
          <thead>
            <tr>
              @for (k of columns(); track k) {
                <th>{{ label(k) }}</th>
              }
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track id(row)) {
              <tr>
                @for (k of columns(); track k) {
                  <td>{{ display(row[k]) }}</td>
                }
                <td><button class="text" (click)="edit(row)">Editar</button></td>
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="columns().length + 1">No hay registros</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
    @if (editing()) {
      <div class="modal">
        <form class="dialog" (ngSubmit)="save()">
          <h2>{{ editingId() ? 'Editar' : 'Nuevo' }} registro</h2>
          <div class="form">
            @for (k of editable(); track k) {
              <label
                >{{ label(k)
                }}<input
                  [type]="k === 'Password' ? 'password' : 'text'"
                  [(ngModel)]="editing()![k]"
                  [name]="k"
              /></label>
            }
          </div>
          @if (error()) {
            <div class="error">{{ error() }}</div>
          }
          <footer>
            <button type="button" class="secondary" (click)="editing.set(null)">Cancelar</button
            ><button>Guardar</button>
          </footer>
        </form>
      </div>
    }`,
  styles: [
    `
      .head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 22px;
      }
      .head p {
        color: var(--text-secondary);
      }
      .panel {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
      }
      .tools {
        display: flex;
        gap: 8px;
        padding: 16px;
      }
      .tools input {
        max-width: 320px;
      }
      .scroll {
        overflow: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        white-space: nowrap;
      }
      th,
      td {
        text-align: left;
        padding: 12px 16px;
        border-top: 1px solid var(--border);
        font-size: 13px;
      }
      th {
        color: var(--text);
        background: var(--surface-alt);
      }
      button {
        border: 0;
        background: var(--primary);
        color: white;
        border-radius: 7px;
        padding: 10px 14px;
        cursor: pointer;
      }
      .secondary {
        background: var(--muted-bg);
        color: var(--text);
      }
      .text {
        background: none;
        color: var(--primary);
        padding: 4px;
      }
      .modal {
        position: fixed;
        z-index: 6;
        inset: 0;
        background: var(--overlay);
        display: grid;
        place-items: center;
        padding: 16px;
      }
      .dialog {
        background: var(--surface);
        border-radius: 12px;
        padding: 24px;
        width: min(760px, 100%);
        max-height: 90dvh;
        overflow: auto;
      }
      .form {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }
      .form label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      }
      input {
        padding: 10px;
        border: 1px solid var(--input-border);
        border-radius: 6px;
      }
      footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 22px;
      }
      .error {
        color: var(--danger);
        padding: 10px;
      }
      @media (max-width: 600px) {
        .form {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CatalogComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  resource = signal('');
  title = signal('');
  rows = signal<Record<string, any>[]>([]);
  columns = signal<string[]>([]);
  editing = signal<Record<string, any> | null>(null);
  editingId = signal('');
  error = signal('');
  search = '';
  private ids: Record<string, string> = {
    users: 'Id_User',
    'user-types': 'Id_User_Type',
    systems: 'Id_System',
    roles: 'Id_Role',
    permissions: 'Id_Permission',
    attributes: 'Id_Attribute',
    applications: 'Id_Application',
    devices: 'Id_Device',
    licenses: 'Id_License',
    'application-access': 'Id_Access',
  };
  constructor() {
    this.route.data.subscribe((d) => {
      this.resource.set(d['resource']);
      this.title.set(d['title']);
      this.load();
    });
  }
  load() {
    this.error.set('');
    this.api.list(this.resource(), this.search).subscribe({
      next: (r) => {
        this.rows.set(r);
        this.columns.set(
          r.length
            ? Object.keys(r[0])
                .filter((k) => !['Password_Hash', 'Public_Key'].includes(k))
                .slice(0, 8)
            : [],
        );
      },
      error: (e) => void this.alerts.error('No fue posible consultar', this.alerts.message(e)),
    });
  }
  id(r: Record<string, any>) {
    return r[this.ids[this.resource()]];
  }
  editable() {
    const row = this.editing();
    return row
      ? Object.keys(row).filter(
          (k) =>
            !k.startsWith('Id_') &&
            !k.match(/(_At|_By|Hash|Public_Key)$/) &&
            k !== 'Active_Identity',
        )
      : [];
  }
  newItem() {
    const templates: Record<string, Record<string, any>> = {
      users: {
        Id_User_Type: '',
        Username: '',
        First_Name: '',
        Last_Name: '',
        Second_Last_Name: '',
        Email: '',
        Employee_Number: '',
        External_Reference: '',
        Status: 'ACTIVE',
        Password: '',
      },
      systems: {
        Code: '',
        Name: '',
        System_Type: 'WEB',
        Description: '',
        Package_Name: '',
        Status: 'ACTIVE',
      },
    };
    this.editingId.set('');
    this.editing.set(
      templates[this.resource()] || { Code: '', Name: '', Description: '', Status: 'ACTIVE' },
    );
  }
  edit(r: Record<string, any>) {
    this.editingId.set(this.id(r));
    this.editing.set({ ...r });
  }
  save() {
    const req = this.editingId()
      ? this.api.update(this.resource(), this.editingId(), this.editing())
      : this.api.create(this.resource(), this.editing());
    req.subscribe({
      next: () => {
        this.editing.set(null);
        this.load();
        void this.alerts.success(this.editingId() ? 'Registro actualizado' : 'Registro creado');
      },
      error: (e) => void this.alerts.error('No fue posible guardar', this.alerts.message(e)),
    });
  }
  label(k: string) {
    return k.replaceAll('_', ' ');
  }
  display(v: any) {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  }
}
