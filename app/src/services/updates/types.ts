/** UI-facing phase for the OTA lifecycle (drives the banner + optional debug row). */
export enum OtaPhase {
  Idle = 'idle', // not started, or OTA inactive (dev build / Expo Go)
  Checking = 'checking',
  Downloading = 'downloading',
  Ready = 'ready', // downloaded & pending → awaiting reload
  UpToDate = 'up-to-date',
  Error = 'error', // offline / failed — non-fatal, we stay on the current bundle
}

/** Result of a single check+download cycle from the service layer. */
export enum OtaCheckResult {
  Downloaded = 'downloaded',
  UpToDate = 'up-to-date',
  Disabled = 'disabled',
  Error = 'error',
}
