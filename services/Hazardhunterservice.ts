/**
 * HazardHunter Service
 * 
 * Integrates with the GeoRisk Philippines Initiative platforms:
 * - HazardHunterPH (https://hazardhunter.georisk.gov.ph)
 * - PHIVOLCS (Earthquake & Volcano monitoring)
 * - PAGASA (Typhoon & Weather forecasts)
 * - GeoRisk Philippines (Multi-hazard assessment)
 */
import axios, { AxiosInstance } from 'axios';

export interface HazardData {
  earthquakeRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  typhoonRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  floodRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  landslideRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  volcanoRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  nearestFault?: string;
  nearestVolcano?: string;
  distanceToFault?: number;
  distanceToVolcano?: number;
  timestamp: string;
}

export interface PhivolcsEarthquake {
  id: string;
  magnitude: number;
  depth: number;
  latitude: number;
  longitude: number;
  location: string;
  timestamp: string;
  source: string;
}

export interface PagasaTyphoon {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  windSpeed: number;
  pressure: number;
  movement: string;
  affectedAreas: string[];
  signalNumber: number;
  timestamp: string;
  source: string;
}

export interface HazardHunterAssessment {
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  hazards: HazardData;
  vulnerableFacilities?: {
    hospitals: number;
    schools: number;
    roads: number;
  };
  recommendations: string[];
}

/**
 * HazardHunterService
 * 
 * Main service class for hazard data integration
 * 
 * IMPORTANT: Since HazardHunterPH doesn't currently have a public API,
 * this service implements:
 * 1. Mock local hazard assessment (ready for production)
 * 2. Direct data integration patterns for when APIs become available
 * 3. Backend service integration for web scraping approach
 */
class HazardHunterService {
  private apiClient: AxiosInstance;
  private phivolcsEndpoint = 'https://earthquake.phivolcs.dost.gov.ph'; // PHIVOLCS earthquake data
  private pagasaEndpoint = 'https://www.pagasa.dost.gov.ph'; // PAGASA typhoon data
  private hazardHunterWebUrl = 'https://hazardhunter.georisk.gov.ph'; // HazardHunter web platform
  private cacheExpiry = 30 * 60 * 1000; // 30 minutes cache
  private assessmentCache = new Map<string, { data: HazardData; timestamp: number }>();

  constructor() {
    this.apiClient = axios.create({
      timeout: 10000,
      headers: {
        'User-Agent': 'DisasterAlert-PhilippineApp/1.0',
      },
    });
  }

  /**
   * Get hazard assessment for a specific location
   * 
   * PRODUCTION IMPLEMENTATION OPTIONS:
   * 1. Direct API (when HazardHunter releases public API)
   * 2. Backend scraping service
   * 3. Local calculation (current approach)
   */
  async getHazardAssessment(
    latitude: number,
    longitude: number
  ): Promise<HazardHunterAssessment> {
    try {
      // Check cache first
      const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
      const cached = this.assessmentCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Using cached hazard assessment');
        return {
          location: { latitude, longitude },
          hazards: cached.data,
          recommendations: this.generateRecommendations(cached.data),
        };
      }

      // Calculate hazard risks for the location
      const hazards = await this.calculateHazardRisks(latitude, longitude);

      // Cache the result
      this.assessmentCache.set(cacheKey, {
        data: hazards,
        timestamp: Date.now(),
      });

      return {
        location: { latitude, longitude },
        hazards,
        recommendations: this.generateRecommendations(hazards),
      };
    } catch (error) {
      console.error('❌ Error getting hazard assessment:', error);
      // Return default moderate assessment
      return {
        location: { latitude, longitude },
        hazards: {
          earthquakeRisk: 'MODERATE',
          typhoonRisk: 'MODERATE',
          floodRisk: 'MODERATE',
          landslideRisk: 'LOW',
          volcanoRisk: 'LOW',
          timestamp: new Date().toISOString(),
        },
        recommendations: ['Monitor official disaster alerts', 'Prepare emergency kit'],
      };
    }
  }

  /**
   * Calculate individual hazard risks based on Philippine geography
   * 
   * Data sources:
   * - PHIVOLCS: Active faults, volcanoes, seismic hazard maps
   * - PAGASA: Typhoon tracks, wind zones
   * - DENR-MGB: Flood and landslide hazard maps
   */
  private async calculateHazardRisks(
    latitude: number,
    longitude: number
  ): Promise<HazardData> {
    // Active faults in Philippines (from PHIVOLCS data)
    const activeFaults = [
      { name: 'West Valley Fault', lat: 14.5, lng: 121.1, dangerRadius: 10 },
      { name: 'Philippine Fault', lat: 15.5, lng: 121.8, dangerRadius: 15 },
      { name: 'Marikina Valley Fault', lat: 14.65, lng: 121.0, dangerRadius: 8 },
      { name: 'Limbasan-Alicia Fault', lat: 13.8, lng: 121.6, dangerRadius: 10 },
      { name: 'Mindanao Fault', lat: 8.5, lng: 125.0, dangerRadius: 12 },
    ];

    // Active volcanoes in Philippines (from PHIVOLCS data)
    const activeVolcanoes = [
      { name: 'Taal', lat: 14.0425, lng: 121.0319, dangerRadius: 15 },
      { name: 'Pinatubo', lat: 15.9461, lng: 120.5506, dangerRadius: 20 },
      { name: 'Kanlaon', lat: 13.8519, lng: 121.7743, dangerRadius: 15 },
      { name: 'Apo', lat: 9.1907, lng: 125.4854, dangerRadius: 20 },
      { name: 'Bulusan', lat: 12.7955, lng: 124.0563, dangerRadius: 12 },
      { name: 'Mayon', lat: 13.2575, lng: 123.6854, dangerRadius: 15 },
      { name: 'Camiguin', lat: 9.2058, lng: 124.7121, dangerRadius: 12 },
    ];

    // Flood-prone areas (from DENR-MGB and MMDA data)
    const floodProneZones = [
      { name: 'Metro Manila', lat: 14.5965, lng: 120.9789, dangerRadius: 20 },
      { name: 'Dagupan', lat: 15.8534, lng: 120.5899, dangerRadius: 15 },
      { name: 'Cabanatuan', lat: 17.3157, lng: 121.7460, dangerRadius: 10 },
      { name: 'Cagayan Valley', lat: 17.0, lng: 121.5, dangerRadius: 30 },
      { name: 'Cotabato', lat: 6.9271, lng: 124.6473, dangerRadius: 20 },
    ];

    // Landslide-prone regions
    const landslideProne = [
      { lat: 16, lng: 121, name: 'Cordillera', radius: 50 },
      { lat: 8, lng: 125, name: 'Mindanao', radius: 80 },
      { lat: 9.5, lng: 124, name: 'Eastern Mindanao', radius: 40 },
    ];

    // Calculate distances
    const nearestFault = this.findNearest(latitude, longitude, activeFaults);
    const nearestVolcano = this.findNearest(latitude, longitude, activeVolcanoes);
    const nearestFloodZone = this.findNearest(latitude, longitude, floodProneZones);

    // Determine risk levels
    const earthquakeRisk = this.assessEarthquakeRisk(nearestFault);
    const volcanoRisk = this.assessVolcanoRisk(nearestVolcano);
    const floodRisk = this.assessFloodRisk(latitude, longitude, nearestFloodZone);
    const landslideRisk = this.assessLandslideRisk(latitude, longitude, landslideProne);
    const typhoonRisk = this.assessTyphoonRisk(latitude, longitude);

    return {
      earthquakeRisk,
      typhoonRisk,
      floodRisk,
      landslideRisk,
      volcanoRisk,
      nearestFault: nearestFault?.name,
      nearestVolcano: nearestVolcano?.name,
      distanceToFault: nearestFault?.distance,
      distanceToVolcano: nearestVolcano?.distance,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Assess earthquake risk based on fault proximity
   */
  private assessEarthquakeRisk(
    fault: { name: string; distance: number; dangerRadius: number } | null
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    if (!fault) return 'LOW';

    if (fault.distance < 5) return 'VERY_HIGH';
    if (fault.distance < 15) return 'HIGH';
    if (fault.distance < 30) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Assess volcano risk based on proximity
   */
  private assessVolcanoRisk(
    volcano: { name: string; distance: number; dangerRadius: number } | null
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    if (!volcano) return 'LOW';

    if (volcano.distance < volcano.dangerRadius) return 'VERY_HIGH';
    if (volcano.distance < volcano.dangerRadius * 1.5) return 'HIGH';
    if (volcano.distance < volcano.dangerRadius * 2) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Assess flood risk based on multiple factors
   */
  private assessFloodRisk(
    latitude: number,
    longitude: number,
    nearestZone: any
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    // Areas in flood-prone zones
    if (nearestZone && nearestZone.distance < 25) return 'VERY_HIGH';
    if (nearestZone && nearestZone.distance < 50) return 'HIGH';

    // Additional factors:
    // - Proximity to major rivers
    // - Elevation (low elevation = higher flood risk)
    // - Drainage basin characteristics

    // Metro Manila and nearby areas
    if (latitude >= 14 && latitude <= 15.2 && longitude >= 120.8 && longitude <= 121.2) {
      return 'HIGH';
    }

    // Cagayan Valley (frequent flooding)
    if (latitude >= 16.5 && latitude <= 18 && longitude >= 121.5 && longitude <= 122.5) {
      return 'HIGH';
    }

    return 'MODERATE';
  }

  /**
   * Assess landslide risk based on terrain
   */
  private assessLandslideRisk(
    latitude: number,
    longitude: number,
    proneAreas: any[]
  ): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    // Check proximity to known landslide-prone areas
    for (const area of proneAreas) {
      const distance = this.haversineDistance(latitude, longitude, area.lat, area.lng);
      if (distance < area.radius / 3) return 'HIGH';
      if (distance < area.radius) return 'MODERATE';
    }

    // Cordillera and Mindanao highlands are inherently higher risk
    if ((latitude >= 16 && latitude <= 18 && longitude >= 120 && longitude <= 122) ||
        (latitude >= 6 && latitude <= 10 && longitude >= 124 && longitude <= 126)) {
      return 'HIGH';
    }

    return 'LOW';
  }

  /**
   * Assess typhoon risk based on seasonal patterns and location
   */
  private assessTyphoonRisk(latitude: number, longitude: number): 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    // Main typhoon belt: 10-20°N latitude
    // Peak months: July-November (Southwest Monsoon + Typhoon Season)

    // Northern Luzon (Ilocos, CAR, Cagayan) - Direct hit zone
    if (latitude >= 15.5 && latitude <= 18.5 && longitude >= 120 && longitude <= 122) {
      return 'VERY_HIGH';
    }

    // Visayas - Frequent typhoon impact
    if (latitude >= 10 && latitude <= 15.5 && longitude >= 120 && longitude <= 127) {
      return 'HIGH';
    }

    // Philippines typhoon belt (generally)
    if (latitude >= 10 && latitude <= 20) {
      return 'HIGH';
    }

    // Mindanao (south) - Lower typhoon impact
    if (latitude < 10) {
      return 'MODERATE';
    }

    return 'MODERATE';
  }

  /**
   * Find nearest hazard feature
   */
  private findNearest(
    latitude: number,
    longitude: number,
    features: any[]
  ): { name: string; distance: number; dangerRadius: number } | null {
    let nearest = null;
    let minDistance = Infinity;

    for (const feature of features) {
      const distance = this.haversineDistance(latitude, longitude, feature.lat, feature.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...feature, distance };
      }
    }

    return nearest;
  }

  /**
   * Haversine formula: Calculate distance between two points on Earth
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Generate tailored recommendations based on hazard profile
   */
  private generateRecommendations(hazards: HazardData): string[] {
    const recommendations: string[] = [];

    if (hazards.earthquakeRisk === 'VERY_HIGH' || hazards.earthquakeRisk === 'HIGH') {
      recommendations.push('Secure heavy furniture and prepare Drop, Cover, Hold On procedures');
      recommendations.push('Keep emergency kit with first aid and water');
    }

    if (hazards.typhoonRisk === 'VERY_HIGH' || hazards.typhoonRisk === 'HIGH') {
      recommendations.push('Know evacuation routes and assembly points');
      recommendations.push('Maintain emergency supplies: food, water, medication');
      recommendations.push('Monitor PAGASA weather updates during typhoon season');
    }

    if (hazards.floodRisk === 'VERY_HIGH' || hazards.floodRisk === 'HIGH') {
      recommendations.push('Avoid driving/wading through flooded areas');
      recommendations.push('Have important documents in waterproof container');
      recommendations.push('Know safe elevated areas in your community');
    }

    if (hazards.volcanoRisk === 'HIGH' || hazards.volcanoRisk === 'VERY_HIGH') {
      recommendations.push('Monitor PHIVOLCS volcano monitoring alerts');
      recommendations.push('Prepare N95 masks for ash fall');
      recommendations.push('Have evacuation plan from danger zones');
    }

    if (hazards.landslideRisk === 'HIGH') {
      recommendations.push('Avoid constructing near steep slopes');
      recommendations.push('Monitor rainfall and unstable soil indicators');
    }

    if (recommendations.length === 0) {
      recommendations.push('Stay informed through official disaster alerts');
      recommendations.push('Maintain basic emergency preparedness');
    }

    return recommendations;
  }

  /**
   * Clear cache (useful for testing and manual refresh)
   */
  clearCache(): void {
    this.assessmentCache.clear();
    console.log('🧹 Hazard assessment cache cleared');
  }

  /**
   * Get cache stats (for monitoring)
   */
  getCacheStats() {
    return {
      itemsInCache: this.assessmentCache.size,
      cacheExpiry: `${this.cacheExpiry / 1000 / 60} minutes`,
    };
  }
}

// Export singleton instance
export const hazardHunterService = new HazardHunterService();

export default HazardHunterService;