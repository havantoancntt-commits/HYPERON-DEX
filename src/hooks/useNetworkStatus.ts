import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [isForeground, setIsForeground] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      window.dispatchEvent(new CustomEvent('hyperon-network-reconnected'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      window.dispatchEvent(new CustomEvent('hyperon-network-disconnected'));
    };

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsForeground(visible);
      if (visible) {
        // App returned to foreground: trigger freshness reconciliation across wallets and prices
        window.dispatchEvent(new CustomEvent('hyperon-foreground-refresh', {
          detail: { timestamp: Date.now() }
        }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { isOnline, isForeground };
}
