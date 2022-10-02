import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PlaceholderComponent} from "./placeholder/placeholder.component";
import {NotFoundComponent} from "./not-found/not-found.component";

const routes: Routes = [
  {path: 'dashboard', component: PlaceholderComponent},
  {path: 'log', component: PlaceholderComponent},
  {path: 'admin', component: PlaceholderComponent},


  //Default route
  {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
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
