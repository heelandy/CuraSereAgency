"use client";

import { useState } from "react";
import { SparkIcon } from "./icons";

export function GenerateInsightsButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setLoading(false);
    if (res.ok) window.location.reload();
    else alert("Could not run AI analysis.");
  }

  return (
    <button className="btn-primary" onClick={run} disabled={loading}>
      <SparkIcon width={16} /> {loading ? "Analyzing…" : "Run AI analysis"}
    </button>
  );
}
