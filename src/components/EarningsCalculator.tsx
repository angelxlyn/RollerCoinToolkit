import React, { useState, useMemo, useEffect } from 'react';
import { CURRENCIES, LEAGUE_BLOCK_REWARDS, ASSET_URLS } from '../constants';
import { CurrencyType, League, GlobalSettings } from '../types';
import { fetchSettings } from '../services/apiService';
import { TrendingUp, Zap, Trophy, Globe, Coins, ClipboardPaste, X, Check, HelpCircle, Settings, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { fetchCryptoPrices } from '../services/priceService';

const LEAGUES: League[] = [
  'BRONZE I', 'BRONZE II', 'BRONZE III',
  'SILVER I', 'SILVER II', 'SILVER III',
  'GOLD I', 'GOLD II', 'GOLD III',
  'PLATINUM I', 'PLATINUM II', 'PLATINUM III',
  'DIAMOND I', 'DIAMOND II', 'DIAMOND III'
];

const LEAGUE_CURRENCIES: Record<League, string[]> = {
  'BRONZE I': ['rlt', 'rst', 'btc', 'ltc'],
  'BRONZE II': ['rlt', 'rst', 'btc', 'ltc', 'bnb'],
  'BRONZE III': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol'],
  'SILVER I': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'usdt'],
  'SILVER II': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'usdt'],
  'SILVER III': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'usdt'],
  'GOLD I': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'usdt'],
  'GOLD II': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'hmt', 'usdt'],
  'GOLD III': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'hmt', 'usdt'],
  'PLATINUM I': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'algo', 'hmt', 'usdt'],
  'PLATINUM II': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'algo', 'hmt', 'usdt'],
  'PLATINUM III': ['rlt', 'rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'algo', 'hmt', 'usdt'],
  'DIAMOND I': ['rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'algo', 'usdt'],
  'DIAMOND II': ['rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'algo', 'usdt'],
  'DIAMOND III': ['rst', 'btc', 'ltc', 'bnb', 'pol', 'xrp', 'doge', 'eth', 'trx', 'sol', 'algo', 'usdt'],
};

type PowerUnit = 'Gh' | 'Th' | 'Ph' | 'Eh' | 'Zh';

const LEAGUE_POWER_GOALS: Record<League, { value: number; unit: PowerUnit }> = {
  'BRONZE I': { value: 0, unit: 'Gh' },
  'BRONZE II': { value: 5, unit: 'Ph' },
  'BRONZE III': { value: 30, unit: 'Ph' },
  'SILVER I': { value: 100, unit: 'Ph' },
  'SILVER II': { value: 200, unit: 'Ph' },
  'SILVER III': { value: 500, unit: 'Ph' },
  'GOLD I': { value: 1, unit: 'Eh' },
  'GOLD II': { value: 2, unit: 'Eh' },
  'GOLD III': { value: 5, unit: 'Eh' },
  'PLATINUM I': { value: 15, unit: 'Eh' },
  'PLATINUM II': { value: 50, unit: 'Eh' },
  'PLATINUM III': { value: 100, unit: 'Eh' },
  'DIAMOND I': { value: 200, unit: 'Eh' },
  'DIAMOND II': { value: 400, unit: 'Eh' },
  'DIAMOND III': { value: 10, unit: 'Zh' },
};

export default function EarningsCalculator() {
  const [selectedLeague, setSelectedLeague] = useState<League>(() => {
    const saved = localStorage.getItem('rollercoin_selected_league');
    return (saved as League) || 'BRONZE I';
  });
  const [userPower, setUserPower] = useState<number | string>(() => {
    const saved = localStorage.getItem('rollercoin_user_power');
    return saved ? parseFloat(saved) : 0;
  });
  const [powerUnit, setPowerUnit] = useState<PowerUnit>(() => {
    const saved = localStorage.getItem('rollercoin_power_unit');
    return (saved as PowerUnit) || 'Gh';
  });
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsModalType, setSettingsModalType] = useState<CurrencyType | null>(null);
  const [currencyOverrides, setCurrencyOverrides] = useState<Record<string, { blockReward?: number | string; blockTime?: number | string }>>(() => {
    const saved = localStorage.getItem('rollercoin_currency_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  const [cryptoSortBy, setCryptoSortBy] = useState<'earnings' | 'withdrawal'>('earnings');

  const [isMarketPricesOpen, setIsMarketPricesOpen] = useState(false);
  const [isMinWithdrawalsOpen, setIsMinWithdrawalsOpen] = useState(false);

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSettings();
        setGlobalSettings(settings);
      } catch (err) {
        console.error('Failed to load global settings:', err);
      }
    };
    loadSettings();
  }, []);

  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(0);

  const updatePrices = async (isManual = false) => {
    if (isManual && refreshCooldown > 0) return;
    
    setIsFetchingPrices(true);
    const prices = await fetchCryptoPrices();
    if (Object.keys(prices).length > 0) {
      setLivePrices(prices);
    }
    setIsFetchingPrices(false);
    
    if (isManual) {
      setRefreshCooldown(30);
    }
  };

  useEffect(() => {
    updatePrices();
    // Refresh every 5 minutes
    const interval = setInterval(() => updatePrices(false), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshCooldown > 0) {
      const timer = setTimeout(() => setRefreshCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshCooldown]);

  const handleLeagueChange = (league: League) => {
    setSelectedLeague(league);
    const goal = LEAGUE_POWER_GOALS[league];
    setUserPower(goal.value);
    setPowerUnit(goal.unit);
  };
  
  // Custom network powers (League Power) in Th/s
  const [customNetworkPowers, setCustomNetworkPowers] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('rollercoin_custom_network_powers');
    return saved ? JSON.parse(saved) : {};
  });
  const [distribution, setDistribution] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('rollercoin_distribution');
    return saved ? JSON.parse(saved) : {};
  });

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('rollercoin_selected_league', selectedLeague);
    localStorage.setItem('rollercoin_user_power', userPower.toString());
    localStorage.setItem('rollercoin_power_unit', powerUnit);
    localStorage.setItem('rollercoin_currency_overrides', JSON.stringify(currencyOverrides));
    localStorage.setItem('rollercoin_custom_network_powers', JSON.stringify(customNetworkPowers));
    localStorage.setItem('rollercoin_distribution', JSON.stringify(distribution));
  }, [selectedLeague, userPower, powerUnit, currencyOverrides, customNetworkPowers, distribution]);

  const totalUserPowerTh = useMemo(() => {
    let base = typeof userPower === 'string' ? (parseFloat(userPower) || 0) : userPower;
    if (powerUnit === 'Gh') base /= 1000;
    if (powerUnit === 'Ph') base *= 1000;
    if (powerUnit === 'Eh') base *= 1000000;
    if (powerUnit === 'Zh') base *= 1000000000;
    return base;
  }, [userPower, powerUnit]);

  const availableCurrencies = useMemo(() => {
    const allowedIds = LEAGUE_CURRENCIES[selectedLeague];
    return CURRENCIES.filter(c => allowedIds.includes(c.id));
  }, [selectedLeague]);

  const handlePaste = () => {
    const lines = pasteText.split('\n').map(l => l.trim()).filter(l => l !== '');
    const results: Record<string, number> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      const currency = CURRENCIES.find(c => 
        c.symbol.toLowerCase() === line || 
        c.id.toLowerCase() === line ||
        (line === 'matic' && c.id === 'pol') ||
        (line === 'tether' && c.id === 'usdt')
      );
      
      if (currency) {
        // Find the line containing the power value (usually 2 lines down)
        // We look ahead a bit to find a line with a unit
        for (let j = 1; j <= 3; j++) {
          const nextLine = lines[i + j];
          if (nextLine) {
            const match = nextLine.match(/([\d,.]+)\s*([a-zA-Z/]+)/);
            if (match) {
              const val = parseFloat(match[1].replace(/,/g, ''));
              const unit = match[2].toLowerCase();
              let thValue = val;
              if (unit.includes('gh')) thValue /= 1000;
              if (unit.includes('ph')) thValue *= 1000;
              if (unit.includes('eh')) thValue *= 1000000;
              if (unit.includes('zh')) thValue *= 1000000000;
              results[currency.id] = thValue;
              break;
            }
          }
        }
      }
    }
    
    setCustomNetworkPowers(prev => ({ ...prev, ...results }));
    setIsPasteModalOpen(false);
    setPasteText('');
  };

  const calculateEarnings = (currency: typeof CURRENCIES[0]) => {
    const allocatedPowerTh = totalUserPowerTh;
    
    // Use overrides if available
    const overrides = currencyOverrides[currency.id] || {};
    const baseReward = globalSettings?.blockRewards?.[selectedLeague]?.[currency.id] ?? LEAGUE_BLOCK_REWARDS[selectedLeague]?.[currency.id] ?? currency.blockReward;
    const blockReward = (overrides.blockReward !== undefined && overrides.blockReward !== '') ? Number(overrides.blockReward) : baseReward;
    const blockTime = (overrides.blockTime !== undefined && overrides.blockTime !== '') ? Number(overrides.blockTime) : (globalSettings?.blockTimes?.[selectedLeague]?.[currency.id] ?? currency.blockTime);
    
    // Use live price if available, otherwise fallback to default
    const currentPrice = livePrices[currency.id] || currency.price;
    
    // Use custom network power if available, otherwise fallback to default
    const networkPowerTh = customNetworkPowers[currency.id] || (currency.networkPower * 1000000);
    
    const userShare = networkPowerTh > 0 ? allocatedPowerTh / networkPowerTh : 0;
    const rewardPerBlock = userShare * blockReward;
    
    const blocksPerDay = (24 * 60 * 60) / blockTime;
    const daily = rewardPerBlock * blocksPerDay;
    
    return {
      allocatedPowerTh,
      networkPowerTh,
      rewardPerBlock,
      daily,
      weekly: daily * 7,
      monthly: daily * 30,
      dailyUsd: daily * currentPrice,
      weeklyUsd: daily * 7 * currentPrice,
      monthlyUsd: daily * 30 * currentPrice,
      currentPrice,
    };
  };

  const formatPower = (thValue: number) => {
    if (thValue >= 1000000000) return `${(thValue / 1000000000).toFixed(3)} Zh/s`;
    if (thValue >= 1000000) return `${(thValue / 1000000).toFixed(3)} Eh/s`;
    if (thValue >= 1000) return `${(thValue / 1000).toFixed(3)} Ph/s`;
    return `${thValue.toFixed(3)} Th/s`;
  };

  const formatTimeToWithdraw = (dailyAmount: number, minWithdrawal: number, isWithdrawable: boolean = true) => {
    if (!isWithdrawable) return 'N/A';
    if (dailyAmount <= 0 || minWithdrawal <= 0) return 'N/A';
    const totalHours = (minWithdrawal / dailyAmount) * 24;
    const days = Math.floor(totalHours / 24);
    const hours = Math.ceil(totalHours % 24);
    
    if (days === 0) return `${hours}H`;
    return `${days}D ${hours}H`;
  };

  const formatNumber = (num: number, decimals: number = 6) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatPrice = (price: number, id: string) => {
    if (id === 'usdt' || price === 1) return price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    
    let decimals = 2;
    if (price < 1) decimals = 3;
    if (price < 0.1) decimals = 4;
    if (price < 0.01) decimals = 6;
    
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  const formatMinWithdrawalAmount = (amount: number, symbol: string) => {
    let decimals = 2;
    if (amount < 1) decimals = 4;
    if (amount < 0.01) decimals = 6;
    if (amount < 0.001) decimals = 8;

    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }) + ' ' + symbol;
  };

  const renderCurrencyTable = (type: CurrencyType) => {
    let filtered = availableCurrencies.filter(c => c.type === type);
    if (filtered.length === 0) return null;

    if (type === CurrencyType.CRYPTO) {
      filtered = [...filtered].sort((a, b) => {
        const ea = calculateEarnings(a);
        const eb = calculateEarnings(b);
        
        if (cryptoSortBy === 'earnings') {
          return eb.dailyUsd - ea.dailyUsd;
        } else {
          if (!a.isWithdrawable && !b.isWithdrawable) return 0;
          if (!a.isWithdrawable) return 1;
          if (!b.isWithdrawable) return -1;
          
          const timeA = (a.minWithdrawal || 0) / ea.daily;
          const timeB = (b.minWithdrawal || 0) / eb.daily;
          return timeA - timeB;
        }
      });
    }

    return (
      <div className="rounded-[32px] border border-slate-700 bg-slate-800/30 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-700/50 bg-slate-800/20">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="whitespace-nowrap">{type} Currencies</span>
            </h3>
            {type === CurrencyType.CRYPTO && (
              <div className="flex items-center bg-slate-900/50 rounded-lg p-0.5 border border-slate-700/50 overflow-x-auto no-scrollbar shrink">
                <button
                  onClick={() => setCryptoSortBy('earnings')}
                  className={cn(
                    "px-2 sm:px-3 py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap",
                    cryptoSortBy === 'earnings' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Earnings
                </button>
                <button
                  onClick={() => setCryptoSortBy('withdrawal')}
                  className={cn(
                    "px-2 sm:px-3 py-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded-md transition-all whitespace-nowrap",
                    cryptoSortBy === 'withdrawal' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Withdrawal
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSettingsModalType(type)}
            className="p-1.5 sm:p-2 hover:bg-slate-700/50 rounded-xl transition-all text-slate-400 hover:text-white group shrink-0"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        <div className="overflow-x-auto relative pb-2">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <th className="w-16 px-4 sticky left-0 z-20 bg-[#1a2438] text-center"></th>
                <th className="px-6 py-4 text-left">Currency</th>
                <th className="px-6 py-4 text-center">League Power</th>
                <th className="px-6 py-4 text-center">Block Reward</th>
                <th className="px-6 py-4 text-center">Daily</th>
                <th className="px-6 py-4 text-center">Weekly</th>
                <th className="px-6 py-4 text-center">Monthly</th>
                {type === CurrencyType.CRYPTO && <th className="px-6 py-4 text-center">Withdrawal In</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map(c => {
                const e = calculateEarnings(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="w-16 px-4 sticky left-0 z-10 bg-[#141c2f] group-hover:bg-[#1e293b] transition-colors">
                      <div className="w-10 h-10 flex items-center justify-center mx-auto overflow-hidden">
                        <img 
                          src={ASSET_URLS.currency(c.id)}
                          alt={c.symbol}
                          className="w-full h-full object-contain p-1.5"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerText = c.symbol[0];
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-5 min-w-[100px]">
                      <p className="font-bold text-white tracking-tight">{c.symbol}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-white">{formatPower(e.networkPowerTh)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-white">{formatNumber(e.rewardPerBlock, 8)}</p>
                      {c.type === CurrencyType.CRYPTO && (
                        <p className="text-sm text-emerald-400">${formatNumber(e.rewardPerBlock * e.currentPrice, 6)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-white">{formatNumber(e.daily, 6)}</p>
                      {c.type === CurrencyType.CRYPTO && (
                        <p className="text-sm text-emerald-400">${formatNumber(e.dailyUsd, 4)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-white">{formatNumber(e.weekly, 6)}</p>
                      {c.type === CurrencyType.CRYPTO && (
                        <p className="text-sm text-emerald-400">${formatNumber(e.weeklyUsd, 4)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-white">{formatNumber(e.monthly, 6)}</p>
                      {c.type === CurrencyType.CRYPTO && (
                        <p className="text-sm text-emerald-400">${formatNumber(e.monthlyUsd, 4)}</p>
                      )}
                    </td>
                    {c.type === CurrencyType.CRYPTO && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col gap-1">
                          <p className={`text-sm font-bold ${c.isWithdrawable ? 'text-white' : 'text-slate-500 italic'}`}>
                            {formatTimeToWithdraw(e.daily, c.minWithdrawal || 0, c.isWithdrawable)}
                          </p>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getStep = (value: number | string | undefined | null) => {
    if (value === undefined || value === null || value === '') return 1;
    const str = value.toString();
    if (!str.includes('.')) return 1;
    const decimalPart = str.split('.')[1];
    const precision = decimalPart.length;
    return Math.pow(10, -precision);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Earnings Calculator</h2>
        <p className="text-slate-400">Comprehensive profit analysis across all available coins.</p>
      </div>

      {/* Global Power Input Container */}
      <div className="p-6 lg:p-8 bg-slate-800/40 rounded-[32px] border border-slate-700/50 shadow-xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-end">
          {/* League Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Trophy className="w-3 h-3 text-yellow-500" />
              League
            </label>
            <select
              value={selectedLeague}
              onChange={(e) => handleLeagueChange(e.target.value as League)}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
            >
              {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Mining Power Input */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3 h-3 text-emerald-400" />
              Mining Power
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step={getStep(userPower)}
                value={userPower}
                min="0"
                onChange={(e) => {
                  const val = e.target.value;
                  setUserPower(val === '' ? '' : (parseFloat(val) < 0 ? 0 : val));
                }}
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
              />
              <select
                value={powerUnit}
                onChange={(e) => setPowerUnit(e.target.value as any)}
                className="shrink-0 bg-slate-900 border border-slate-700 rounded-2xl px-3 py-3.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="Gh">Gh/s</option>
                <option value="Th">Th/s</option>
                <option value="Ph">Ph/s</option>
                <option value="Eh">Eh/s</option>
                <option value="Zh">Zh/s</option>
              </select>
            </div>
          </div>

          {/* Paste Network Data Button */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 relative">
              <ClipboardPaste className="w-3 h-3 text-emerald-400" />
              League Power
              <div 
                className="relative inline-block p-1 -m-1"
                onMouseEnter={() => setShowHelpTooltip(true)}
                onMouseLeave={() => setShowHelpTooltip(false)}
                onClick={() => setShowHelpTooltip(!showHelpTooltip)}
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-600 hover:text-emerald-400 cursor-help transition-colors" />

                <AnimatePresence>
                  {showHelpTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 w-64 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl pointer-events-none md:pointer-events-auto"
                    >
                      <p className="text-[10px] font-bold text-white mb-2 uppercase tracking-wider">How to paste data:</p>
                      <p className="text-[11px] text-slate-300 leading-tight mb-3 normal-case">
                        Copy all text from the <span className="text-emerald-400 font-bold">League Power</span> and paste it into the update field.
                      </p>
                      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img 
                          src="/help/earnings-guide.png" 
                          alt="Instructional image" 
                          className="w-full h-auto opacity-90"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </label>
            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <ClipboardPaste className="w-4 h-4 text-emerald-400" />
              Paste League Power Data
            </button>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="space-y-12">
        {renderCurrencyTable(CurrencyType.GAME)}
        {renderCurrencyTable(CurrencyType.CRYPTO)}
      </div>

      {/* Market & Withdrawal Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-800/50 items-start">
        <div className="space-y-4">
          <div className="flex items-center justify-between w-full h-12 px-1">
            <button 
              onClick={() => setIsMarketPricesOpen(!isMarketPricesOpen)}
              className="flex items-center gap-3 group"
            >
              <Globe className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Crypto Prices (USD)</h3>
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => updatePrices(true)}
                disabled={isFetchingPrices || refreshCooldown > 0}
                className="min-w-[40px] h-9 flex items-center justify-center bg-slate-800/50 hover:bg-slate-700/50 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white transition-all disabled:opacity-100 disabled:cursor-default"
                title={refreshCooldown > 0 ? `Cooldown: ${refreshCooldown}s` : "Refresh prices"}
              >
                {refreshCooldown > 0 ? (
                  <span className="text-[10px] font-black text-emerald-400">{refreshCooldown}s</span>
                ) : (
                  <RefreshCw className={cn("w-3.5 h-3.5", isFetchingPrices && "animate-spin")} />
                )}
              </button>
              
              <button 
                onClick={() => setIsMarketPricesOpen(!isMarketPricesOpen)}
                className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors group"
              >
                {isMarketPricesOpen ? (
                  <ChevronUp className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                )}
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {isMarketPricesOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-slate-700/30 overflow-hidden bg-slate-800/10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-4 py-3">Currency</th>
                        <th className="px-4 py-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {CURRENCIES.filter(c => c.type === CurrencyType.CRYPTO).map(c => {
                        const currentPrice = livePrices[c.id] || c.price;
                        return (
                          <tr key={c.id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={ASSET_URLS.currency(c.id)}
                                    alt={c.symbol}
                                    className="w-full h-full object-contain p-0.5"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerText = c.symbol[0];
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-white">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-white">
                              ${formatPrice(currentPrice, c.id)}
                              {livePrices[c.id] && (
                                <span className="ml-2 text-[8px] text-emerald-400 font-black uppercase tracking-tighter bg-emerald-500/10 px-1 rounded">Live</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between w-full h-12 px-1">
            <button 
              onClick={() => setIsMinWithdrawalsOpen(!isMinWithdrawalsOpen)}
              className="flex items-center gap-3 group"
            >
              <Zap className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Minimum Withdrawals</h3>
            </button>
            <button 
              onClick={() => setIsMinWithdrawalsOpen(!isMinWithdrawalsOpen)}
              className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors group"
            >
              {isMinWithdrawalsOpen ? (
                <ChevronUp className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {isMinWithdrawalsOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl border border-slate-700/30 overflow-hidden bg-slate-800/10">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <th className="px-4 py-3">Currency</th>
                        <th className="px-4 py-3 text-right">Min Amount</th>
                        <th className="px-4 py-3 text-right">USD Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {CURRENCIES.filter(c => c.type === CurrencyType.CRYPTO).map(c => {
                        const currentPrice = livePrices[c.id] || c.price;
                        return (
                          <tr key={c.id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={ASSET_URLS.currency(c.id)}
                                    alt={c.symbol}
                                    className="w-full h-full object-contain p-0.5"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement!.innerText = c.symbol[0];
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-white">{c.symbol}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-white">
                              {c.isWithdrawable ? formatMinWithdrawalAmount(c.minWithdrawal, c.symbol) : <span className="text-slate-500 italic">N/A</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">
                              {c.isWithdrawable ? `$${((c.minWithdrawal || 0) * currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-slate-500 italic">-</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Paste Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-emerald-400" />
                League Power Data
              </h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-400">
                Paste the league power data from the game. Each currency’s values are automatically parsed.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="rlt&#10;RLT&#10;6.136 Zh/s&#10;..."
                className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={handlePaste}
                  className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" /> Update
                </button>
                <button
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Currency Settings Modal */}
      <AnimatePresence>
        {settingsModalType && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    settingsModalType === CurrencyType.GAME ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                  )}>
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{settingsModalType} Settings</h3>
                    <p className="text-xs text-slate-500 font-medium">Configure block rewards and times</p>
                  </div>
                </div>
                <button onClick={() => setSettingsModalType(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      <th className="w-[60px] px-4 py-3"></th>
                      <th className="px-4 py-3 text-center">Block Reward</th>
                      <th className="px-4 py-3 text-center">Time (sec)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {availableCurrencies.filter(c => c.type === settingsModalType).map(c => {
                      const baseReward = LEAGUE_BLOCK_REWARDS[selectedLeague]?.[c.id] ?? c.blockReward;
                      const blockReward = currencyOverrides[c.id]?.blockReward ?? baseReward;
                      const step = getStep(blockReward);
                      
                      return (
                        <tr key={c.id} className="hover:bg-slate-700/20 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center">
                              <div className="w-8 h-8 flex items-center justify-center overflow-hidden shrink-0">
                                <img 
                                  src={ASSET_URLS.currency(c.id)}
                                  alt={c.symbol}
                                  className="w-full h-full object-contain p-1"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerText = c.symbol[0];
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-4 py-3">
                            <input 
                              type="number"
                              step={step}
                              value={blockReward}
                              min="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                setCurrencyOverrides(prev => ({
                                  ...prev,
                                  [c.id]: { ...prev[c.id], blockReward: val === '' ? '' : (parseFloat(val) < 0 ? 0 : val) }
                                }));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-center focus:outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>
                          
                          <td className="px-4 py-3">
                            <input 
                              type="number"
                              step={getStep(currencyOverrides[c.id]?.blockTime ?? c.blockTime)}
                              value={currencyOverrides[c.id]?.blockTime ?? c.blockTime}
                              min="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                setCurrencyOverrides(prev => ({
                                  ...prev,
                                  [c.id]: { ...prev[c.id], blockTime: val === '' ? '' : (parseFloat(val) < 0 ? 0 : val) }
                                }));
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold text-center focus:outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-3">
                <button
                  onClick={() => setSettingsModalType(null)}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-all"
                >
                  Done
                </button>
                <button
                  onClick={() => {
                    const newOverrides = { ...currencyOverrides };
                    availableCurrencies.filter(c => c.type === settingsModalType).forEach(c => {
                      delete newOverrides[c.id];
                    });
                    setCurrencyOverrides(newOverrides);
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-all"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
