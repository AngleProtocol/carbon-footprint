import axios from 'axios';
import { Response } from 'express';

const ETHERSCAN_API_URL = process.env.MAINNET_ETHERSCAN_API_URL;
const ETHERSCAN_API_KEY = process.env.MAINNET_ETHERSCAN_API_KEY;

const fetchTxList = async (address: string, startBlock: number, endBlock: number, res: Response) => {
  if (!ETHERSCAN_API_URL || !ETHERSCAN_API_KEY) {
    res.status(550).send('Missing keys in .env');
  } else {
    // Fetch the list of this address transaction
    const url = new URL(ETHERSCAN_API_URL);

    url.searchParams.append('action', 'txlist');
    url.searchParams.append('module', 'account');
    url.searchParams.append('sort', 'desc');
    url.searchParams.append('startBlock', `${startBlock.toString()}`);
    url.searchParams.append('endBlock', `${endBlock.toString()}`);
    url.searchParams.append('apikey', ETHERSCAN_API_KEY);
    url.searchParams.append('address', address);

    const response = await axios.get(url.toString());
    if (response.status !== 200) {
      res.status(503).send('Etherscan unavailable');
    } else if (parseInt(response.data.status) !== 1) {
      return [];
    }
    return response.data.result;
  }
};

export default fetchTxList;
