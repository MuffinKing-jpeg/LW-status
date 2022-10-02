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


  constructor(
    private http: HttpClient
  ) {
  }

  loadStatus(): Observable<ServerStatusInterface[]> {
    return this.http.get<ServerStatusInterface[]>(this.url)
  }

}
