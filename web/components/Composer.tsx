"use client";
import { FormEvent, useState } from "react";

interface ComposerProps {
  onSubmit: (instruction: string) => void;
  isPending: boolean;
}

export function Composer({ onSubmit, isPending }: ComposerProps) {
  const [instruction, setInstruction] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (instruction.trim()) {
      onSubmit(instruction);
      setInstruction("");
    }
  }

  return (
    <section className="composer panel">
      <div>
        <p className="eyebrow">New task</p>
        <h2>What should ellipsis handle?</h2>
        <p className="muted">The agent works independently, then pauses before irreversible actions.</p>
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="Research the best standing desk under $300 and recommend the top three..."
        />
        <div className="form-row">
          <label>
            <input type="checkbox" defaultChecked /> Approval gates enabled
          </label>
          <button className="primary" disabled={isPending}>
            {isPending ? "Creating..." : "Create task ↗"}
          </button>
        </div>
      </form>
    </section>
  );
}
