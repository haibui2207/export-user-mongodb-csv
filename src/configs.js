const mongoUser = '';
const mongoPass = '';
const mongoHost = 'localhost';
const mongoPort = '27017';
const dbName = 'admin';
const collectionName = 'user';

module.exports = {
  DB_NAME: dbName,
  COLLECTION_NAME: collectionName,
  MONGO_URL: `mongodb://${mongoUser}:${mongoPass}@${mongoHost}:${mongoPort}/${dbName}`,
  PROCESS: {
    MAX_SPAWNS: 10, // number of child processes
    MAX_SPAWNS_PARALLEL: 5, // number of child processes will be executed in the same time
    MIN_RECORDS_PER_SPAWN: 2000, // number records each spawn
  },
};
