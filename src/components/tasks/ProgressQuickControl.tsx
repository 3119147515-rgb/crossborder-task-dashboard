"use client";

import { useEffect, useRef, useState } from "react";
import { ProgressBar } from "./ProgressBar";

export function ProgressQuickControl({
  value,
  onCommit,
  ariaLabel,
}: {
  value: number;
  onCommit: (value: number) => Promise<void>;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const lastSubmitted = useRef(value);

  useEffect(() => {
    // Keep the control in sync when Supabase returns the persisted value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(value);
    lastSubmitted.current = value;
  }, [value]);

  async function commit() {
    if (saving || draft === lastSubmitted.current) return;
    const previousValue = value;
    lastSubmitted.current = draft;
    setSaving(true);
    try {
      await onCommit(draft);
    } catch {
      lastSubmitted.current = previousValue;
      setDraft(previousValue);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={saving ? "opacity-60" : undefined}>
      <ProgressBar value={draft} />
      <input
        aria-label={ariaLabel}
        className="mt-2 w-full accent-blue-600 disabled:cursor-wait"
        type="range"
        min={0}
        max={100}
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={() => void commit()}
        onBlur={() => void commit()}
      />
    </div>
  );
}
