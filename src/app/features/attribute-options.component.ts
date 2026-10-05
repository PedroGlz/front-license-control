import { IconComponent } from '../core/icon.component';
import { generatedCode } from '../core/generated-code';
import { Component, input, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AlertService } from '../core/alert.service';
@Component({
  standalone: true,
  selector: 'app-attribute-options',
  imports: [FormsModule, IconComponent],
  styleUrls: ['./forms.scss'],
  template: `<h3>Opciones del catálogo</h3>
    @for (o of options(); track o['Id_Option']) {
      <div class="grid">
        <label>Código<input [ngModel]="o['Value_Code']" readonly [ngModelOptions]="{standalone: true}" maxlength="100" /></label
        ><label>Nombre<input [(ngModel)]="o['Display_Name']" [ngModelOptions]="{standalone: true}" maxlength="150" /></label
        ><label>Orden<input type="number" [(ngModel)]="o['Sort_Order']" [ngModelOptions]="{standalone: true}" /></label
        >
      </div>
      <div class="option-actions"><button type="button" class="icon-button" title="Guardar opción" aria-label="Guardar opción" (click)="save(o)"><app-icon name="save" /></button><button type="button" class="icon-button danger" title="Desactivar opción" aria-label="Desactivar opción" (click)="remove(o)"><app-icon name="trash" /></button></div>
    }
    <div class="grid" style="margin-top:20px">
      <label>Código<input [ngModel]="code(newOption.Display_Name, 100)" readonly [ngModelOptions]="{standalone: true}" maxlength="100" /></label
      ><label>Nombre<input [(ngModel)]="newOption.Display_Name" [ngModelOptions]="{standalone: true}" maxlength="150" /></label>
    </div>
    <div class="option-actions"><button type="button" [disabled]="!code(newOption.Display_Name, 100)" (click)="add()">Agregar opción</button><button type="button" class="secondary" (click)="newOption = { Value_Code: '', Display_Name: '', Sort_Order: 0 }">Cancelar</button></div>
    <p>{{ message() }}</p>`,
})
export class AttributeOptionsComponent implements OnInit {
  code = generatedCode;
  attributeId = input.required<string>();
  api = inject(ApiService);
  alerts = inject(AlertService);
  options = signal<any[]>([]);
  message = signal('');
  newOption = { Value_Code: '', Display_Name: '', Sort_Order: 0 };
  ngOnInit() {
    this.load();
  }
  load() {
    this.api
      .get<any[]>(`/admin/attributes/${this.attributeId()}/options`)
      .subscribe((x) => this.options.set(x));
  }
  save(o: any) {
    this.api
      .put(`/admin/attributes/${this.attributeId()}/options/${o.Id_Option}`, o)
      .subscribe({
        next: () => void this.alerts.success('Opción guardada'),
        error: (e) => void this.alerts.error('No fue posible guardar', this.alerts.message(e)),
      });
  }
  async remove(option: any) {
    if (!(await this.alerts.confirm('¿Eliminar opción?', 'La opción será desactivada.')).isConfirmed) return;
    this.api.delete(`/admin/attributes/${this.attributeId()}/options/${option.Id_Option}`).subscribe({
      next: () => { this.load(); void this.alerts.success('Opción desactivada'); },
      error: (e) => void this.alerts.error('No fue posible eliminar', this.alerts.message(e)),
    });
  }
  add() {
    this.newOption.Value_Code = generatedCode(this.newOption.Display_Name, 100);
    this.api.post(`/admin/attributes/${this.attributeId()}/options`, this.newOption).subscribe({
      next: () => {
        this.newOption = { Value_Code: '', Display_Name: '', Sort_Order: 0 };
        this.load();
        void this.alerts.success('Opción agregada');
      },
      error: (e) => void this.alerts.error('No fue posible guardar', this.alerts.message(e)),
    });
  }
}
