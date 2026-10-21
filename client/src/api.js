export async function getHealth() {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("API health check failed");
  return res.json();
}

export async function getHousehold() {
  const res = await fetch("/api/household");
  if (!res.ok) throw new Error("Failed to load household");
  return res.json();
}

export async function resetHousehold() {
  const res = await fetch("/api/household/reset", { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset household");
  return res.json();
}

export async function planUtterance(text) {
  const res = await fetch("/api/tools/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not plan the caretaker tools");
  }
  return res.json();
}

export async function chat(text) {
  const res = await fetch("/api/tools/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Chat request failed");
  }
  return res.json();
}
