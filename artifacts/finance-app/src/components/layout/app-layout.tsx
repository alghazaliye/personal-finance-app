import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  WalletCards, 
  ArrowLeftRight, 
  PieChart, 
  BarChart3, 
  Settings, 
  Bell, 
  User,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGetUnreadNotificationsCount } from '@workspace/api-client-react';

const NavItems = [
  { href: '/', label: 'الرئيسية', icon: Home },
  { href: '/transactions', label: 'المعاملات', icon: ArrowLeftRight },
  { href: '/accounts', label: 'الحسابات', icon: WalletCards },
  { href: '/budgets', label: 'الميزانية', icon: PieChart },
  { href: '/reports', label: 'التقارير', icon: BarChart3 },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const { data: unreadData } = useGetUnreadNotificationsCount({
    query: {
      enabled: !!user,
      refetchInterval: 60000,
    }
  });
  
  const unreadCount = unreadData?.count || 0;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-l border-border fixed h-full z-10">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <WalletCards className="w-8 h-8" />
            حسابي
          </h1>
        </div>
        
        <div className="px-4 py-2">
          <Link href="/transactions/new" className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-xl transition-colors font-medium">
            <Plus className="w-5 h-5" />
            معاملة جديدة
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {NavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  isActive 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <Link href="/notifications" className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
            location.startsWith('/notifications') ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
          )}>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              <span>الإشعارات</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link href="/settings" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
            location.startsWith('/settings') ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
          )}>
            <Settings className="w-5 h-5" />
            الإعدادات
          </Link>
          <Link href="/profile" className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mt-2",
            location.startsWith('/profile') ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted"
          )}>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <span className="truncate">{user?.name}</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:mr-64 pb-20 md:pb-0 min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-10">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <WalletCards className="w-6 h-6" />
            حسابي
          </h1>
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative p-2 text-muted-foreground">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-destructive rounded-full border-2 border-card"></span>
              )}
            </Link>
            <Link href="/profile" className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </Link>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card border-t border-border flex items-center justify-around p-2 pb-safe z-50">
        {NavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive ? "fill-primary/20" : "")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        
        {/* Mobile FAB for adding transaction */}
        <Link 
          href="/transactions/new" 
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg border-4 border-background hover:scale-105 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </nav>
    </div>
  );
}
