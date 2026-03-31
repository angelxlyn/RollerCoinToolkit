import React, { useState, useMemo, useEffect } from 'react';
import { Rarity, PartType } from '../types';
import { CONVERSION_RATES, RARITY_COLORS, ASSET_URLS, PART_MARKET_BASE_URL, PART_IDS } from '../constants';
import { ShoppingBag, ClipboardPaste, X, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

const STORAGE_KEY = 'rollercoin_parts_prices';

const PART_RARITIES = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY];

const DEFAULT_PRICES: Record<PartType, Partial<Record<Rarity, number>>> = Object.values(PartType).reduce((acc, type) => {
  acc[type] = PART_RARITIES.reduce((rAcc, rarity) => {
    rAcc[rarity] = 0;
    return rAcc;
  }, {} as Partial<Record<Rarity, number>>);
  return acc;
}, {} as Record<PartType, Partial<Record<Rarity, number>>>);

const FORGE_LEVELS = [
  { level: 1, discount: 0 },
  { level: 2, discount: 5 },
  { level: 3, discount: 10 },
  { level: 4, discount: 15 },
  { level: 5, discount: 25 },
];

const CRAFTING_DATA: Partial<Record<Rarity, { rates: number[], fee: number }>> = {
  [Rarity.COMMON]: { rates: [1, 1, 1, 1, 1], fee: 0 },
  [Rarity.UNCOMMON]: { rates: [50, 48, 45, 43, 38], fee: 0.005 },
  [Rarity.RARE]: { rates: [20, 19, 18, 17, 15], fee: 0.105 },
  [Rarity.EPIC]: { rates: [10, 10, 9, 9, 8], fee: 1.1025 },
  [Rarity.LEGENDARY]: { rates: [5, 5, 5, 4, 4], fee: 5.7881 },
};

const RARITY_BORDER_COLORS: Record<Rarity, string> = {
  [Rarity.COMMON]: 'border-gray-400/50',
  [Rarity.UNCOMMON]: 'border-green-500/50',
  [Rarity.RARE]: 'border-blue-500/50',
  [Rarity.EPIC]: 'border-purple-500/50',
  [Rarity.LEGENDARY]: 'border-yellow-500/50',
  [Rarity.UNREAL]: 'border-cyan-500/50',
  [Rarity.LEGACY]: 'border-slate-500/50',
};

export default function PartsCalculator() {
  const [targetRarity, setTargetRarity] = useState<Rarity>(Rarity.RARE);
  const [targetQuantity, setTargetQuantity] = useState<number | string>(1);
  const [forgeLevel, setForgeLevel] = useState(1);
  const [selectedPartType, setSelectedPartType] = useState<PartType>(PartType.FAN);
  const [allPrices, setAllPrices] = useState<Record<PartType, Partial<Record<Rarity, number | string>>>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PRICES;
    try {
      const parsed = JSON.parse(saved);
      // Merge with DEFAULT_PRICES to ensure all keys exist (e.g. after adding UNREAL)
      const merged = { ...DEFAULT_PRICES };
      Object.keys(parsed).forEach(type => {
        if (merged[type as PartType]) {
          merged[type as PartType] = { ...merged[type as PartType], ...parsed[type] };
        }
      });
      return merged;
    } catch (e) {
      return DEFAULT_PRICES;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPrices));
  }, [allPrices]);

  const prices = allPrices[selectedPartType];

  const setPrices = (newPrices: Record<Rarity, number | string>) => {
    setAllPrices(prev => ({
      ...prev,
      [selectedPartType]: newPrices
    }));
  };

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);

  const handlePaste = () => {
    const newAllPrices = JSON.parse(JSON.stringify(allPrices));
    let updated = false;

    // Split by "product" keyword
    const blocks = pasteText.split(/product/gi).filter(b => b.trim());

    blocks.forEach(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) return;

      // First line usually contains "Rarity PartType"
      const infoLine = lines[0].toLowerCase();
      
      let foundType: PartType | null = null;
      if (infoLine.includes('fan')) foundType = PartType.FAN;
      else if (infoLine.includes('hashboard')) foundType = PartType.HASHBOARD;
      else if (infoLine.includes('wire')) foundType = PartType.WIRE;

      let foundRarity: Rarity | null = null;
      PART_RARITIES.forEach(r => {
        if (infoLine.includes(r.toLowerCase())) foundRarity = r;
      });

      if (foundType && foundRarity) {
        // Find the line with the price (usually contains RLT or is a number)
        // We look for a line that contains a number and specifically avoid the "Quantity" line.
        const priceLine = lines.find(l => !l.toLowerCase().includes('quantity') && /(\d+\.?\d*)/.test(l));
        
        if (priceLine) {
          const priceMatch = priceLine.match(/(\d+\.?\d*)/);
          if (priceMatch) {
            const parsedPrice = parseFloat(priceMatch[0]);
            newAllPrices[foundType][foundRarity] = parsedPrice;
            updated = true;
          }
        }
      }
    });

    if (updated) {
      setAllPrices(newAllPrices);
      setIsPasteModalOpen(false);
      setPasteText('');
    }
  };

  const conversion = useMemo(() => {
    const discount = FORGE_LEVELS.find(f => f.level === forgeLevel)?.discount || 0;
    const lvlIdx = forgeLevel - 1;

    // Helper to get cumulative rates and fees
    const getPathData = (from: Rarity, to: Rarity) => {
      const rarities = PART_RARITIES;
      const fromIdx = rarities.indexOf(from);
      const toIdx = rarities.indexOf(to);
      
      let totalParts = 1;
      let totalFee = 0;

      // Calculate path from 'to' back to 'from'
      for (let i = toIdx; i > fromIdx; i--) {
        const currentRarity = rarities[i];
        const stepRate = CRAFTING_DATA[currentRarity]!.rates[lvlIdx];
        const stepFee = CRAFTING_DATA[currentRarity]!.fee * (1 - discount / 100);
        
        totalFee += totalParts * stepFee;
        totalParts *= stepRate;
      }

      return { totalParts, totalFee };
    };

    const rarities = PART_RARITIES;
    const targetIdx = rarities.indexOf(targetRarity);
    const qty = Number(targetQuantity) || 1;

    const options = rarities.slice(0, targetIdx + 1).map(r => {
      const { totalParts, totalFee } = getPathData(r, targetRarity);
      const finalCount = totalParts * qty;
      const finalFee = totalFee * qty;
      const price = typeof prices[r] === 'string' ? (parseFloat(prices[r] as string) || 0) : (prices[r] as number);
      const totalPartCost = finalCount * price;
      const totalCost = totalPartCost + finalFee;

      const targetPrice = typeof prices[targetRarity] === 'string' ? (parseFloat(prices[targetRarity] as string) || 0) : (prices[targetRarity] as number);
      const directBuyTotal = targetPrice * qty;

      return {
        rarity: r,
        count: finalCount,
        partCost: totalPartCost,
        craftingCost: finalFee,
        totalCost,
        directBuyTotal,
        isCheapest: false
      };
    });

    // Sort by total cost (best value first)
    options.sort((a, b) => a.totalCost - b.totalCost);

    // Find cheapest
    if (options.length > 0) {
      const minCost = options[0].totalCost;
      options.forEach(o => {
        if (Math.abs(o.totalCost - minCost) < 0.000001) o.isCheapest = true;
      });
    }

    return options;
  }, [targetRarity, targetQuantity, forgeLevel, prices]);

  const getPartImage = (type: PartType, rarity: Rarity) => {
    return ASSET_URLS.part(type, rarity);
  };

  const formatRLT = (value: number) => {
    // Show values without a hard decimal limit
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 10 
    });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Parts & Crafting</h2>
          <p className="text-slate-400">Optimize your crafting path and save RLT.</p>
        </div>
        <div className="flex items-center gap-3 p-2 bg-slate-800 rounded-2xl border border-slate-700 max-w-full sm:max-w-none">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 ml-2 uppercase tracking-wider shrink-0">Forge Level:</span>
          <div className="flex gap-1 flex-1 overflow-x-auto no-scrollbar">
            {FORGE_LEVELS.map((f) => (
              <button
                key={f.level}
                onClick={() => setForgeLevel(f.level)}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                  forgeLevel === f.level 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "text-slate-400 hover:bg-slate-700"
                )}
              >
                Lvl {f.level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Prices */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <div 
                  className="w-10 h-10 flex items-center justify-center bg-white" 
                  style={{ 
                    maskImage: 'url(/icons/marketplace.svg)', 
                    maskSize: '24px', 
                    maskRepeat: 'no-repeat', 
                    maskPosition: 'center',
                    WebkitMaskImage: 'url(/icons/marketplace.svg)',
                    WebkitMaskSize: '24px',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center'
                  }}
                />
                Marketplace Prices
                <div 
                  className="relative inline-block p-1 -m-1"
                  onMouseEnter={() => setShowHelpTooltip(true)}
                  onMouseLeave={() => setShowHelpTooltip(false)}
                  onClick={() => setShowHelpTooltip(!showHelpTooltip)}
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-600 hover:text-orange-400 cursor-help transition-colors" />
                  
                  <AnimatePresence>
                    {showHelpTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full right-[-20px] sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-3 z-50 w-64 p-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl pointer-events-none md:pointer-events-auto"
                      >
                        <p className="text-[10px] font-bold text-white mb-2 uppercase tracking-wider">How to paste data:</p>
                        <p className="text-[11px] text-slate-300 leading-tight mb-3">
                          Enter or paste all text from the marketplace prices for each part rarity.
                        </p>
                        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                          <img 
                            src="/help/parts-guide.png" 
                            alt="Instructional image" 
                            className="w-full h-auto opacity-90"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </h3>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsPasteModalOpen(true)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                  title="Paste prices"
                >
                  <ClipboardPaste className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-1 p-1 bg-slate-900 rounded-xl mb-6">
              {Object.values(PartType).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedPartType(type)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    selectedPartType === type 
                      ? "bg-slate-700 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {PART_RARITIES.map((r) => (
                <div key={r} className="flex items-center gap-3 group">
                  <div className="relative shrink-0">
                    <a 
                      href={`${PART_MARKET_BASE_URL}${PART_IDS[selectedPartType]?.[r] || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 flex items-center justify-center overflow-hidden hover:scale-110 transition-transform cursor-pointer"
                      title={`View ${r} ${selectedPartType} on Marketplace`}
                    >
                      <img 
                        src={getPartImage(selectedPartType, r)}
                        alt={`${r} ${selectedPartType}`}
                        className="w-10 h-10 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </a>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={prices[r]}
                      step={getStep(prices[r])}
                      min="0"
                      onChange={(e) => {
                        const val = e.target.value;
                        setPrices({ ...prices, [r]: val === '' ? '' : (parseFloat(val) < 0 ? 0 : val) });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 transition-all hover:border-slate-600"
                      placeholder="0.000"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Crafting Options */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 sm:gap-4 p-2 bg-slate-800 rounded-2xl border border-slate-700 w-full overflow-hidden">
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
              <span className="text-xs font-bold text-slate-500 ml-2 uppercase tracking-wider shrink-0">Target:</span>
              <div className="flex gap-1 flex-1 overflow-x-auto no-scrollbar pb-0.5">
                {PART_RARITIES.filter(r => r !== Rarity.COMMON).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTargetRarity(r)}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl font-bold transition-all text-sm whitespace-nowrap min-w-[100px] md:min-w-0",
                      targetRarity === r 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700 shrink-0 hidden sm:block" />

            <div className="flex items-center gap-2 shrink-0 pr-1 sm:pr-2">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Qty:</span>
              <input
                type="number"
                min="1"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 sm:w-16 bg-slate-900 border border-slate-700 rounded-xl px-1 sm:px-2 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-colors text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {conversion.map((option) => (
              <div 
                key={option.rarity}
                className={cn(
                  "relative p-6 rounded-3xl border transition-all overflow-hidden",
                  RARITY_BORDER_COLORS[option.rarity],
                  option.isCheapest 
                    ? "bg-emerald-500/10 shadow-lg shadow-emerald-500/5" 
                    : "bg-slate-800/40"
                )}
              >
                {option.isCheapest && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                    Best Value
                  </div>
                )}
                
                <div className="flex flex-col gap-4">
                  {/* Header Section */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <a 
                        href={`${PART_MARKET_BASE_URL}${PART_IDS[selectedPartType]?.[option.rarity] || ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                        title="View on Marketplace"
                      >
                        <img 
                          src={getPartImage(selectedPartType, option.rarity)}
                          alt={`${option.rarity} ${selectedPartType}`}
                          className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </a>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl sm:text-2xl font-black text-white">{option.count.toLocaleString()}</span>
                          <span className="text-xs sm:text-sm text-slate-400 font-bold uppercase tracking-wider">{option.rarity}</span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Starting Point</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Total Cost</p>
                      <p className={cn("text-xl sm:text-2xl font-black leading-none", option.isCheapest ? "text-emerald-400" : "text-white")}>
                        {formatRLT(option.totalCost)} <span className="text-xs sm:text-sm font-bold">RLT</span>
                      </p>
                    </div>
                  </div>

                  {/* Divider (Desktop Only) */}
                  <div className="hidden md:flex items-center gap-4 text-slate-700 my-2">
                    <div className="h-px flex-1 bg-slate-700/50" />
                  </div>

                  {/* Mobile Divider */}
                  <div className="md:hidden h-px w-full bg-slate-700/30 my-1" />

                  {/* Detailed Breakdown Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Parts Cost</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-200">{formatRLT(option.partCost)} <span className="text-[10px] opacity-50">RLT</span></p>
                    </div>
                    <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-700/30">
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Merge Fee</p>
                      <p className="text-xs sm:text-sm font-bold text-slate-200">{formatRLT(option.craftingCost)} <span className="text-[10px] opacity-50">RLT</span></p>
                    </div>
                    <div className={cn(
                      "col-span-2 md:col-span-1 p-3 rounded-2xl border flex flex-col justify-center",
                      option.directBuyTotal >= option.totalCost 
                        ? "bg-emerald-500/5 border-emerald-500/20" 
                        : "bg-red-500/5 border-red-500/20"
                    )}>
                      <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Savings vs Direct Buy</p>
                      <p className={cn(
                        "text-sm sm:text-base font-black",
                        option.directBuyTotal >= option.totalCost ? "text-emerald-400" : "text-red-400"
                      )}>
                        {formatRLT(option.directBuyTotal - option.totalCost)} <span className="text-[10px] uppercase">RLT</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Paste Modal */}
      <AnimatePresence>
        {isPasteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ClipboardPaste className="w-5 h-5 text-emerald-400" />
                  Marketplace Prices Data
                </h3>
                <button onClick={() => setIsPasteModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  Paste the marketplace data for parts. The tool will automatically parse the values for Fan, Hashboard, and Wire.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Fan Common 0.001 RLT&#10;Hashboard Rare 1.2 RLT&#10;..."
                  className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handlePaste}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    Update Prices
                  </button>
                  <button
                    onClick={() => setIsPasteModalOpen(false)}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
