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
import {HistoryComponent} from './history/history.component';
import {FormsModule} from '@angular/forms';
import {AdminComponent} from './admin/admin.component';

@NgModule({
  declarations: [
    AppComponent,
    ThemeBtnComponent,
    NavbarComponent,
    PlaceholderComponent,
    NotFoundComponent,
    DashboardComponent,
    HistoryComponent,
    AdminComponent
  ],
  imports: [
    HttpClientModule,
    FormsModule,
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {

}
