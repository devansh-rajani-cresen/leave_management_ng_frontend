import { Component, PLATFORM_ID, inject, OnInit, ChangeDetectorRef } from '@angular/core'; // ✅ add ChangeDetectorRef
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AgGridModule } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

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
  private cdr = inject(ChangeDetectorRef);

  isSidebarOpen = true;
  showUserMenu = false;
  fullName: string = '';
  activeMenu: string = 'overview';
  currentPage: string = 'overview';
  userRole: string = 'ADMIN';
  isUsersLoaded = false;
  showAddEmployeeForm = false;

  private gridApi!: GridApi;
  rowData: any[] = [];
  pageSizeOptions: number[] = [5, 10, 20, 50];
  private readonly usersEndpoint = 'http://localhost:8081/auth/get-users';
  private readonly addUserEndpoint = 'http://localhost:8081/auth/add-user';

  colDefs: ColDef[] = [
    { field: 'companyId', headerName: 'Company ID', filter: true, sortable: true, minWidth: 130 },
    { field: 'fullName', headerName: 'Full Name', filter: true, sortable: true, minWidth: 200 },
    { field: 'userName', headerName: 'User Name', filter: true, sortable: true, minWidth: 170 },
    { field: 'emailId', headerName: 'Email ID', filter: true, sortable: true, minWidth: 260 },
    { field: 'role', headerName: 'Role', filter: true, sortable: true, minWidth: 140 },
    { field: 'gender', headerName: 'Gender', filter: true, sortable: true, minWidth: 140 },
    {
      field: 'active',
      headerName: 'Active',
      filter: true,
      sortable: true,
      minWidth: 120,
      cellRenderer: (params: any) => {
        const value = params.value;
        const isActive =
          value === true || value === 'true' || value === 1 || value === '1' || value === 'ACTIVE';
        const label = isActive ? 'Active' : 'Not active';
        const bg = isActive ? '#16a34a' : '#dc2626';

        return `<span style="display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;border-radius:9999px;color:#ffffff;background:${bg};font-weight:600;font-size:12px;line-height:1;white-space:nowrap;">${label}</span>`;
      },
    },
  ];

  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 140,
    resizable: true,
    filter: true,
    sortable: true,
  };

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
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

  // common method to trim values and handle null/undefined
  private trimValue(val: any): string{
      if (val === null || val === undefined) return '';
      return String(val).trim();
  }

  // check if user is authenticated by looking for token in session storage
  private checkAuth() {
    const token = sessionStorage.getItem('token');
    if (!token) {
      this.toastr.error('Please login first');
      this.router.navigate(['/login'], { queryParams: { reason: 'auth-required' } });
    }
  }

  // load user's full name from session storage to display in Dashboard header
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

  openAddEmployeeForm() {
    this.showAddEmployeeForm = true;
  }

  closeAddEmployeeForm() {
    this.showAddEmployeeForm = false;
  }

  private loadAllUsers() {
    this.isUsersLoaded = false;
    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    this.http.get<any>(this.usersEndpoint, { headers }).subscribe({
      next: (usersResponse) => {
        const users = this.extractUsers(usersResponse);
        this.rowData = users.map((user) => ({
          companyId: user.companyId ?? '',
          fullName: user.fullName ?? '',
          userName: user.userName ?? user.username ?? '',
          emailId: user.emailId ?? user.email ?? '',
          role: user.role ?? '',
          gender: user.gender ?? '',
          active: user.active ?? user.isActive ?? false,
        }));
        this.isUsersLoaded = true;
        this.gridApi?.setGridOption('rowData', this.rowData);
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

  private extractUsers(usersResponse: any): any[] {
    if (Array.isArray(usersResponse)) {
      return usersResponse;
    }
    if (Array.isArray(usersResponse?.data)) {
      return usersResponse.data;
    }
    if (Array.isArray(usersResponse?.users)) {
      return usersResponse.users;
    }
    return [];
  }

  // Method to indivitualy check if username or email is taken
  private isUsernameOrEmailTaken(username: string, email: string) {
    const isUsernameTaken = this.rowData.some(
      (user) => user.userName.toLowerCase() === username.toLowerCase(),
    );

    const isEmailTaken = this.rowData.some(
      (user) => user.emailId.toLowerCase() === email.toLowerCase(),
    );

    return { isUsernameTaken, isEmailTaken };
  }

  submitUserForm() {
    const result = this.isUsernameOrEmailTaken(this.userForm.username, this.userForm.email);

    if (result.isUsernameTaken && result.isEmailTaken) {
      this.toastr.warning('Username & Email already exists!');
      return;
    } else if (result.isUsernameTaken) {
      this.toastr.warning('Username already exists!');
      return;
    } else if (result.isEmailTaken) {
      this.toastr.warning('Email already exists!');
      return;
    }

    const formValue = { ...this.userForm };

    const token = sessionStorage.getItem('token');
    const payload = {
      companyId: this.trimValue(formValue.companyId),
      fullName: this.trimValue(formValue.fullName),
      userName: this.trimValue(formValue.username),
      userPassword: formValue.password,
      emailId: this.trimValue(formValue.email),
      role: formValue.role,
      gender: formValue.gender,
      active: formValue.isActive,
      createdBy: this.userRole,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    this.http.post<any>(this.addUserEndpoint, payload, { headers }).subscribe({
      next: (res) => {
        const isSuccess =
          res === true ||
          res?.success === true ||
          res?.status === true ||
          res?.message?.toLowerCase?.().includes('success') === true;

        if (!isSuccess && res === false) {
          this.toastr.error('Unable to create user');
          return;
        }

        this.toastr.success('User created successfully!');
        this.resetUserForm();
        this.closeAddEmployeeForm();
        this.loadAllUsers();
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
