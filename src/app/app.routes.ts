import { Routes } from '@angular/router';
import { Login } from './login/login';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { ManagerDashboard } from './manager-dashboard/manager-dashboard';
import { EmployeeDashboard } from './employee-dashboard/employee-dashboard';
import { authGuard, roleGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'admin-panel',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard(['ADMIN'])],
  },
  {
    path: 'manager-panel',
    component: ManagerDashboard,
    canActivate: [authGuard, roleGuard(['MANAGER'])],
  },
  {
    path: 'employee-panel',
    component: EmployeeDashboard,
    canActivate: [authGuard, roleGuard(['EMPLOYEE'])],
  },
  { path: '**', redirectTo: '/login' }
];
