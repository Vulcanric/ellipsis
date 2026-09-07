from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


class Store:
    def __init__(self, path: str | Path = "data/ellipsis.sqlite3") -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                instruction TEXT NOT NULL,
                approval_policy TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL REFERENCES tasks(id),
                status TEXT NOT NULL,
                current_step TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                run_id TEXT NOT NULL REFERENCES runs(id),
                action TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
        self.connection.commit()

    def create_task(self, task_id: str, instruction: str, approval_policy: str) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        self.connection.execute(
            "INSERT INTO tasks VALUES (?, ?, ?, ?, ?)",
            (task_id, instruction, approval_policy, "queued", now),
        )
        self.connection.commit()
        return self.get_task(task_id)

    def get_task(self, task_id: str) -> dict[str, Any]:
        row = self.connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
        if row is None:
            raise KeyError(task_id)
        return dict(row)

    def list_tasks(self) -> list[dict[str, Any]]:
        rows = self.connection.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC"
        ).fetchall()
        return [dict(row) for row in rows]

    def create_run(self, run_id: str, task_id: str) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        self.connection.execute(
            "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?)",
            (run_id, task_id, "running", "Planning next action", now, now),
        )
        self.connection.execute("UPDATE tasks SET status = 'running' WHERE id = ?", (task_id,))
        self.connection.commit()
        return self.get_run(run_id)

    def get_run(self, run_id: str) -> dict[str, Any]:
        row = self.connection.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
        if row is None:
            raise KeyError(run_id)
        result = dict(row)
        result["approvals"] = [dict(item) for item in self.connection.execute(
            "SELECT * FROM approvals WHERE run_id = ? ORDER BY created_at", (run_id,)
        ).fetchall()]
        return result

    def update_run(self, run_id: str, status: str, current_step: str) -> dict[str, Any]:
        self.connection.execute(
            "UPDATE runs SET status = ?, current_step = ?, updated_at = ? WHERE id = ?",
            (status, current_step, datetime.now(UTC).isoformat(), run_id),
        )
        self.connection.commit()
        return self.get_run(run_id)

    def request_approval(self, approval_id: str, run_id: str, action: str) -> dict[str, Any]:
        now = datetime.now(UTC).isoformat()
        self.connection.execute(
            "INSERT INTO approvals VALUES (?, ?, ?, ?, ?)",
            (approval_id, run_id, action, "pending", now),
        )
        self.connection.commit()
        return self.get_run(run_id)

    def decide_approval(self, approval_id: str, status: str) -> dict[str, Any]:
        self.connection.execute("UPDATE approvals SET status = ? WHERE id = ?", (status, approval_id))
        self.connection.commit()
        row = self.connection.execute("SELECT run_id FROM approvals WHERE id = ?", (approval_id,)).fetchone()
        if row is None:
            raise KeyError(approval_id)
        return self.get_run(row["run_id"])
