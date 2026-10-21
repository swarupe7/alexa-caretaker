import { todayKey, nowHHMM } from "./householdRepository.js";

/**
 * Expand medicines into today’s dose slots with status from logs.
 */
export function buildTodayDoses(household, when = new Date()) {
  const date = todayKey(when);
  const now = nowHHMM(when);
  const logs = (household.doseLogs || []).filter((l) => l.date === date);

  const doses = [];
  for (const med of household.medicines || []) {
    for (const time of med.times || []) {
      const log = logs.find(
        (l) => l.medicineId === med.id && l.time === time
      );
      let status = "upcoming";
      if (log) status = log.status;
      else if (time <= now) status = "due";

      doses.push({
        key: `${med.id}@${time}`,
        medicineId: med.id,
        medicineName: med.name,
        dose: med.dose,
        time,
        date,
        withFood: med.withFood,
        notes: med.notes,
        status,
        loggedAt: log?.loggedAt || null,
      });
    }
  }

  doses.sort((a, b) => a.time.localeCompare(b.time));
  return doses;
}

export function summarizeCaretaker(household, when = new Date()) {
  const doses = buildTodayDoses(household, when);
  const taken = doses.filter((d) => d.status === "taken");
  const missed = doses.filter((d) => d.status === "missed");
  const skipped = doses.filter((d) => d.status === "skipped");
  const due = doses.filter((d) => d.status === "due");
  const upcoming = doses.filter((d) => d.status === "upcoming");

  return {
    patientName: household.patientName,
    date: todayKey(when),
    total: doses.length,
    taken: taken.length,
    missed: missed.length,
    skipped: skipped.length,
    due: due.length,
    upcoming: upcoming.length,
    dueList: due,
    missedList: missed,
    nextUp: upcoming[0] || null,
    doses,
  };
}

export function findDose(household, medicineHint, timeHint, when = new Date()) {
  const doses = buildTodayDoses(household, when);
  const hint = String(medicineHint || "").toLowerCase();

  let pool = doses;
  if (hint) {
    pool = doses.filter((d) =>
      d.medicineName.toLowerCase().includes(hint)
    );
  }

  if (timeHint) {
    const t = String(timeHint);
    const timed = pool.filter((d) => d.time === t || d.time.startsWith(t));
    if (timed.length) return timed[0];
  }

  // Prefer due, then upcoming, then any
  return (
    pool.find((d) => d.status === "due") ||
    pool.find((d) => d.status === "upcoming") ||
    pool[0] ||
    null
  );
}
