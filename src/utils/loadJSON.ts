import fs from 'fs';

const loadJSON = async (fileName: string): Promise<{ [blockNumber: number]: number }> => {
  let res = {};
  await fs.readFile(fileName, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return {};
    }
    res = JSON.parse(data);
  });

  return res;
};

export default loadJSON;
