import { randomUUID } from "node:crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createCaretakerMcpServer } from "./caretakerServer.js";

export const MCP_PROTOCOL = "2025-11-25";
export const MCP_PATH = "/mcp";

// One Streamable HTTP transport per MCP session.
const sessions = new Map();

function jsonRpcError(res, status, code, message) {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}

/**
 * Mount the caretaker MCP endpoint on the existing Express app.
 * Clients POST JSON-RPC: initialize, then tools/list, then tools/call.
 */
export function mountCaretakerMcp(app) {
  app.post(MCP_PATH, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    const existing = sessionId ? sessions.get(sessionId) : undefined;

    try {
      // Reuse the session created by initialize.
      if (existing) {
        await existing.handleRequest(req, res, req.body);
        return;
      }

      // First request of a session must be initialize.
      if (!sessionId && isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableJsonResponse: true,
          onsessioninitialized: (id) => {
            sessions.set(id, transport);
            console.log(`[mcp] session ${id} initialized`);
          },
        });

        transport.onclose = () => {
          const id = transport.sessionId;
          if (id && sessions.has(id)) {
            sessions.delete(id);
            console.log(`[mcp] session ${id} closed`);
          }
        };

        const server = createCaretakerMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (sessionId) {
        jsonRpcError(res, 404, -32001, "Session not found");
        return;
      }

      jsonRpcError(res, 400, -32000, "Bad Request: No valid session ID provided");
    } catch (err) {
      console.error("[mcp] request failed:", err);
      if (!res.headersSent) {
        jsonRpcError(res, 500, -32603, "Internal server error");
      }
    }
  });

  // This server answers tool calls on POST. A standalone SSE stream is not offered.
  app.get(MCP_PATH, (_req, res) => {
    res.status(405).set("Allow", "POST, DELETE").send("Method Not Allowed");
  });

  app.delete(MCP_PATH, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    const transport = sessionId ? sessions.get(sessionId) : undefined;
    if (!transport) {
      jsonRpcError(res, 404, -32001, "Session not found");
      return;
    }
    await transport.handleRequest(req, res);
  });
}
