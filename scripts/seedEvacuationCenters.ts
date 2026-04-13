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

const evacuationCenters = [
  {
    name: "Apolinario Mabini Elementary School",
    address: "1001 Severino St, Quiapo, Manila",
    district: "Quiapo",
    latitude: 14.6014,
    longitude: 120.9859,
    type: "School",
  },
  {
    name: "Barangay 643 Hall",
    address: "Aguado Ext, San Miguel, Manila",
    district: "San Miguel",
    latitude: 14.5947,
    longitude: 120.9920,
    type: "Barangay Hall",
  },
  {
    name: "Barangay 648 Hall",
    address: "San Miguel, Manila",
    district: "San Miguel",
    latitude: 14.5942,
    longitude: 120.9870,
    type: "Barangay Hall",
  },
  {
    name: "Pio del Pilar Elementary School",
    address: "Santa Mesa, Manila",
    district: "Sta. Mesa",
    latitude: 14.6004,
    longitude: 121.0041,
    type: "School",
  },
  {
    name: "Bacood Elementary School",
    address: "614 Bacood, Santa Mesa, Manila",
    district: "Sta. Mesa",
    latitude: 14.5949,
    longitude: 121.0170,
    type: "School",
  },
  {
    name: "Balagtas Covered Court",
    address: "Balagtas St, Pandacan, Manila",
    district: "Pandacan",
    latitude: 14.5904,
    longitude: 121.0049,
    type: "Covered Court",
  },
  {
    name: "Bomarc Covered Court",
    address: "2181 Adonis, Pandacan, Manila",
    district: "Pandacan",
    latitude: 14.5869,
    longitude: 121.0049,
    type: "Covered Court",
  },
  {
    name: "Sta. Ana Elementary School",
    address: "Manuel Roxas Street, Santa Ana, Manila",
    district: "Sta. Ana",
    latitude: 14.5798,
    longitude: 121.0123,
    type: "School",
  },
  {
    name: "Fernando Amorsolo Elementary School",
    address: "2601 Old Panaderos St, Santa Ana, Manila",
    district: "Sta. Ana",
    latitude: 14.5833,
    longitude: 121.0139,
    type: "School",
  },
];

async function seedCenters() {
  try {
    console.log("Seeding evacuation centers...");
    const colRef = collection(db, "evacuation_centers");

    for (const center of evacuationCenters) {
      await addDoc(colRef, center);
      console.log(` Added: ${center.name}`);
    }

    console.log("All evacuation centers added successfully!");
    process.exit(0);
  } catch (error) {
    console.log("Error seeding centers:", error);
    process.exit(1);
  }
}

seedCenters();