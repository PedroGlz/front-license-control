import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './features/login.component';
import { LayoutComponent } from './layout/layout.component';
// Temporalmente oculto: import { DashboardComponent } from './features/dashboard.component';
// Temporalmente oculto: import { AuditComponent } from './features/audit.component';
// Temporalmente oculto: import { RolePermissionsComponent } from './features/role-permissions.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: LayoutComponent, canActivate: [authGuard], children: [
//     { path: 'dashboard', component: DashboardComponent },
    { path: 'usuarios', loadComponent: () => import('./features/users.component').then(m => m.UsersComponent) },
    { path: 'tipos-usuario', loadComponent: () => import('./features/domain-admin.component').then(m => m.DomainAdminComponent), data: { domain: 'user-types' } },
    { path: 'sistemas', loadComponent: () => import('./features/domain-admin.component').then(m => m.DomainAdminComponent), data: { domain: 'systems' } },
    { path: 'roles', loadComponent: () => import('./features/domain-admin.component').then(m => m.DomainAdminComponent), data: { domain: 'roles' } },
//     { path: 'permisos', component: DomainAdminComponent, data: { domain: 'permissions' } },
//     { path: 'roles-permisos', component: RolePermissionsComponent },
    { path: 'atributos', loadComponent: () => import('./features/domain-admin.component').then(m => m.DomainAdminComponent), data: { domain: 'attributes' } },
    { path: 'versiones', loadComponent: () => import('./features/versions.component').then(m => m.VersionsComponent) },
    { path: 'clientes', loadComponent: () => import('./features/customers.component').then(m => m.CustomersComponent) },
    { path: 'licencias', loadComponent: () => import('./features/licenses.component').then(m => m.LicensesComponent) },
    { path: 'dispositivos', loadComponent: () => import('./features/devices.component').then(m => m.DevicesComponent) },
    { path: 'codigos-activacion', loadComponent: () => import('./features/enrollment-codes.component').then(m => m.EnrollmentCodesComponent) },
//     { path: 'auditoria', component: AuditComponent },
    { path: '', pathMatch: 'full', redirectTo: 'usuarios' }
  ]},
  { path: '**', redirectTo: '' }
];
