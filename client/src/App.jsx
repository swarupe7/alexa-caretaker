import { useEffect, useRef, useState } from "react";
import { getHealth, getHousehold, planUtterance, resetHousehold } from "./api.js";
import { callCaretakerTool, connectCaretakerMcp } from "./mcpClient.js";
import { DEMO_PROMPTS } from "./demoPrompts.js";
import { CareIcon } from "./CareIcons.jsx";

const WELCOME = {
  role: "assistant",
  text: "Hi — I’m Alexa Caretaker. I help your family keep medicines on time, log taken or missed doses, and answer “did they take it?” Reminder support only — not medical advice.",
  tools: [],
};

function statusLabel(status) {
  if (status === "taken") return "Taken";
  if (status === "missed") return "Missed";
  if (status === "skipped") return "Skipped";
  if (status === "due") return "Due now";
  return "Upcoming";
}

/**
 * Full-width Alexa+ home-care medicine companion.
 */
export default function App() {
  const [health, setHealth] = useState(null);
  const [payload, setPayload] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastTools, setLastTools] = useState([]);
  const [speechSource, setSpeechSource] = useState("rules");
  const [mcpTools, setMcpTools] = useState([]);
  const [mcpReady, setMcpReady] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const transcriptRef = useRef(null);

  useEffect(() => {
    async function boot() {
      try {
        const [h, house] = await Promise.all([getHealth(), getHousehold()]);
        setHealth(h);
        setPayload(house);
        setSummary(house.summary);
        setSpeechSource(h.bedrock?.configured ? "bedrock-ready" : "rules");
        const mcp = await connectCaretakerMcp();
        setMcpTools(mcp.tools || []);
        setMcpReady(true);
        setError("");
      } catch (err) {
        setError(
          err.message || "API not reachable. Start the Alexa Caretaker server."
        );
      }
    }
    boot();
  }, []);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const household = payload?.household;
  const doses = summary?.doses || [];

  async function sendUtterance(raw) {
    const text = String(raw || "").trim();
    if (!text || busy) return;

    setBusy(true);
    setListening(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text, tools: [] }]);

    try {
      // The page picks a tool name, then runs it with MCP tools/call.
      const plan = await planUtterance(text);
      const toolsUsed = [];
      const speeches = [];
      let latestSummary = null;

      if (!plan.calls?.length) {
        speeches.push(plan.helpSpeech || "I can help with today’s medicines.");
      } else {
        for (const call of plan.calls) {
          const cleanArgs = Object.fromEntries(
            Object.entries(call.args || {}).filter(([, value]) => value != null && value !== "")
          );
          const result = await callCaretakerTool(call.tool, cleanArgs);
          toolsUsed.push(result.tool || call.tool);
          if (result.speech) speeches.push(result.speech);
          if (result.summary) latestSummary = result.summary;
        }
      }

      const house = await getHousehold();
      setPayload(house);
      setSummary(latestSummary || house.summary);
      setLastTools(toolsUsed);
      setSpeechSource("rules");
      setMcpReady(true);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: speeches.filter(Boolean).join(" "),
          tools: toolsUsed,
          speechSource: "rules",
          viaMcp: toolsUsed.length > 0,
        },
      ]);
      setError("");
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Sorry — ${err.message}`, tools: [] },
      ]);
      setError(err.message);
    } finally {
      setBusy(false);
      setTimeout(() => setListening(false), 350);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    sendUtterance(input);
  }

  async function handleReset() {
    try {
      const house = await resetHousehold();
      setPayload(house);
      setSummary(house.summary);
      setLastTools([]);
      setMessages([
        {
          role: "assistant",
          text: "Schedule reset. Mom’s medicines are back to the starter plan for today.",
          tools: [],
        },
      ]);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function runDemo() {
    if (busy) return;
    await handleReset();
    for (const prompt of DEMO_PROMPTS.slice(0, 4)) {
      await sendUtterance(prompt.text);
      await new Promise((r) => setTimeout(r, 650));
    }
  }

  return (
    <div className="app-shell">
      {/* Full-bleed top bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <CareIcon name="cross" size={22} />
            </span>
            <div>
              <strong>Alexa Caretaker</strong>
              <em>Home medicine care</em>
            </div>
          </div>
          <div className="topbar-meta">
            <span className="meta-pill">
              <CareIcon name="shield" size={16} />
              Amazon Hackathon · Alexa+
            </span>
            {health ? (
              <span className={`meta-pill${health.ok ? " live" : ""}`}>
                {health.ok ? "Online" : "Offline"} · {health.storage}
              </span>
            ) : null}
            <span className={`meta-pill${mcpReady ? " live" : ""}`}>
              {mcpReady ? "MCP connected" : "MCP offline"}
            </span>
            <span
              className={`meta-pill${health?.bedrock?.configured ? " bedrock" : ""}`}
            >
              {health?.bedrock?.configured
                ? "Bedrock ready"
                : "Bedrock off (rules speech)"}
            </span>
          </div>
        </div>
      </div>

      {/* Full-width care hero */}
      <header className="hero-band">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Care at home · Family first</p>
            <h1>Alexa Caretaker</h1>
            <p className="lead">
              Hire Alexa as your home medicine companion — remind on time, log
              every dose, and know instantly if Mom took her meds.
            </p>
            <div className="hero-cta">
              <button
                type="button"
                className="btn solid"
                onClick={runDemo}
                disabled={busy}
              >
                <CareIcon name="clock" size={18} />
                Play caretaker demo
              </button>
              <button
                type="button"
                className="btn soft"
                onClick={handleReset}
                disabled={busy}
              >
                Reset day
              </button>
            </div>
            <p className="disclaimer">
              Reminders and logging only — not a doctor, pharmacy, or diagnosis.
            </p>
          </div>

          <div className="hero-visual">
            <div className="care-scene" aria-hidden="true">
              <div className="scene-home">
                <CareIcon name="home" size={72} />
              </div>
              <div className="scene-pill">
                <CareIcon name="pill" size={40} />
              </div>
              <div className="scene-heart">
                <CareIcon name="heart" size={36} />
              </div>
            </div>
            <div className={`orb-panel${listening || busy ? " active" : ""}`}>
              <div className="orb">
                <span className="orb-core" />
                <span className="orb-ring r1" />
                <span className="orb-ring r2" />
              </div>
              <p>{busy ? "Checking schedule…" : "Ready to care"}</p>
            </div>
          </div>
        </div>

        {/* Medical care feature strip — full width */}
        <div className="care-strip">
          <div className="care-strip-inner">
            <article>
              <CareIcon name="clock" size={28} />
              <div>
                <strong>On-time doses</strong>
                <span>Timed reminders for each medicine</span>
              </div>
            </article>
            <article>
              <CareIcon name="pill" size={28} />
              <div>
                <strong>Taken / missed log</strong>
                <span>Clear adherence for the day</span>
              </div>
            </article>
            <article>
              <CareIcon name="heart" size={28} />
              <div>
                <strong>Family check-in</strong>
                <span>“Did Mom take her medicines?”</span>
              </div>
            </article>
            <article>
              <CareIcon name="home" size={28} />
              <div>
                <strong>Home care focus</strong>
                <span>Built for parents & caretakers</span>
              </div>
            </article>
          </div>
        </div>
      </header>

      {error ? (
        <div className="error-wrap">
          <p className="error">{error}</p>
        </div>
      ) : null}

      {/* Wide workspace */}
      <main className="workspace">
        <section className="coach">
          <div className="coach-head">
            <div className="mini-orb" aria-hidden="true" />
            <div>
              <h2>Ask Alexa Caretaker</h2>
              <p>
                Caring for <strong>{household?.patientName || "…"}</strong> at
                home
              </p>
            </div>
          </div>

          <div className="chips">
            {DEMO_PROMPTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => sendUtterance(p.text)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="transcript" ref={transcriptRef}>
            {messages.map((m, i) => (
              <div key={i} className={`bubble ${m.role}`}>
                <span className="who">
                  {m.role === "user" ? "You" : "Alexa Caretaker"}
                </span>
                <p>{m.text}</p>
                {m.tools?.length ? (
                  <p className="tools">Tools: {m.tools.join(" → ")}</p>
                ) : null}
                {m.speechSource ? (
                  <p className="tools">
                    Speech: rules engine
                    {m.viaMcp ? " · MCP tools/call" : ""}
                  </p>
                ) : null}
              </div>
            ))}
            {busy ? (
              <div className="bubble assistant thinking">
                <span className="who">Alexa Caretaker</span>
                <p>Looking at today’s doses…</p>
              </div>
            ) : null}
          </div>

          <form className="composer" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "Did Mom take her medicines?"'
              disabled={busy}
              aria-label="Ask Alexa Caretaker"
            />
            <button type="submit" disabled={busy || !input.trim()}>
              Ask Alexa
            </button>
          </form>
        </section>

        <aside className="side">
          <section className="panel pulse-panel">
            <div className="panel-head">
              <CareIcon name="heart" size={22} />
              <h2>Caretaker pulse</h2>
            </div>
            <div className="pulse-grid">
              <div>
                <strong>{summary?.taken ?? 0}</strong>
                <span>Taken</span>
              </div>
              <div className="warn">
                <strong>{summary?.due ?? 0}</strong>
                <span>Due now</span>
              </div>
              <div className="bad">
                <strong>{summary?.missed ?? 0}</strong>
                <span>Missed</span>
              </div>
              <div>
                <strong>{summary?.upcoming ?? 0}</strong>
                <span>Upcoming</span>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <CareIcon name="pill" size={22} />
              <h2>Today’s medicines</h2>
            </div>
            <ul className="dose-list">
              {doses.map((d) => (
                <li key={d.key} className={`dose ${d.status}`}>
                  <div className="dose-icon">
                    <CareIcon name="pill" size={20} />
                  </div>
                  <div className="dose-body">
                    <strong>{d.medicineName}</strong>
                    <span>
                      {d.dose} · {d.time}
                      {d.withFood ? " · with food" : ""}
                    </span>
                  </div>
                  <em>{statusLabel(d.status)}</em>
                </li>
              ))}
              {!doses.length ? (
                <li className="empty">No doses loaded yet.</li>
              ) : null}
            </ul>
          </section>

          <section className="panel household-panel">
            <div className="panel-head">
              <CareIcon name="home" size={22} />
              <h2>Household</h2>
            </div>
            <div className="house-grid">
              <div>
                <span>Patient</span>
                <strong>{household?.patientName || "—"}</strong>
              </div>
              <div>
                <span>Caretaker</span>
                <strong>You</strong>
              </div>
              <div>
                <span>Medicines on file</span>
                <strong>{household?.medicines?.length ?? 0}</strong>
              </div>
            </div>
          </section>

          <section className="panel soft-panel">
            <div className="panel-head">
              <CareIcon name="shield" size={22} />
              <h2>Agent tools</h2>
            </div>
            <p className="muted">
              {lastTools.length
                ? lastTools.join(" → ")
                : mcpTools.length
                  ? `Discovered: ${mcpTools.join(", ")}`
                  : "Ask Alexa to see which care tools run."}
            </p>
            <p className="muted" style={{ marginTop: "0.45rem" }}>
              Last speech:{" "}
              {speechSource === "bedrock"
                ? "Amazon Bedrock"
                : speechSource === "bedrock-ready"
                  ? "Bedrock configured — ask something to use it"
                  : "rules engine"}
            </p>
          </section>
        </aside>
      </main>

      <footer className="footer-band">
        <div className="footer-inner">
          <span>
            <CareIcon name="cross" size={16} /> Alexa Caretaker
          </span>
          <span>Alexa+ · MCP Streamable HTTP · family medicine care</span>
        </div>
      </footer>
    </div>
  );
}
