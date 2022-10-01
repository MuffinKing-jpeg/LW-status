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
  public shadowClass: string = 'shadow-on shadow';
  public navClass: string = ''

  constructor(
    private themeService: ThemeService,
    public navState: NavbarStateService,
    public router: Router) {
  }

  ngOnInit() {
    this.themeService.checkTheme();

  }

  ngDoCheck() {
    if (this.navState.isNavActive) {
      this.shadowClass = 'shadow-on shadow'
      this.navClass = 'app-navbar-active'
    } else {
      this.navClass = ''
      this.shadowClass = 'shadow-off shadow'
    }

  }
}
