const MongoClient = require('mongodb').MongoClient;
const { finalizeArgs } = require('jsuti');
const CONFIGS = require('./configs');

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
    default: 0,
  },
];

// Start script
(async () => {
  try {
    const client = await MongoClient.connect(CONFIGS.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const db = client.db(CONFIGS.DB_NAME);
    const cliArgs = {};
    finalizeArgs(cliArgs, possibleArgs);

    const data = await db
      .collection(CONFIGS.COLLECTION_NAME)
      .find()
      .skip(parseInt(cliArgs.skip))
      .limit(parseInt(cliArgs.limit))
      .toArray();

    process.stdout.write(JSON.stringify(data));

    client.close();
  } catch (e) {
    // nothing
  }
})();
