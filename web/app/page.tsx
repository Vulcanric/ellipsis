"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { api, Run, Task, Approval } from "../lib/api";
import { useUIStore } from "../lib/store";
import { Composer } from "../components/Composer";
import { TaskItem } from "../components/TaskItem";
import { RunLiveView } from "../components/RunLiveView";
import { ApprovalItem } from "../components/ApprovalItem";

export default function Home() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"runs" | "approvals">("runs");
  const [run, setRun] = useState<Run | null>(null);
  const { theme, setTheme } = useUIStore();

  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<Task[]>("/v1/tasks") });
  const approvals = useQuery({ queryKey: ["approvals"], queryFn: () => api<Approval[]>("/v1/approvals") });

  const createTask = useMutation({
    mutationFn: (instruction: string) =>
      api<Task>("/v1/tasks", {
        method: "POST",
        body: JSON.stringify({ instruction, approval_policy: "irreversible-actions" }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const startRun = useMutation({
    mutationFn: (taskId: string) => api<Run>(`/v1/tasks/${taskId}/runs`, { method: "POST" }),
    onSuccess: setRun,
  });

  const decideApproval = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      api(`/v1/approvals/${id}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  useEffect(() => {
    const saved = localStorage.getItem("ellipsis-theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, [setTheme]);

  useEffect(() => {
    if (!run) return;
    const socket = new WebSocket(
      `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace("http", "ws")}/v1/runs/${run.id}/events`
    );
    socket.onmessage = (event) => {
      const update = JSON.parse(event.data) as Partial<Run>;
      if (update.status) setRun((current) => (current ? { ...current, ...update } : current));
    };
    return () => socket.close();
  }, [run?.id]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="mark">
            <i /><i /><i />
          </span>
          ellipsis
          <span className="dot">.</span>
        </div>
        <p className="eyebrow">Workspace</p>
        <nav>
          <button
            className={`nav ${view === "runs" ? "active" : ""}`}
            onClick={() => setView("runs")}
          >
            ◈ <span>Runs</span>
          </button>
          <button
            className={`nav ${view === "approvals" ? "active" : ""}`}
            onClick={() => setView("approvals")}
          >
            ◷ <span>Approvals</span>
          </button>
        </nav>
        <div className="online"><i />Control plane online</div>
      </aside>
      <main>
        <header className="topbar">
          <span className="crumb">
            Workspace / <b>{view === "runs" ? "Runs" : "Approvals"}</b>
          </span>
          <button
            className="theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </header>
        <section className="content">
          {view === "runs" ? (
            <>
              <div className="hero">
                <div>
                  <p className="eyebrow">Autonomous operations</p>
                  <h1>
                    Give ellipsis<br />
                    <em>something to do.</em>
                  </h1>
                </div>
                <span className="health">● API connected</span>
              </div>
              <Composer
                onSubmit={(instruction) => createTask.mutate(instruction)}
                isPending={createTask.isPending}
              />
              <section className="runs">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">Recent tasks</p>
                    <h2>Agent activity</h2>
                  </div>
                  <button className="refresh" onClick={() => tasks.refetch()}>
                    Refresh ↻
                  </button>
                </div>
                {tasks.isLoading ? (
                  <div className="empty">Loading tasks...</div>
                ) : tasks.error ? (
                  <div className="empty">API unavailable. Start the FastAPI service on port 8000.</div>
                ) : tasks.data?.length ? (
                  <div className="task-list">
                    {tasks.data.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onStartRun={(id) => startRun.mutate(id)}
                        isStarting={startRun.isPending}
                        isRunning={run?.task_id === task.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty">No tasks yet. Create the first one above.</div>
                )}
                {run && <RunLiveView run={run} />}
              </section>
            </>
          ) : (
            <section className="approvals">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Pending actions</p>
                  <h2>Approval gates</h2>
                </div>
                <button className="refresh" onClick={() => approvals.refetch()}>
                  Refresh ↻
                </button>
              </div>
              {approvals.isLoading ? (
                <div className="empty">Loading approvals...</div>
              ) : approvals.error ? (
                <div className="empty">API unavailable. Start the FastAPI service on port 8000.</div>
              ) : approvals.data?.length ? (
                <div className="task-list">
                  {approvals.data.map((approval) => (
                    <ApprovalItem
                      key={approval.id}
                      approval={approval}
                      onDecide={(id, status) => decideApproval.mutate({ id, status })}
                      isDeciding={decideApproval.isPending}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty">No pending approvals.</div>
              )}
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
