import {
  listTodayDoses,
  markTaken,
  markMissed,
  caretakerSummary,
  nextDue,
  addMedicine,
  TOOL_CATALOG,
} from "./agentTools.js";
import { parseIntent } from "./intentParser.js";
import { summarizeCaretaker } from "../services/schedule.js";
import {
  isBedrockConfigured,
  phraseCaretakerReply,
} from "../services/bedrock.js";

const HELP_SPEECH =
  "I’m Alexa Caretaker. Try: what’s due today; mark Amoxicillin as taken; I missed the evening Vitamin D; did Mom take her medicines?";

const RUNNERS = {
  list_today_doses: (args) => listTodayDoses(args),
  mark_taken: (args) => markTaken(args),
  mark_missed: (args) => markMissed(args),
  caretaker_summary: (args) => caretakerSummary(args),
  next_due: (args) => nextDue(args),
  add_medicine: (args) => addMedicine(args),
};

export async function runTool(tool, args = {}) {
  const runner = RUNNERS[tool];
  if (!runner) {
    return { ok: false, tool, speech: `Unknown tool: ${tool}`, data: {} };
  }
  const result = await runner(args);
  return {
    ok: true,
    tool: result.tool,
    speech: result.speech,
    data: result.data,
    household: result.household,
    summary: result.household
      ? summarizeCaretaker(result.household)
      : null,
  };
}

export async function runFromUtterance(text) {
  const intents = parseIntent(text);
  const steps = [];
  let latest = null;

  for (const intent of intents) {
    if (intent.tool === "help") {
      steps.push({
        ok: true,
        tool: "help",
        speech: HELP_SPEECH,
        data: { catalog: TOOL_CATALOG },
      });
      continue;
    }
    const result = await runTool(intent.tool, intent.args);
    steps.push(result);
    if (result.household) latest = result.household;
  }

  const factsSpeech = steps
    .map((s) => s.speech)
    .filter(Boolean)
    .join(" ");

  const summary = latest ? summarizeCaretaker(latest) : null;
  const toolsUsed = steps.map((s) => s.tool);

  // Bedrock only rewrites tone; tool facts stay the source of truth
  const phrased = await phraseCaretakerReply({
    utterance: text,
    toolsUsed,
    factsSpeech,
    summary,
  });

  return {
    ok: true,
    utterance: text,
    toolsUsed,
    steps,
    speech: phrased.speech,
    speechSource: phrased.source,
    bedrockModel: phrased.model || null,
    bedrockEnabled: isBedrockConfigured(),
    household: latest,
    summary,
  };
}

/**
 * Choose tool names for an utterance without running them.
 * The web page sends the chosen calls through MCP tools/call.
 */
export function planUtterance(text) {
  const intents = parseIntent(text);
  const helpOnly = intents.length === 1 && intents[0].tool === "help";
  if (helpOnly) {
    return { calls: [], helpSpeech: HELP_SPEECH };
  }

  return {
    calls: intents
      .filter((intent) => intent.tool !== "help")
      .map((intent) => ({ tool: intent.tool, args: intent.args || {} })),
    helpSpeech: null,
  };
}

export { TOOL_CATALOG };
