import {Injectable, OnDestroy} from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {environment} from '../../environments/environment';
import {AdminConfiguration, AdminSaveRequest} from './admin.interface';

interface FirebaseSignIn {
  idToken: string;
  expiresIn: string;
}

@Injectable({providedIn: 'root'})
export class AdminService implements OnDestroy {
  email = '';
  sessionMessage = '';
  private token = '';
  private expiration = 0;
  private expiryTimer?: ReturnType<typeof setTimeout>;

  constructor(private http: HttpClient) {}

  get authenticated(): boolean { return !!this.email && Date.now() < this.expiration; }

  async signIn(email: string, password: string): Promise<AdminConfiguration> {
    this.signOut();
    // Firebase handles password verification/rate limiting. Passwords never go to our backend.
    // Tokens are memory-only: no localStorage, cookies, persisted refresh tokens or URL parameters.
    const result = await firstValueFrom(this.http.post<FirebaseSignIn>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${environment.FIREBASE_API_KEY}`,
      {email: email.trim(), password, returnSecureToken: true}
    ));
    this.token = result.idToken;
    this.expiration = Date.now() + Number(result.expiresIn) * 1000 - 30000;
    try {
      const configuration = await this.load();
      this.email = configuration.user.email || email.trim();
      this.expiryTimer = setTimeout(() => {
        this.signOut();
        this.sessionMessage = 'Session expired. Please sign in again.';
      }, Math.max(0, this.expiration - Date.now()));
      return configuration;
    } catch (error) {
      this.signOut();
      throw error;
    }
  }

  signOut(): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = undefined;
    this.email = '';
    this.token = '';
    this.expiration = 0;
    this.sessionMessage = '';
  }

  load(): Promise<AdminConfiguration> { return this.request<AdminConfiguration>('GET'); }
  save(body: AdminSaveRequest): Promise<{ok: boolean}> { return this.request('PUT', body); }
  ngOnDestroy(): void { this.signOut(); }

  private async request<T>(method: string, body?: AdminSaveRequest): Promise<T> {
    if (!this.token || Date.now() >= this.expiration) {
      this.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    try {
      return await firstValueFrom(this.http.request<T>(method, environment.ADMIN_API_URL, {
        body, headers: new HttpHeaders({Authorization: `Bearer ${this.token}`})
      }));
    } catch (error) {
      if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) this.signOut();
      throw error;
    }
  }
}
