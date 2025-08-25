// backend/models/index.cjs
const { DataTypes } = require("sequelize");
const { sequelize } = require("../db/sequelize.cjs");
const layoutFactory = require("./Layout");
const workflowFactory = require("./Workflow");
const workflowExecFactory = require("./WorkflowExecution");

const Layout = layoutFactory(sequelize, DataTypes);
const Workflow = workflowFactory(sequelize, DataTypes);
const WorkflowExecution = workflowExecFactory(sequelize, DataTypes);

Workflow.hasMany(WorkflowExecution, { foreignKey: 'workflowId', as: 'executions', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
WorkflowExecution.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });

module.exports = { sequelize, Layout, Workflow, WorkflowExecution };
