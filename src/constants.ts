import { Rarity, Currency, Miner, Rack, CurrencyType } from './types';

export const CURRENCIES: Currency[] = [
  // Game Currencies
  { id: 'rlt', name: 'RollerToken', symbol: 'RLT', type: CurrencyType.GAME, blockReward: 20, blockTime: 596, networkPower: 0, price: 1, minWithdrawal: 0, isWithdrawable: false },
  { id: 'rst', name: 'RollerSeasonToken', symbol: 'RST', type: CurrencyType.GAME, blockReward: 150, blockTime: 596, networkPower: 0, price: 0.01, minWithdrawal: 0, isWithdrawable: false },
  { id: 'hmt', name: 'HamsterToken', symbol: 'HMT', type: CurrencyType.GAME, blockReward: 50, blockTime: 596, networkPower: 0, price: 0.005, minWithdrawal: 0, isWithdrawable: false },
  
  // Cryptocurrencies
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', type: CurrencyType.CRYPTO, blockReward: 0.00035, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 0.00085, isWithdrawable: true },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', type: CurrencyType.CRYPTO, blockReward: 0.005, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 0.014, isWithdrawable: true },
  { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', type: CurrencyType.CRYPTO, blockReward: 20, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 220, isWithdrawable: true },
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC', type: CurrencyType.CRYPTO, blockReward: 0.015, blockTime: 602, networkPower: 0, price: 0, minWithdrawal: 5, isWithdrawable: true },
  { id: 'bnb', name: 'Binance Coin', symbol: 'BNB', type: CurrencyType.CRYPTO, blockReward: 0.012, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 0.06, isWithdrawable: true },
  { id: 'pol', name: 'Polygon', symbol: 'POL', type: CurrencyType.CRYPTO, blockReward: 3.5, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 300, isWithdrawable: true },
  { id: 'xrp', name: 'XRP', symbol: 'XRP', type: CurrencyType.CRYPTO, blockReward: 15, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 40, isWithdrawable: true },
  { id: 'trx', name: 'Tron', symbol: 'TRX', type: CurrencyType.CRYPTO, blockReward: 45, blockTime: 602, networkPower: 0, price: 0., minWithdrawal: 300, isWithdrawable: true },
  { id: 'sol', name: 'Solana', symbol: 'SOL', type: CurrencyType.CRYPTO, blockReward: 0.05, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 0.6, isWithdrawable: true },
  { id: 'algo', name: 'Algorand', symbol: 'ALGO', type: CurrencyType.CRYPTO, blockReward: 25, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 0, isWithdrawable: false },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', type: CurrencyType.CRYPTO, blockReward: 30, blockTime: 596, networkPower: 0, price: 0, minWithdrawal: 0, isWithdrawable: false },
];

export const LEAGUE_BLOCK_REWARDS: Record<string, Record<string, number>> = {
  'BRONZE I': { rlt: 0.76, rst: 48, btc: 0.00000201, ltc: 0.0015 },
  'BRONZE II': { rlt: 1.4, rst: 86, btc: 0.00000411, ltc: 0.00269, bnb: 0.0007 },
  'BRONZE III': { rlt: 1.55, rst: 117, btc: 0.00000759, ltc: 0.0049, bnb: 0.00087, pol: 6.73 },
  'SILVER I': { rlt: 0.91, rst: 69, btc: 0.0000043, ltc: 0.0026, bnb: 0.00044, pol: 3.27, xrp: 0.26, usdt: 0.14287 },
  'SILVER II': { rlt: 1.07, rst: 49.61213, btc: 0.00000459, ltc: 0.0027, bnb: 0.00043, pol: 2.99, xrp: 0.22, doge: 5.56, usdt: 0.195529 },
  'SILVER III': { rlt: 0.88, rst: 66, btc: 0.0000041, ltc: 0.0023, bnb: 0.00035, pol: 2.29, xrp: 0.16, doge: 3.84, eth: 0.00021, usdt: 0.274038 },
  'GOLD I': { rlt: 0.66, rst: 50, btc: 0.00000345, ltc: 0.0018, bnb: 0.00026, pol: 1.65, xrp: 0.11, doge: 2.5, eth: 0.00013, trx: 2.23, usdt: 0.151647 },
  'GOLD II': { rlt: 1.06, rst: 80, btc: 0.0000036, ltc: 0.0023, bnb: 0.00035, pol: 1.99, xrp: 0.13, doge: 2.95, eth: 0.00014, trx: 2.5, sol: 0.0093, hmt: 625, usdt: 0.274038 },
  'GOLD III': { rlt: 2.72, rst: 204, btc: 0.00001531, ltc: 0.0073, bnb: 0.00111, pol: 6.71, xrp: 0.46, doge: 10.47, eth: 0.00053, trx: 9.42, sol: 0.0243, hmt: 1528, usdt: 1 },
  'PLATINUM I': { rlt: 4.5, rst: 338, btc: 0.00003085, ltc: 0.0152, bnb: 0.00238, pol: 14.92, xrp: 1.04, doge: 24.7, eth: 0.00129, trx: 23.53, sol: 0.0315, algo: 26.9, hmt: 3125, usdt: 2.340383 },
  'PLATINUM II': { rlt: 2.11, rst: 158, btc: 0.0000189, ltc: 0.0093, bnb: 0.00151, pol: 9.67, xrp: 0.69, doge: 16.88, eth: 0.0009, trx: 16.84, sol: 0.0346, algo: 11.2, hmt: 2430, usdt: 1.46274 },
  'PLATINUM III': { rlt: 1.21, rst: 91, btc: 0.00001275, ltc: 0.0064, bnb: 0.00109, pol: 7.16, xrp: 0.53, doge: 13.44, eth: 0.00074, trx: 14.28, sol: 0.0368, algo: 7.2, hmt: 2084, usdt: 1.316466 },
  'DIAMOND I': { rst: 81, btc: 0.00001242, ltc: 0.0137, bnb: 0.00126, pol: 13.95, xrp: 0.89, doge: 14.21, eth: 0.00068, trx: 4.41, sol: 0.0115, algo: 16.2, usdt: 1.170192 },
  'DIAMOND II': { rst: 45.59218, btc: 0.0000151, ltc: 0.0167, bnb: 0.00174, pol: 16.96, xrp: 1.08, doge: 17.28, eth: 0.00083, trx: 5.37, sol: 0.0133, algo: 19.7, usdt: 1.609014 },
  'DIAMOND III': { rst: 88, btc: 0.00000102, ltc: 0.00127, bnb: 0.00013, pol: 0.94354, xrp: 0.07015, doge: 1.1583, eth: 0.00006, trx: 0.43505, sol: 0.00162, algo: 2.04621, usdt: 0.34722 },
};

export const RARITY_COLORS = {
  [Rarity.COMMON]: 'bg-gray-400',
  [Rarity.UNCOMMON]: 'bg-green-500',
  [Rarity.RARE]: 'bg-blue-500',
  [Rarity.EPIC]: 'bg-purple-500',
  [Rarity.LEGENDARY]: 'bg-yellow-500',
};

export const CONVERSION_RATES = {
  [Rarity.LEGENDARY]: { [Rarity.COMMON]: 50000, [Rarity.UNCOMMON]: 1000, [Rarity.RARE]: 50, [Rarity.EPIC]: 5 },
  [Rarity.EPIC]: { [Rarity.COMMON]: 10000, [Rarity.UNCOMMON]: 200, [Rarity.RARE]: 10 },
  [Rarity.RARE]: { [Rarity.COMMON]: 1000, [Rarity.UNCOMMON]: 20 },
  [Rarity.UNCOMMON]: { [Rarity.COMMON]: 50 },
  [Rarity.COMMON]: { [Rarity.COMMON]: 1 },
};

import minersData from './data/miners.json';
import racksData from './data/racks.json';

export const MINERS_DB = minersData as Miner[];
export const RACKS = racksData as Rack[];


