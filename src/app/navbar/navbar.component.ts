import {Component, OnInit} from '@angular/core';
import {NavbarStateService} from "../services/navbar-state.service";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  
  constructor(
    public navState: NavbarStateService
  ) {
  }

  ngOnInit(): void {
    this.navState.getPath()
  }

  public toggleNavState(): void {
    this.navState.isNavActive ?
      this.navState.setNavState = false :
      this.navState.setNavState = true;
  }

}
