from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    instruction: str = Field(min_length=1, max_length=10_000)
    approval_policy: str = Field(default="irreversible-actions", min_length=1, max_length=80)


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    instruction: str
    approval_policy: str
    status: str
    created_at: datetime


class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    task_id: UUID
    status: str
    current_step: str | None
    created_at: datetime
    updated_at: datetime


class ApprovalCreate(BaseModel):
    action: str = Field(min_length=1, max_length=10_000)


class ApprovalDecision(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")


class ApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    run_id: UUID
    action: str
    status: str

