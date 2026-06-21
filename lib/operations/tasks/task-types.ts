import type { PlanningActionPriority, PlanningActionType } from "@/lib/operations/planning/planning-types";

export type OperationsTaskStatus = "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export type OperationsTask = {
  id: string;
  planningActionId: string;
  seasonId: string;
  seasonTitle: string;
  type: PlanningActionType;
  title: string;
  priority: PlanningActionPriority;
  status: OperationsTaskStatus;
  assignee: string;
  dueLabel: string;
  progress: number;
  sourceReason: string;
};

export type OperationsTaskOverview = {
  source: string;
  generatedAt: string;
  summary: {
    totalTasks: number;
    pending: number;
    inProgress: number;
    blocked: number;
    done: number;
    highPriority: number;
  };
  tasks: OperationsTask[];
};
