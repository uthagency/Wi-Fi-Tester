export type ConnectionState = 'connected' | 'disconnected' | 'error' | 'unknown';

export type SignalTier =
  | 'Very weak'
  | 'Weak'
  | 'Fair'
  | 'Good'
  | 'Excellent';

export interface WifiSampleResult {
  ts: number;
  state: ConnectionState;
  iface: string | null;
  ssid: string | null;
  signal: number | null;
  adapter: 'nmcli' | 'dbus' | 'fake';
  errorCode: string | null;
  errorMessage: string | null;
  latencyMs: number;
}

export interface WifiReading {
  id: number;
  ts: number;
  state: ConnectionState;
  iface: string | null;
  ssid: string | null;
  signal: number | null;
  location: string;
}

export interface StabilityMetrics {
  location: string;
  windowStartMs: number;
  windowEndMs: number;
  totalSamples: number;
  validChecks: number;
  connectedChecks: number;
  disconnectedChecks: number;
  unknownChecks: number;
  onlineWhenCheckedPct: number | null;
  observedDropouts: number;
}

export interface TimelinePoint {
  id: number;
  ts: number;
  state: ConnectionState;
  signalValue: number | null;
  iface: string | null;
  ssid: string | null;
  tier: SignalTier | null;
}

export interface LocationSummary {
  location: string;
  sampleCount: number;
  lastTs: number;
}

export interface PollResponse {
  sample: WifiSampleResult;
  reading: WifiReading;
  prunedCount: number;
  metrics: StabilityMetrics;
  timeline: TimelinePoint[];
  recentReadings: WifiReading[];
  locations: LocationSummary[];
}

export interface HistoryResponse {
  location: string;
  metrics: StabilityMetrics;
  timeline: TimelinePoint[];
  recentReadings: WifiReading[];
  locations: LocationSummary[];
}
