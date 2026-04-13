
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Replace with your token. In production, store this in a secure backend and
// serve alerts as your own JSON endpoint so the token is never on the client.
export const FB_ACCESS_TOKEN = "EAAXL0JzP35ABRFrFoBIESuq3gZAjpnE9uJDveu21CBIMyPf0gG0d4ykF1OdZCB7MjGYmKZBlbDmiJUo76cAzQuA5E2UkyRPUJ4eVZB21PQ6VZA6dLAEQsNw7Dt8MuHg7YTOP8F2ZC8nHvfDaWVZCWX1ZAJfhubmikp6cvdhzvFgiOrVZAtkohCm2slZBJ4gd499CXUihKz1D0qSmO6XosShUUlz8JpZBAiBwZBPa9n4wQBLn4uWJQoobpXhJIypmAWfzZBPZC1aYCZARyw1yAcDbJ5qE2TujzFqQm7uwzdQuAEYbVypyO6E";

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

const PAGES = [
  { id: "PAGASA.DOST.GOV.PH", name: "PAGASA",   sourceType: "weather" },
  { id: "PHIVOLCS",            name: "PHIVOLCS", sourceType: "quake"  },
] as const;

const CACHE_KEY = "fb_alerts_cache";
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ─── TYPES ───────────────────────────────────────────────────────────────────
export type FBAlertType = "earthquake" | "typhoon" | "flood" | "storm" | "volcano" | "weather";

export type FBAlert = {
  id: string;
  source: "PAGASA" | "PHIVOLCS";
  type: FBAlertType;
  severity: "emergency" | "warning" | "watch" | "advisory";
  title: string;
  description: string;
  rawText: string;
  publishedAt: string; // ISO string
  permalink: string;
  icon: string;
  color: string;
  // Extracted data (when parseable)
  magnitude?: number;
  signalNumber?: number;
  depth?: number;
  location?: string;
};

type CacheEntry = {
  alerts: FBAlert[];
  fetchedAt: number;
};

// ─── KEYWORD PATTERNS ────────────────────────────────────────────────────────
const KEYWORD_MAP: Record<FBAlertType, string[]> = {
  earthquake: [
    "lindol", "earthquake", "magnitude", "seismic", "tremor",
    "aftershock", "tectonic", "richter", "mw ", "ms ", "aftershocks",
    "phivolcs earthquake bulletin",
  ],
  typhoon: [
    "bagyo", "typhoon", "tropical depression", "tropical storm",
    "psws", "signal no", "signal #", "tcws", "super typhoon",
    "intertropical convergence", "tropical cyclone wind signal",
  ],
  flood: [
    "baha", "flood", "inundation", "landslide", "lahar",
    "storm surge", "mudslide", "debris flow", "river level",
    "overflow", "dam release",
  ],
  storm: [
    "rainfall advisory", "thunderstorm", "habagat", "amihan",
    "heavy rain", "monsoon", "lightning", "shear line", "low pressure area",
    "lpa ", "rain", "gale warning",
  ],
  volcano: [
    "bulkan", "volcano", "eruption", "lava", "ashfall",
    "pyroclastic", "taal", "mayon", "kanlaon", "pinatubo",
    "alert level", "phreatic", "volcanic earthquake", "sulfur dioxide",
    "so2", "volcanic activity",
  ],
  weather: ["forecast", "weather", "temperature", "advisory", "outlook"],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function classifyText(text: string, sourceType: string): FBAlertType {
  const lower = text.toLowerCase();
  // Priority order matters — volcano/quake before generic weather
  for (const type of ["earthquake", "volcano", "typhoon", "flood", "storm", "weather"] as FBAlertType[]) {
    if (KEYWORD_MAP[type].some((kw) => lower.includes(kw))) return type;
  }
  return sourceType === "quake" ? "earthquake" : "weather";
}

function extractSeverity(text: string): FBAlert["severity"] {
  const t = text.toLowerCase();

  // Typhoon signal numbers
  const signalMatch = t.match(/signal\s*(?:no\.?|#)?\s*([1-5])/i);
  if (signalMatch) {
    const n = parseInt(signalMatch[1]);
    if (n >= 4) return "emergency";
    if (n === 3) return "warning";
    if (n === 2) return "watch";
    return "advisory";
  }

  // Earthquake magnitude
  const magMatch = t.match(/magnitude\s+(\d+(?:\.\d+)?)/i) || t.match(/mw\s+(\d+(?:\.\d+)?)/i);
  if (magMatch) {
    const m = parseFloat(magMatch[1]);
    if (m >= 7.0) return "emergency";
    if (m >= 5.5) return "warning";
    if (m >= 4.0) return "watch";
    return "advisory";
  }

  // Volcano alert levels
  const volMatch = t.match(/alert\s*level\s*(\d)/i);
  if (volMatch) {
    const l = parseInt(volMatch[1]);
    if (l >= 4) return "emergency";
    if (l >= 3) return "warning";
    if (l >= 2) return "watch";
    return "advisory";
  }

  // Text-based severity
  if (/red\s*alert|super\s*typhoon|major\s*eruption|catastrophic|evacuate\s*immediately/.test(t))
    return "emergency";
  if (/orange\s*alert|severe|destructive|warning/.test(t)) return "warning";
  if (/yellow\s*alert|moderate|caution|watch/.test(t)) return "watch";
  return "advisory";
}

function extractMagnitude(text: string): number | undefined {
  const m = text.match(/magnitude\s+(\d+(?:\.\d+)?)/i) || text.match(/mw\s+(\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : undefined;
}

function extractSignalNumber(text: string): number | undefined {
  const m = text.match(/signal\s*(?:no\.?|#)?\s*([1-5])/i);
  return m ? parseInt(m[1]) : undefined;
}

function extractDepth(text: string): number | undefined {
  const m = text.match(/depth[:\s]+(\d+(?:\.\d+)?)\s*km/i);
  return m ? parseFloat(m[1]) : undefined;
}

function extractLocation(text: string): string | undefined {
  // Common PH location patterns in bulletins
  const m = text.match(/(?:of|near|in)\s+([A-Z][a-zA-Z\s,]+(?:Province|City|Island|Bay|Sea|Strait|Region)?)/);
  return m ? m[1].trim().slice(0, 60) : undefined;
}

function getTitle(text: string, type: FBAlertType, magnitude?: number, signalNo?: number): string {
  if (type === "earthquake" && magnitude) return `M${magnitude.toFixed(1)} Earthquake`;
  if (type === "typhoon" && signalNo)     return `Typhoon Signal No. ${signalNo}`;
  if (type === "volcano")                 return "Volcano Bulletin";

  // First non-empty line, max 70 chars
  const first = text.split("\n").map((l) => l.trim()).find(Boolean) || "";
  return first.length > 70 ? first.slice(0, 67) + "…" : first || "Hazard Advisory";
}

function getIcon(type: FBAlertType): string {
  return { earthquake: "🌋", typhoon: "🌀", flood: "🌊", storm: "⚡", volcano: "🔥", weather: "🌧️" }[type];
}

function getColor(severity: FBAlert["severity"]): string {
  return { emergency: "#8B0000", warning: "#D62828", watch: "#E07B39", advisory: "#F9A825" }[severity];
}

function descriptionSnippet(text: string, maxLen = 160): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
}

// ─── MAIN SERVICE ─────────────────────────────────────────────────────────────
export const FacebookAlertService = {
  /**
   * Fetch alerts from PAGASA & PHIVOLCS Facebook pages.
   * Returns parsed FBAlert[] sorted newest first.
   * Uses AsyncStorage cache (TTL: 15 min) to avoid hammering the API.
   */
  async fetchAlerts(
    token: string = FB_ACCESS_TOKEN,
    forceRefresh = false,
    postsPerPage = 15
  ): Promise<FBAlert[]> {
    // Check cache first
    if (!forceRefresh) {
      const cached = await this._readCache();
      if (cached) return cached;
    }

    const fields = "message,created_time,permalink_url,story";
    const allAlerts: FBAlert[] = [];

    for (const page of PAGES) {
      const url = `${GRAPH_BASE}/${page.id}/posts?fields=${fields}&limit=${postsPerPage}&access_token=${token}`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[FB] HTTP ${res.status} for page ${page.name}`);
          continue;
        }
        const data = await res.json();

        if (data.error) {
          console.error(`[FB] Graph API error (${page.name}):`, data.error.message);
          continue;
        }

        for (const post of data.data ?? []) {
          const rawText: string = post.message || post.story || "";
          if (!rawText.trim()) continue;

          const type     = classifyText(rawText, page.sourceType);
          const severity = extractSeverity(rawText);
          const magnitude   = extractMagnitude(rawText);
          const signalNumber = extractSignalNumber(rawText);
          const depth       = extractDepth(rawText);
          const location    = extractLocation(rawText);

          allAlerts.push({
            id:          `fb_${post.id}`,
            source:      page.name,
            type,
            severity,
            title:       getTitle(rawText, type, magnitude, signalNumber),
            description: descriptionSnippet(rawText),
            rawText,
            publishedAt: post.created_time,
            permalink:   post.permalink_url ?? `https://www.facebook.com/${page.id}`,
            icon:        getIcon(type),
            color:       getColor(severity),
            magnitude,
            signalNumber,
            depth,
            location,
          });
        }
      } catch (err) {
        console.error(`[FB] Network error fetching ${page.name}:`, err);
      }
    }

    // Sort: severity DESC → newest first
    const SEVERITY_RANK = { emergency: 4, warning: 3, watch: 2, advisory: 1 };
    allAlerts.sort((a, b) => {
      const ds = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (ds !== 0) return ds;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    await this._writeCache(allAlerts);
    return allAlerts;
  },

  /** Map FBAlert severity → your existing color scheme */
  getSeverityColor(severity: FBAlert["severity"]): string {
    return getColor(severity);
  },

  async _readCache(): Promise<FBAlert[] | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const entry: CacheEntry = JSON.parse(raw);
      if (Date.now() - entry.fetchedAt > CACHE_TTL) return null;
      return entry.alerts;
    } catch {
      return null;
    }
  },

  async _writeCache(alerts: FBAlert[]): Promise<void> {
    try {
      const entry: CacheEntry = { alerts, fetchedAt: Date.now() };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      /* non-fatal */
    }
  },

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(CACHE_KEY);
  },
};