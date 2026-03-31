import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ASSET_URLS, MARKET_BASE_URL } from '../constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ensureFullUrl = (val: string | undefined, baseUrl: string, extension: string = '') => {
  if (!val) return '';
  const sVal = String(val).trim();
  if (!sVal) return '';
  if (sVal.startsWith('http') || sVal.startsWith('data:')) return sVal;
  
  const ext = extension ? (extension.startsWith('.') ? extension : '.' + extension) : '';
  
  if (baseUrl === 'miners') return ASSET_URLS.miner(sVal, ext);
  if (baseUrl === 'racks') return ASSET_URLS.rack(sVal);
  return `${baseUrl}${sVal}${ext}`;
};
