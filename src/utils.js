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

module.exports = {
  formatDate,
  formatUserRecordsCSV,
};
