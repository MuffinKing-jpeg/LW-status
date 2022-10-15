import {Component, OnInit} from '@angular/core';
import {NavbarStateService} from "../services/navbar-state.service";

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements OnInit {

  constructor(public currentLocation: NavbarStateService) {
  }

  ngOnInit(): void {
  }

}
