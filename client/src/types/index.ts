export type UserType = 'visitor' | 'community-member' | null;

export interface User {
  type: UserType;
  name?: string;
  email?: string;
  authenticated: boolean;
}

export type AQICategory = 'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';

export type HealthRiskZone = 'moderate-risk' | 'high-risk' | 'severe-risk';

export interface Sensor {
  id: string;
  lat: number;
  lng: number;
  aqi: number;
  category: AQICategory;
  healthRiskZone: HealthRiskZone;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
  dataSource: 'ANM' | 'ANPM' | 'Civic Network';
  cluster?: number;
  riskCluster?: number;
}