import "dotenv/config";
import { connectDb, isMongoReady } from "./db.js";
import { Household } from "./models/Household.js";
import { DEMO_HOUSEHOLD_ID, seedHousehold } from "./data/seedHousehold.js";
import { resetMemoryStore } from "./store/memoryStore.js";

async function seed() {
  const usingMongo = await connectDb(process.env.MONGO_URI);
  if (!usingMongo || !isMongoReady()) {
    resetMemoryStore();
    console.log("[seed] In-memory household ready:", DEMO_HOUSEHOLD_ID);
    process.exit(0);
  }

  await Household.findOneAndUpdate(
    { householdId: DEMO_HOUSEHOLD_ID },
    { $set: seedHousehold },
    { upsert: true, new: true }
  );
  console.log("[seed] MongoDB household ready:", DEMO_HOUSEHOLD_ID);
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
