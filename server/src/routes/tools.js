import { Router } from "express";
import {
  planUtterance,
  runFromUtterance,
  runTool,
  TOOL_CATALOG,
} from "../tools/runTools.js";
import { storageLabel } from "../services/householdRepository.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, tools: TOOL_CATALOG, status: "ready" });
});

router.post("/chat", async (req, res) => {
  try {
    const text = req.body?.text || req.body?.utterance || "";
    if (!String(text).trim()) {
      return res.status(400).json({ ok: false, error: "text is required" });
    }
    const result = await runFromUtterance(text);
    res.json({ ...result, storage: storageLabel() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/plan", (req, res) => {
  const text = req.body?.text || req.body?.utterance || "";
  if (!String(text).trim()) {
    return res.status(400).json({ ok: false, error: "text is required" });
  }
  const plan = planUtterance(text);
  res.json({ ok: true, utterance: text, ...plan });
});

router.post("/:name", async (req, res) => {
  try {
    const name = req.params.name;
    if (!TOOL_CATALOG.includes(name)) {
      return res.status(404).json({ ok: false, error: `Unknown tool: ${name}` });
    }
    const result = await runTool(name, req.body || {});
    res.json({ ...result, storage: storageLabel() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
