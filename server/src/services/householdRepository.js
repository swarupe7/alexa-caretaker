import { isMongoReady } from "../db.js";
import { Household } from "../models/Household.js";
import {
  DEMO_HOUSEHOLD_ID,
  seedHousehold,
} from "../data/seedHousehold.js";
import {
  getMemoryHousehold,
  resetMemoryStore,
  setMemoryHousehold,
} from "../store/memoryStore.js";

function toPlain(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === "function") return doc.toObject();
  return structuredClone(doc);
}

export async function loadHousehold(id = DEMO_HOUSEHOLD_ID) {
  if (isMongoReady()) {
    let doc = await Household.findOne({ householdId: id });
    if (!doc) {
      doc = await Household.create(structuredClone(seedHousehold));
    }
    return toPlain(doc);
  }

  let mem = getMemoryHousehold(id);
  if (!mem) mem = resetMemoryStore();
  return structuredClone(mem);
}

export async function saveHousehold(household) {
  if (isMongoReady()) {
    const doc = await Household.findOneAndUpdate(
      { householdId: household.householdId || DEMO_HOUSEHOLD_ID },
      { $set: household },
      { upsert: true, new: true }
    );
    return toPlain(doc);
  }
  return setMemoryHousehold(structuredClone(household));
}

export async function resetHousehold() {
  if (isMongoReady()) {
    const doc = await Household.findOneAndUpdate(
      { householdId: DEMO_HOUSEHOLD_ID },
      { $set: structuredClone(seedHousehold) },
      { upsert: true, new: true }
    );
    return toPlain(doc);
  }
  return resetMemoryStore();
}

export function storageLabel() {
  return isMongoReady() ? "mongodb" : "memory";
}

/** Local calendar date YYYY-MM-DD */
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Current local HH:mm */
export function nowHHMM(d = new Date()) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
