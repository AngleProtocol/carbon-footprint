import fs from 'fs';

const loadJSON = async (fileName: string): Promise<{ [blockNumber: number]: number }> => {
  return JSON.parse(await fs.promises.readFile(fileName, 'utf8'));
};

export default loadJSON;
