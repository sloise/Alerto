import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export interface FloodAlert {
  id: string;
  area: string;
  riverBasin: string;
  waterLevel: number; // meters
  criticalLevel: number; // meters
  rainfallAmount: number; // mm per hour
  floodDepth: number; // meters
  affectedStreets: string[];
  evacuationStatus: 'green' | 'yellow' | 'orange' | 'red';
  estimatedPeakTime: Date;
  alertLevel: 'critical' | 'high' | 'medium' | 'info';
  updatedAt: Date;
}

// Sample flood data for Metro Manila
const SAMPLE_FLOODS: FloodAlert[] = [
  {
    id: 'fl1',
    area: 'Marikina City',
    riverBasin: 'Marikina River',
    waterLevel: 17.5,
    criticalLevel: 18.0,
    rainfallAmount: 45,
    floodDepth: 0.5,
    affectedStreets: ['J.P. Rizal St.', 'Sumulong Highway', 'Marcos Highway', 'A. Bonifacio Ave'],
    evacuationStatus: 'orange',
    estimatedPeakTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    alertLevel: 'high',
    updatedAt: new Date()
  },
  {
    id: 'fl2',
    area: 'Valenzuela City',
    riverBasin: 'Tullahan River',
    waterLevel: 3.2,
    criticalLevel: 4.0,
    rainfallAmount: 30,
    floodDepth: 0.3,
    affectedStreets: ['McArthur Highway', 'Maysan Road', 'Karhuhan Street'],
    evacuationStatus: 'yellow',
    estimatedPeakTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
    alertLevel: 'medium',
    updatedAt: new Date()
  },
  {
    id: 'fl3',
    area: 'Navotas City',
    riverBasin: 'Navotas River',
    waterLevel: 2.8,
    criticalLevel: 3.5,
    rainfallAmount: 25,
    floodDepth: 0.2,
    affectedStreets: ['Navotas Boulevard', 'Gen. Luna St.', 'M. Naval St.'],
    evacuationStatus: 'yellow',
    estimatedPeakTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    alertLevel: 'medium',
    updatedAt: new Date()
  },
  {
    id: 'fl4',
    area: 'Pasig City',
    riverBasin: 'Pasig River',
    waterLevel: 12.0,
    criticalLevel: 13.5,
    rainfallAmount: 60,
    floodDepth: 0.8,
    affectedStreets: ['C-5 Road', 'Dr. Sixto Antonio Ave', 'E. Rodriguez Jr. Ave'],
    evacuationStatus: 'orange',
    estimatedPeakTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
    alertLevel: 'high',
    updatedAt: new Date()
  },
  {
    id: 'fl5',
    area: 'Malabon City',
    riverBasin: 'Malabon River',
    waterLevel: 2.5,
    criticalLevel: 3.0,
    rainfallAmount: 40,
    floodDepth: 0.4,
    affectedStreets: ['C. Arellano St.', 'P. Aquino St.', 'F. Sevilla St.'],
    evacuationStatus: 'yellow',
    estimatedPeakTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
    alertLevel: 'medium',
    updatedAt: new Date()
  }
];

// Fetch flood alerts (from Firestore or sample data)
export async function fetchFloodAlerts(): Promise<FloodAlert[]> {
  try {
    // Try to fetch from Firestore first
    const floodRef = collection(db, 'flood_alerts');
    const q = query(floodRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FloodAlert));
    }
    
    // If no data in Firestore, return sample data
    console.log('No flood alerts in Firestore, using sample data');
    return SAMPLE_FLOODS;
  } catch (error) {
    console.error('Error fetching flood alerts:', error);
    // Return sample data as fallback
    return SAMPLE_FLOODS;
  }
}

// Save flood alert to Firestore (for admin use)
export async function saveFloodAlert(alert: Omit<FloodAlert, 'id'>): Promise<string> {
  try {
    const floodRef = collection(db, 'flood_alerts');
    const docRef = await addDoc(floodRef, {
      ...alert,
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving flood alert:', error);
    throw error;
  }
}

// Get flood alert by area
export async function getFloodAlertByArea(area: string): Promise<FloodAlert | null> {
  try {
    const floodRef = collection(db, 'flood_alerts');
    const q = query(floodRef, where('area', '==', area));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as FloodAlert;
    }
    return null;
  } catch (error) {
    console.error('Error getting flood alert:', error);
    return null;
  }
}

// Get water level status text
export function getWaterLevelStatus(current: number, critical: number): string {
  const ratio = current / critical;
  if (ratio >= 0.9) return 'CRITICAL - Evacuate';
  if (ratio >= 0.75) return 'WARNING - Prepare to evacuate';
  if (ratio >= 0.6) return 'ALERT - Monitor closely';
  return 'NORMAL - Continue monitoring';
}

// Get color based on water level
export function getFloodStatusColor(evacuationStatus: string): string {
  switch (evacuationStatus) {
    case 'red': return '#B71C1C';
    case 'orange': return '#E07B39';
    case 'yellow': return '#F9A825';
    default: return '#2196F3';
  }
}

// Check if user's area is flood-prone
export function isAreaFloodProne(area: string, alerts: FloodAlert[]): boolean {
  return alerts.some(alert => 
    alert.area.toLowerCase().includes(area.toLowerCase()) ||
    alert.affectedStreets.some(street => 
      street.toLowerCase().includes(area.toLowerCase())
    )
  );
}