from __future__ import annotations

import json
import os
from typing import Any

from redis.asyncio import Redis


class EventBus:
    def __init__(self) -> None:
        self.redis = Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)

    async def publish(self, run_id: str, event: dict[str, Any]) -> None:
        await self.redis.publish(f"run:{run_id}", json.dumps(event, default=str))

    async def subscribe(self, run_id: str):
        channel = self.redis.pubsub()
        await channel.subscribe(f"run:{run_id}")
        return channel

    async def close(self) -> None:
        await self.redis.aclose()
