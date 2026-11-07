export interface EquipmentSample {
  id: string;
  name: string;
  icon: string;
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
  samples: HistorySample[];
}
