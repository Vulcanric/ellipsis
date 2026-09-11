"use client";
import { Approval } from "../lib/api";

interface ApprovalItemProps {
  approval: Approval;
  onDecide: (approvalId: string, status: "approved" | "rejected") => void;
  isDeciding?: boolean;
}

export function ApprovalItem({ approval, onDecide, isDeciding }: ApprovalItemProps) {
  return (
    <article className="task-row">
      <span className="task-icon">⚠</span>
      <div className="task-copy">
        <b className="text-sm">Approval required for run {approval.run_id.slice(0, 8)}</b>
        <small>Action: {approval.action}</small>
      </div>
      <div className="approval-actions">
        <button
          className="approve"
          onClick={() => onDecide(approval.id, "approved")}
          disabled={isDeciding}
        >
          Approve
        </button>
        <button
          className="reject"
          onClick={() => onDecide(approval.id, "rejected")}
          disabled={isDeciding}
        >
          Reject
        </button>
      </div>
    </article>
  );
}
