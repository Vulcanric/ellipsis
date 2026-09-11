"use client";
import { Run } from "../lib/api";

interface RunLiveViewProps {
  run: Run;
}

export function RunLiveView({ run }: RunLiveViewProps) {
  return (
    <div className="live panel">
      <div>
        <span className="live-dot"/>
        Live run <b>{run.id.slice(0, 8)}</b>
      </div>
      <strong className={`status ${run.status}`}>{run.status}</strong>
      <small>{run.current_step}</small>
    </div>
  );
}
