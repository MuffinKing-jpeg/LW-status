import {Component, OnInit} from '@angular/core';
import {NavbarStateService} from "../services/navbar-state.service";
import {LocalizationService} from '../i18n/localization.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  
  constructor(
    public navState: NavbarStateService,
    public i18n: LocalizationService
  ) {
  }

  ngOnInit(): void {
    this.navState.getPath()
  }
  languageChange(event: Event): void { this.i18n.setPreference((event.target as HTMLSelectElement).value); }

  public toggleNavState(): void {
    this.navState.isNavActive ?
      this.navState.setNavState = false :
      this.navState.setNavState = true;
  }

}
