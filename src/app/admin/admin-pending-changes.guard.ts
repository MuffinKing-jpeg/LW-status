import {Injectable} from '@angular/core';
import {CanDeactivate} from '@angular/router';
import {AdminComponent} from './admin.component';

@Injectable({providedIn: 'root'})
export class AdminPendingChangesGuard implements CanDeactivate<AdminComponent> {
  canDeactivate(component: AdminComponent): boolean { return component.confirmLeave(); }
}
