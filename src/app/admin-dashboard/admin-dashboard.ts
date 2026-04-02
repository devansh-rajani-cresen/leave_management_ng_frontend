import { Component, PLATFORM_ID, inject, OnInit, ChangeDetectorRef } from '@angular/core'; // ✅ add ChangeDetectorRef
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridApi, GridReadyEvent } from 'ag-grid-community';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule, FormsModule, AgGridModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef); // ✅ inject ChangeDetectorRef

  isSidebarOpen = true;
  showUserMenu = false;
  fullName: string = '';
  activeMenu: string = 'overview';
  currentPage: string = 'overview';
  userRole: string = 'ADMIN';
  isUsersLoaded = false;

  private gridApi!: GridApi;
  rowData: any[] = [];

  colDefs: ColDef[] = [
    { field: 'companyId', headerName: 'Company ID', filter: true, sortable: true },
    { field: 'fullName', headerName: 'Full Name', filter: true, sortable: true },
    { field: 'userName', headerName: 'Username', filter: true, sortable: true },
    { field: 'emailId', headerName: 'Email', filter: true, sortable: true },
    { field: 'role', headerName: 'Role', filter: true, sortable: true },
    { field: 'gender', headerName: 'Gender', filter: true, sortable: true },
    { field: 'active', headerName: 'Active', filter: true, sortable: true },
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
  };

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  userForm = {
    companyId: '',
    fullName: '',
    username: '',
    password: '',
    email: '',
    role: 'EMPLOYEE',
    gender: 'MALE',
    isActive: true,
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.userRole = sessionStorage.getItem('role') || 'ADMIN';
      this.checkAuth();
      this.loadFullName();
      this.loadAllUsers();
    }
  }

  private checkAuth() {
    const token = sessionStorage.getItem('token');
    if (!token) {
      this.toastr.error('Please login first');
      this.router.navigate(['/login'], { queryParams: { reason: 'auth-required' } });
    }
  }

  private loadFullName() {
    const fullName = sessionStorage.getItem('userFullName');
    const user = sessionStorage.getItem('username');
    this.fullName = fullName || user || 'Admin User';
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleMenu(menu: string) {
    this.activeMenu = menu;
    this.currentPage = menu;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  private loadAllUsers() {
    this.isUsersLoaded = false;
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http.get<any[]>('http://localhost:8081/auth/get-users', { headers }).subscribe({
      next: (users) => {
        this.rowData = (users || []).map((user) => ({
          companyId: user.companyId ?? '',
          fullName: user.fullName ?? '',
          userName: user.userName ?? user.username ?? '',
          emailId: user.emailId ?? user.email ?? '',
          role: user.role ?? '',
          gender: user.gender ?? '',
          active: user.active ?? user.isActive ?? false,
        }));
        this.isUsersLoaded = true;
        this.cdr.detectChanges();
      },
      error: (err: HttpErrorResponse) => {
        this.isUsersLoaded = true;
        this.cdr.detectChanges();
        this.toastr.error('Failed to load users');
        console.error(err);
      },
    });
  }

  private isUsernameOrEmailTaken(username: string, email: string): boolean {
    const duplicate = this.rowData.find(
      (user) =>
        user.userName.toLowerCase() === username.toLowerCase() ||
        user.emailId.toLowerCase() === email.toLowerCase(),
    );
    return !!duplicate;
  }

  submitUserForm() {
    const formValue = { ...this.userForm };

    if (this.isUsernameOrEmailTaken(formValue.username, formValue.email)) {
      this.toastr.warning('Username or Email already exists!');
      return;
    }

    const token = sessionStorage.getItem('token');
    const payload = {
      companyId: formValue.companyId.trim(),
      fullName: formValue.fullName.trim(),
      userName: formValue.username.trim(),
      userPassword: formValue.password,
      emailId: formValue.email.trim(),
      role: formValue.role,
      gender: formValue.gender,
      active: formValue.isActive,
      createdBy: this.userRole,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    this.http.post<boolean>('http://localhost:8081/auth/add-user', payload, { headers }).subscribe({
      next: (res) => {
        if (res === true) {
          this.toastr.success('User created successfully!');

          // Add to rowData so overview cards and AG Grid both update
          this.rowData = [
            {
              companyId: formValue.companyId,
              fullName: formValue.fullName,
              userName: formValue.username,
              emailId: formValue.email,
              role: formValue.role,
              gender: formValue.gender,
              active: formValue.isActive,
            },
            ...this.rowData,
          ];
          this.cdr.detectChanges(); // trigger change detection after update

          // Reset form and stay on the same page
          this.resetUserForm();
          return;
        }
        this.toastr.error('Unable to create user');
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Unable to create user');
      },
    });
  }

  private resetUserForm() {
    this.userForm = {
      companyId: '',
      fullName: '',
      username: '',
      password: '',
      email: '',
      role: 'EMPLOYEE',
      gender: 'MALE',
      isActive: true,
    };
  }

  resetForm(form: any) {
    // Reset only the input fields, keep dropdowns with their default values
    this.userForm = {
      companyId: '',
      fullName: '',
      username: '',
      password: '',
      email: '',
      role: 'EMPLOYEE',
      gender: 'MALE',
      isActive: true,
    };
  }

  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userFullName');
    this.router.navigate(['/login']);
  }
}