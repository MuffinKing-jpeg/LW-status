import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, exhaustMap, map, merge, of, scan, shareReplay, startWith, Subject, timeout, timer} from 'rxjs';
import {environment} from '../../environments/environment';
import {ServerStatusInterface} from '../interfaces/serverStatus.interface';

export interface InfrastructureState {
  devices: ServerStatusInterface[];
  loading: boolean;
  error: boolean;
  checkedAt: number | null;
}
export const initialInfrastructureState: InfrastructureState = {devices: [], loading: true, error: false, checkedAt: null};
type StatusEvent = {kind: 'loading'} | {kind: 'success'; devices: ServerStatusInterface[]; at: number} | {kind: 'error'};

export function reduceInfrastructure(state: InfrastructureState, event: StatusEvent): InfrastructureState {
  if (event.kind === 'loading') return {...state, loading: true};
  if (event.kind === 'error') return {...state, loading: false, error: true};
  return {devices: event.devices, loading: false, error: false, checkedAt: event.at};
}

@Injectable({providedIn: 'root'})
export class InfrastructureStatusService {
  private readonly refreshRequests = new Subject<void>();
  readonly state$ = merge(timer(0, 60000), this.refreshRequests).pipe(
    exhaustMap(() => this.http.get<ServerStatusInterface[]>(environment.API_URL, {params: {_check: Date.now()}}).pipe(
      timeout(15000),
      map(devices => {
        if (!Array.isArray(devices) || devices.some(device => !device || typeof device.name !== 'string' ||
          typeof device.icon !== 'string' || !['Online', 'Offline'].includes(device.available))) throw new Error('Invalid monitoring response');
        return {kind: 'success', devices, at: Date.now()} as StatusEvent;
      }),
      catchError(() => of<StatusEvent>({kind: 'error'})),
      startWith<StatusEvent>({kind: 'loading'})
    )),
    scan(reduceInfrastructure, initialInfrastructureState),
    startWith(initialInfrastructureState),
    shareReplay({bufferSize: 1, refCount: true})
  );

  constructor(private http: HttpClient) {}
  refresh(): void { this.refreshRequests.next(); }
}
