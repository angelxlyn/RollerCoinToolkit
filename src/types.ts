export enum Rarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary',
  UNREAL = 'Unreal',
  LEGACY = 'Legacy'
}

export interface Part {
  id: string;
  name: string;
  rarity: Rarity;
  price: number;
}

export interface MinerRarity {
  power: number;
  bonus: number;
  marketUrl?: string;
}

export interface Miner {
  id: string;
  name: string;
  description?: string;
  cells: number;
  image?: string;
  tags: string[];
  rarities: Partial<Record<Rarity, MinerRarity>>;
  defaultRarity: Rarity;
  setId?: string;
  sellable?: boolean;
  marketUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rack {
  id: string;
  name: string;
  slots: number;
  bonus: number; // percentage
  image?: string;
  setId?: string;
  marketUrl?: string;
}

export interface CollectionSet {
  id: string;
  name: string;
  levels: {
    level: number;
    count: number; // Number of miners from this set in the rack
    power?: number; // Gh/s bonus
    bonus?: number; // percentage bonus
  }[];
  updatedAt?: string;
}

export enum CurrencyType {
  GAME = 'Game',
  CRYPTO = 'Crypto'
}

export interface Currency {
  id: string;
  name: string;
  symbol: string;
  type: CurrencyType;
  blockReward: number;
  blockTime: number; // in seconds
  networkPower: number; // in Eh/s
  price: number; // in USD
  minWithdrawal?: number;
  isWithdrawable?: boolean;
}

export type League = 
  | 'BRONZE I' | 'BRONZE II' | 'BRONZE III'
  | 'SILVER I' | 'SILVER II' | 'SILVER III'
  | 'GOLD I' | 'GOLD II' | 'GOLD III'
  | 'PLATINUM I' | 'PLATINUM II' | 'PLATINUM III'
  | 'DIAMOND I' | 'DIAMOND II' | 'DIAMOND III';

export enum PartType {
  FAN = 'Fan',
  HASHBOARD = 'Hashboard',
  WIRE = 'Wire'
}

export interface GlobalSettings {
  blockTimes: Record<string, Record<string, number>>;
  blockRewards: Record<string, Record<string, number>>;
  updatedAt: string;
  rewardsUpdatedAt?: string;
  timesUpdatedAt?: string;
}
