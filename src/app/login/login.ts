import { Component, NgZone, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})

export class Login {
  username = signal('');
  password = signal('');
  showPassword = signal(false);
  showForgotPassword = signal(false);
  otpUsername = signal('');
  otpCode = signal('');
  otpSent = signal(false);
  otpVerified = signal(false);
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
  ) {}

  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('reason') === 'auth-required') {
        this.toastr.error('Please login first');
      }
    });
  }

  onLogin() {
    this.username.set(this.username().trim());

    if (!this.username() && !this.password()) {
      this.toastr.warning('Please fill in all the details!');
      return;
    } else if (!this.username()) {
      this.toastr.warning('Please enter username!');
      return;
    } else if (!this.emailRegex.test(this.username())) {
      this.toastr.warning('Please enter a valid username!');
      return;
    } else if (!this.password()) {
      this.toastr.warning('Please enter Password!');
      return;
    }

    // Request Payload
    const userData = {
      username: this.username(),
      password: this.password(),
    };

    this.http.post<any>('http://localhost:8081/auth/login', userData).subscribe({
      next: (res) => {
        console.log('Response:', res);

        localStorage.setItem('token', res.token);
        localStorage.setItem('role', res.role);

        this.toastr.success('Login successful!');

        this.username.set('');
        this.password.set('');

        if (res.role === 'ADMIN') {
          this.router.navigate(['/admin-panel']);
        } else if (res.role === 'MANAGER') {
          this.router.navigate(['/manager-panel']);
        } else if (res.role === 'EMPLOYEE') {
          this.router.navigate(['/employee-panel']);
        } else {
          this.toastr.error('Unknown role!');
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);

        if (err.status === 0) {
          this.toastr.error('Server not reachable!');
        } else {
          this.toastr.error('Invalid credentials!');
        }
      },
    });
  }

  togglePassword() {
    this.showPassword.update((currentValue) => !currentValue);
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.showForgotPassword.set(true);
    this.otpUsername.set('');
    this.otpCode.set('');
    this.otpSent.set(false);
  }

  sendOTP() {
    this.otpUsername.set(this.otpUsername().trim());

    if (!this.otpUsername()) {
      this.toastr.warning('Please enter your email!');
      return;
    }

    if (!this.emailRegex.test(this.otpUsername())) {
      this.toastr.warning('Please enter a valid email address!');
      return;
    }

    const sendOtpPayload = {
      email: this.otpUsername()
    };

    this.http
      .post<boolean>('http://localhost:8081/auth/send-otp', sendOtpPayload)
      .subscribe({
        next: (success: boolean) => {
          if (success) {
            this.ngZone.run(() => {
              this.otpSent.set(true);
            });
            this.toastr.success('OTP has been sent to your email!');
          } else {
            this.toastr.error('Failed to send OTP. Please try again.');
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error(err);
          this.toastr.error(err.error || 'Unable to send OTP.');
        },
      });
  }

  verifyOTP() {
    this.otpUsername.set(this.otpUsername().trim());
    this.otpCode.set(this.otpCode().trim());

    if (!this.otpUsername()) {
      this.toastr.warning('Please enter your email!');
      return;
    }

    if (!this.otpCode()) {
      this.toastr.warning('Please enter OTP!');
      return;
    }

    const verifyOtpPayload = {
      email: this.otpUsername(),
      otp: this.otpCode(),
    };

    this.http
      .post<boolean>('http://localhost:8081/auth/verify-otp', verifyOtpPayload)
      .subscribe({
        next: (isValid: boolean) => {
          if (isValid) {
            this.ngZone.run(() => {
              this.otpVerified.set(true);
            });
            this.toastr.success('OTP verified successfully!');
          } else {
            this.toastr.error('Invalid or expired OTP!');
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error(err);
          this.toastr.error(err.error || 'Unable to verify OTP.');
        },
      });
  }

  toggleNewPassword() {
    this.showNewPassword.update((currentValue) => !currentValue);
  }

  toggleConfirmPassword() {
    this.showConfirmPassword.update((currentValue) => !currentValue);
  }

  isValidPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password);
    const hasMinLength = password.length >= 8;

    return hasUpperCase && hasLowerCase && hasDigit && hasSpecialChar && hasMinLength;
  }

  resetPassword() {
    this.newPassword.set(this.newPassword().trim());
    this.confirmPassword.set(this.confirmPassword().trim());

    const password = this.newPassword();

    if (!password) {
      this.toastr.warning('Please enter your new password!');
      return;
    }

    // Specific password validation checks
    if (password.length < 8) {
      this.toastr.error('Password must be at least 8 characters long!');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      this.toastr.error('Password must contain uppercase letters (A-Z)!');
      return;
    }

    if (!/[a-z]/.test(password)) {
      this.toastr.error('Password must contain lowercase letters (a-z)!');
      return;
    }

    if (!/\d/.test(password)) {
      this.toastr.error('Password must contain digits (0-9)!');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      this.toastr.error('Password must contain special characters (!@#$%^&*)!');
      return;
    }

    if (!this.confirmPassword()) {
      this.toastr.warning('Please confirm your password!');
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.toastr.error('Passwords do not match!');
      return;
    }

    const resetPasswordPayload = {
      email: this.otpUsername(),
      newPassword: this.newPassword(),
    };

    this.http
      .post<any>('http://localhost:8081/auth/reset-password', resetPasswordPayload)
      .subscribe({
        next: (res: any) => {
          this.ngZone.run(() => {
            this.toastr.success('Password reset successfully!');
            this.showForgotPassword.set(false);
            this.otpVerified.set(false);
            this.otpUsername.set('');
            this.otpCode.set('');
            this.newPassword.set('');
            this.confirmPassword.set('');
            this.otpSent.set(false);
          });
        },
        error: (err: HttpErrorResponse) => {
          console.error(err);
          this.toastr.error(err.error || 'Unable to reset password.');
        },
      });
  }

  backToLogin() {
    this.showForgotPassword.set(false);
    this.otpUsername.set('');
    this.otpCode.set('');
    this.otpSent.set(false);
    this.otpVerified.set(false);
    this.newPassword.set('');
    this.confirmPassword.set('');
  }
}