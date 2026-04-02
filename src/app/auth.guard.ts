import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';

const getAuthState = (platformId: Object) => {
  if (!isPlatformBrowser(platformId)) {
    return {
      token: null,
      role: null,
      isAuthenticated: false,
    };
  }

  const token = sessionStorage.getItem('token');
  const role = sessionStorage.getItem('role');

  return {
    token,
    role,
    isAuthenticated: !!token,
  };
};

export const authGuard: CanActivateFn = (_, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const { isAuthenticated } = getAuthState(platformId);

  if (isAuthenticated) {
    return true;
  }

  // Allow SSR to render, client will handle auth redirect
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url, reason: 'auth-required' },
  });
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);
    const { isAuthenticated, role } = getAuthState(platformId);

    // Allow SSR to render, client will handle auth redirect
    if (!isPlatformBrowser(platformId)) {
      return true;
    }

    if (!isAuthenticated) {
      return router.createUrlTree(['/login'], {
        queryParams: { reason: 'auth-required' },
      });
    }

    if (role && allowedRoles.includes(role)) {
      return true;
    }

    // If role does not match, send user back to login and clear stale auth data.
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userFullName');

    return router.createUrlTree(['/login'], {
      queryParams: { reason: 'auth-required' },
    });
  };
};