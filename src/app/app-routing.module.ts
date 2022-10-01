import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {PlaceholderComponent} from "./placeholder/placeholder.component";

const routes: Routes = [
  {path: 'dashboard', component:PlaceholderComponent},
  {path: 'log', component: PlaceholderComponent},
  {path: 'admin', component: PlaceholderComponent},


  //Default route
  {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
  //404 route
  {path: '404', component: PlaceholderComponent},
  {path: '**', component: PlaceholderComponent, pathMatch: 'full'}
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
