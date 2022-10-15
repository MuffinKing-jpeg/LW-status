import {Component, OnInit} from '@angular/core';
import {ApiFetchService} from "../services/api-fetch.service";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {


  constructor(public apiFetch: ApiFetchService) {
  }

  ngOnInit(): void {
    this.apiFetch.loadStatusData()
    this.apiFetch.loadGameServers()
  }


}
