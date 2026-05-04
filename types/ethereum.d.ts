interface EthereumProvider {
  isMiniPay?: boolean;
  isMetaMask?: boolean;
  isValora?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  send?: (...args: unknown[]) => unknown;
  sendAsync?: (...args: unknown[]) => unknown;
  enable?: () => Promise<string[]>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
