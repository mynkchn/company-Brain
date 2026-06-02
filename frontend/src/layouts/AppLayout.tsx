import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Database, LogOut, Terminal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

interface AppLayoutProps {
  user: User;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function AppLayout({ user, onLogout, children }: AppLayoutProps) {
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Playgrounds', icon: Database },
    { to: '/new', label: 'New', icon: Plus },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="relative">
              <Terminal className="h-5 w-5 text-primary group-hover:text-primary transition-colors" />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
            </div>
            <span className="font-mono font-bold text-sm text-foreground">
              company<span className="text-primary">Brain</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors',
                  location.pathname === to
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src={user.avatar_url}
                alt={user.username}
                className="h-7 w-7 rounded-full border border-border"
              />
              <span className="text-xs font-mono text-muted-foreground hidden sm:block">
                {user.username}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
