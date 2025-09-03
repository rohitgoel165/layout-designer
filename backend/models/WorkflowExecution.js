// backend/models/WorkflowExecution.js
module.exports = (sequelize, DataTypes) => {
  const WorkflowExecution = sequelize.define(
    "workflow_executions",
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
      organizationId: { type: DataTypes.STRING, allowNull: true },
      jobId: { type: DataTypes.STRING, allowNull: true },

      workflowId: { type: DataTypes.BIGINT, allowNull: true },
      workflowName: { type: DataTypes.STRING, allowNull: true },
      layoutName: { type: DataTypes.STRING, allowNull: true },
      type: { type: DataTypes.STRING, allowNull: true },
      format: { type: DataTypes.STRING, allowNull: true },

      status: { type: DataTypes.STRING, allowNull: true, defaultValue: "pending" },
      progress: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },

      startTime: { type: DataTypes.DATE, allowNull: true },
      endTime: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },

      requestData: { type: DataTypes.JSONB, allowNull: true },
      inputData: { type: DataTypes.JSONB, allowNull: true },
      results: { type: DataTypes.JSONB, allowNull: true },
      responseData: { type: DataTypes.JSONB, allowNull: true },
      outputData: { type: DataTypes.JSONB, allowNull: true },

      logs: { type: DataTypes.JSONB, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "workflow_executions",
      timestamps: true,
      indexes: [
        { name: "exec_workflow_id", fields: ["workflowId"] },
        { name: "exec_organization_id", fields: ["organizationId"] },
        { name: "exec_status", fields: ["status"] },
        { name: "exec_job_id", fields: ["jobId"] },
        { name: "exec_workflow_status", fields: ["workflowId", "status"] },
        { name: "exec_created_at", fields: ["createdAt"] },
      ],
      hooks: {
        beforeSave: (inst) => {
          if ((inst.status || "").toLowerCase() === "completed") {
            inst.completedAt = inst.completedAt || new Date();
            inst.endTime = inst.endTime || inst.completedAt;
            inst.progress = typeof inst.progress === "number" ? inst.progress : 100;
          }
        },
      },
    }
  );

  return WorkflowExecution;
};
