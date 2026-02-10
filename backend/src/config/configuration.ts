export default () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/openshutter',
  },
  /** Base path for export/import; only paths under this are allowed. If unset, default ./migration-data is used when present. */
  migrationBasePath: process.env.MIGRATION_BASE_PATH || undefined,
});
