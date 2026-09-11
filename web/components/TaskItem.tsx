"use client";
import { Task } from "../lib/api";

interface TaskItemProps {
  task: Task;
  onStartRun: (taskId: string) => void;
  isStarting?: boolean;
  isRunning?: boolean;
}

export function TaskItem({ task, onStartRun, isStarting, isRunning }: TaskItemProps) {
  return (
    <article className="task-row">
      <span className="task-icon">◈</span>
      <div className="task-copy">
        <b className="text-sm">{task.instruction}</b>
        <small>{new Date(task.created_at).toLocaleString()} · Approval gates on</small>
      </div>
      <span className={`status ${task.status}`}>{task.status}</span>
      <button
        className="run-button"
        onClick={() => onStartRun(task.id)}
        disabled={isStarting}
      >
        {isRunning ? "Running" : "Start run"}
      </button>
    </article>
  );
}
