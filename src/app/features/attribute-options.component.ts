import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { IconComponent } from '../core/icon.component';
import { Component, input, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
interface AttributeOption { Id_Option?: string; Value_Code: string; Display_Name: string; Sort_Order: number; Is_Active: boolean; }
@Component({
  standalone: true, selector: 'app-attribute-options',
  imports: [ButtonModule, InputTextModule, DialogModule, TableModule, FormsModule, IconComponent],
  styleUrls: ['./forms.scss', './attribute-options.component.scss'],
  template: `
    <section class="attribute-section">
      <header class="option-heading"><div><h3>Valores del atributo</h3><p>Administra los valores disponibles y sus etiquetas.</p></div>
        <button pButton type="button" (click)="open()">Agregar valor</button>
      </header>
      <p-table [value]="options()" styleClass="etic-table" [scrollable]="true">
        <ng-template #header><tr><th>Valor</th><th>Etiqueta</th><th>Orden</th><th>Estado</th><th>Acciones</th></tr></ng-template>
        <ng-template #body let-option><tr>
          <td>{{option.Value_Code}}</td><td>{{option.Display_Name}}</td><td>{{option.Sort_Order}}</td>
          <td><span class="badge" [class.inactive]="!option.Is_Active">{{option.Is_Active ? 'Activo' : 'Inactivo'}}</span></td>
          <td><button pButton type="button" class="icon-button" aria-label="Editar valor" title="Editar valor" (click)="open(option)"><app-icon name="edit" /></button>
            @if(option.Is_Active){<button pButton type="button" class="icon-button danger" aria-label="Desactivar valor" title="Desactivar valor" [disabled]="busy()" (click)="remove(option)"><app-icon name="trash" /></button>}
            @else{<button pButton type="button" class="secondary" [disabled]="busy()" (click)="reactivate(option)">Reactivar</button>}
          </td></tr></ng-template>
        <ng-template #emptymessage><tr><td colspan="5" class="empty">No hay valores registrados. Agrega el primero.</td></tr></ng-template>
      </p-table>
    </section>
    @if(model(); as option){
      <p-dialog [visible]="true" [modal]="true" [draggable]="false" [closable]="false" [showHeader]="false" styleClass="etic-dialog" [style]="{width:'min(92vw, 560px)'}">
        <form #optionForm="ngForm" (ngSubmit)="save()">
          <div class="dialog-heading"><h2>{{option.Id_Option ? 'Editar valor' : 'Agregar valor'}}</h2><button pButton type="button" class="icon-button" aria-label="Cerrar" [disabled]="busy()" (click)="model.set(null)"><app-icon name="close" /></button></div>
          <div class="grid option-grid">
            <label>Valor *<input pInputText name="value" [(ngModel)]="option.Value_Code" required maxlength="100" /></label>
            <label>Etiqueta<input pInputText name="label" [(ngModel)]="option.Display_Name" maxlength="150" /></label>
            <label>Orden<input pInputText name="order" type="number" [(ngModel)]="option.Sort_Order" required min="0" max="2147483647" step="1" /></label>
            <label class="check"><input name="active" type="checkbox" [(ngModel)]="option.Is_Active" />Activo</label>
          </div>
          <div class="actions"><button pButton type="button" class="secondary" [disabled]="busy()" (click)="model.set(null)">Cancelar</button><button pButton type="submit" [disabled]="optionForm.invalid || busy() || !option.Value_Code.trim()">Guardar</button></div>
        </form>
      </p-dialog>
    }`,
})
export class AttributeOptionsComponent implements OnInit {
  attributeId = input.required<string>();
  private api = inject(ApiService);
  private alerts = inject(AlertService);
  options = signal<AttributeOption[]>([]);
  model = signal<AttributeOption | null>(null);
  busy = signal(false);
  ngOnInit() { this.load(); }
  private url() { return '/admin/attributes/' + this.attributeId() + '/options'; }
  load() {
    this.api.get<AttributeOption[]>(this.url() + '?includeInactive=true').subscribe({
      next: rows => this.options.set(rows),
      error: e => void this.alerts.error('No fue posible cargar los valores', this.alerts.message(e)),
    });
  }
  open(option?: AttributeOption) {
    this.model.set(option ? {...option} : {Value_Code:'', Display_Name:'', Sort_Order:0, Is_Active:true});
  }
  save() {
    const option = this.model(); if (!option || this.busy()) return;
    if (!Number.isInteger(option.Sort_Order) || option.Sort_Order < 0) { void this.alerts.error('Orden inválido', 'Ingresa un entero mayor o igual a cero.'); return; }
    this.persist(option, true);
  }
  private persist(option: AttributeOption, close: boolean) {
    this.busy.set(true);
    const body = {Value_Code:option.Value_Code.trim(), Display_Name:option.Display_Name.trim(), Sort_Order:option.Sort_Order, Is_Active:option.Is_Active};
    const request = option.Id_Option ? this.api.put(this.url() + '/' + option.Id_Option, body) : this.api.post(this.url(), body);
    request.subscribe({
      next: () => { this.busy.set(false); if(close)this.model.set(null); this.load(); void this.alerts.success('Valor guardado'); },
      error: e => { this.busy.set(false); void this.alerts.error('No fue posible guardar', this.alerts.message(e)); },
    });
  }
  async reactivate(option: AttributeOption) {
    if(this.busy() || !(await this.alerts.confirm('¿Reactivar valor?')).isConfirmed)return;
    this.persist({...option, Is_Active:true}, false);
  }
  async remove(option: AttributeOption) {
    if(this.busy() || !(await this.alerts.confirm('¿Desactivar valor?', 'Se conservarán los datos existentes.')).isConfirmed)return;
    this.busy.set(true);
    this.api.delete(this.url() + '/' + option.Id_Option).subscribe({
      next: () => { this.busy.set(false); this.load(); void this.alerts.success('Valor desactivado'); },
      error: e => { this.busy.set(false); void this.alerts.error('No fue posible desactivar', this.alerts.message(e)); },
    });
  }
}
