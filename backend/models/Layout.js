module.exports = (sequelize, DataTypes) => {
  const Layout = sequelize.define('layouts', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    organizationId: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    structure: { type: DataTypes.JSONB, allowNull: true },
  }, {
    indexes: [
      { name: 'layouts_organization_id', fields: ['organizationId'] },
      { name: 'uniq_layouts_org_name', fields: ['organizationId', 'name'], unique: true },
    ]
  });

  // dynamic scope by org
  Layout.addScope('byOrg', (orgId) => ({
    where: { organizationId: orgId }
  }));

  return Layout;
};
