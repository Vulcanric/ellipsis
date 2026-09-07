"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { api, Run, Task } from "../lib/api";
import { useUIStore } from "../lib/store";

export default function Home() {
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const { theme, setTheme } = useUIStore();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => api<Task[]>("/v1/tasks") });
  const createTask = useMutation({ mutationFn: () => api<Task>("/v1/tasks", { method: "POST", body: JSON.stringify({ instruction, approval_policy: "irreversible-actions" }) }), onSuccess: () => { setInstruction(""); queryClient.invalidateQueries({ queryKey: ["tasks"] }); } });
  const startRun = useMutation({ mutationFn: (taskId: string) => api<Run>(`/v1/tasks/${taskId}/runs`, { method: "POST" }), onSuccess: setRun });

  useEffect(() => { const saved = localStorage.getItem("ellipsis-theme") as "light" | "dark" | null; if (saved) setTheme(saved); }, [setTheme]);
  useEffect(() => { if (!run) return; const socket = new WebSocket(`${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace("http", "ws")}/v1/runs/${run.id}/events`); socket.onmessage = (event) => { const update = JSON.parse(event.data) as Partial<Run>; if (update.status) setRun((current) => current ? { ...current, ...update } : current); }; return () => socket.close(); }, [run?.id]);

  function submit(event: FormEvent) { event.preventDefault(); if (instruction.trim()) createTask.mutate(); }

  return <div className="shell"><aside className="sidebar"><div className="brand"><span className="mark"><i/><i/><i/></span>ellipsis<span className="dot">.</span></div><p className="eyebrow">Workspace</p><nav><button className="nav active">◈ <span>Runs</span></button><button className="nav">＋ <span>New task</span></button><button className="nav">◷ <span>Approvals</span></button></nav><div className="online"><i/>Control plane online</div></aside><main><header className="topbar"><span className="crumb">Workspace / <b>Runs</b></span><button className="theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "☾"}</button></header><section className="content"><div className="hero"><div><p className="eyebrow">Autonomous operations</p><h1>Give ellipsis<br/><em>something to do.</em></h1></div><span className="health">● API connected</span></div><section className="composer panel"><div><p className="eyebrow">New task</p><h2>What should ellipsis handle?</h2><p className="muted">The agent works independently, then pauses before irreversible actions.</p></div><form onSubmit={submit}><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="Research the best standing desk under $300 and recommend the top three..."/><div className="form-row"><label><input type="checkbox" defaultChecked/> Approval gates enabled</label><button className="primary" disabled={createTask.isPending}>{createTask.isPending ? "Creating..." : "Create task ↗"}</button></div></form></section><section className="runs"><div className="section-head"><div><p className="eyebrow">Recent tasks</p><h2>Agent activity</h2></div><button className="refresh" onClick={() => tasks.refetch()}>Refresh ↻</button></div>{tasks.isLoading ? <div className="empty">Loading tasks...</div> : tasks.error ? <div className="empty">API unavailable. Start the FastAPI service on port 8000.</div> : tasks.data?.length ? <div className="task-list">{tasks.data.map((task) => <article className="task" key={task.id}><span className="task-icon">◈</span><div className="task-copy"><b>{task.instruction}</b><small>{new Date(task.created_at).toLocaleString()} · Approval gates on</small></div><span className={`status ${task.status}`}>{task.status}</span><button className="run" onClick={() => startRun.mutate(task.id)} disabled={startRun.isPending && startRun.variables === task.id}>{run?.task_id === task.id ? "Running" : "Start run"}</button></article>)}</div> : <div className="empty">No tasks yet. Create the first one above.</div>}{run && <div className="live panel"><div><span className="live-dot"/>Live run <b>{run.id.slice(0, 8)}</b></div><strong>{run.status}</strong><small>{run.current_step}</small></div>}</section></section></main></div>;
}
