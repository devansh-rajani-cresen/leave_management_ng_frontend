import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Login } from './login/login';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Login],
  templateUrl: './app.html',
  styleUrl: './app.css'
})

export class App {
  protected readonly title = signal('leave-management-system');
}

// import { Component } from '@angular/core';
// import { Login } from './login/login';

// @Component({
//   selector: 'app-root',
//   standalone: true,
//   imports: [Login],
//   template: `<app-login></app-login>`
// })
// export class App {}