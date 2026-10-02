import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
export interface SessionUser { id:string; username:string; firstName:string; lastName?:string; email?:string; userType:string; roles:string[]; permissions:string[] }
@Injectable({providedIn:'root'}) export class AuthService {private http=inject(HttpClient);private router=inject(Router);user=signal<SessionUser|null>(JSON.parse(sessionStorage.getItem('lc_user')||'null'));token(){return sessionStorage.getItem('lc_token');}login(username:string,password:string){return this.http.post<{token:string,user:SessionUser}>(`${environment.apiUrl}/auth/login`,{username,password}).pipe(tap(r=>{sessionStorage.setItem('lc_token',r.token);sessionStorage.setItem('lc_user',JSON.stringify(r.user));this.user.set(r.user);}));}logout(){sessionStorage.removeItem('lc_token');sessionStorage.removeItem('lc_user');this.user.set(null);this.router.navigateByUrl('/login');}}
