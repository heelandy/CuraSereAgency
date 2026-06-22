"use client";

import { useState } from "react";
import { CalendarIcon } from "./icons";

export function GenerateRecurringButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/scheduling/generate-recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setLoading(false);
    if (res.ok) {
      const j = await res.json();
      alert(`${j.created} recurring visit(s) generated for the next 4 weeks.`);
      window.location.reload();
    } else {
      alert("Could not generate recurring visits.");
    }
  }

  return (
    <button className="btn-secondary" onClick={run} disabled={loading}>
      <CalendarIcon width={16} /> {loading ? "Generating…" : "Generate recurring"}
    </button>
  );
}
