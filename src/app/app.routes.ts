import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { LoginComponent } from './features/login.component';
import { LayoutComponent } from './layout/layout.component';
// Temporalmente oculto: import { DashboardComponent } from './features/dashboard.component';
// Temporalmente oculto: import { AuditComponent } from './features/audit.component';
import { UsersComponent } from './features/users.component';
import { DomainAdminComponent } from './features/domain-admin.component';
// Temporalmente oculto: import { RolePermissionsComponent } from './features/role-permissions.component';
import { VersionsComponent } from './features/versions.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', component: LayoutComponent, canActivate: [authGuard], children: [
//     { path: 'dashboard', component: DashboardComponent },
    { path: 'usuarios', component: UsersComponent },
    { path: 'tipos-usuario', component: DomainAdminComponent, data: { domain: 'user-types' } },
    { path: 'sistemas', component: DomainAdminComponent, data: { domain: 'systems' } },
    { path: 'roles', component: DomainAdminComponent, data: { domain: 'roles' } },
//     { path: 'permisos', component: DomainAdminComponent, data: { domain: 'permissions' } },
//     { path: 'roles-permisos', component: RolePermissionsComponent },
    { path: 'atributos', component: DomainAdminComponent, data: { domain: 'attributes' } },
    { path: 'aplicaciones', component: DomainAdminComponent, data: { domain: 'applications' } },
    { path: 'versiones', component: VersionsComponent },
    { path: 'accesos', component: DomainAdminComponent, data: { domain: 'application-access' } },
    { path: 'licencias', component: DomainAdminComponent, data: { domain: 'licenses' } },
    { path: 'dispositivos', component: DomainAdminComponent, data: { domain: 'devices' } },
//     { path: 'auditoria', component: AuditComponent },
    { path: '', pathMatch: 'full', redirectTo: 'usuarios' }
  ]},
  { path: '**', redirectTo: '' }
];
