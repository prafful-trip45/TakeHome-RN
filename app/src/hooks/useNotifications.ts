import { useEffect } from 'react';
import { syncNotifications } from '../services/notifications/notificationService';

/**
 * Mount once at root. Kicks off the notification sync (channel → permission →
 * token → admin registration) after first render so it never delays splash hide
 * or first paint.
 *
 * Registers no listeners: notification-tap routing lives solely in
 * navigation/linkingConfig.ts, so handlers exist exactly once app-wide and the
 * linking subscribe cleans them up on container unmount.
 */
export function useNotifications(): void {
  useEffect(() => {
    void syncNotifications();
  }, []);
}
