const MCP_URL = "/mcp";
const PROTOCOL = "2025-11-25";

let sessionId = null;
let nextId = 1;
let toolNames = [];

function rpcId() {
  nextId += 1;
  return nextId;
}

/**
 * Read a Streamable HTTP response that is either JSON or an SSE event.
 */
async function readRpc(res) {
  const type = res.headers.get("content-type") || "";
  if (res.status === 202) return null;

  const raw = await res.text();
  if (!raw.trim()) return null;

  if (type.includes("text/event-stream")) {
    const dataLines = raw
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);
    const last = dataLines[dataLines.length - 1];
    return last ? JSON.parse(last) : null;
  }

  return JSON.parse(raw);
}

/**
 * POST one JSON-RPC message to the caretaker MCP server.
 */
async function postRpc(message, { session } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (session) {
    headers["MCP-Protocol-Version"] = PROTOCOL;
    headers["Mcp-Session-Id"] = session;
  }

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });

  const returnedSession = res.headers.get("mcp-session-id");
  const body = await readRpc(res);
  if (!res.ok) {
    const messageText = body?.error?.message || `MCP request failed (${res.status})`;
    const error = new Error(messageText);
    error.status = res.status;
    throw error;
  }
  if (body?.error) {
    throw new Error(body.error.message || "MCP error");
  }
  return { body, sessionId: returnedSession };
}

function resetSession() {
  sessionId = null;
  toolNames = [];
}

/**
 * Open a session: initialize, notifications/initialized, then tools/list.
 */
export async function connectCaretakerMcp() {
  resetSession();

  const init = await postRpc({
    jsonrpc: "2.0",
    id: rpcId(),
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: "alexa-caretaker-web", version: "1.0.0" },
    },
  });

  sessionId = init.sessionId;
  if (!sessionId) {
    throw new Error("MCP server did not return a session id");
  }

  // Required handshake before tools/list or tools/call.
  await postRpc(
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { session: sessionId }
  );

  const listed = await postRpc(
    { jsonrpc: "2.0", id: rpcId(), method: "tools/list", params: {} },
    { session: sessionId }
  );

  toolNames = (listed.body?.result?.tools || []).map((tool) => tool.name);
  return { sessionId, tools: toolNames };
}

export function getMcpToolNames() {
  return toolNames;
}

/**
 * Call one caretaker tool. Reconnects once if the server forgot the session.
 */
export async function callCaretakerTool(name, args = {}) {
  if (!sessionId) await connectCaretakerMcp();

  const payload = {
    jsonrpc: "2.0",
    id: rpcId(),
    method: "tools/call",
    params: { name, arguments: args },
  };

  let response;
  try {
    response = await postRpc(payload, { session: sessionId });
  } catch (err) {
    if (err.status !== 404) throw err;
    await connectCaretakerMcp();
    response = await postRpc(payload, { session: sessionId });
  }

  const result = response.body?.result || {};
  const text = (result.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ");
  const structured = result.structuredContent || {};

  return {
    speech: structured.speech || text,
    tool: structured.tool || name,
    summary: structured.summary || null,
    isError: Boolean(result.isError),
  };
}
