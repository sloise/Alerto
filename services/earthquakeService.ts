import { addDoc, collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ── Philippines bounding box ───────────────────────────────────
const USGS_URL =
  "https://earthquake.usgs.gov/fdsnws/event/1/query?" +
  "format=geojson" +
  "&minmagnitude=2.5" +
  "&minlatitude=4.5" +
  "&maxlatitude=21.5" +
  "&minlongitude=116.0" +
  "&maxlongitude=127.0" +
  "&orderby=time" +
  "&limit=10";

// ── Fetch from USGS and save to Firestore ──────────────────────
export async function fetchAndSaveEarthquakes() {
  try {
    console.log("🌍 Fetching earthquakes from USGS...");

    const response = await fetch(USGS_URL);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.log("No earthquakes found.");
      return [];
    }

    // ── Clear old data first ───────────────────────────────────
    const colRef = collection(db, "earthquake_alerts");
    const existing = await getDocs(colRef);
    for (const document of existing.docs) {
      await deleteDoc(doc(db, "earthquake_alerts", document.id));
    }

    // ── Save new data ──────────────────────────────────────────
    const saved = [];
    for (const feature of data.features) {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      const earthquake = {
        title: props.title,
        magnitude: props.mag,
        location: props.place,
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2],
        timestamp: new Date(props.time).toISOString(),
        source: "USGS",
      };

      await addDoc(colRef, earthquake);
      saved.push(earthquake);
    }

    console.log(`✅ Saved ${saved.length} earthquakes to Firestore!`);
    return saved;

  } catch (error) {
    console.log("❌ Error fetching earthquakes:", error);
    return [];
  }
}

// ── Read earthquakes from Firestore ───────────────────────────
export async function getEarthquakesFromFirestore() {
  try {
    const colRef = collection(db, "earthquake_alerts");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.log("❌ Error reading earthquakes:", error);
    return [];
  }
}