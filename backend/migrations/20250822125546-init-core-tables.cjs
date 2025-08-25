'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // helper for idempotent index creation
    const idx = (sql) => queryInterface.sequelize.query(sql);

    // ─────────────────────────────────────────────────────────────────────────────
    // layouts
    // ─────────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('layouts', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      organizationId: { type: Sequelize.STRING, allowNull: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      structure: { type: Sequelize.JSONB, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // indexes for layouts (idempotent)
    await idx('CREATE INDEX IF NOT EXISTS "layouts_organization_id" ON "layouts" ("organizationId");');
    await idx('CREATE UNIQUE INDEX IF NOT EXISTS "uniq_layouts_org_name" ON "layouts" ("organizationId","name");');

    // ─────────────────────────────────────────────────────────────────────────────
    // workflows
    // ─────────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('workflows', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      organizationId: { type: Sequelize.STRING, allowNull: true },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      nodes: { type: Sequelize.JSONB, allowNull: true },
      connections: { type: Sequelize.JSONB, allowNull: true },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      tags: { type: Sequelize.ARRAY(Sequelize.STRING), allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // indexes for workflows (idempotent)
    await idx('CREATE INDEX IF NOT EXISTS "workflows_organization_id" ON "workflows" ("organizationId");');
    await idx('CREATE UNIQUE INDEX IF NOT EXISTS "uniq_workflows_org_name" ON "workflows" ("organizationId","name");');

    // ─────────────────────────────────────────────────────────────────────────────
    // workflow_executions
    // ─────────────────────────────────────────────────────────────────────────────
    await queryInterface.createTable('workflow_executions', {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      organizationId: { type: Sequelize.STRING, allowNull: true },
      jobId: { type: Sequelize.STRING, allowNull: true },
      workflowId: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'workflows', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      workflowName: { type: Sequelize.STRING, allowNull: true },
      type: { type: Sequelize.STRING, allowNull: true },
      status: { type: Sequelize.STRING, allowNull: true, defaultValue: 'pending' },
      progress: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      startTime: { type: Sequelize.DATE, allowNull: true },
      endTime: { type: Sequelize.DATE, allowNull: true },
      inputData: { type: Sequelize.JSONB, allowNull: true },
      outputData: { type: Sequelize.JSONB, allowNull: true },
      logs: { type: Sequelize.JSONB, allowNull: true },
      results: { type: Sequelize.JSONB, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // indexes for executions (idempotent)
    await idx('CREATE INDEX IF NOT EXISTS "exec_workflow_id" ON "workflow_executions" ("workflowId");');
    await idx('CREATE INDEX IF NOT EXISTS "exec_organization_id" ON "workflow_executions" ("organizationId");');
    await idx('CREATE INDEX IF NOT EXISTS "exec_status" ON "workflow_executions" ("status");');
    await idx('CREATE INDEX IF NOT EXISTS "exec_job_id" ON "workflow_executions" ("jobId");');
    await idx('CREATE INDEX IF NOT EXISTS "exec_workflow_status" ON "workflow_executions" ("workflowId","status");');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('workflow_executions');
    await queryInterface.dropTable('workflows');
    await queryInterface.dropTable('layouts');
  },
};
