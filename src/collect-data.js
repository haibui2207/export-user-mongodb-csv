const MongoClient = require('mongodb').MongoClient;
const { finalizeArgs } = require('jsuti');
const CONFIGS = require('./configs');
const fs = require('fs');

/**
 * possible args
 */
const possibleArgs = [
  {
    name: 'skip',
    arg: '--skip',
    abbr: '-sp',
    default: 0,
  },
  {
    name: 'limit',
    arg: '--limit',
    abbr: '-l',
    default: 100,
  },
  {
    name: 'filePath',
    arg: '--file-path',
    abbr: '-p',
    default: '.',
  },
];

// Start script
(async () => {
  let client;
  try {
    client = await MongoClient.connect(CONFIGS.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = client.db(CONFIGS.DB_NAME);
    const cliArgs = {};
    finalizeArgs(cliArgs, possibleArgs);

    const data = await db
      .collection(CONFIGS.COLLECTION_NAME)
      .find({})
      .skip(parseInt(cliArgs.skip))
      .limit(parseInt(cliArgs.limit))
      .toArray();

    fs.writeFileSync(cliArgs.filePath, JSON.stringify(data));
    console.log(`Write file successfully to ${cliArgs.filePath}`);
  } catch (e) {
    console.log(e);
  } finally {
    client.close();
  }
})();
