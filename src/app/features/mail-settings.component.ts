import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { AlertService } from '../core/alert.service';
import { ApiService } from '../core/api.service';

@Component({
  standalone: true,
  imports: [ButtonModule, FormsModule, TextareaModule],
  styleUrls: ['./forms.scss'],
  styles: [`
    .mail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.mail-grid label{display:grid;gap:.45rem}
    .systems{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}.system-card{padding:1.15rem;border:1px solid var(--border);border-radius:12px;background:var(--surface)}
    .system-card h3{margin:0 0 .3rem}.meta{color:var(--text-secondary);font-size:.9rem;overflow-wrap:anywhere}.card-actions{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin-top:1rem}
    .file-input{display:grid;gap:.35rem;margin-top:1rem}.status{font-weight:700;color:var(--success)}.status.off{color:var(--text-secondary)}
    @media(max-width:650px){.mail-grid{grid-template-columns:1fr}}
  `],
  template: `
    <div class="page-heading"><div><h1>Configuración de correos</h1><p>Destinatarios de copia y guías de instalación para sistemas Android.</p></div></div>
    <section class="panel">
      <h2>Destinatarios adicionales</h2>
      <p class="meta">Escribe una dirección por línea o separada por coma. Las duplicadas se eliminan automáticamente.</p>
      <form #form="ngForm" (ngSubmit)="saveRecipients()">
        <div class="mail-grid">
          <label>CC<textarea pTextarea rows="5" name="cc" [(ngModel)]="cc" placeholder="correo@empresa.com"></textarea></label>
          <label>CCO / BCC<textarea pTextarea rows="5" name="bcc" [(ngModel)]="bcc" placeholder="auditoria@empresa.com"></textarea></label>
        </div>
        <div class="actions"><button pButton [disabled]="busy()">Guardar destinatarios</button></div>
      </form>
    </section>
    <section class="panel">
      <h2>Guías de instalación</h2>
      <p class="meta">PDF opcional por sistema Android. Máximo 10 MB.</p>
      <div class="systems">
        @for(system of systems(); track system['Id_System']){
          <article class="system-card">
            <h3>{{system['Name']}}</h3><div class="meta">{{system['Code']}}</div>
            @if(system['Original_File_Name']){
              <p><span class="status" [class.off]="!system['Is_Enabled']">{{system['Is_Enabled'] ? 'Adjunto activo' : 'Adjunto desactivado'}}</span></p>
              <div class="meta">{{system['Original_File_Name']}} · {{formatSize(system['File_Size'])}}</div>
              <div class="card-actions">
                <button pButton type="button" class="secondary" (click)="download(system)">Descargar</button>
                <button pButton type="button" [class.danger]="system['Is_Enabled']" (click)="toggle(system)">{{system['Is_Enabled'] ? 'Desactivar' : 'Activar'}}</button>
              </div>
            } @else { <p class="meta">No hay PDF configurado. Los correos se enviarán sin adjunto.</p> }
            <label class="file-input">{{system['Original_File_Name'] ? 'Reemplazar PDF' : 'Cargar PDF'}}
              <input type="file" accept="application/pdf,.pdf" [disabled]="busy()" (change)="upload(system,$event)">
            </label>
          </article>
        } @empty { <div class="empty-state">No hay sistemas Android activos.</div> }
      </div>
    </section>
  `
})
export class MailSettingsComponent {
  private api=inject(ApiService); private alerts=inject(AlertService);
  systems=signal<Record<string,any>[]>([]); busy=signal(false); cc=''; bcc='';
  constructor(){this.load();}
  load(){this.api.get<Record<string,any>>('/admin/mail-settings').subscribe({next:r=>{this.cc=(r['cc']||[]).join('\n');this.bcc=(r['bcc']||[]).join('\n');this.systems.set(r['systems']||[]);},error:e=>this.error(e)});}
  values(text:string){return text.split(/[,;\n\r]+/).map(v=>v.trim()).filter(Boolean);}
  saveRecipients(){if(this.busy())return;this.busy.set(true);this.api.put('/admin/mail-settings/recipients',{cc:this.values(this.cc),bcc:this.values(this.bcc)}).subscribe({next:()=>{this.busy.set(false);this.load();void this.alerts.success('Configuración guardada');},error:e=>{this.busy.set(false);this.error(e);}});}
  upload(system:Record<string,any>,event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){void this.alerts.warning('Archivo no válido','Selecciona un PDF.');input.value='';return;}if(file.size>10*1024*1024){void this.alerts.warning('Archivo demasiado grande','El máximo permitido es 10 MB.');input.value='';return;}const body=new FormData();body.append('file',file);this.busy.set(true);this.api.post(`/admin/mail-settings/systems/${system['Id_System']}/guide`,body).subscribe({next:()=>{this.busy.set(false);input.value='';this.load();void this.alerts.success('Guía guardada');},error:e=>{this.busy.set(false);input.value='';this.error(e);}});}
  async toggle(system:Record<string,any>){const enable=!system['Is_Enabled'];if(!(await this.alerts.confirm(enable?'¿Activar adjunto?':'¿Desactivar adjunto?',enable?'La guía se adjuntará a los nuevos correos.':'Los nuevos correos se enviarán sin esta guía.')).isConfirmed)return;this.api.put(`/admin/mail-settings/systems/${system['Id_System']}/guide/enabled`,{enabled:enable}).subscribe({next:()=>{this.load();void this.alerts.success(enable?'Adjunto activado':'Adjunto desactivado');},error:e=>this.error(e)});}
  download(system:Record<string,any>){this.api.download(`/admin/mail-settings/systems/${system['Id_System']}/guide`).subscribe({next:blob=>{const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=system['Original_File_Name'];anchor.click();URL.revokeObjectURL(url);},error:e=>this.error(e)});}
  formatSize(value:unknown){const bytes=Number(value||0);return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}
  private error(e:unknown){void this.alerts.error('No fue posible completar la operación',this.alerts.message(e));}
}
