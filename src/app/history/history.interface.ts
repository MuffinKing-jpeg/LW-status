export interface EquipmentInfo {
  id: string;
  name: string;
  icon: string;
  enabled?: boolean;
}

export interface EquipmentSample extends EquipmentInfo {
  excludedFromStats?: boolean;
  available: 'Online' | 'Offline';
  latency: number | null;
}

export interface HistorySample {
  timestamp: number;
  players: number | null;
  equipment: EquipmentSample[] | null;
}

export interface HistoryResponse {
  from: number;
  to: number;
  interval: number;
  // Optional during rolling deployment: old APIs only supplied samples.
  equipment?: EquipmentInfo[];
  excludedChecks?: number;
  samples: HistorySample[];
}
