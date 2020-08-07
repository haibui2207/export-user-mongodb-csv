const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const CONFIGS = require('./configs');

function formatDate(number) {
  if (!number) {
    return '';
  }

  const d = new Date(number);
  let day = d.getDate();
  let month = d.getMonth() + 1;
  let year = d.getFullYear();

  month = month < 10 ? `0${month}` : month;
  day = day < 10 ? `0${day}` : day;

  return [month, day, year].join('/');
}

const formatUserRecordsCSV = (data, columnConfigs) => {
  if (
    !data ||
    data.length === 0 ||
    !columnConfigs ||
    columnConfigs.length === 0
  )
    return [];

  return data.map((item) =>
    columnConfigs.map((column) =>
      column.formatValueFunc
        ? column.formatValueFunc(item[column.dbProperty])
        : item[column.dbProperty],
    ),
  );
};

const adjustNumberOfSpawnsAndRecords = (
  totalRecords,
  maxSpawns = CONFIGS.PROCESS.MAX_SPAWNS,
  maxSpawnsParallel = CONFIGS.PROCESS.MAX_SPAWNS_PARALLEL,
  minRecordsPerSpawn = CONFIGS.PROCESS.MIN_RECORDS_PER_SPAWN,
) => {
  if (!totalRecords) return {};
  const ajustedMaxSpawnsParallel = Math.max(
    0,
    maxSpawnsParallel > maxSpawns ? maxSpawns : maxSpawnsParallel,
  );

  // spawns larger than maxSpawns, increase records amount per spawns
  if (Math.ceil(totalRecords / minRecordsPerSpawn) > maxSpawns) {
    return {
      maxSpawns,
      maxSpawnsParallel: ajustedMaxSpawnsParallel,
      minRecordsPerSpawn: Math.ceil(totalRecords / maxSpawns),
    };
  } else {
    // spawns smaller than maxSpawns
    // and records amount smaller than minRecordsPerSpawn
    // decrease amount of spawns
    if (Math.ceil(totalRecords / maxSpawns) < minRecordsPerSpawn) {
      return {
        maxSpawnsParallel,
        maxSpawnsParallel: ajustedMaxSpawnsParallel,
        maxSpawns: Math.ceil(totalRecords / minRecordsPerSpawn),
      };
    }
  }

  return {
    maxSpawns,
    maxSpawnsParallel: ajustedMaxSpawnsParallel,
    minRecordsPerSpawn,
  };
};

const generateSpawn = ({ index, folderPath, minRecordsPerSpawn }, callback) => {
  const spawnFilePath = path.resolve(
    path.join(folderPath, `export-spawn-${index}.txt`),
  );
  const child = cp.spawn(
    'node',
    [
      path.resolve(path.join(process.cwd(), 'collect-data.js')),
      '--skip',
      index * minRecordsPerSpawn,
      '--limit',
      minRecordsPerSpawn,
      '--file-path',
      spawnFilePath,
    ],
    { stdio: ['ignore', 'pipe', process.stderr] },
  );
  child.stdout.on('data', (data) => {
    console.log(
      `[DEBUG]: Receive spawn [${index}] message: ${JSON.stringify(
        data.toString(),
      )}`,
    );
    if (fs.existsSync(spawnFilePath)) {
      const spawnData = fs.readFileSync(spawnFilePath, {
        encoding: 'utf-8',
      });
      if (spawnData) {
        callback(null, JSON.parse(spawnData));
      } else {
        callback(`[DEBUG]: Receive spawn ${index} data null`, null);
      }
    } else {
      callback(
        `[DEBUG]: Cannot read/Missing file spawn ${spawnFilePath}`,
        null,
      );
    }
  });
  child.on('exit', (code) => {
    if (code === 1) {
      callback(`[DEBUG]: Exit spawn number ${index} with code ${code}`, null);
    }
  });
};

const generateCSVFile = (data, folderPath) => {
  const fileName = 'users.csv';
  const filePath = path.resolve(path.join(folderPath, fileName));
  fs.writeFileSync(filePath, data);

  return { fileName, filePath };
};

module.exports = {
  formatDate,
  formatUserRecordsCSV,
  adjustNumberOfSpawnsAndRecords,
  generateSpawn,
  generateCSVFile,
};
