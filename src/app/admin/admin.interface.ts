export interface MonitoredDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  icon: string;
  enabled: boolean;
}

export interface AdminAuditEvent {
  id: string;
  email: string;
  timestamp: number | null;
  deviceCount: number;
  changedDevices: string[];
  settingsKeys: string[];
}

export interface AdminConfiguration {
  user: {uid: string; email: string};
  settings: {timeout: number; [key: string]: unknown};
  servers: MonitoredDevice[];
  revision: string;
  audit: AdminAuditEvent[];
}

export interface AdminSaveRequest {
  settings: AdminConfiguration['settings'];
  servers: MonitoredDevice[];
  revision: string;
}
