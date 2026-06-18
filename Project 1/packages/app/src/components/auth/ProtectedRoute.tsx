/**
 * ProtectedRoute — Route Guard
 *
 * Wraps all authenticated pages.
 * If the user is not logged in, redirects to /login.
 * The `from` param lets us redirect BACK after login:
 *   User tries to go to /payments → redirect to /login?from=/payments
 *   After login → redirect to /payments
 */

import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, fetchMe } = useAuth();
  const location = useLocation();

  // On app load, verify the stored token is still valid
  useEffect(() => {
    fetchMe();
  }, []);

  if (!isAuthenticated) {
    // Save the current URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // <Outlet /> renders the matched child route component
  return <Outlet />;
}
