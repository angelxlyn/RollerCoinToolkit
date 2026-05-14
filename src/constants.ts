import { Rarity, Currency, Miner, Rack, CurrencyType, PartType } from './types';

export const CURRENCIES: Currency[] = [
  // Game Currencies
  { id: 'rlt', name: 'RollerToken', symbol: 'RLT', type: CurrencyType.GAME, blockReward: 1.21, blockTime: 600, networkPower: 0, price: 1, minWithdrawal: 0, isWithdrawable: false },
  { id: 'rst', name: 'RollerSeasonToken', symbol: 'RST', type: CurrencyType.GAME, blockReward: 91, blockTime: 600, networkPower: 0, price: 0.01, minWithdrawal: 0, isWithdrawable: false },
  { id: 'hmt', name: 'HamsterToken', symbol: 'HMT', type: CurrencyType.GAME, blockReward: 2084, blockTime: 600, networkPower: 0, price: 0.005, minWithdrawal: 0, isWithdrawable: false },
  
  // Cryptocurrencies
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', type: CurrencyType.CRYPTO, blockReward: 0.00001275, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 0.00085, isWithdrawable: true },
  { id: 'ltc', name: 'Litecoin', symbol: 'LTC', type: CurrencyType.CRYPTO, blockReward: 0.0064, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 5, isWithdrawable: true },
  { id: 'bnb', name: 'Binance Coin', symbol: 'BNB', type: CurrencyType.CRYPTO, blockReward: 0.00109, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 0.06, isWithdrawable: true },
  { id: 'pol', name: 'Polygon', symbol: 'POL', type: CurrencyType.CRYPTO, blockReward: 7.16, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 300, isWithdrawable: true },
  { id: 'xrp', name: 'XRP', symbol: 'XRP', type: CurrencyType.CRYPTO, blockReward: 0.53, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 40, isWithdrawable: true },
  { id: 'doge', name: 'Dogecoin', symbol: 'DOGE', type: CurrencyType.CRYPTO, blockReward: 13.44, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 220, isWithdrawable: true },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', type: CurrencyType.CRYPTO, blockReward: 0.00074, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 0.014, isWithdrawable: true },
  { id: 'trx', name: 'Tron', symbol: 'TRX', type: CurrencyType.CRYPTO, blockReward: 14.28, blockTime: 600, networkPower: 0, price: 0., minWithdrawal: 300, isWithdrawable: true },  
  { id: 'sol', name: 'Solana', symbol: 'SOL', type: CurrencyType.CRYPTO, blockReward: 0.0368, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 0.6, isWithdrawable: true },
  { id: 'algo', name: 'Algorand', symbol: 'ALGO', type: CurrencyType.CRYPTO, blockReward: 7.2, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 0, isWithdrawable: false },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', type: CurrencyType.CRYPTO, blockReward: 1.316466, blockTime: 600, networkPower: 0, price: 0, minWithdrawal: 0, isWithdrawable: false },
];

export const LEAGUE_BLOCK_REWARDS: Record<string, Record<string, number>> = {
  'BRONZE I': { rlt: 0.76, rst: 48, btc: 0.00000201, ltc: 0.0015 },
  'BRONZE II': { rlt: 1.4, rst: 86, btc: 0.00000411, ltc: 0.00269, bnb: 0.0007 },
  'BRONZE III': { rlt: 1.55, rst: 117, btc: 0.00000759, ltc: 0.0049, bnb: 0.00087, pol: 6.73 },
  'SILVER I': { rlt: 0.91, rst: 69, btc: 0.00000439, ltc: 0.0026, bnb: 0.00044, pol: 3.27, xrp: 0.252, usdt: 0.14287 },
  'SILVER II': { rlt: 1.07, rst: 81, btc: 0.00000469, ltc: 0.0027, bnb: 0.000428, pol: 2.99, xrp: 0.219, doge: 5.6463, usdt: 0.195529 },
  'SILVER III': { rlt: 0.88, rst: 66, btc: 0.00000418, ltc: 0.0023, bnb: 0.000345, pol: 2.29, xrp: 0.159, doge: 3.899, eth: 0.0002, usdt: 0.274038 },
  'GOLD I': { rlt: 0.66, rst: 50, btc: 0.00000351, ltc: 0.0018, bnb: 0.000262, pol: 1.667, xrp: 0.109, doge: 2.5355, eth: 0.000123, trx: 2.185, usdt: 0.151647 },
  'GOLD II': { rlt: 1.06, rst: 80, btc: 0.00000561, ltc: 0.0023, bnb: 0.000349, pol: 2.011, xrp: 0.128, doge: 2.9918, eth: 0.00014, trx: 2.451, sol: 0.0089, hmt: 625, usdt: 0.274038 },
  'GOLD III': { rlt: 2.72, rst: 204, btc: 0.00001562, ltc: 0.0073, bnb: 0.001105, pol: 6.779, xrp: 0.446, doge: 10.6261, eth: 0.000515, trx: 9.235, sol: 0.0237, hmt: 1528, usdt: 1 },
  'PLATINUM I': { rlt: 4.5, rst: 338, btc: 0.00003147, ltc: 0.0152, bnb: 0.002376, pol: 15.074, xrp: 1.023, doge: 25.0678, eth: 0.001253, trx: 23.062, sol: 0.0307, algo: 26.9, hmt: 3125, usdt: 2.340383 },
  'PLATINUM II': { rlt: 2.11, rst: 158, btc: 0.00001928, ltc: 0.0093, bnb: 0.001512, pol: 9.765, xrp: 0.68, doge: 17.1362, eth: 0.000876, trx: 16.499, sol: 0.0337, algo: 11.2, hmt: 2430, usdt: 1.46274 },
  'PLATINUM III': { rlt: 1.21, rst: 91, btc: 0.00001301, ltc: 0.0064, bnb: 0.001085, pol: 7.227, xrp: 0.523, doge: 13.6452, eth: 0.00072, trx: 13.997, sol: 0.0359, algo: 7.2, hmt: 2084, usdt: 1.316466 },
  'DIAMOND I': { rst: 81, btc: 0.00001267, ltc: 0.0137, bnb: 0.001254, pol: 14.094, xrp: 0.87, doge: 14.4234, eth: 0.000664, trx: 4.326, sol: 0.01, algo: 16.2, usdt: 1.170192 },
  'DIAMOND II': { rst: 45.59218, btc: 0.00002695, ltc: 0.02255, bnb: 0.003047, pol: 16.271, xrp: 1, doge: 30.6835, eth: 0.000765, trx: 4.998, sol: 0.0166, algo: 34.4, usdt: 2.7 },
  'DIAMOND III': { rst: 352, btc: 0.00000416, ltc: 0.00508, bnb: 0.00052, pol: 3.812, xrp: 0.275, doge: 4.7027, eth: 0.000233, trx: 1.705, sol: 0.0058, algo: 8.18484, usdt: 1.38888 },
};

export const RARITY_COLORS = {
  [Rarity.COMMON]: 'bg-gray-400',
  [Rarity.UNCOMMON]: 'bg-green-500',
  [Rarity.RARE]: 'bg-blue-500',
  [Rarity.EPIC]: 'bg-purple-500',
  [Rarity.LEGENDARY]: 'bg-yellow-500',
  [Rarity.UNREAL]: 'bg-red-500',
  [Rarity.LEGACY]: 'bg-[#CD7F32]',
};

export const RARITY_ORDER = [
  Rarity.COMMON,
  Rarity.UNCOMMON,
  Rarity.RARE,
  Rarity.EPIC,
  Rarity.LEGENDARY,
  Rarity.UNREAL,
  Rarity.LEGACY
];

export const CONVERSION_RATES = {
  [Rarity.LEGENDARY]: { [Rarity.COMMON]: 50000, [Rarity.UNCOMMON]: 1000, [Rarity.RARE]: 50, [Rarity.EPIC]: 5 },
  [Rarity.EPIC]: { [Rarity.COMMON]: 10000, [Rarity.UNCOMMON]: 200, [Rarity.RARE]: 10 },
  [Rarity.RARE]: { [Rarity.COMMON]: 1000, [Rarity.UNCOMMON]: 20 },
  [Rarity.UNCOMMON]: { [Rarity.COMMON]: 50 },
  [Rarity.COMMON]: { [Rarity.COMMON]: 1 },
};

export const TRUSTED_EMAILS = [
  'roller@rc.gg',
  // Add other trusted emails here
];

export const PART_IDS: Record<string, Record<string, string>> = {
  [PartType.FAN]: {
    [Rarity.COMMON]: '61b35fea67433d2dc586f7fe',
    [Rarity.UNCOMMON]: '6319f7baa8ce530569ed16b9',
    [Rarity.RARE]: '61b35dac67433d2dc57d1156',
    [Rarity.EPIC]: '6319f918a8ce530569f33dd5',
    [Rarity.LEGENDARY]: '6196269b67433d2dc52e0130',
  },
  [PartType.HASHBOARD]: {
    [Rarity.COMMON]: '61b3606767433d2dc58913a9',
    [Rarity.UNCOMMON]: '6319f840a8ce530569ef82b7',
    [Rarity.RARE]: '61b35e3767433d2dc57f86a2',
    [Rarity.EPIC]: '6319fc56a8ce530569024d79',
    [Rarity.LEGENDARY]: '6196289f67433d2dc53c0c5d',
  },
  [PartType.WIRE]: {
    [Rarity.COMMON]: '61b3604967433d2dc58893b0',
    [Rarity.UNCOMMON]: '6319f81fa8ce530569eee9dd',
    [Rarity.RARE]: '61b35dcd67433d2dc57daca3',
    [Rarity.EPIC]: '6319f969a8ce530569f4b3e8',
    [Rarity.LEGENDARY]: '6196281467433d2dc53872b3',
  },
};

export const LEAGUE_IDS: Record<string, string> = {
  'BRONZE I': '68af01ce48490927df92d687',
  'BRONZE II': '68af01ce48490927df92d686',
  'BRONZE III': '68af01ce48490927df92d685',
  'SILVER I': '68af01ce48490927df92d684',
  'SILVER II': '68af01ce48490927df92d683',
  'SILVER III': '68af01ce48490927df92d682',
  'GOLD I': '68af01ce48490927df92d681',
  'GOLD II': '68af01ce48490927df92d680',
  'GOLD III': '68af01ce48490927df92d67f',
  'PLATINUM I': '68af01ce48490927df92d67e',
  'PLATINUM II': '68af01ce48490927df92d67d',
  'PLATINUM III': '68af01ce48490927df92d67c',
  'DIAMOND I': '68af01ce48490927df92d67b',
  'DIAMOND II': '68af01ce48490927df92d67a',
  'DIAMOND III': '68af01ce48490927df92d679',
};

export const MARKET_BASE_URL = 'https://rollercoin.com/marketplace/buy/miner/';
export const RACK_MARKET_BASE_URL = 'https://rollercoin.com/marketplace/buy/rack/';
export const PART_MARKET_BASE_URL = 'https://rollercoin.com/marketplace/buy/mutation_component/';

export const ASSET_URLS = {
  rarity: (rarity: string) => {
    if (rarity.toLowerCase() === 'legacy') {
      return 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/D_5qvuWhkX-PFUFKeh0mq.png';
    }
    const levelMap: Record<string, string> = {
      'common': 'level_1',
      'uncommon': 'level_2',
      'rare': 'level_3',
      'epic': 'level_4',
      'legendary': 'level_5',
      'unreal': 'level_6',
    };
    const level = levelMap[rarity.toLowerCase()] || rarity.toLowerCase();
    return `https://rollercoin.com/static/img/storage/rarity_icons/${level}.png`;
  },
  part: (type: string, rarity: string) => {
    const id = PART_IDS[type]?.[rarity] || `${type.toLowerCase()}_${rarity.toLowerCase()}`;
    return `https://static.rollercoin.com/static/img/storage/mutation_components/${id}.png`;
  },
  currency: (id: string) => {
    const iconId = id.toLowerCase() === 'pol' ? 'matic' : id.toLowerCase();
    return `https://rollercoin.com/static/img/wallet/${iconId}.svg`;
  },
  league: (league: string) => {
    const id = LEAGUE_IDS[league] || league.toLowerCase().replace(/ /g, '_');
    return `https://static.rollercoin.com/static/img/icons/leagues/${id}.png`;
  },
  miner: (id: string, ext: string = '.gif') => `https://static.rollercoin.com/static/img/market/miners/${id}${ext.startsWith('.') ? ext : '.' + ext}`,
  rack: (id: string) => `https://static.rollercoin.com/static/img/market/racks/${id}.png`,
};
