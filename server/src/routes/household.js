import { Router } from "express";
import {
  loadHousehold,
  resetHousehold,
  storageLabel,
} from "../services/householdRepository.js";
import { summarizeCaretaker } from "../services/schedule.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const household = await loadHousehold();
    res.json({
      ok: true,
      storage: storageLabel(),
      household,
      summary: summarizeCaretaker(household),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post("/reset", async (_req, res) => {
  try {
    const household = await resetHousehold();
    res.json({
      ok: true,
      storage: storageLabel(),
      household,
      summary: summarizeCaretaker(household),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
