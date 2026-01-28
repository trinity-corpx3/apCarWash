import { Routes } from '@angular/router';
import { SuperAdminMenuComponent } from './menu/super-admin-menu.component';
import { AdminMenuComponent } from './menu/admin-menu.component';
import { LoginComponent } from './auth/login/login.component';
import { PosComponent } from './pos/pos.component';
import { ProductsComponent } from './products/products.component';
import { EmployeesComponent } from './employees/employees.component';
import { AuthGuard } from './auth.guard';
import { OrdersComponent } from './orders/orders.component';
import { DirectorOrdersComponent } from './director-orders/director-orders.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { CustomersComponent } from './customers/customers.component';
import { PlatesComponent } from './plates/plates.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'super-admin-menu', component: SuperAdminMenuComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin'] } },
  { path: 'admin-menu', component: AdminMenuComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Admin'] } },
  { path: 'pos', component: PosComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin', 'Operator'] } },
  { path: 'orders', component: OrdersComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin', 'Operator'] } },
  { path: 'plates', component: PlatesComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin', 'Operator'] } },
  { path: 'expenses', component: ExpensesComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin', 'Operator'] } },
  { path: 'products', component: ProductsComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin'] } },
  { path: 'employees', component: EmployeesComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin'] } },
  { path: 'customers', component: CustomersComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Super Admin', 'Operator'] } },
  { path: 'director-orders', component: DirectorOrdersComponent, canActivate: [AuthGuard], data: { expectedRoles: ['Director'] } },

  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
