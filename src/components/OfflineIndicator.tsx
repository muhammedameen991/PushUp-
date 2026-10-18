import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#262624] text-[#F5F4EF] dark:bg-[#F5F4EF] dark:text-[#262624] px-3.5 py-2 text-xs font-semibold shadow-floating border border-soft-stone animate-bounce"
    >
      <WifiOff className="w-4 h-4 text-terracotta shrink-0" />
      <span>Offline Mode — All workouts and stats save locally to your device.</span>
    </div>
  );
};
