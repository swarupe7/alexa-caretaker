/**
 * Map caretaker utterances → Alexa Caretaker tools.
 */

export function parseIntent(rawText) {
  // Demo chips use a curly apostrophe in “What’s”.
  const text = String(rawText || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .trim();
  if (!text) return [{ tool: "help", args: {} }];

  const calls = [];

  // Add medicine
  const addMatch = text.match(
    /add (medicine |med )?([a-z0-9\s-]+?)(?:\s+at\s+(\d{1,2}:\d{2}))?$/i
  );
  if (/^add (medicine|med)\b/.test(text) || /^add [a-z]/.test(text) && /medicine|med /.test(text)) {
    const namePart =
      text.replace(/^add (medicine |med )?/i, "").replace(/\s+at\s+\d{1,2}:\d{2}.*$/i, "").trim();
    const timePart = text.match(/at\s+(\d{1,2}:\d{2})/);
    calls.push({
      tool: "add_medicine",
      args: {
        name: namePart || "New medicine",
        time: timePart ? timePart[1] : "12:00",
      },
    });
    return calls;
  }

  // Caretaker summary
  if (
    /did (mom|she|he|they) take|caretaker|how is (mom|she)|medicine(s)? (status|update)|any missed|adherence/.test(
      text
    )
  ) {
    calls.push({ tool: "caretaker_summary", args: {} });
  }

  // List today
  if (
    /what('?s| is) due|today('?s)? (doses|medicines|meds|schedule)|list (today|medicines|doses)|what (does|should) (mom|she) (take|need)/.test(
      text
    )
  ) {
    calls.push({ tool: "list_today_doses", args: {} });
  }

  // Next due / reminder
  if (
    /what('?s| is) next|remind|time for medicine|next dose|due now/.test(text)
  ) {
    calls.push({ tool: "next_due", args: {} });
  }

  // Mark taken
  const isTaken =
    /mark .+ (as )?taken|took (the |my |her |his )?|taken|yes,? i took|log .+ taken/.test(
      text
    );
  if (isTaken && !/missed/.test(text)) {
    const name = extractMedicineName(text);
    calls.push({
      tool: "mark_taken",
      args: { medicineName: name, time: extractTime(text) },
    });
  }

  // Mark missed
  if (/missed|mark .+ (as )?missed|didn'?t take|forgot/.test(text)) {
    const name = extractMedicineName(text);
    calls.push({
      tool: "mark_missed",
      args: { medicineName: name, time: extractTime(text) },
    });
  }

  // Deduplicate
  const seen = new Set();
  const unique = [];
  for (const c of calls) {
    if (seen.has(c.tool)) continue;
    seen.add(c.tool);
    unique.push(c);
  }

  if (unique.length === 0) return [{ tool: "help", args: {} }];
  return unique;
}

function extractTime(text) {
  const m = text.match(/\b(\d{1,2}:\d{2})\b/);
  if (m) return m[1].padStart(5, "0");
  if (/evening|night|20:00/.test(text)) return "20:00";
  if (/morning|08:00|9 ?am/.test(text)) return "08:00";
  return undefined;
}

function extractMedicineName(text) {
  const known = ["amoxicillin", "amlodipine", "vitamin d", "vitamin"];
  for (const k of known) {
    if (text.includes(k)) {
      if (k === "vitamin") return "Vitamin D";
      return k;
    }
  }
  const m = text.match(
    /(?:mark|took|missed|log)\s+(?:the\s+)?([a-z0-9\s-]+?)(?:\s+as\s+|\s+at\s+|$)/i
  );
  if (m) return m[1].replace(/\b(evening|morning|medicine|dose)\b/g, "").trim();
  return undefined;
}
