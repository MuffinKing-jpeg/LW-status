import {Component, OnInit} from '@angular/core';
import {NavbarStateService} from "../services/navbar-state.service";

@Component({
  selector: 'app-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss']
})
export class PlaceholderComponent implements OnInit {

  constructor(
    public currentLocation: NavbarStateService
  ) {
  }

  ngOnInit(): void {
  }

}
