import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    dose: String,
    times: [String],
    withFood: Boolean,
    notes: String,
  },
  { _id: false }
);

const doseLogSchema = new mongoose.Schema(
  {
    id: String,
    medicineId: String,
    medicineName: String,
    date: String,
    time: String,
    status: { type: String, enum: ["taken", "missed", "skipped"] },
    loggedAt: Date,
  },
  { _id: false }
);

const householdSchema = new mongoose.Schema(
  {
    householdId: { type: String, required: true, unique: true },
    caretakerName: String,
    patientName: String,
    medicines: [medicineSchema],
    doseLogs: [doseLogSchema],
  },
  { timestamps: true }
);

export const Household = mongoose.model("Household", householdSchema);
