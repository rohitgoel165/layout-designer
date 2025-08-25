module.exports = (sequelize, DataTypes) => {
  const Workflow = sequelize.define('workflows', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    organizationId: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    nodes: { type: DataTypes.JSONB, allowNull: true },
    connections: { type: DataTypes.JSONB, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    tags: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
  }, {
    indexes: [
      { name: 'workflows_organization_id', fields: ['organizationId'] },
      { name: 'uniq_workflows_org_name', fields: ['organizationId', 'name'], unique: true },
    ],
  });

  Workflow.addScope('byOrg', (orgId) => ({ where: { organizationId: orgId } }));

  return Workflow;
};
