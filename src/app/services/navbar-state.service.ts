import {Injectable} from '@angular/core';
import {filter} from "rxjs";
import {NavigationEnd, Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class NavbarStateService {

  public isNavActive: boolean = false;
  public currentPath!: string;

  constructor(
    private router: Router
  ) {
  }

  public set setNavState(state: boolean) {
    this.isNavActive = state
  }

  public getPath(): void {
    this.router
      .events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe({
        next: (data: any) => {
          this.currentPath = data['url']
        }
      })
  }
}
