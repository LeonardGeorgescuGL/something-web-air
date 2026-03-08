import type { Sensor, AQICategory, HealthRiskZone } from '../types';

// Bucharest coordinates
const BUCHAREST_CENTER = { lat: 44.4268, lng: 26.1025 };

// Define urban areas in Bucharest
const URBAN_AREAS = [
  { name: 'Centru', lat: 44.4360, lng: 26.1028, sensors: 45 },
  { name: 'Nord (Băneasa)', lat: 44.5050, lng: 26.0870, sensors: 38 },
  { name: 'Sud (Berceni)', lat: 44.3680, lng: 26.1250, sensors: 42 },
  { name: 'Est (Pantelimon)', lat: 44.4350, lng: 26.2450, sensors: 40 },
  { name: 'Vest (Militari)', lat: 44.4400, lng: 26.0400, sensors: 44 },
  { name: 'Sud-Est (Titan)', lat: 44.4100, lng: 26.1700, sensors: 38 },
];

function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

// New function to determine health risk zone based on AQI
function getHealthRiskZone(aqi: number): HealthRiskZone {
  // Moderate Risk: AQI 0-100 (Good + Moderate)
  if (aqi <= 100) return 'moderate-risk';
  // High Risk: AQI 101-200 (Unhealthy for Sensitive Groups + Unhealthy)
  if (aqi <= 200) return 'high-risk';
  // Severe Risk: AQI 201+ (Very Unhealthy + Hazardous)
  return 'severe-risk';
}

// New function to assign risk-based clusters (0-2 for 3 zones)
function getRiskCluster(sensors: Sensor[]): void {
  sensors.forEach(sensor => {
    const avgAQI = sensor.aqi;
    
    // Assign cluster based on health risk zone
    if (sensor.healthRiskZone === 'moderate-risk') {
      sensor.riskCluster = 0;
    } else if (sensor.healthRiskZone === 'high-risk') {
      sensor.riskCluster = 1;
    } else {
      sensor.riskCluster = 2;
    }
  });
}

export function generateMockSensors(): Sensor[] {
  const sensors: Sensor[] = [];
  let sensorId = 1;

  URBAN_AREAS.forEach((area, areaIndex) => {
    for (let i = 0; i < area.sensors; i++) {
      // Generate random coordinates around area center
      const latOffset = (Math.random() - 0.5) * 0.05;
      const lngOffset = (Math.random() - 0.5) * 0.08;

      // Generate realistic AQI values with some variation by area
      const baseAQI = 50 + Math.random() * 100 + (areaIndex % 2) * 30;
      const aqi = Math.round(baseAQI + Math.random() * 40);

      // Generate correlated pollutant values
      const pm25 = Math.round((aqi / 3) + Math.random() * 20);
      const pm10 = Math.round(pm25 * 1.5 + Math.random() * 15);
      const no2 = Math.round(30 + Math.random() * 50);
      const o3 = Math.round(40 + Math.random() * 60);
      const co = Math.round(0.5 + Math.random() * 1.5 * 10) / 10;
      const so2 = Math.round(5 + Math.random() * 20);

      const dataSources: ('ANM' | 'ANPM' | 'Civic Network')[] = ['ANM', 'ANPM', 'Civic Network'];
      const dataSource = dataSources[Math.floor(Math.random() * dataSources.length)];

      const healthRiskZone = getHealthRiskZone(aqi);

      sensors.push({
        id: `sensor-${sensorId}`,
        lat: area.lat + latOffset,
        lng: area.lng + lngOffset,
        aqi,
        category: getAQICategory(aqi),
        pm25,
        pm10,
        no2,
        o3,
        co,
        so2,
        dataSource,
        cluster: areaIndex,
        healthRiskZone,
      });

      sensorId++;
    }
  });

  getRiskCluster(sensors);

  return sensors;
}

export const AQI_COLORS = {
  good: '#22c55e',
  moderate: '#eab308',
  sensitive: '#f97316',
  unhealthy: '#ef4444',
  'very-unhealthy': '#a855f7',
  hazardous: '#881337',
};

export const AQI_LABELS = {
  good: 'Bun',
  moderate: 'Moderat',
  sensitive: 'Nesănătos pentru grupuri sensibile',
  unhealthy: 'Nesănătos',
  'very-unhealthy': 'Foarte nesănătos',
  hazardous: 'Periculos',
};

// Health Risk Zone Colors
export const RISK_ZONE_COLORS = {
  'moderate-risk': '#22c55e', // Green
  'high-risk': '#f97316',     // Orange
  'severe-risk': '#dc2626',   // Red
};

// Health Risk Zone Labels
export const RISK_ZONE_LABELS = {
  'moderate-risk': 'Risc Moderat pentru Sănătate',
  'high-risk': 'Risc Ridicat',
  'severe-risk': 'Risc Sever',
};

/**
 * Facebook Prophet-inspired time series prediction
 * Implements a simplified version of Prophet's additive model:
 * y(t) = trend(t) + seasonality(t) + noise
 */
export function generateProphetPredictions(
  historicalData: any[],
  daysToPredict: number = 7
): any[] {
  if (historicalData.length < 7) {
    return []; // Need at least 7 days of data
  }

  const predictions: any[] = [];
  
  // Extract values for the selected pollutant
  const values = historicalData.map(d => d.aqi);
  const n = values.length;
  
  // 1. Calculate trend using linear regression
  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = values;
  
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // 2. Calculate weekly seasonality
  const weeklyPattern: number[] = Array(7).fill(0);
  const weeklyCount: number[] = Array(7).fill(0);
  
  historicalData.forEach((d, i) => {
    const date = new Date(d.date);
    const dayOfWeek = date.getDay();
    const trendValue = slope * i + intercept;
    const detrended = d.aqi - trendValue;
    
    weeklyPattern[dayOfWeek] += detrended;
    weeklyCount[dayOfWeek]++;
  });
  
  // Average the weekly pattern
  for (let i = 0; i < 7; i++) {
    if (weeklyCount[i] > 0) {
      weeklyPattern[i] /= weeklyCount[i];
    }
  }
  
  // 3. Calculate noise/uncertainty level
  const residuals = historicalData.map((d, i) => {
    const date = new Date(d.date);
    const dayOfWeek = date.getDay();
    const trendValue = slope * i + intercept;
    const seasonalValue = weeklyPattern[dayOfWeek];
    const predicted = trendValue + seasonalValue;
    return Math.abs(d.aqi - predicted);
  });
  
  const avgResidual = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  const uncertainty = avgResidual * 1.5; // Increase uncertainty for future predictions
  
  // 4. Generate predictions
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  
  for (let i = 1; i <= daysToPredict; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    
    const dayOfWeek = futureDate.getDay();
    const tIndex = n + i - 1;
    
    // Prophet's additive model: y(t) = trend(t) + seasonality(t)
    const trendValue = slope * tIndex + intercept;
    const seasonalValue = weeklyPattern[dayOfWeek];
    
    // Add some realistic variation
    const noise = (Math.random() - 0.5) * avgResidual * 0.5;
    const predictedAQI = Math.max(0, Math.round(trendValue + seasonalValue + noise));
    
    // Calculate confidence intervals (Prophet uses MCMC, we use simplified approach)
    const lowerBound = Math.max(0, Math.round(predictedAQI - uncertainty));
    const upperBound = Math.round(predictedAQI + uncertainty);
    
    // Generate correlated pollutant predictions
    const pm25 = Math.round((predictedAQI / 3) + Math.random() * 15);
    const pm10 = Math.round(pm25 * 1.5 + Math.random() * 10);
    const no2 = Math.round(25 + Math.random() * 40);
    const o3 = Math.round(35 + Math.random() * 50);
    const co = Math.round(0.4 + Math.random() * 1.2 * 10) / 10;
    const so2 = Math.round(4 + Math.random() * 15);
    
    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      timestamp: futureDate.getTime(),
      aqi: predictedAQI,
      category: getAQICategory(predictedAQI),
      pm25,
      pm10,
      no2,
      o3,
      co,
      so2,
      isPrediction: true,
      lowerBound,
      upperBound,
      confidence: Math.max(0.5, 1 - (i / daysToPredict) * 0.3), // Decreasing confidence
    });
  }
  
  return predictions;
}

export function generateHistoricalData(sensorId: string, days: number = 30) {
  const data = [];
  // TODAY is Feb 7, 2026
  const today = new Date('2026-02-07');

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate realistic patterns (higher during workdays, lower on weekends)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseValue = isWeekend ? 40 : 70;
    const variation = Math.random() * 40;

    const aqi = Math.round(baseValue + variation);
    const pm25 = Math.round((aqi / 3) + Math.random() * 15);
    const pm10 = Math.round(pm25 * 1.5 + Math.random() * 10);
    const no2 = Math.round(25 + Math.random() * 40);
    const o3 = Math.round(35 + Math.random() * 50);
    const co = Math.round(0.4 + Math.random() * 1.2 * 10) / 10;
    const so2 = Math.round(4 + Math.random() * 15);

    data.push({
      date: date.toISOString().split('T')[0],
      timestamp: date.getTime(),
      aqi,
      category: getAQICategory(aqi),
      pm25,
      pm10,
      no2,
      o3,
      co,
      so2,
    });
  }

  return data;
}

export const TRANSPORT_ROUTES = [
  {
    id: 'route-1',
    name: 'Șoseaua Kiseleff',
    type: 'major',
    coordinates: [
      [44.4679, 26.0812],
      [44.4589, 26.0845],
      [44.4500, 26.0878],
    ],
  },
  {
    id: 'route-2',
    name: 'Calea Victoriei',
    type: 'major',
    coordinates: [
      [44.4500, 26.0950],
      [44.4380, 26.0970],
      [44.4280, 26.0990],
    ],
  },
  {
    id: 'route-3',
    name: 'Bulevardul Unirii',
    type: 'major',
    coordinates: [
      [44.4268, 26.1025],
      [44.4208, 26.1125],
      [44.4158, 26.1225],
    ],
  },
];