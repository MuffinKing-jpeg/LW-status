import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {NotFoundComponent} from "./not-found/not-found.component";
import {DashboardComponent} from "./dashboard/dashboard.component";
import {HistoryComponent} from './history/history.component';
import {AdminComponent} from './admin/admin.component';
import {AdminPendingChangesGuard} from './admin/admin-pending-changes.guard';

const routes: Routes = [
  {path: '', component: DashboardComponent},
  {path: 'log', component: HistoryComponent},
  {path: 'admin', component: AdminComponent, canDeactivate: [AdminPendingChangesGuard]},

  //Default route
  // {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
  //404 route
  {path: '404', component: NotFoundComponent},
  {path: '**', component: NotFoundComponent, pathMatch: 'full'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
