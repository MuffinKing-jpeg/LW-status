import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {ThemeBtnComponent} from './navbar/theme-btn/theme-btn.component';
import {NavbarComponent} from './navbar/navbar.component';
import {PlaceholderComponent} from './placeholder/placeholder.component';
import {NotFoundComponent} from './not-found/not-found.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {HttpClientModule} from "@angular/common/http";

@NgModule({
  declarations: [
    AppComponent,
    ThemeBtnComponent,
    NavbarComponent,
    PlaceholderComponent,
    NotFoundComponent,
    DashboardComponent
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {

}
