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
};
