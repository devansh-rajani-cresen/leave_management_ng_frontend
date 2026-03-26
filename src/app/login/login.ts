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
  password: string = '';
  showPassword: boolean = false;

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  onLogin() {

    this.username = this.username.trim();

    if (!this.username && !this.password) {
      alert('Please fill in all the details!');
      return;
    }
    else if (!this.username){
      alert('Please enter username!');
      return;
    }
    else if (!this.emailRegex.test(this.username)) {
      alert('Please enter a valid username!');
      return;
    }
    else if (!this.password) {
      alert('Please enter Password!');
      return;
    }

    const userData = {
      email: this.username,
      password: this.password
    };
    
    console.log('User Data:', userData);
    alert('Login successful!');

    this.username = '';
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