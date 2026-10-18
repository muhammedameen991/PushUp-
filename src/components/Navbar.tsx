import React from 'react';
import {
  LayoutDashboard,
  Dumbbell,
  History,
  TrendingUp,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Activity
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export type NavTab = 'dashboard' | 'workout' | 'biomechanics' | 'history' | 'progress' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  hasActiveWorkout?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isDarkMode,
  onToggleTheme,
  hasActiveWorkout = false,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; mobileShort?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, mobileShort: 'Home' },
    {
      id: 'workout',
      label: hasActiveWorkout ? 'Active Workout' : 'Start Workout',
      icon: <Dumbbell className="w-4 h-4" />,
      mobileShort: 'Workout',
    },
    { id: 'biomechanics', label: '3D Biomechanics', icon: <Activity className="w-4 h-4" />, mobileShort: '3D Form' },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" />, mobileShort: 'History' },
    { id: 'progress', label: 'Progress', icon: <TrendingUp className="w-4 h-4" />, mobileShort: 'Progress' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" />, mobileShort: 'Settings' },
  ];

  return (
    <>
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 w-full border-b border-soft-stone bg-pure-white/90 dark:bg-[#282825]/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Tagline */}
          <button
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-3 text-left group focus:outline-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-terracotta flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20.57 14.86L22 13.43L20.57 12L17 15.57L8.43 7L12 3.43L10.57 2L9.14 3.43L7.71 2L5.57 4.14L4.14 2.71L2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57L3.43 12L7 8.43L15.57 17L12 20.57L13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-charcoal">PushUp</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-terracotta/10 text-terracotta uppercase tracking-wider">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-charcoal-secondary -mt-0.5 hidden sm:block">
                Small reps. Big progress.
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isWorkoutAlert = item.id === 'workout' && hasActiveWorkout;

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-warm-ivory text-charcoal dark:bg-[#20201E] dark:text-[#F5F4EF] shadow-xs'
                      : 'text-charcoal-secondary hover:text-charcoal hover:bg-stone-100 dark:hover:bg-stone-800'
                  } ${isWorkoutAlert ? 'ring-2 ring-terracotta' : ''}`}
                >
                  <span className={isActive ? 'text-terracotta' : ''}>{item.icon}</span>
                  <span>{item.label}</span>
                  {isWorkoutAlert && (
                    <span className="w-2 h-2 rounded-full bg-terracotta animate-ping" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions: Install Button & Dark Mode Toggle */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-soft-stone text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-charcoal-secondary" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-soft-stone bg-pure-white/95 dark:bg-[#282825]/95 backdrop-blur-md pb-safe"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-6 h-16 items-center px-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-lg transition-all ${
                  isActive ? 'text-terracotta font-bold' : 'text-charcoal-secondary'
                }`}
              >
                <div className={`p-1 rounded-md ${isActive ? 'bg-terracotta/10' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tighter truncate max-w-[54px]">
                  {item.mobileShort || item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
