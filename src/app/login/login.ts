import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})

export class Login {

  username: string = '';
  password: string = '';
  showPassword: boolean = false;
  showForgotPassword: boolean = false;
  otpUsername: string = '';

  constructor(private http: HttpClient, private toastr: ToastrService) {}

  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  onLogin() {

    this.username = this.username.trim();

    if (!this.username && !this.password) {
      this.toastr.warning('Please fill in all the details!');
      return;
    }
    else if (!this.username){
      this.toastr.warning('Please enter username!');
      return;
    }
    else if (!this.emailRegex.test(this.username)) {
      this.toastr.warning('Please enter a valid username!');
      return;
    }
    else if (!this.password) {
      this.toastr.warning('Please enter Password!');
      return;
    }

    // Request Payload
    const userData = {
      email: this.username,
      password: this.password
    };

    this.http.post('http://localhost:8081/auth/login', userData, { responseType: 'text' })
      .subscribe({
        next: (res) => {
          console.log("Response:", res);
          this.toastr.success(res || 'Login successful!');
          this.username = '';
          this.password = '';
        },
        error: (err: HttpErrorResponse) => {
          console.error(err);
          if (err.status === 0) {
            this.toastr.error('Internal Server Error.');
            return;
          }

          this.toastr.error(err?.error || 'Login failed !');
        }
      });

    console.log('User Data:', userData);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    this.showForgotPassword = true;
    this.otpUsername = '';
  }

  sendOTP() {
    this.otpUsername = this.otpUsername.trim();

    if (!this.otpUsername) {
      this.toastr.warning('Please enter your email!');
      return;
    }
    else if (!this.emailRegex.test(this.otpUsername)) {
      this.toastr.warning('Please enter a valid email address!');
      return;
    }

    console.log('OTP sent to:', this.otpUsername);
    this.toastr.success('OTP has been sent to your email!', 'Success');
    this.otpUsername = '';
    this.showForgotPassword = false;
  }

  backToLogin() {
    this.showForgotPassword = false;
    this.otpUsername = '';
  }
}