/**
 * Demo household: parent caretaker watching Mom’s medicines.
 * Times are local HH:mm for today’s checklist.
 */
export const DEMO_HOUSEHOLD_ID = "demo-home";

export const seedHousehold = {
  householdId: DEMO_HOUSEHOLD_ID,
  caretakerName: "You (parent / family caretaker)",
  patientName: "Mom",
  medicines: [
    {
      id: "med-amox",
      name: "Amoxicillin",
      dose: "1 capsule",
      times: ["08:00", "20:00"],
      withFood: true,
      notes: "Antibiotic course — finish all doses",
    },
    {
      id: "med-bp",
      name: "Amlodipine",
      dose: "5 mg",
      times: ["09:00"],
      withFood: false,
      notes: "Blood pressure — morning",
    },
    {
      id: "med-vitd",
      name: "Vitamin D",
      dose: "1 tablet",
      times: ["20:00"],
      withFood: true,
      notes: "Evening vitamin",
    },
  ],
  /** Dose logs: { id, medicineId, medicineName, date, time, status, loggedAt } */
  doseLogs: [],
};
