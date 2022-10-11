import {Component, OnInit} from '@angular/core';
import {ApiFetchService} from "../services/api-fetch.service";
import {ServerStatusInterface} from "../interfaces/serverStatus.interface";
import {GamesBriefInterface} from "../interfaces/gamesBrief.interface";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  public serverStatus: ServerStatusInterface[] = [];
  public isStatusLoading = false;

  public gamesStatus: any[] = [];
  public gamesBrief!: GamesBriefInterface
  public isGamesLoading = false

  constructor(public apiFetch: ApiFetchService) {
  }

  ngOnInit(): void {
    this.loadStatusData()
    this.loadGameServers()
  }

  loadStatusData(): void {
    this.serverStatus = [];
    this.isStatusLoading = true;
    const subscription = this.apiFetch.loadStatus().subscribe({
      next: (res) => {
        this.isStatusLoading = false
        if (res) {
          this.serverStatus = res
        } else {
          this.serverStatus = [{
            available: 'Offline',
            icon: 'fa-solid fa-bug',
            name: 'Empty API response'
          }]
          throw 'Empty API response'
        }
        subscription.unsubscribe()
      },
      error: err => {
        console.error(err)
        this.serverStatus = [{
          available: 'Offline',
          icon: 'fa-solid fa-bug',
          name: err.name
        }]
        subscription.unsubscribe()
      }
    })

  }

  loadGameServers(): void {
    this.isGamesLoading = true
    const subscription = this.apiFetch.loadGames().subscribe({
      next: res => {

        if (res) {
          this.gamesBrief = {
            status: "Online",
            record: res['record'],
            online: res['online'],
            slots: res['slots'],
            percent: 100 - Math.ceil(res['online'] / res['slots'] * 100),
            recordday: res['recordday']
          }
          console.log(this.gamesBrief)
          this.isGamesLoading = false
        } else {

        }

        subscription.unsubscribe()
      },
      error: err => {
        console.error(err)
        subscription.unsubscribe()
      }
    })
  }

}
