import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import {Observable} from "rxjs";
import {ServerStatusInterface} from "../interfaces/serverStatus.interface";

@Injectable({
  providedIn: 'root'
})
export class ApiFetchService {
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

}
