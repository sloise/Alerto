import { apiService } from "./APIService";

export async function fetchAndSaveTyphoons() {
  try {
    const alerts = await apiService.getRealWeatherAlerts(12.8797, 121.7740);
    const typhoons = alerts.filter((a: any) => a.type === "typhoon");
    console.log("Typhoons fetched:", typhoons.length);
    return typhoons;
  } catch (error) {
    console.error("fetchAndSaveTyphoons error:", error);
    return [];
  }
}
