import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated: boolean = false;

  constructor() { }

  login(email: string, password: string): boolean {
    // Dummy authentication - in a real app, this would call an API
    if (email === 'user@example.com' && password === 'password') {
      this.isAuthenticated = true;
      localStorage.setItem('isLoggedIn', 'true');
      return true;
    }
    return false;
  }

  logout(): void {
    this.isAuthenticated = false;
    localStorage.removeItem('isLoggedIn');
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated || localStorage.getItem('isLoggedIn') === 'true';
  }
}