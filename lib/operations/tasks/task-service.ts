import { generateTasks } from "./task-engine";
import type { OperationsTaskOverview } from "./task-types";

export function getTaskOverview(): OperationsTaskOverview {
  const tasks = generateTasks();

  return {
    source: "task-engine-foundation",
    generatedAt: new Date().toISOString(),
    summary: {
      totalTasks: tasks.length,
      pending: tasks.filter((task) => task.status === "PENDING").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      blocked: tasks.filter((task) => task.status === "BLOCKED").length,
      done: tasks.filter((task) => task.status === "DONE").length,
      highPriority: tasks.filter((task) => task.priority === "HIGH").length,
    },
    tasks,
  };
}
