const MongoClient = require('mongodb').MongoClient;
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const { formatDate, formatUserRecordsCSV } = require('./utils');
const CONFIGS = require('./configs');

const CSV_COLUMNS = [
  { columnName: 'ID', dbProperty: '_id', formatValueFunc: null },
  { columnName: 'FirstName', dbProperty: 'firstName', formatValueFunc: null },
  { columnName: 'LastName', dbProperty: 'lastName', formatValueFunc: null },
  { columnName: 'EmailAddress', dbProperty: 'emailAddress', formatValueFunc: null },
  { columnName: 'PhoneNumber', dbProperty: 'phoneNumber', formatValueFunc: null },
  { columnName: 'EmailStatus', dbProperty: 'emailStatus', formatValueFunc: null },
  { columnName: 'PhoneStatus', dbProperty: 'phoneStatus', formatValueFunc: null },
  { columnName: 'Credits', dbProperty: 'credits', formatValueFunc: null },
  { columnName: 'CreatedDate', dbProperty: 'createdAt', formatValueFunc: formatDate },
  { columnName: 'LastActivityDate', dbProperty: 'updatedAt', formatValueFunc: formatDate },
];

(async () => {
  try {
    const client = await MongoClient.connect(CONFIGS.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const db = client.db(CONFIGS.DB_NAME);
    const totalRecords = await db
      .collection(CONFIGS.COLLECTION_NAME)
      .countDocuments();
    console.log(`[DEBUG]: Total ${totalRecords} records`);
    let minRecordsPerSpawn = 2000;
    let maxSpawns = 10;
    let cvsRows = [CSV_COLUMNS.map((item) => item.columnName)];

    // spawns larger than maxSpawns, increase records amount per spawns
    if (Math.ceil(totalRecords / minRecordsPerSpawn) > maxSpawns) {
      minRecordsPerSpawn = Math.ceil(totalRecords / maxSpawns);
    } else {
      // spawns smaller than maxSpawns
      // and records amount smaller than minRecordsPerSpawn
      // decrease amount of spawns
      if (Math.ceil(totalRecords / maxSpawns) < minRecordsPerSpawn) {
        maxSpawns = Math.ceil(totalRecords / minRecordsPerSpawn);
      }
    }

    const csvData = await new Promise((resolve, reject) => {
      console.log('[DEBUG]: Exporting data');
      for (let index = 0; index < maxSpawns; index++) {
        console.log(`[DEBUG]: Start spawn ${index}`);
        const child = cp.spawn('node', [
          path.resolve(path.join(process.cwd(), 'collect-data.js')),
          '--skip',
          index * minRecordsPerSpawn,
          '--limit',
          minRecordsPerSpawn,
        ]);
        child.stdout.on('data', (data) => {
          console.log(`[DEBUG]: Receive spawn ${index} data`);

          try {
            const formatedData = JSON.parse(data.toString());
            cvsRows = cvsRows.concat(formatUserRecordsCSV(formatedData, CSV_COLUMNS));
            if (cvsRows.length - 1 === totalRecords) {
              console.log('[DEBUG]: Start generate csv content');
              const csvContent = cvsRows.map((r) => r.join(',')).join('\n');
              resolve(csvContent);
            }
          } catch (e) {
            console.log(`[DEBUG]: Cannot parse data error: ${e}`);
            throw new Error(`Cannot parse data`);
          }
        });
        child.on('exit', (code) => {
          if (code === 1) {
            console.log(
              `[DEBUG]: Exit spawn number ${index} with code ${code}`,
            );
            reject(code);
          }
        });
      }
    });

    const filePath = path.resolve(path.join(process.cwd(), 'data.csv'));
    fs.writeFileSync(filePath, csvData);
    console.debug('[DEBUG]: Completed generate csv file');
    client.close();
  } catch (e) {
    console.log(`[ERROR]: Something wrong: ${e}`);
  } finally {
    console.debug('[DEBUG]: Closed connection');
    process.exit(1);
  }
})();
