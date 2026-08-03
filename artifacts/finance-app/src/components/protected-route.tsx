import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect, Route, RouteProps } from 'wouter';
import { AppLayout } from './layout/app-layout';

export function ProtectedRoute({ component: Component, ...rest }: RouteProps & { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Route 
      {...rest} 
      component={(props) => {
        if (isLoading) return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
        if (!isAuthenticated) return <Redirect to="/login" replace />;
        return (
          <AppLayout>
            <Component {...props} />
          </AppLayout>
        );
      }} 
    />
  );
}
