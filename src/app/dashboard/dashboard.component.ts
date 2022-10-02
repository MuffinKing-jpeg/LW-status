import {Component, OnInit} from '@angular/core';
import {ApiFetchService} from "../services/api-fetch.service";
import {ServerStatusInterface} from "../interfaces/serverStatus.interface";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  public serverStatus!: ServerStatusInterface[];

  constructor(public apiFetch: ApiFetchService) {
  }

  ngOnInit(): void {
    this.updateData()

  }

  updateData(): void {
    this.serverStatus = [];
    const subscriber = this.apiFetch.loadStatus().subscribe({
      next: (res) => {
        if (res) {
          this.serverStatus = res
        } else {
          this.serverStatus = [{
            available: 'Offline',
            icon: 'fa-solid fa-bug',
            name: 'Api unavailable'
          }]
        }
        subscriber.unsubscribe()
      },
      error: err => {
        console.error(err)
        this.serverStatus = [{
          available: 'Offline',
          icon: 'fa-solid fa-bug',
          name: err
        }]
      }
    })

  }

}
