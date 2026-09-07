from __future__ import annotations

import json
import os
from uuid import UUID

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_session
from .events import EventBus
from .models import Approval, Run, Task
from .schemas import ApprovalCreate, ApprovalDecision, RunResponse, TaskCreate, TaskResponse

app = FastAPI(title="ellipsis control plane", version="0.2.0")
redis_dsn = os.getenv("REDIS_URL", "redis://localhost:6379/0")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "control-plane"}


@app.post("/v1/tasks", response_model=TaskResponse, status_code=201)
async def create_task(payload: TaskCreate, session: AsyncSession = Depends(get_session)) -> Task:
    task = Task(instruction=payload.instruction, approval_policy=payload.approval_policy)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@app.get("/v1/tasks", response_model=list[TaskResponse])
async def list_tasks(session: AsyncSession = Depends(get_session)) -> list[Task]:
    result = await session.execute(select(Task).order_by(Task.created_at.desc()))
    return list(result.scalars())


@app.get("/v1/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: UUID, session: AsyncSession = Depends(get_session)) -> Task:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.post("/v1/tasks/{task_id}/runs", response_model=RunResponse, status_code=201)
async def start_run(task_id: UUID, session: AsyncSession = Depends(get_session)) -> Run:
    task = await session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    run = Run(task_id=task.id, status="queued", current_step="Queued for worker")
    task.status = "running"
    session.add(run)
    await session.commit()
    await session.refresh(run)
    pool = await create_pool(RedisSettings.from_dsn(redis_dsn))
    await pool.enqueue_job("execute_run", str(run.id))
    await pool.close()
    return run


@app.get("/v1/runs/{run_id}", response_model=RunResponse)
async def get_run(run_id: UUID, session: AsyncSession = Depends(get_session)) -> Run:
    run = await session.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.post("/v1/runs/{run_id}/approvals")
async def request_approval(run_id: UUID, payload: ApprovalCreate, session: AsyncSession = Depends(get_session)) -> dict:
    run = await session.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    approval = Approval(run_id=run.id, action=payload.action)
    run.status = "waiting_approval"
    run.current_step = "Waiting for approval"
    session.add(approval)
    await session.commit()
    await session.refresh(approval)
    bus = EventBus()
    await bus.publish(str(run.id), {"type": "approval.requested", "approval_id": str(approval.id), "action": approval.action})
    await bus.close()
    return {"id": approval.id, "run_id": run.id, "action": approval.action, "status": approval.status}


@app.post("/v1/approvals/{approval_id}")
async def decide_approval(approval_id: UUID, payload: ApprovalDecision, session: AsyncSession = Depends(get_session)) -> dict:
    approval = await session.get(Approval, approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    approval.status = payload.status
    run = await session.get(Run, approval.run_id)
    if run is not None:
        run.status = "running" if payload.status == "approved" else "cancelled"
        run.current_step = "Approval accepted" if payload.status == "approved" else "Approval rejected"
    await session.commit()
    bus = EventBus()
    await bus.publish(str(approval.run_id), {"type": "approval.decided", "status": payload.status})
    await bus.close()
    return {"id": approval.id, "status": approval.status, "run_id": approval.run_id}


@app.websocket("/v1/runs/{run_id}/events")
async def run_events(websocket: WebSocket, run_id: UUID) -> None:
    await websocket.accept()
    bus = EventBus()
    channel = await bus.subscribe(str(run_id))
    try:
        while True:
            message = await channel.get_message(ignore_subscribe_messages=True, timeout=30)
            await websocket.send_text(message["data"] if message and message.get("data") else json.dumps({"type": "heartbeat"}))
    except WebSocketDisconnect:
        await channel.unsubscribe(f"run:{run_id}")
        await channel.close()
        await bus.close()
