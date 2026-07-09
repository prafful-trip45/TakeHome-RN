import { useEffect } from 'react';
import { syncNotifications } from '../services/notifications/notificationService';

/**
 * Mount ONCE at root (task 3). Kicks off the notification sync (channel →
 * permission → token → admin registration) after first render so it never
 * delays splash hide or first paint.
 *
 * Deliberately registers NO listeners: notification-tap routing lives solely in
 * navigation/linkingConfig.ts (D8), so handlers exist exactly once app-wide —
 * the "registered once and cleaned up" performance requirement is satisfied by
 * construction (the linking subscribe cleans up on container unmount).
 */
export function useNotifications(): void {
  useEffect(() => {
    void syncNotifications();
  }, []);
}
