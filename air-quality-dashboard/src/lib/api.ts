// lib/api.ts - API service to fetch real data from backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface DashboardDevice {
  id: string;
  deviceId: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  status: string;
  pm2_5: number | null;
  pm10: number | null;
  temperature: number | null;
  humidity: number | null;
  lastUpdate: string | null;
  aqi: { value: number; status: string } | null;
}

export interface DeviceLatest {
  device: {
    deviceId: string;
    name: string;
    location: any;
  };
  reading: {
    deviceId: string;
    timestamp: string;
    location: string;
    environmental: {
      temperature: number;
      humidity: number;
      pressure: number;
    };
    airQuality: {
      pm1_0: number;
      pm2_5: number;
      pm10: number;
    };
    particles: {
      particles_0_3um: number;
      particles_2_5um: number;
    };
  };
  aqi: { value: number; status: string };
  rawData: any;
}

export interface TrendData {
  time: string;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  count: number;
}

export interface CurrentMetrics {
  deviceId: string;
  timestamp: string;
  metrics: {
    pm25: { value: number; unit: string; status: string; trend: string };
    pm10: { value: number; unit: string; status: string; trend: string };
    temperature: { value: number; unit: string; status: string; trend: string };
    humidity: { value: number; unit: string; status: string; trend: string };
    pressure: { value: number; unit: string; status: string; trend: string };
  };
}

export async function getDashboardData(): Promise<DashboardDevice[]> {
  const response = await fetch(`${API_BASE}/sensor/dashboard`, {
    cache: 'no-store', // Disable caching for real-time data
  });
  if (!response.ok) throw new Error('Failed to fetch dashboard data');
  return response.json();
}

export async function getDeviceLatest(deviceId: string): Promise<DeviceLatest> {
  const response = await fetch(`${API_BASE}/sensor/${deviceId}/latest`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch device data');
  return response.json();
}

export async function getDeviceTrends(
  deviceId: string,
  hours: number = 24
): Promise<{ deviceId: string; hours: number; data: TrendData[] }> {
  const response = await fetch(`${API_BASE}/sensor/${deviceId}/trends?hours=${hours}`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch trend data');
  return response.json();
}

export async function getCurrentMetrics(deviceId: string): Promise<CurrentMetrics> {
  const response = await fetch(`${API_BASE}/sensor/${deviceId}/current-metrics`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch metrics');
  return response.json();
}
