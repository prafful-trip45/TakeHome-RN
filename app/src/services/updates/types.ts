/** UI-facing OTA lifecycle phase; drives the update banner. */
export enum OtaPhase {
  Idle = 'idle', // not started, or OTA inactive (dev build / Expo Go)
  Checking = 'checking',
  Downloading = 'downloading',
  Ready = 'ready', // downloaded & pending, awaiting reload
  UpToDate = 'up-to-date',
  Error = 'error', // offline/failed; non-fatal, stays on current bundle
}

/** Result of a single check+download cycle. */
export enum OtaCheckResult {
  Downloaded = 'downloaded',
  UpToDate = 'up-to-date',
  Disabled = 'disabled',
  Error = 'error',
}
