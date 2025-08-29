// backend/migrations/XXXX-add-cols-workflow-executions.js
"use strict";
module.exports = {
  async up(q, S) {
    const t = "workflow_executions";
    await Promise.all([
      q.addColumn(t, "layoutName", { type: S.STRING }),
      q.addColumn(t, "format", { type: S.STRING }),
      q.addColumn(t, "requestData", { type: S.JSONB }),
      q.addColumn(t, "responseData", { type: S.JSONB }),
      q.addColumn(t, "completedAt", { type: S.DATE }),
      q.addColumn(t, "errorMessage", { type: S.TEXT }),
      q.addIndex(t, ["createdAt"], { name: "exec_created_at" }),
    ]);
  },
  async down(q) {
    const t = "workflow_executions";
    await Promise.all([
      q.removeIndex(t, "exec_created_at"),
      q.removeColumn(t, "errorMessage"),
      q.removeColumn(t, "completedAt"),
      q.removeColumn(t, "responseData"),
      q.removeColumn(t, "requestData"),
      q.removeColumn(t, "format"),
      q.removeColumn(t, "layoutName"),
    ]);
  },
};
