/** UI-facing phase for the OTA lifecycle (drives the banner + optional debug row). */
export type OtaPhase =
  | 'idle' // not started, or OTA inactive (dev build / Expo Go)
  | 'checking'
  | 'downloading'
  | 'ready' // downloaded & pending → awaiting reload
  | 'up-to-date'
  | 'error'; // offline / failed — non-fatal, we stay on the current bundle

/** Result of a single check+download cycle from the service layer. */
export type OtaCheckResult = 'downloaded' | 'up-to-date' | 'disabled' | 'error';
