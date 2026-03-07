import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from '@google/genai';
import { MINERS_DB } from '../constants';
import { Miner, Rarity } from '../types';
import { Search, Upload, Image as ImageIcon, Loader2, Zap, Shield, Tag, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface MinerCardProps {
  miner: Miner;
  key?: string;
}

function formatPower(power: number) {
  if (power >= 1000000) return { value: (power / 1000000).toFixed(2), unit: 'Ph/s' };
  if (power >= 1000) return { value: (power / 1000).toFixed(2), unit: 'Th/s' };
  return { value: power.toLocaleString(), unit: 'Gh/s' };
}

function MinerCard({ miner }: MinerCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  
  // Base stats (Common)
  const baseStats = miner.rarities[Rarity.COMMON] || Object.values(miner.rarities)[0]!;
  const basePower = formatPower(baseStats.power);
  
  // Other rarities (excluding Common)
  const otherRarities = (Object.keys(miner.rarities) as Rarity[]).filter(r => r !== Rarity.COMMON);

  const description = miner.description || "No description available.";
  // Roughly 65 chars usually fit in 2 lines for this card width
  const charLimit = 65;
  const isLongDescription = description.length > charLimit;

  return (
    <motion.div
      layout
      transition={{ 
        layout: { type: "tween", duration: 0.25, ease: "easeOut" },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 }
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="p-5 bg-slate-800/40 rounded-3xl border border-slate-700/50 hover:border-emerald-500/50 transition-all group flex flex-col h-full relative"
    >
      {/* Header: Image & Base Stats */}
      <div className="flex items-center justify-between mb-0 gap-4">
        <div className="w-36 h-28 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden shrink-0 relative">
          {miner.image ? (
            <img 
              src={miner.image} 
              alt={miner.name} 
              className="w-full h-full object-contain p-1 drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Zap className="w-10 h-10 text-slate-700" />
          )}
          {baseStats.marketUrl && (
            <a 
              href={baseStats.marketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-1 right-1 p-1 bg-slate-800/80 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="text-right flex flex-col items-end">
          <div className="flex items-center justify-end gap-1 text-emerald-400 font-black text-2xl">
            {basePower.value} <span className="text-xs font-bold opacity-70">{basePower.unit}</span>
          </div>
          <div className="text-blue-400 text-sm font-bold mb-2">
            {baseStats.bonus}% Bonus
          </div>

          {/* Rarity Upgrades Trigger */}
          <div className="relative">
            <button 
              onClick={() => setIsTableOpen(!isTableOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-700/50 rounded-xl transition-all group/btn"
            >
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover/btn:text-slate-300 transition-colors">
                Upgrades
              </span>
              <ChevronDown className={cn(
                "w-3 h-3 text-slate-500 group-hover/btn:text-white transition-all",
                isTableOpen && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {isTableOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "absolute top-full right-0 w-[260px] z-50 mt-2",
                    "bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700 p-1.5"
                  )}
                >
                  <div className="rounded-xl bg-slate-900/50 border border-slate-700/30 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-800/30 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <th className="px-4 py-1.5">Rarity</th>
                          <th className="px-4 py-1.5 text-right">Power</th>
                          <th className="px-4 py-1.5 text-right">Bonus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/20">
                        {otherRarities.map(r => {
                          const stats = miner.rarities[r]!;
                          const p = formatPower(stats.power);
                          return (
                            <tr key={r} className="hover:bg-slate-700/20 transition-colors">
                              <td className="px-4 py-1.5">
                                <div className="relative w-6 h-6 flex items-center justify-center">
                                  {stats.marketUrl ? (
                                    <a 
                                      href={stats.marketUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block w-full h-full group/rarity"
                                      onClick={(e) => e.stopPropagation()}
                                      title={`View ${r} on Marketplace`}
                                    >
                                      <img 
                                        src={`/rarities/${r.toLowerCase()}.png`} 
                                        alt={r}
                                        className="w-full h-full object-contain group-hover/rarity:scale-110 transition-transform"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute -top-1 -right-1 p-0.5 bg-slate-900 rounded-full border border-slate-700 shadow-sm group-hover/rarity:border-emerald-500 transition-colors">
                                        <ExternalLink className="w-2 h-2 text-slate-400 group-hover/rarity:text-emerald-400" />
                                      </div>
                                    </a>
                                  ) : (
                                    <img 
                                      src={`/rarities/${r.toLowerCase()}.png`} 
                                      alt={r}
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-1.5 text-right text-[11px] font-black text-white whitespace-nowrap">
                                {p.value} <span className="text-[9px] opacity-50 font-bold">{p.unit}</span>
                              </td>
                              <td className="px-4 py-1.5 text-right text-[11px] font-bold text-blue-400">
                                {stats.bonus}%
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
      </div>

      {/* Content: Name & Description */}
      <div className="flex-1 space-y-1">
        <h3 className="text-xl font-bold text-white leading-tight">{miner.name}</h3>
        
        <div className="relative">
          <p className="text-sm text-slate-400 leading-relaxed">
            {isDescriptionExpanded ? description : (isLongDescription ? description.slice(0, charLimit) : description)}
            {isLongDescription && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsDescriptionExpanded(!isDescriptionExpanded); }}
                className="ml-1 text-emerald-400 hover:text-emerald-300 font-bold text-[10px] uppercase tracking-wider inline"
              >
                {isDescriptionExpanded ? "See Less" : "... See More"}
              </button>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

const ALL_MINERS = MINERS_DB;

export default function MinerSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedTags, setIdentifiedTags] = useState<string[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // Advanced Filters
  const [cellFilter, setCellFilter] = useState<number | null>(null);
  const [filterRarity, setFilterRarity] = useState<Rarity | 'Any'>('Any');
  const [minPower, setMinPower] = useState<string>('0');
  const [maxPowerFilter, setMaxPowerFilter] = useState<string>('');
  const [minBonus, setMinBonus] = useState<string>('0');
  const [maxBonusFilter, setMaxBonusFilter] = useState<string>('');

  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(12);

  const currentMaxStats = useMemo(() => {
    let p = 0;
    let b = 0;
    ALL_MINERS.forEach(m => {
      if (filterRarity === 'Any') {
        Object.values(m.rarities).forEach(r => {
          if (r) {
            if (r.power > p) p = r.power;
            if (r.bonus > b) b = r.bonus;
          }
        });
      } else {
        const r = m.rarities[filterRarity as Rarity];
        if (r) {
          if (r.power > p) p = r.power;
          if (r.bonus > b) b = r.bonus;
        }
      }
    });
    return { power: p, bonus: b };
  }, [filterRarity]);

  useEffect(() => {
    setMaxPowerFilter(currentMaxStats.power.toString());
    setMaxBonusFilter(currentMaxStats.bonus.toString());
  }, [currentMaxStats]);

  const filteredMiners = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const tags = identifiedTags.map(t => t.toLowerCase());

    const minP = parseFloat(minPower) || 0;
    const maxP = parseFloat(maxPowerFilter) || Infinity;
    const minB = parseFloat(minBonus) || 0;
    const maxB = parseFloat(maxBonusFilter) || Infinity;

    return ALL_MINERS.filter(miner => {
      const matchesQuery = !query || 
        miner.name.toLowerCase().includes(query) || 
        miner.tags.some(t => t.toLowerCase().includes(query)) ||
        miner.description?.toLowerCase().includes(query);
      
      const matchesTags = tags.length === 0 || 
        tags.some(tag => 
          miner.name.toLowerCase().includes(tag) || 
          miner.tags.some(t => t.toLowerCase().includes(tag))
        );

      const matchesCells = cellFilter === null || miner.cells === cellFilter;
      
      let matchesRange = false;
      if (filterRarity === 'Any') {
        matchesRange = Object.values(miner.rarities).some(s => 
          s && 
          s.power >= minP && s.power <= maxP && 
          s.bonus >= minB && s.bonus <= maxB
        );
      } else {
        const s = miner.rarities[filterRarity as Rarity];
        matchesRange = !!s && 
          s.power >= minP && s.power <= maxP && 
          s.bonus >= minB && s.bonus <= maxB;
      }

      return matchesQuery && matchesTags && matchesCells && matchesRange;
    });
  }, [searchQuery, identifiedTags, cellFilter, minPower, maxPowerFilter, minBonus, maxBonusFilter, filterRarity]);

  // Reset pagination when search changes
  useEffect(() => {
    setDisplayLimit(12);
  }, [searchQuery, identifiedTags, cellFilter, minPower, maxPowerFilter, minBonus, maxBonusFilter, filterRarity]);

  const displayedMiners = filteredMiners.slice(0, displayLimit);
  const hasMore = displayLimit < filteredMiners.length;

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 12);
  };

  const identifyMiner = async (base64Image: string) => {
    setIsIdentifying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.split(',')[1],
              },
            },
            {
              text: 'This is an image of a pixel-art mining machine. It might be a partial image, a close-up, or a full view. Identify the specific miner if you recognize it, or provide 8-12 highly specific visual tags (e.g., "Chromaflux", "pink dome", "blue speakers", "neon"). If you recognize the exact miner, include its name as the first tag. Return ONLY the tags separated by commas. Do not include "pixel art" as a tag.',
            },
          ],
        },
      });

      const tags = response.text?.split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== 'pixel art' && t !== 'pixel-art') || [];
      setIdentifiedTags(tags);
    } catch (error) {
      console.error('AI Identification failed:', error);
    } finally {
      setIsIdentifying(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setUploadedImage(base64);
      identifyMiner(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false 
  } as any);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Miner Search</h2>
          <p className="text-slate-400">Identify miners using visual tags or image recognition.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search & Upload */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-3xl p-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3",
                isDragActive ? "border-emerald-500 bg-emerald-500/5" : "border-slate-700 hover:border-slate-500 bg-slate-900/50"
              )}
            >
              <input {...getInputProps()} />
              {uploadedImage ? (
                <div className="relative w-full rounded-xl overflow-hidden group">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-auto block" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Upload Miner Image</p>
                    <p className="text-xs text-slate-500">Drag & drop or click to identify</p>
                  </div>
                </>
              )}
            </div>

            {isIdentifying && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                <span className="text-sm text-emerald-400 font-medium">AI is identifying visual tags...</span>
              </div>
            )}

            {identifiedTags.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identified Tags</p>
                  <button 
                    onClick={() => { setIdentifiedTags([]); setUploadedImage(null); }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {identifiedTags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-slate-700 text-slate-200 rounded-full text-xs font-medium border border-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filters Container */}
          <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Advanced Filters</h3>
            
            {/* Cell Count */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Cell Count</label>
              <div className="flex gap-2 flex-1">
                {[null, 1, 2].map(cells => (
                  <button
                    key={cells === null ? 'all' : cells}
                    onClick={() => setCellFilter(cells)}
                    className={cn(
                      "flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all",
                      cellFilter === cells 
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                    )}
                  >
                    {cells === null ? 'Any' : cells}
                  </button>
                ))}
              </div>
            </div>

            {/* Rarity Selector */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Rarity</label>
              <select 
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value as Rarity | 'Any')}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Any">Any</option>
                {Object.values(Rarity).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Power Text Boxes */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Power</label>
              <div className="flex gap-2 flex-1">
                <input 
                  type="text"
                  placeholder="Min"
                  value={minPower}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setMinPower(val);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input 
                  type="text"
                  placeholder="Max"
                  value={maxPowerFilter}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val === '' || parseInt(val) <= currentMaxStats.power) {
                      setMaxPowerFilter(val);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Bonus Text Boxes */}
            <div className="flex items-center gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Bonus</label>
              <div className="flex gap-2 flex-1">
                <input 
                  type="text"
                  placeholder="Min"
                  value={minBonus}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setMinBonus(val);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input 
                  type="text"
                  placeholder="Max"
                  value={maxBonusFilter}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    if (val === '' || parseFloat(val) <= currentMaxStats.bonus) {
                      setMaxBonusFilter(val);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Reset Button */}
            <button 
              onClick={() => {
                setCellFilter(null);
                setMinPower('0');
                setMaxPowerFilter(currentMaxStats.power.toString());
                setMinBonus('0');
                setMaxBonusFilter(currentMaxStats.bonus.toString());
                setFilterRarity('Any');
              }}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-3 h-3" /> Reset Advanced Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {displayedMiners.map((miner) => (
                <MinerCard key={miner.id} miner={miner} />
              ))}
            </AnimatePresence>
            {filteredMiners.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-10 h-10 text-slate-600" />
                </div>
                <div>
                  <p className="text-white font-bold text-xl">No miners found</p>
                  <p className="text-slate-500">Try adjusting your search or identified tags.</p>
                </div>
              </div>
            )}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all flex items-center gap-2 group"
              >
                Load More Miners
                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
