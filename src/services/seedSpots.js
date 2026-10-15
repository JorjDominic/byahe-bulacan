import {
  collection,
  deleteField,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const SEED_SPOTS = [
  {
    name:         "Barasoain Church",
    municipality: "Malolos",
    category:     "Historical Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Pastillas de leche, Religious souvenirs, Historical books",
    hours:        "8:00 AM – 5:00 PM",
    rating:       4.9,
    reviews:      312,
    badge:        "National Shrine",
    lat:          14.8560,
    lng:          120.8109,
    bg:           "#f3e8fe",
    emoji:        "🏛️",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1776757232/wlid1n0kh6zmmyxvn6vs.webp",
    desc:         "A national shrine and the historic site of the Constitutional Convention of the First Philippine Republic in 1898, making the Philippines the first Asian government to promulgate a Constitution. Features a light and sound museum under the National Historical Institute.",
  },
  {
    name:         "Biak-na-Bato National Park",
    municipality: "San Miguel",
    category:     "Ecological Site",
    fee:          "₱50",
    feeNum:       50,
    pasalubong:   "Dried fish, Local honey, Woven crafts",
    hours:        "7:00 AM – 4:00 PM",
    rating:       4.9,
    reviews:      287,
    badge:        "National Park",
    lat:          15.1189,
    lng:          121.0850,
    bg:           "#e8f5ee",
    emoji:        "⛰️",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780244768/udifuqlb8viuicnch3fo.jpg",
    desc:         "A 2,118-hectare protected area and mountain hideout of Gen. Emilio Aguinaldo during the Spanish regime. Features Bahay Paniki Cave, Aguinaldo Cave, Madlum Cave, Tanggapan Cave, Tilandong Falls, hanging bridges and stunning rock formations.",
  },
  {
    name:         "Basilica Minore de Immaculada Concepcion",
    municipality: "Malolos",
    category:     "Religious Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Pastillas de leche, Religious items",
    hours:        "6:00 AM – 7:00 PM",
    rating:       4.8,
    reviews:      201,
    badge:        "Basilica",
    lat:          14.8527,
    lng:          120.8160,
    bg:           "#e8f0fe",
    emoji:        "⛪",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780244728/cnrven91d718jokbpmvs.jpg",
    desc:         "Historic church that served as the seat of power of Gen. Emilio Aguinaldo in 1896. Features the century-old Kalayaan Tree planted by Aguinaldo. Currently the seat of the Diocese of Malolos.",
  },
  {
    name:         "St. John the Baptist Church",
    municipality: "Calumpit",
    category:     "Religious Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Religious souvenirs, Local delicacies",
    hours:        "6:00 AM – 6:00 PM",
    rating:       4.7,
    reviews:      143,
    badge:        "Oldest Church",
    lat:          14.9197,
    lng:          120.7650,
    bg:           "#fff8e8",
    emoji:        "⛪",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780244670/cyync6xbgu2leiyxtyuv.jpg",
    desc:         "Built in 1572, this is the oldest church in Bulacan constructed under Augustinian priest Fr. Diego Vivar-Ordoñez. Features a historic tunnel used to hide gold and religious artifacts during the Spanish regime.",
  },
  {
    name:         "Angat Dam & Reservoir",
    municipality: "Angat",
    category:     "Ecological Site",
    fee:          "₱40",
    feeNum:       40,
    pasalubong:   "Freshwater fish, Local produce",
    hours:        "7:00 AM – 5:00 PM",
    rating:       4.2,
    reviews:      98,
    badge:        null,
    lat:          14.9284,
    lng:          121.0334,
    bg:           "#e8f9f0",
    emoji:        "🏞️",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780244566/thpvfjm1knyszgwwktwg.jpg",
    desc:         "A scenic reservoir offering picturesque views of Bulacan's natural landscape. Popular for picnics, nature photography, and peaceful getaways away from the city.",
  },
  {
    name:         "Digo's Hills",
    municipality: "Dona Remedios Trinidad",
    category:     "Other",
    fee:          "50",
    feeNum:       50,
    pasalubong:   "Decorations",
    hours:        "Open 24 hours",
    rating:       0,
    reviews:      0,
    badge:        "Viewpoint",
    lat:          15.0943692,
    lng:          121.0953873,
    bg:           "#e8f5ee",
    emoji:        "📍",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780245141/ud3b7ojegnhvcy0bqede.jpg",
    desc:         "Digo's Hills is a popular hiking and camping destination in Doña Remedios Trinidad, offering panoramic views of the Sierra Madre mountain range and an early morning sea of clouds.",
  },
  {
    name:         "Pinagrealan Cave",
    municipality: "San Miguel",
    category:     "Ecological Site",
    fee:          "₱30",
    feeNum:       30,
    pasalubong:   "Local honey, Woven crafts",
    hours:        "8:00 AM – 4:00 PM",
    rating:       4.5,
    reviews:      76,
    badge:        "Historic Cave",
    lat:          15.1250,
    lng:          121.0955,
    bg:           "#e8f5ee",
    emoji:        "🏕️",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780244492/i8pluuizsfhi0iefskvs.jpg",
    desc:         "A subterranean network of caverns extending more than a kilometer deep. Used as a camp by Katipunero Revolutionaries in 1896 and as hideout of Gen. Emilio Aguinaldo during the Filipino-American War in 1898.",
  },
  {
    name:         "Marcelo H. del Pilar Shrine",
    municipality: "Malolos",
    category:     "Historical Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Historical books, Souvenirs",
    hours:        "8:00 AM – 5:00 PM",
    rating:       4.6,
    reviews:      112,
    badge:        "National Hero",
    lat:          14.8544,
    lng:          120.8130,
    bg:           "#fef3dc",
    emoji:        "🗿",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780244412/h4nz2mqkaev9hb6tmqwv.jpg",
    desc:         "Monument honoring Marcelo H. del Pilar — patriot, writer, and editor of the revolutionary paper La Solidaridad. Under the management of the National Historical Institute.",
  },
  {
    name:         "Kakarong de Sile Shrine",
    municipality: "Pandi",
    category:     "Historical Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Local produce, Crafts",
    hours:        "8:00 AM – 5:00 PM",
    rating:       4.3,
    reviews:      54,
    badge:        "Revolution Site",
    lat:          14.8690,
    lng:          120.9561,
    bg:           "#fce8e8",
    emoji:        "🏯",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780243826/ocitzdl2ygldyjxomlgp.jpg",
    desc:         "Site of the bloodiest revolution in Bulacan where more than 3,000 Katipunero revolutionaries died. The Republic of Real de Kakarong de Sili of 1896 was established on this very ground.",
  },
  {
    name:         "Bagbag Bridge",
    municipality: "Calumpit",
    category:     "Historical Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Local delicacies",
    hours:        "Open 24 hours",
    rating:       4.1,
    reviews:      38,
    badge:        null,
    lat:          14.9178,
    lng:          120.7583,
    bg:           "#e8f0fe",
    emoji:        "🌉",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1780243509/zyquz0pxvgrn5qfoxpd7.jpg",
    desc:         "Site of the longest battle between Americans and Filipinos led by General Gregorio del Pilar on April 25, 1899. The bridge serves as a reminder of Filipino valor and triumph against American forces.",
  },
  {
    name:         "Baliuag Museum",
    municipality: "Baliuag",
    category:     "Heritage Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Historical books, Antiques",
    hours:        "8:00 AM – 5:00 PM",
    rating:       4.4,
    reviews:      67,
    badge:        null,
    lat:          14.9531,
    lng:          120.9014,
    bg:           "#fef3dc",
    emoji:        "🏺",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1777360059/fymoesriqvtgwtbpw6qj.jpg",
    desc:         "The town's center for historical and cultural heritage, housing artifacts, documents, and memorabilia that tell the story of Baliuag's rich history.",
  },
  {
    name:         "Casa Real Shrine",
    municipality: "Malolos",
    category:     "Historical Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Historical books, Souvenirs",
    hours:        "8:00 AM – 5:00 PM",
    rating:       4.5,
    reviews:      89,
    badge:        "Malolos Republic",
    lat:          14.8540,
    lng:          120.8118,
    bg:           "#f5eefe",
    emoji:        "🏛️",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1776741453/gkpuklgmkqyaysg2chub.jpg",
    desc:         "A printing press during the Malolos Republic, restored in 1852 and converted into a municipal library. Now a museum under the National Historical Institute.",
  },
  {
    name:         "Guiguinto Old Train Station",
    municipality: "Guiguinto",
    category:     "Heritage Site",
    fee:          "Free",
    feeNum:       0,
    pasalubong:   "Local delicacies, Souvenir items",
    hours:        "8:00 AM – 5:00 PM",
    rating:       4.3,
    reviews:      71,
    badge:        "Heritage Site",
    lat:          14.8358,
    lng:          120.8897,
    bg:           "#f0f0f0",
    emoji:        "🚂",
    imageUrl:     "https://res.cloudinary.com/dmd03zrwf/image/upload/v1776740750/eys6elnk7p5hbeebsrg6.jpg",
    desc:         "Built in 1896, the Estacion de Guiguinto is the town's most acclaimed historical landmark. Site where 200 Katipuneros ambushed Spaniards in 1898, inspiring the famous zarzuela 'Walang Sugat'.",
  },
];

const LEGACY_NON_ORIGINAL_SPOTS = new Set([
  "bocaue pagoda festival",
  "singkaban festival",
  "obando fertility rites festival",
]);

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function stableSpotId(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function recordScore(snapshot) {
  const value = snapshot.data();
  return (value.archived ? -100 : 0)
    + (value.imageUrl ? 10 : 0)
    + (value.mapsLink ? 5 : 0)
    + (Number(value.reviews) || 0) / 1000;
}

export async function seedSpots() {
  try {
    const spotsRef = collection(db, "spots");
    const existing = await getDocs(spotsRef);
    const byName = new Map();
    existing.docs.forEach((snapshot) => {
      const key = normalizeName(snapshot.data().name);
      const group = byName.get(key) || [];
      group.push(snapshot);
      byName.set(key, group);
    });

    const batch = writeBatch(db);

    // These three entries came from the placeholder seed but were not part of
    // the original production catalog. Archive them reversibly if present.
    existing.docs.forEach((snapshot) => {
      if (LEGACY_NON_ORIGINAL_SPOTS.has(normalizeName(snapshot.data().name))) {
        batch.update(snapshot.ref, {
          archived: true,
          archivedReason: "not-in-original-catalog",
          updatedAt: serverTimestamp(),
        });
      }
    });

    SEED_SPOTS.forEach((spot) => {
      const matches = [...(byName.get(normalizeName(spot.name)) || [])]
        .sort((left, right) => recordScore(right) - recordScore(left));
      const winnerRef = matches[0]?.ref || doc(db, "spots", stableSpotId(spot.name));

      batch.set(winnerRef, {
        ...spot,
        id: winnerRef.id,
        archived: false,
        archivedReason: deleteField(),
        updatedAt: serverTimestamp(),
        ...(matches.length === 0 ? { createdAt: serverTimestamp() } : {}),
      }, { merge: true });

      // Keep duplicate documents for audit/recovery, but hide them from users.
      matches.slice(1).forEach((snapshot) => {
        batch.update(snapshot.ref, {
          archived: true,
          archivedReason: `duplicate-of:${winnerRef.id}`,
          updatedAt: serverTimestamp(),
        });
      });
    });

    await batch.commit();
    console.log("🎉 Migrated", SEED_SPOTS.length, "original spots with images.");
    return true;
  } catch (err) {
    console.error("Seed error:", err.message);
    return false;
  }
}
