import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

/**
 * Optional Amazon Bedrock phrasing for Alexa Caretaker replies.
 * Tools still decide facts; Bedrock only rewrites speech to sound warmer.
 * If Bedrock is off or fails, the deterministic tool speech is used.
 */

let client = null;

export function isBedrockConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      (process.env.BEDROCK_MODEL_ID || "").trim()
  );
}

function getClient() {
  if (!isBedrockConfigured()) return null;
  if (client) return client;

  client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

/**
 * Rephrase caretaker facts into a short Alexa-style spoken reply.
 * @returns {{ speech: string, source: "bedrock" | "rules", model?: string }}
 */
export async function phraseCaretakerReply({
  utterance,
  toolsUsed,
  factsSpeech,
  summary,
}) {
  const bedrockClient = getClient();
  const modelId = (process.env.BEDROCK_MODEL_ID || "").trim();

  if (!bedrockClient || !modelId) {
    return { speech: factsSpeech, source: "rules" };
  }

  const system = [
    "You are Alexa Caretaker, a warm family medicine reminder assistant.",
    "Rewrite the FACTS into one short spoken reply (2–4 sentences).",
    "Keep every medicine name, time, and status exactly correct.",
    "Do not diagnose, prescribe, change doses, or give medical advice.",
    "If a dose was missed, gently suggest checking the label or a pharmacist before doubling up.",
    "Sound natural for voice. No markdown, no bullet lists, no emojis.",
  ].join(" ");

  const userContent = [
    `User said: ${utterance}`,
    `Tools used: ${(toolsUsed || []).join(", ") || "none"}`,
    `FACTS to preserve:\n${factsSpeech}`,
    summary
      ? `Today counts — taken: ${summary.taken}, due: ${summary.due}, missed: ${summary.missed}, upcoming: ${summary.upcoming}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const response = await bedrockClient.send(
      new ConverseCommand({
        modelId,
        system: [{ text: system }],
        messages: [
          {
            role: "user",
            content: [{ text: userContent }],
          },
        ],
        inferenceConfig: {
          maxTokens: 280,
          temperature: 0.4,
        },
      })
    );

    const text = response?.output?.message?.content
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      return { speech: factsSpeech, source: "rules" };
    }

    return { speech: text, source: "bedrock", model: modelId };
  } catch (err) {
    console.warn("[bedrock] Converse failed, using rules speech:", err.message);
    return { speech: factsSpeech, source: "rules", error: err.message };
  }
}
