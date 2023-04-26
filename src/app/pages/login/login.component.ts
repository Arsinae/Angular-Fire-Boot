import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormGroupDirective, NgForm, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { browserSessionPersistence, inMemoryPersistence } from '@angular/fire/auth'

import { User } from '@app/models/user';
import { AuthService } from '@app/services/auth/auth.service';
import { UserService } from '@server-data/user.service';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public loginForm: FormGroup;
  public signUpForm: FormGroup;
  public passwordErrorMatcher: PasswordErrorStateMatcher = new PasswordErrorStateMatcher();

  public type: string = 'login';

  constructor(
    private router: Router,
    private snackbar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      stayConnected: [true]
    })
    this.signUpForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
    }, {
      validators: this.checkPasswords
    });
  }

  checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => { 
    let pass = group.get('password')?.value;
    let confirmPass = group.get('confirmPassword')?.value
    return pass === confirmPass ? null : { passwordDontMatch: true };
  }

  ngOnInit() {
    this.authService.isConnected().subscribe(authState => {
      if (authState) {
        this.router.navigate(['/home']);
      }
    });
  }

  switchPage(type: string) {
    this.type = type;
  }

  connect() {
    this.authService.authentify(this.loginForm.get('email')?.value, this.loginForm.get('password')?.value).then(async (auth) => {
      if (auth && auth.user) {
        this.getConnectedUser(auth.user.uid);
        await this.authService.setConnectionPersistence(this.loginForm.get('stayConnected')?.value === true ? browserSessionPersistence : inMemoryPersistence);
      }
    }).catch((err) => {
      console.log(err);
      const msg = this.authService.getAuthError(err.code);
      this.snackbar.open(this.translate.instant(`LOGIN.${msg}`), '', {panelClass: 'danger-snackbar', duration: 4000});
    });
  }

  getConnectedUser(userUid: string) {
    this.userService.getUserData(userUid).then(user => {
      if (user) {
        this.authService.setUser(user);
        this.userService.setLastLogin(userUid);
        this.router.navigate(['/home']);
      } else {
        this.snackbar.open(this.translate.instant(`LOGIN.ERROR`), '', {panelClass: 'danger-snackbar', duration: 4000});
      }
    })
  }

  createAccount()  {
    this.authService.createAccount(this.signUpForm.get('email')?.value, this.signUpForm.get('password')?.value).then(res => {
      if (res.user) {
        const newUser: User = User.setNewUser(this.signUpForm);
        newUser.uuid = res.user.uid;
        this.storeUserInfo(newUser, res.user.uid);
      }
    }).catch(err => {
      console.log(err);
      const msg = this.authService.getAuthError(err.code);
      this.snackbar.open(this.translate.instant(`SIGNUP.${msg}`), '', {panelClass: 'danger-snackbar', duration: 4000});
    })
  }

  googleAuth() {
    this.authService.authentifyWithGoogle().then(credential => {
      console.log(credential);
      if (credential.operationType === 'signIn') {
        const newUser: User = User.setNewUserFromAuthProvider(credential);
        newUser.uuid = credential.user.uid;
        this.storeUserInfo(newUser, credential.user.uid);
      } else {
        this.snackbar.open(this.translate.instant(`SIGNUP.UNKNOWN_METHOD`), '', {panelClass: 'danger-snackbar', duration: 4000});
      }
    }).catch(err => {
      this.snackbar.open(this.translate.instant(`LOGIN.ERROR`), '', {panelClass: 'danger-snackbar', duration: 4000});
    })
  }

  storeUserInfo(user: User, uuid: string) {
    this.userService.createUser(uuid, user).then(resUser => {
      this.snackbar.open(this.translate.instant('SIGNUP.CREATED'), '', {panelClass: 'primary-snackbar', duration: 4000});
      this.authService.setUser(user);
      this.router.navigate(['/home']);
    })
  }

  forgetPassword() {
    this.dialog.open(ForgotPasswordComponent, {data: {email: this.loginForm.get('email')?.value}, width: '80%', panelClass: 'dark-theme'}).afterClosed().subscribe(res => {
      if (res) {
        this.authService.sendPasswordResetEmail(res.email).then(() => {
          this.snackbar.open(this.translate.instant('FORGET_PASSWORD.MAIL_SENT'), '', {panelClass: 'primary-snackbar', duration: 4000});
        }).catch((err) => {
          const msg = this.authService.getAuthError(err.code);
          this.snackbar.open(this.translate.instant(`FORGET_PASSWORD.${msg}`), '', {panelClass: 'danger-snackbar', duration: 4000});
        })
      }
    })
  }
}

export class PasswordErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const dontMatch = form && form.hasError('passwordDontMatch');
    return !!(control && !control.invalid && (control.dirty || control.touched) && dontMatch);
  }
}