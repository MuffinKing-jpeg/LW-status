import {Component, OnInit} from '@angular/core';
import {ThemeService} from './services/theme.service';
import {NavbarStateService} from "./services/navbar-state.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {


  constructor(
    private themeService: ThemeService,
    public navState: NavbarStateService,
    public router: Router) {
  }

  ngOnInit() {
    this.themeService.checkTheme();
  }
}
