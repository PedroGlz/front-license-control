import { Component, input } from '@angular/core';

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="paths[name()] || paths['edit']" /></svg>`,
  styles: [':host { display:inline-flex; width:20px; height:20px; flex-shrink:0; } svg { width:100%; height:100%; }'],
})
export class IconComponent {
  name = input('edit');
  paths: Record<string, string> = {
    home: 'M3 11l9-8 9 8 M5 10v11h14V10 M9 21v-7h6v7',
    badge: 'M4 5h16v15H4V5z M9 5V2h6v3 M8 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0 M7 16h6 M16 10h2 M16 14h2',
    monitor: 'M3 3h18v14H3V3z M8 21h8 M12 17v4 M7 7h4v5H7V7z M15 7h2 M15 11h2',
    admin: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4z M12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M8 16c0-4 8-4 8 0',
    key: 'M9 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M13 13l8 8 M17 17l3-3 M19 19l3-3 M7 8h.01',
    rolePermissions: 'M3 5h9 M3 10h9 M3 15h5 M16 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M18 15l4 4 M20 17l2-2',
    tune: 'M4 6h16 M4 12h16 M4 18h16 M8 3v6 M16 9v6 M10 15v6',
    android: 'M5 10h14v10H5V10z M6 8a6 6 0 0 1 12 0 M8 3L6 1 M16 3l2-2 M2 11v7 M22 11v7 M8 20v3 M16 20v3 M9 6h.01 M15 6h.01',
    package: 'M12 2l9 5v10l-9 5-9-5V7l9-5z M3 7l9 5 9-5 M12 12v10 M7 4l10 6',
    access: 'M4 11h16v10H4V11z M8 11V6a4 4 0 0 1 8 0 M12 15v3',
    phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 M10 5h4 M12 18h.01',
    history: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2',
    edit: 'M16 3l5 5-12 12-6 1 1-6L16 3z M14 5l5 5',
    trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
    close: 'M6 6l12 12 M18 6L6 18',
    save: 'M5 3h12l4 4v14H3V3h2z M7 3v6h10V3 M7 21v-8h10v8',
    logout: 'M10 3H4v18h6 M9 12h12 M17 8l4 4-4 4',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-4',
    catalog: 'M4 3h16v18H4V3z M8 7h8 M8 12h8 M8 17h5',
    license: 'M12 3l8 4v6c0 4-8 8-8 8s-8-4-8-8V7l8-4z M8 12l3 3 5-6',
  };
}
