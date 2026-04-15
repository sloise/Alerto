import { apiService } from "./APIService";

export async function fetchAndSaveEarthquakes() {
  try {
    const earthquakes = await apiService.getRealEarthquakes();
    if (!earthquakes || earthquakes.length === 0) return [];
    console.log("Earthquakes fetched:", earthquakes.length);
    return earthquakes;
  } catch (error) {
    console.error("fetchAndSaveEarthquakes error:", error);
    return [];
  }
}
