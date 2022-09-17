import { ChainId } from '@angleprotocol/sdk';

import { httpProvider } from './provider';

const isContract = async (address: string): Promise<boolean> => {
  return (await httpProvider(ChainId.MAINNET)?.getCode(address)) !== '0x';
};

export default isContract;
