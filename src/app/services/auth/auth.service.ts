import { Injectable } from '@angular/core';
import * as Auth from '@angular/fire/auth';
import { User } from '@app/models/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private user: User | null = null;
  private authErrors: any = {
    "auth/user-not-found": "EMAIL_NOT_FOUND",
    "auth/wrong-password": 'INVALID_PASSWORD',
    "user-disabled": "USER_DISABLED",
    "auth/email-already-in-use": "EMAIL_ALREADY_USE",
    "auth/invalid-email": "INVALID_EMAIL",
    "auth/weak-password": "WEAK_PASSWORD",
    "auth/expired-action-code": "EXPIRED_CODE",
    "auth/invalid-action-code": "INVALID_CODE"
  }

  constructor(
    private auth: Auth.Auth
  ) { }

  createAccount(mail: string, password: string) {
    return Auth.createUserWithEmailAndPassword(this.auth, mail, password)
  }

  authentify(mail: string, password: string) {
    return Auth.signInWithEmailAndPassword(this.auth, mail, password);
  }

  authentifyWithGoogle() {
    return Auth.signInWithPopup(this.auth, new Auth.GoogleAuthProvider());
  }

  disconnect() {
    this.user = null;
    return this.auth.signOut();
  }

  setConnectionPersistence(persistence: Auth.Persistence) {
    return this.auth.setPersistence(persistence);
  }

  isConnected() {
    return Auth.authState(this.auth);
  }

  setUser(user: User) {
    this.user = user;
  }

  getCurrentUser() {
    return this.user;
  }

  sendPasswordResetEmail(email: string) {
    return Auth.sendPasswordResetEmail(this.auth, email);
  }

  verifyPasswordCode(code: string) {
    return Auth.verifyPasswordResetCode(this.auth, code);
  }

  changePassword(code: string, password: string) {
    return Auth.confirmPasswordReset(this.auth, code, password);
  }

  getAuthError(errorCode: string): string {
    return (errorCode && this.authErrors[errorCode] !== undefined) ? this.authErrors[errorCode] : 'ERROR'
  }
}
