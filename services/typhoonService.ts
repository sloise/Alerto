import { db } from "../firebaseConfig";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

const GDACS_URL = "https://www.gdacs.org/xml/rss.xml";

// ── Parse XML string into usable object ───────────────────────
function parseXML(xml: string) {
  const items: any[] = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);

  if (!itemMatches) return items;

  for (const item of itemMatches) {
    const get = (tag: string) => {
      const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`));
      return match ? match[1].trim() : "";
    };

    const eventType = get("gdacs:eventtype");

    // ── Only keep typhoon/cyclone events ──────────────────────
    if (eventType !== "TC") continue;

    // ── Only keep Philippines-related events ──────────────────
    const title = get("title");
    const description = get("description");
    const country = get("gdacs:country");

    const isPhilippines =
      country.toLowerCase().includes("philippines") ||
      title.toLowerCase().includes("philippines") ||
      description.toLowerCase().includes("philippines");

    if (!isPhilippines) continue;

    items.push({
      title: title || "Typhoon Alert",
      description: description || "No description available",
      severity: get("gdacs:alertlevel") || "Unknown",
      location: country || "Philippines",
      timestamp: get("pubDate") || new Date().toISOString(),
      source: "GDACS",
    });
  }

  return items;
}

// ── Fetch from GDACS and save to Firestore ─────────────────────
export async function fetchAndSaveTyphoons() {
  try {
    console.log("🌀 Fetching typhoons from GDACS...");

    const response = await fetch(GDACS_URL);
    const xml = await response.text();
    const typhoons = parseXML(xml);

    // ── Clear old data ─────────────────────────────────────────
    const colRef = collection(db, "typhoon_alerts");
    const existing = await getDocs(colRef);
    for (const document of existing.docs) {
      await deleteDoc(doc(db, "typhoon_alerts", document.id));
    }

    if (typhoons.length === 0) {
      console.log("🌀 No active typhoons affecting Philippines right now.");
      return [];
    }

    // ── Save new data ──────────────────────────────────────────
    for (const typhoon of typhoons) {
      await addDoc(colRef, typhoon);
    }

    console.log(`✅ Saved ${typhoons.length} typhoon alerts to Firestore!`);
    return typhoons;

  } catch (error) {
    console.log("❌ Error fetching typhoons:", error);
    return [];
  }
}

// ── Read typhoons from Firestore ───────────────────────────────
export async function getTyphooonsFromFirestore() {
  try {
    const colRef = collection(db, "typhoon_alerts");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.log("❌ Error reading typhoons:", error);
    return [];
  }
}