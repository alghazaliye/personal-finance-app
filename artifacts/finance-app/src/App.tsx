import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/protected-route';

// Pages
import Login from '@/pages/login';
import Register from '@/pages/register';
import ForgotPassword from '@/pages/forgot-password';
import Dashboard from '@/pages/dashboard';
import Accounts from '@/pages/accounts';
import AccountDetail from '@/pages/account-detail';
import Transactions from '@/pages/transactions';
import TransactionNew from '@/pages/transaction-new';
import Categories from '@/pages/categories';
import Budgets from '@/pages/budgets';
import Reports from '@/pages/reports';
import Subscription from '@/pages/subscription';
import Notifications from '@/pages/notifications';
import Settings from '@/pages/settings';
import Profile from '@/pages/profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/accounts" component={Accounts} />
      <ProtectedRoute path="/accounts/:id" component={AccountDetail} />
      <ProtectedRoute path="/transactions" component={Transactions} />
      <ProtectedRoute path="/transactions/new" component={TransactionNew} />
      <ProtectedRoute path="/categories" component={Categories} />
      <ProtectedRoute path="/budgets" component={Budgets} />
      <ProtectedRoute path="/reports" component={Reports} />
      <ProtectedRoute path="/subscription" component={Subscription} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/profile" component={Profile} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="hisabi-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster position="top-center" dir="rtl" />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
