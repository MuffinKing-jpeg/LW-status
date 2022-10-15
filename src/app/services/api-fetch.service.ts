import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {Observable} from "rxjs";
import {ServerStatusInterface} from "../interfaces/serverStatus.interface";
import {GamesBriefInterface} from "../interfaces/gamesBrief.interface";
import {GamesInfoInterface} from "../interfaces/gamesInfo.interface";
import {RawGamesInfoInterface} from "../interfaces/rawGamesInfo.interface";

@Injectable({
  providedIn: 'root'
})
export class ApiFetchService {
  public serverStatus: ServerStatusInterface[] = [];
  public isStatusLoading = false;
  public gamesStatus: GamesInfoInterface[] = [];
  public gamesBrief!: GamesBriefInterface
  public isGamesLoading = false
  private url: string = environment.API_URL
  private gameUrl: string = environment.GAME_URL

  constructor(
    private http: HttpClient
  ) {
  }

  public loadStatus(): Observable<ServerStatusInterface[]> {
    return this.http.get<ServerStatusInterface[]>(this.url)
  }

  public loadGames(): Observable<any> {
    return this.http.get<any>(`${this.gameUrl}${Date.now()}`)
  }

  loadStatusData(): void {
    this.serverStatus = [];
    this.isStatusLoading = true;
    const subscription = this.loadStatus().subscribe({
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
    this.gamesStatus = []
    this.isGamesLoading = true
    const subscription = this.loadGames().subscribe({
      next: res => {

        if (res) {
          this.gamesBrief = {
            status: "Online",
            record: res['record'],
            online: res['online'],
            slots: res['slots'],
            percent: 100 - res['online'] / res['slots'] * 100,
            recordday: res['recordday']
          }

          Object.keys(res['servers']).forEach((key) => {
            const value: RawGamesInfoInterface = res['servers'][key]


            this.gamesStatus.push({
              name: key,
              get status() {
                switch (value.status) {
                  case 'online':
                    return 'Online'
                  case 'Неизвестное ядро':
                    return 'Warning'
                  default:
                    return 'Offline'
                }

              },
              online: value.status === 'online' ? value.online : 0,
              slots: value.status === 'online' ? value.slots : 0,
              get percent() {
                return this.status === 'Online' ? 100 - (this.online / this.slots * 100) : 100
              }
            })

          })

          this.isGamesLoading = false
          console.log(this.gamesStatus)
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
