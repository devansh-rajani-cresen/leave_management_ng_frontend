import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})

export class Login {

  username: string = '';
  fullName: string = '';
  password: string = '';
  showPassword: boolean = false;

  // private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  onLogin() {

    this.username = this.username.trim();
    // this.email = this.email.trim();

    if (!this.username && !this.fullName && !this.password) {
      alert('Please fill in all the details!');
      return;
    }
    else if (!this.fullName) {
      alert('Please enter Full Name!');
      return;
    }
    else if (!this.username){
      alert('Please enter Username!');
      return;
    }
    // else if (!this.emailRegex.test(this.email)) {
    //   alert('Please enter a valid email address!');
    //   return;
    // }
    else if (!this.password) {
      alert('Please enter Password!');
      return;
    }

    const userData = {
      username: this.username,
      fullName: this.fullName,
      password: this.password
    };
    
    console.log('User Data:', userData);
    alert('Login successful!');

    this.username = '';
    this.fullName = '';
    this.password = '';
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    alert('Redirecting to forgot password...');
  }
}