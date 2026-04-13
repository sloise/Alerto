import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDw2xetPJBsBMFrHcsk7VCE0912Ht9yZkA",
  authDomain: "alerto-app-85298.firebaseapp.com",
  projectId: "alerto-app-85298",
  storageBucket: "alerto-app-85298.firebasestorage.app",
  messagingSenderId: "374289377107",
  appId: "1:374289377107:web:2709c560559b954c0623a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const newCenters = [
  // ── Mandaluyong ───────────────────────────────────────────
  {
    name: "Mandaluyong Evacuation Center",
    address: "22 Acacia Ln, Mandaluyong City",
    district: "Mandaluyong",
    latitude: 14.5868,
    longitude: 121.0351,
    type: "Evacuation Center",
  },
  {
    name: "Barangay Mabini-J.Rizal Covered Court",
    address: "J.P. Rizal, Mandaluyong City",
    district: "Mandaluyong",
    latitude: 14.5858,
    longitude: 121.0210,
    type: "Covered Court",
  },
  {
    name: "Brgy. Hagdan Bato Itaas Covered Court",
    address: "A. Bonifacio, Mandaluyong City",
    district: "Mandaluyong",
    latitude: 14.5881,
    longitude: 121.0327,
    type: "Covered Court",
  },
  {
    name: "Malamig Barangay Hall",
    address: "555 Cresta, Mandaluyong City",
    district: "Mandaluyong",
    latitude: 14.5752,
    longitude: 121.0466,
    type: "Barangay Hall",
  },

  // ── Navotas ───────────────────────────────────────────────
  {
    name: "Navotas Rescue Center",
    address: "C-3 Dalagang Bukid St, Navotas",
    district: "Navotas",
    latitude: 14.6449,
    longitude: 120.9622,
    type: "Rescue Center",
  },
  {
    name: "NBBS Kaunlaran Barangay Hall",
    address: "Lapu-Lapu Ave, Navotas",
    district: "Navotas",
    latitude: 14.6469,
    longitude: 120.9547,
    type: "Barangay Hall",
  },
  {
    name: "Barangay Daanghari Hall",
    address: "E Alonzo St, Navotas",
    district: "Navotas",
    latitude: 14.6688,
    longitude: 120.9411,
    type: "Barangay Hall",
  },
  {
    name: "Navotas Elementary School - Central",
    address: "Los Martires St, Navotas",
    district: "Navotas",
    latitude: 14.6624,
    longitude: 120.9440,
    type: "School",
  },
];

async function seedNewCenters() {
  try {
    console.log("Adding Mandaluyong and Navotas centers...");
    const colRef = collection(db, "evacuation_centers");

    for (const center of newCenters) {
      await addDoc(colRef, center);
    console.log(`✅ Added: ${center.name}`);
    }

    console.log("ll new centers added successfully!");
    process.exit(0);
  } catch (error) {
    console.log("Error:", error);
    process.exit(1);
  }
}

seedNewCenters();