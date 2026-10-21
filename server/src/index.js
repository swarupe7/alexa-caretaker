import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDb, isMongoReady } from "./db.js";
import { resetMemoryStore } from "./store/memoryStore.js";
import householdRoutes from "./routes/household.js";
import toolsRoutes from "./routes/tools.js";
import { isBedrockConfigured } from "./services/bedrock.js";
import { MCP_PATH, MCP_PROTOCOL, mountCaretakerMcp } from "./mcp/http.js";

const PORT = Number(process.env.PORT) || 5050;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5174";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "alexa-caretaker-api",
    track: "Alexa+",
    storage: isMongoReady() ? "mongodb" : "memory",
    bedrock: {
      configured: isBedrockConfigured(),
      region: process.env.AWS_REGION || "us-east-1",
      model: process.env.BEDROCK_MODEL_ID || null,
    },
    mcp: {
      enabled: true,
      path: MCP_PATH,
      transport: "streamable-http",
      protocol: MCP_PROTOCOL,
    },
  });
});

app.use("/api/household", householdRoutes);
app.use("/api/tools", toolsRoutes);
mountCaretakerMcp(app);

async function start() {
  const usingMongo = await connectDb(process.env.MONGO_URI);
  if (!usingMongo) resetMemoryStore();

  app.listen(PORT, () => {
    console.log(`[server] Alexa Caretaker API on http://localhost:${PORT}`);
    console.log(`[server] Storage: ${usingMongo ? "mongodb" : "memory"}`);
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
