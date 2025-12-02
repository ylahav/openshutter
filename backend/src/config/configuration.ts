export default () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/openshutter',
  },
});
