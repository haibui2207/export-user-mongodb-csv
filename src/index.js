const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const fs = require('fs');
const {
  formatDate,
  formatUserRecordsCSV,
  adjustNumberOfSpawnsAndRecords,
  generateSpawn,
  generateCSVFile,
} = require('./utils');
const CONFIGS = require('./configs');
const chunk = require('lodash.chunk');

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

    // Create container folder which contains all sub processes folder
    // Make sure when trash folders included in container folder
    // Each export users request, we save all processes in a sub folder
    const exportUsersFolder = path.resolve(
      path.join(process.cwd(), 'export-users'),
    );
    if (!fs.existsSync(exportUsersFolder)) {
      fs.mkdirSync(exportUsersFolder);
    }
    const folderPath = path.resolve(
      path.join(exportUsersFolder, Date.now().toString()),
    );
    let csvRows = [CSV_COLUMNS.map((item) => item.columnName)];
    const {
      maxSpawns,
      maxSpawnsParallel,
      minRecordsPerSpawn,
    } = adjustNumberOfSpawnsAndRecords(totalRecords);
    console.log(`[DEBUG]: Total ${maxSpawns} spawns`);
    console.log(`[DEBUG]: Will be have ${maxSpawnsParallel} spawns run together in the same time`);

    const csvData = await new Promise((resolve, reject) => {
      console.log('[DEBUG]: Preparing data');
      const spawns = [];
      // Create folder to contain spawn files, prevent multiple export requests
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      for (let index = 0; index < maxSpawns; index++) {
        spawns.push(
          () =>
            new Promise((rs) => {
              console.log(`[DEBUG]: Start spawn ${index}`);
              generateSpawn(
                { index, folderPath, minRecordsPerSpawn },
                (error, data) => {
                  if (error) {
                    console.log(error);
                    reject(`[DEBUG]: Spawn ${index} failed`);
                  } else {
                    console.log(`[DEBUG]: Receive spawn ${index} data`);
                    csvRows = csvRows.concat(formatUserRecordsCSV(data, CSV_COLUMNS));
                    if (csvRows.length - 1 === totalRecords) {
                      console.log('[DEBUG]: Start generate csv content');
                      const csvContent = csvRows
                        .map((row) => row.join(','))
                        .join('\n');
                      resolve(csvContent);
                    }
                    rs();
                  }
                },
              );
            }),
        );
      }
      console.log('[DEBUG]: Exporting data');
      chunk(spawns, Math.ceil(spawns.length / maxSpawnsParallel)).forEach(
        async (currentSpawns) => {
          for (let index = 0; index < currentSpawns.length; index++) {
            try {
              await currentSpawns[index]();
            } catch(e) {
              console.log(e);
            }
          }
        },
      );
    });

    generateCSVFile(csvData, folderPath);
    console.log('[DEBUG]: Generate file successully!');
  } catch (e) {
    console.log(e);
    console.log('[DEBUG]: Cannot export csv');
  } finally {
    process.exit(1);
  }
})();
