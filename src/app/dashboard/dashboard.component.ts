import {Component, OnInit} from '@angular/core';
import {ApiFetchService} from "../services/api-fetch.service";
import {InfrastructureStatusService} from '../services/infrastructure-status.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {


  constructor(public apiFetch: ApiFetchService, public infrastructure: InfrastructureStatusService) {
  }

  ngOnInit(): void {
    this.apiFetch.loadGameServers()
  }


}
