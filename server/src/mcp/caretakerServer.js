import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runTool } from "../tools/runTools.js";

const medicineArgs = {
  medicineName: z
    .string()
    .optional()
    .describe("Medicine name, for example Amoxicillin or Vitamin D"),
  time: z
    .string()
    .optional()
    .describe("Dose time as HH:MM, for example 08:00 or 20:00"),
};

/**
 * Turn a caretaker tool result into an MCP tool response.
 * Speech stays on the rules voice. Bedrock is not called from this path.
 */
async function caretakerToolResult(tool, args) {
  const result = await runTool(tool, args || {});
  const speech = result.speech || "Done.";
  return {
    content: [{ type: "text", text: speech }],
    structuredContent: {
      speech,
      tool: result.tool,
      summary: result.summary || null,
    },
  };
}

/**
 * Build one MCP server for a single Streamable HTTP session.
 * A new instance is connected per session so transports do not share state.
 */
export function createCaretakerMcpServer() {
  const server = new McpServer({
    name: "alexa-caretaker",
    version: "1.0.0",
  });

  server.registerTool(
    "list_today_doses",
    {
      description:
        "List today's medicine doses for the household patient, including which are due, taken, missed, or upcoming.",
      inputSchema: {},
    },
    async () => caretakerToolResult("list_today_doses", {})
  );

  server.registerTool(
    "mark_taken",
    {
      description: "Log a scheduled dose as taken for the household patient.",
      inputSchema: medicineArgs,
    },
    async (args) => caretakerToolResult("mark_taken", args)
  );

  server.registerTool(
    "mark_missed",
    {
      description: "Log a scheduled dose as missed and flag it for the caretaker.",
      inputSchema: medicineArgs,
    },
    async (args) => caretakerToolResult("mark_missed", args)
  );

  server.registerTool(
    "caretaker_summary",
    {
      description:
        "Summarize whether the patient took, missed, or still owes today's medicines.",
      inputSchema: {},
    },
    async () => caretakerToolResult("caretaker_summary", {})
  );

  server.registerTool(
    "next_due",
    {
      description: "Return the next medicine that is due now or coming up today.",
      inputSchema: {},
    },
    async () => caretakerToolResult("next_due", {})
  );

  server.registerTool(
    "add_medicine",
    {
      description: "Add a medicine and a dose time to the household schedule.",
      inputSchema: {
        name: z.string().describe("Medicine name to add"),
        time: z.string().optional().describe("Dose time as HH:MM"),
        dose: z.string().optional().describe("Dose label, for example 1 tablet"),
        withFood: z.boolean().optional().describe("True when the dose should be taken with food"),
      },
    },
    async (args) => caretakerToolResult("add_medicine", args)
  );

  return server;
}
