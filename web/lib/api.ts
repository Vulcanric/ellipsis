export type Task = {
  id: string;
  instruction: string;
  approval_policy: string;
  status: string;
  created_at: string;
};

export type Run = {
  id: string;
  task_id: string;
  status: string;
  current_step: string | null;
  created_at: string;
  updated_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error((await response.json()).detail ?? "Request failed");
  return response.json();
}
