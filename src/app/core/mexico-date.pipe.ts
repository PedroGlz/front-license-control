import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'mexicoDate', standalone: true })
export class MexicoDatePipe implements PipeTransform {
  transform(value: unknown, withTime = true): string {
    const text = String(value ?? '').trim();
    if (!text) return '';
    const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (calendar) return `${calendar[3]}/${calendar[2]}/${calendar[1]}`;
    const naive = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(text);
    const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
    if (naive && !hasOffset) return withTime ? `${naive[3]}/${naive[2]}/${naive[1]} ${naive[4]}:${naive[5]}` : `${naive[3]}/${naive[2]}/${naive[1]}`;
    const date = new Date(text);
    if (!Number.isFinite(date.getTime())) return text;
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {})
    }).format(date).replace(',', '');
  }
}
