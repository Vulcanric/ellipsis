from __future__ import annotations

import asyncio
import os
from uuid import UUID

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select

from .db import SessionLocal
from .events import EventBus
from .models import Run, Task


async def execute_run(ctx: dict, run_id: str) -> None:
    bus: EventBus = ctx["events"]
    async with SessionLocal() as session:
        run = await session.get(Run, UUID(run_id))
        if run is None:
            return
        run.status = "running"
        run.current_step = "Planning next action"
        await session.commit()
    await bus.publish(run_id, {"type": "run.updated", "status": "running", "current_step": "Planning next action"})
    await asyncio.sleep(0)


async def startup(ctx: dict) -> None:
    ctx["events"] = EventBus()


async def shutdown(ctx: dict) -> None:
    await ctx["events"].close()


class WorkerSettings:
    functions = [execute_run]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379/0"))
