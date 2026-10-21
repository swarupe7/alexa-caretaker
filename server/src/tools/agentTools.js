import {
  loadHousehold,
  saveHousehold,
  todayKey,
} from "../services/householdRepository.js";
import {
  buildTodayDoses,
  findDose,
  summarizeCaretaker,
} from "../services/schedule.js";

function newLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Upsert a dose log for today.
 */
async function setDoseStatus(medicineId, time, status) {
  const household = await loadHousehold();
  const med = (household.medicines || []).find((m) => m.id === medicineId);
  if (!med) {
    return { ok: false, speech: "I couldn’t find that medicine.", household };
  }

  const date = todayKey();
  household.doseLogs = household.doseLogs || [];
  const existing = household.doseLogs.findIndex(
    (l) => l.medicineId === medicineId && l.date === date && l.time === time
  );

  const entry = {
    id: existing >= 0 ? household.doseLogs[existing].id : newLogId(),
    medicineId,
    medicineName: med.name,
    date,
    time,
    status,
    loggedAt: new Date(),
  };

  if (existing >= 0) household.doseLogs[existing] = entry;
  else household.doseLogs.push(entry);

  const saved = await saveHousehold(household);
  return { ok: true, entry, household: saved, med };
}

export async function listTodayDoses() {
  const household = await loadHousehold();
  const doses = buildTodayDoses(household);
  const due = doses.filter((d) => d.status === "due");
  const upcoming = doses.filter((d) => d.status === "upcoming");

  let speech = `Today for ${household.patientName}: ${doses.length} doses scheduled.`;
  if (due.length) {
    speech += ` Due now: ${due
      .map((d) => `${d.medicineName} at ${d.time}`)
      .join(", ")}.`;
  }
  if (upcoming.length) {
    speech += ` Coming up: ${upcoming
      .slice(0, 3)
      .map((d) => `${d.medicineName} at ${d.time}`)
      .join(", ")}.`;
  }
  if (!due.length && !upcoming.length) {
    speech += " All of today’s doses are already logged.";
  }

  return {
    tool: "list_today_doses",
    speech,
    data: { doses, summary: summarizeCaretaker(household) },
    household,
  };
}

export async function markTaken(options = {}) {
  const household = await loadHousehold();
  const dose =
    options.medicineId && options.time
      ? buildTodayDoses(household).find(
          (d) =>
            d.medicineId === options.medicineId && d.time === options.time
        )
      : findDose(household, options.medicineName || options.name, options.time);

  if (!dose) {
    return {
      tool: "mark_taken",
      speech:
        "I couldn’t match that dose. Say the medicine name, like “mark Amoxicillin as taken.”",
      data: {},
      household,
    };
  }

  const result = await setDoseStatus(dose.medicineId, dose.time, "taken");
  const foodNote = dose.withFood ? " Remember it was meant with food." : "";

  return {
    tool: "mark_taken",
    speech: `Logged ${dose.medicineName} (${dose.dose}) at ${dose.time} as taken for ${result.household.patientName}.${foodNote}`,
    data: { entry: result.entry, summary: summarizeCaretaker(result.household) },
    household: result.household,
  };
}

export async function markMissed(options = {}) {
  const household = await loadHousehold();
  const dose =
    options.medicineId && options.time
      ? buildTodayDoses(household).find(
          (d) =>
            d.medicineId === options.medicineId && d.time === options.time
        )
      : findDose(household, options.medicineName || options.name, options.time);

  if (!dose) {
    return {
      tool: "mark_missed",
      speech:
        "I couldn’t match that dose. Try “I missed the evening Vitamin D.”",
      data: {},
      household,
    };
  }

  const result = await setDoseStatus(dose.medicineId, dose.time, "missed");

  return {
    tool: "mark_missed",
    speech: `Marked ${dose.medicineName} at ${dose.time} as missed. I’ve flagged this for the caretaker checklist — don’t double-dose without checking the label or a pharmacist.`,
    data: { entry: result.entry, summary: summarizeCaretaker(result.household) },
    household: result.household,
  };
}

export async function caretakerSummary() {
  const household = await loadHousehold();
  const summary = summarizeCaretaker(household);

  let speech = `Caretaker update for ${summary.patientName}: ${summary.taken} taken, ${summary.due} due, ${summary.missed} missed, ${summary.upcoming} still upcoming.`;
  if (summary.dueList.length) {
    speech += ` Needs attention now: ${summary.dueList
      .map((d) => `${d.medicineName} (${d.time})`)
      .join(", ")}.`;
  }
  if (summary.missedList.length) {
    speech += ` Missed earlier: ${summary.missedList
      .map((d) => `${d.medicineName} (${d.time})`)
      .join(", ")}.`;
  }
  if (!summary.dueList.length && !summary.missedList.length) {
    speech += " Nothing overdue right now.";
  }

  return {
    tool: "caretaker_summary",
    speech,
    data: { summary },
    household,
  };
}

export async function nextDue() {
  const household = await loadHousehold();
  const summary = summarizeCaretaker(household);
  const next = summary.dueList[0] || summary.nextUp;

  if (!next) {
    return {
      tool: "next_due",
      speech: `No remaining doses for ${household.patientName} today.`,
      data: { next: null, summary },
      household,
    };
  }

  const urgency = next.status === "due" ? "is due now" : `is next at ${next.time}`;
  return {
    tool: "next_due",
    speech: `${next.medicineName} (${next.dose}) ${urgency} for ${household.patientName}.${
      next.withFood ? " Take with food." : ""
    } Say “mark it taken” or “mark it missed.”`,
    data: { next, summary },
    household,
  };
}

/**
 * Simple add medicine for demo (name + one or two times).
 */
export async function addMedicine(options = {}) {
  const household = await loadHousehold();
  const name = String(options.name || "").trim();
  if (!name) {
    return {
      tool: "add_medicine",
      speech: "Tell me the medicine name to add, for example “add medicine Ibuprofen at 14:00.”",
      data: {},
      household,
    };
  }

  const times = Array.isArray(options.times) && options.times.length
    ? options.times
    : [options.time || "12:00"];

  const med = {
    id: `med-${Date.now()}`,
    name,
    dose: options.dose || "1 dose",
    times,
    withFood: Boolean(options.withFood),
    notes: options.notes || "Added via Alexa",
  };

  household.medicines = household.medicines || [];
  household.medicines.push(med);
  const saved = await saveHousehold(household);

  return {
    tool: "add_medicine",
    speech: `Added ${med.name} (${med.dose}) for ${saved.patientName} at ${med.times.join(" and ")}. I’ll include it on today’s checklist.`,
    data: { medicine: med },
    household: saved,
  };
}

export const TOOL_CATALOG = [
  "list_today_doses",
  "mark_taken",
  "mark_missed",
  "caretaker_summary",
  "next_due",
  "add_medicine",
];
