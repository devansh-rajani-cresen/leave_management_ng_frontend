import { ChangeDetectorRef, Component, NgZone, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  // Validation and API URLs
  private readonly emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  private readonly usersEndpoint = 'http://localhost:8081/admin/get-users';
  private readonly addUserEndpoint = 'http://localhost:8081/admin/add-user';
  private readonly deleteUserEndpoint = 'http://localhost:8081/admin/delete-user';
  private readonly updateUserEndpoint = 'http://localhost:8081/admin/update-user';

  // Injected services
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  // Internal refs
  private gridApi!: GridApi;
  private editingUsername = '';

  // Page state
  isSidebarOpen = true;
  showUserMenu = false;
  fullName = '';
  activeMenu = 'overview';
  currentPage = 'overview';
  userRole = 'ADMIN';
  isUsersLoaded = false;
  showAddEmployeeForm = false;
  isEditMode = false;
  showDeleteConfirm = false;
  deleteCandidateName = '';
  deleteCandidateUsername = '';
  deleteCandidateEmail = '';
  userSearchTerm = '';

  rowData: any[] = [];
  pageSizeOptions: number[] = [5, 10, 20, 50];

  // Grid setup
  colDefs: ColDef[] = [
    { field: 'companyId', headerName: 'Company ID', filter: true, sortable: true, minWidth: 120 },
    { field: 'fullName', headerName: 'Full Name', filter: true, sortable: true, minWidth: 200 },
    { field: 'userName', headerName: 'User Name', filter: true, sortable: true, minWidth: 170 },
    { field: 'emailId', headerName: 'Email ID', filter: true, sortable: true, minWidth: 260 },
    { field: 'role', headerName: 'Role', filter: true, sortable: true, minWidth: 100 },
    { field: 'gender', headerName: 'Gender', filter: true, sortable: true, minWidth: 70 },
    {
      field: 'active',
      headerName: 'Active',
      filter: true,
      sortable: true,
      minWidth: 80,
      cellRenderer: (params: any) => {
        const label = this.isUserActive(params.value) ? 'Active' : 'Not active';
        const bg = this.isUserActive(params.value) ? '#16a34a' : '#dc2626';

        return `<span style="display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;border-radius:9999px;color:#ffffff;background:${bg};font-weight:600;font-size:12px;line-height:1;white-space:nowrap;">${label}</span>`;
      },
    },
    {
      headerName: 'Actions',
      field: 'actions',
      filter: false,
      sortable: false,
      resizable: false,
      minWidth: 120,
      maxWidth: 140,
      cellRenderer: () => {
        return `
    <div class="table-actions">
      <button type="button" class="table-action-btn table-action-btn--edit" data-action="edit" aria-label="Edit user">
        <span class="material-icons" style="pointer-events:none;">edit</span>
      </button>
      <button type="button" class="table-action-btn table-action-btn--delete" data-action="delete" aria-label="Delete user">
        <span class="material-icons" style="pointer-events:none;">delete</span>
      </button>
    </div>
  `;
      },
      onCellClicked: (params: any) => {
        this.ngZone.run(() => {
          const target = params.event?.target as HTMLElement;
          const actionBtn = target?.closest('[data-action]') as HTMLElement;
          const action = actionBtn?.getAttribute('data-action');

          if (!action) {
            return;
          }

          if (action === 'edit') {
            this.openEditEmployeeForm(params.data);
            return;
          }

          if (action === 'delete') {
            this.openDeleteConfirm(params.data?.fullName, params.data?.userName, params.data?.emailId);
          }
        });
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

  // Form state
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

  // displaying active employees cards
  get totalUsers(): number {
    return this.rowData.length;
  }

  get activeUsers(): number {
    return this.rowData.filter((user) => this.isUserActive(user.active)).length;
  }

  get adminCount(): number {
    return this.getRoleCount('ADMIN');
  }

  get managerCount(): number {
    return this.getRoleCount('MANAGER');
  }

  get employeeCount(): number {
    return this.getRoleCount('EMPLOYEE');
  }

  get adminActiveCount(): number {
    return this.getRoleStatusCount('ADMIN', true);
  }

  get adminInactiveCount(): number {
    return this.getRoleStatusCount('ADMIN', false);
  }

  get managerActiveCount(): number {
    return this.getRoleStatusCount('MANAGER', true);
  }

  get managerInactiveCount(): number {
    return this.getRoleStatusCount('MANAGER', false);
  }

  get employeeActiveCount(): number {
    return this.getRoleStatusCount('EMPLOYEE', true);
  }

  get employeeInactiveCount(): number {
    return this.getRoleStatusCount('EMPLOYEE', false);
  }

  get filteredRowData(): any[] {
    const searchTerm = this.normalizeSearchValue(this.userSearchTerm);

    if (!searchTerm) {
      return this.rowData;
    }

    return this.rowData.filter((user) => {
      const combinedSearchText = [
        this.normalizeSearchValue(user.fullName),
        this.normalizeSearchValue(user.userName),
        this.normalizeSearchValue(user.emailId),
        this.normalizeSearchValue(user.role),
        this.normalizeSearchValue(user.gender),
      ].join(' ');

      return combinedSearchText.includes(searchTerm);
    });
  }

  // Initial checking Authentication, loading full name for dashboard and fetching all emps for table
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.userRole = sessionStorage.getItem('role') || 'ADMIN';
      this.checkAuth();
      this.loadFullName();
      this.loadAllUsers();
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridApi.sizeColumnsToFit();
  }

  // helper methods for toggle sidebar, menu and user dropdown
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 320);
  }

  toggleMenu(menu: string) {
    this.activeMenu = menu;
    this.currentPage = menu;
    setTimeout(() => this.gridApi?.sizeColumnsToFit(), 120);
  }

  openOverviewDestination(section: string) {
    this.toggleMenu(section);
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  // helper methods for open/close the Add/Edit employee form
  openAddEmployeeForm() {
    this.isEditMode = false;
    this.resetUserForm();
    this.showAddEmployeeForm = true;
  }

  closeAddEmployeeForm() {
    this.isEditMode = false;
    this.editingUsername = '';
    this.showAddEmployeeForm = false;
  }

  openEditEmployeeForm(user: any) {
    this.isEditMode = true;
    this.editingUsername = this.trimValue(user?.userName);
    this.userForm = {
      companyId: this.trimValue(user?.companyId),
      fullName: this.trimValue(user?.fullName),
      username: this.trimValue(user?.userName),
      password: '',
      email: this.trimValue(user?.emailId),
      role: this.trimValue(user?.role) || 'EMPLOYEE',
      gender: this.trimValue(user?.gender) || 'MALE',
      isActive: this.isUserActive(user?.active),
    };
    this.showAddEmployeeForm = true;
    this.cdr.detectChanges();
  }

  // form submission for both add and edit employee with validation for email format and unique username/email
  submitUserForm() {
    const email = this.trimValue(this.userForm.email);

    if (!this.emailPattern.test(email)) {
      this.toastr.error('Please enter a valid email address');
      return;
    }

    const result = this.isUsernameOrEmailTaken(this.userForm.username, this.userForm.email);

    if (result.isUsernameTaken && result.isEmailTaken) {
      this.toastr.warning('Username & Email already exists!');
      return;
    }

    if (result.isUsernameTaken) {
      this.toastr.warning('Username already exists!');
      return;
    }

    if (result.isEmailTaken) {
      this.toastr.warning('Email already exists!');
      return;
    }

    // If in edit mode, then call update employee API, otherwise call add employee API
    if (this.isEditMode) {
      this.updateEmployee();
      return;
    }

    this.addEmployee();
  }

  resetForm(form: any) {
    this.resetUserForm();
  }

  // Delete user confirmation popup handlers
  cancelDeleteUser() {
    this.showDeleteConfirm = false;
    this.deleteCandidateName = '';
    this.deleteCandidateUsername = '';
    this.deleteCandidateEmail = '';
  }

  confirmDeleteUser() {
    if (!this.deleteCandidateUsername) {
      this.toastr.error('Username not found for delete!');
      this.cancelDeleteUser();
      return;
    }

    if (!this.deleteCandidateEmail) {
      this.toastr.error('Email not found for delete!');
      this.cancelDeleteUser();
      return;
    }

    this.showDeleteConfirm = false;
    this.deleteUser(this.deleteCandidateName, this.deleteCandidateUsername, this.deleteCandidateEmail);
  }

  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userFullName');
    this.router.navigate(['/login']);
  }

  // POST - add Employee
  private addEmployee() {
    const token = sessionStorage.getItem('token');
    const payload = this.buildPayload();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    this.http.post<any>(this.addUserEndpoint, payload, { headers }).subscribe({
      next: (res) => {
        this.toastr.success(res?.message || 'User added successfully!');
        this.resetUserForm();
        this.closeAddEmployeeForm();
        this.loadAllUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Unable to create user!');
      },
    });
  }

  // PUT - update Employee
  private updateEmployee() {
    const token = sessionStorage.getItem('token');
    const payload = this.buildPayload();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    this.http.put<any>(this.updateUserEndpoint, payload, { headers }).subscribe({
      next: (res) => {
        this.toastr.success(res?.message || 'User updated successfully!');
        this.resetUserForm();
        this.closeAddEmployeeForm();
        this.loadAllUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Unable to update user');
      },
    });
  }

  private openDeleteConfirm(fullName: string, username: string, emailId: string) {
    const trimmedUsername = this.trimValue(username);
    const trimmedEmail = this.trimValue(emailId);

    if (!trimmedUsername) {
      this.toastr.error('Username not found for delete!');
      return;
    }

    if (!trimmedEmail) {
      this.toastr.error('Email not found for delete!');
      return;
    }

    this.deleteCandidateName = this.trimValue(fullName) || 'this employee';
    this.deleteCandidateUsername = trimmedUsername;
    this.deleteCandidateEmail = trimmedEmail;
    this.showDeleteConfirm = true;
    this.cdr.detectChanges();
  }

  // DELETE - delete Employee, with confirmation popup
  private deleteUser(fullName: string, username: string, emailId: string) {
    const trimmedFullName = this.trimValue(fullName);
    const trimmedUsername = this.trimValue(username);
    const trimmedEmail = this.trimValue(emailId);

    if (!trimmedFullName) {
      this.toastr.error('Full name not found for delete!');
      return;
    }

    if (!trimmedUsername) {
      this.toastr.error('Username not found for delete!');
      return;
    }

    if (!trimmedEmail) {
      this.toastr.error('Email not found for delete!');
      return;
    }

    const token = sessionStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });

    const payload = {
      fullName: trimmedFullName,
      userName: trimmedUsername,
      emailId: trimmedEmail,
    };

    this.http.delete<any>(this.deleteUserEndpoint, { headers, body: payload }).subscribe({
      next: (res) => {
        this.toastr.success(res?.message || 'User deleted successfully!');
        this.loadAllUsers();
      },
      error: (err: HttpErrorResponse) => {
        this.toastr.error(err.error?.message || 'Unable to delete user!');
      },
    });
  }

  // Auth and data load
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
        this.gridApi?.sizeColumnsToFit();
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

  // Shared helpers
  private buildPayload() {
    const f = this.userForm;

    return {
      fullName: this.trimValue(f.fullName),
      userName: this.trimValue(f.username),
      userPassword: f.password,
      emailId: this.trimValue(f.email),
      role: f.role,
      gender: f.gender,
      active: f.isActive,
      createdBy: this.userRole,
    };
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

  private getRoleCount(role: string): number {
    return this.rowData.filter((user) => String(user.role || '').toUpperCase() === role).length;
  }

  private getRoleStatusCount(role: string, isActive: boolean): number {
    return this.rowData.filter((user) => {
      const userRole = String(user.role || '').toUpperCase() === role;
      const userStatus = this.isUserActive(user.active) === isActive;

      return userRole && userStatus;
    }).length;
  }

  private isUserActive(value: any): boolean {
    return (
      value === true ||
      value === 'true' ||
      value === 1 ||
      value === '1' ||
      String(value || '').toUpperCase() === 'ACTIVE'
    );
  }

  private isUsernameOrEmailTaken(username: string, email: string) {
    const otherUsers = this.isEditMode
      ? this.rowData.filter((u) => u.userName.toLowerCase() !== this.editingUsername.toLowerCase())
      : this.rowData;

    const isUsernameTaken = otherUsers.some((user) => user.userName.toLowerCase() === username.toLowerCase());
    const isEmailTaken = otherUsers.some((user) => user.emailId.toLowerCase() === email.toLowerCase());

    return { isUsernameTaken, isEmailTaken };
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

  private trimValue(val: any): string {
    if (val === null || val === undefined) {
      return '';
    }

    return String(val).trim();
  }

  private normalizeSearchValue(value: any): string {
    return this.trimValue(value).toLowerCase();
  }
}
