import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../lib/supabase';
import { RARITY_ORDER, ASSET_URLS, MARKET_BASE_URL } from '../constants';
import { Miner, Rarity, MinerRarity } from '../types';
import { fetchMiners, deleteMiner } from '../services/apiService';
import { Search, Upload, Image as ImageIcon, Loader2, Zap, Tag, X, ChevronDown, ChevronUp, ExternalLink, Edit2, ChevronLeft, ChevronRight, ArrowRight, Trash2, AlertCircle } from 'lucide-react';
import { cn, ensureFullUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import MinerImage from './MinerImage';

interface MinerCardProps {
  miner: Miner;
  onEdit?: (miner: Miner) => void;
  onDelete?: (id: string) => void;
  currentUser?: any | null;
  key?: string;
}

function formatPower(power: number) {
  if (power >= 1000000000000) return { value: (power / 1000000000000).toFixed(3), unit: 'Zh/s' };
  if (power >= 1000000000) return { value: (power / 1000000000).toFixed(3), unit: 'Eh/s' };
  if (power >= 1000000) return { value: (power / 1000000).toFixed(3), unit: 'Ph/s' };
  if (power >= 1000) return { value: (power / 1000).toFixed(3), unit: 'Th/s' };
  return { value: power.toLocaleString(), unit: 'Gh/s' };
}

function MinerCard({ miner, onEdit, onDelete, currentUser }: MinerCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const imageUrl = ensureFullUrl(miner.image, 'miners', '.gif');
  const mainMarketUrl = ensureFullUrl(miner.marketUrl, ASSET_URLS.miner(miner.id, '')); // This is a bit tricky, but let's use the default if it's an ID

  // Base stats (Common)
  const baseStats = miner.rarities[Rarity.COMMON] || Object.values(miner.rarities)[0]!;
  const basePower = formatPower(baseStats.power);
  const baseMarketUrl = ensureFullUrl(baseStats.marketUrl, MARKET_BASE_URL);
  
  // Other rarities (excluding Common)
  const otherRarities = (Object.keys(miner.rarities) as Rarity[])
    .filter(r => {
      const rarityKey = String(r).toLowerCase();
      return rarityKey !== 'common' && rarityKey !== Rarity.COMMON.toLowerCase();
    })
    .sort((a, b) => {
      const orderA = RARITY_ORDER.findIndex(r => r.toLowerCase() === a.toLowerCase());
      const orderB = RARITY_ORDER.findIndex(r => r.toLowerCase() === b.toLowerCase());
      return orderA - orderB;
    });

  const description = miner.description || "No description available.";
  // Roughly 80 chars usually fit in 2 lines for this card width
  const charLimit = 80;
  const isLongDescription = description.length > charLimit + 10; // Add buffer to avoid "See More" for just a few extra chars

  const canEdit = !!currentUser;

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
      {/* Action Buttons */}
      {canEdit && (
        <div className="absolute top-4 left-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          {onEdit && (
            <button 
              onClick={() => onEdit(miner)}
              className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
              title="Edit Miner"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 bg-red-500 hover:bg-red-400 text-white rounded-xl shadow-lg shadow-red-500/20 transition-all"
              title="Delete Miner"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center p-6 text-center space-y-4"
          >
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h4 className="text-white font-bold">Delete Miner?</h4>
              <p className="text-xs text-slate-400">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  onDelete(miner.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-xl transition-all"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header: Image & Base Stats */}
      <div className="flex items-center justify-between mb-0 gap-4">
        <div className="w-36 h-28 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden shrink-0 relative">
          <MinerImage 
            image={miner.image} 
            name={miner.name} 
            className="w-full h-full object-contain p-1 drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            fallbackClassName="w-full h-full"
          />
          {baseMarketUrl && (
            <a 
              href={baseMarketUrl}
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
          {otherRarities.length > 0 && (
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
                          {(otherRarities || []).map(r => {
                            const stats = miner.rarities[r]!;
                            const p = formatPower(stats.power);
                            const rarityMarketUrl = ensureFullUrl(stats.marketUrl, MARKET_BASE_URL);
                            return (
                              <tr key={r} className="hover:bg-slate-700/20 transition-colors">
                                <td className="px-4 py-1.5">
                                  <div className="relative w-6 h-6 flex items-center justify-center">
                                    {rarityMarketUrl ? (
                                      <a 
                                        href={rarityMarketUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full h-full group/rarity"
                                        onClick={(e) => e.stopPropagation()}
                                        title={`View ${r} on Marketplace`}
                                      >
                                        <img 
                                          src={ASSET_URLS.rarity(r)} 
                                          alt={r}
                                          className="w-full h-full object-contain group-hover/rarity:scale-110 transition-transform"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute -top-1 -right-1 p-0.5 bg-slate-900 rounded-full border border-slate-700 shadow-sm group-hover/rarity:border-emerald-500 transition-colors">
                                          <ExternalLink className="w-2 h-2 text-slate-400 group-hover/rarity:text-emerald-400" />
                                        </div>
                                      </a>
                                    ) : (
                                      <img 
                                        src={ASSET_URLS.rarity(r)} 
                                        alt={r}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                        referrerPolicy="no-referrer"
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
          )}
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

interface MinerSearchProps {
  onEdit?: (miner: Miner) => void;
}

export default function MinerSearch({ onEdit }: MinerSearchProps) {
  const [user, setUser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedTags, setIdentifiedTags] = useState<string[]>([]);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [apiMiners, setApiMiners] = useState<Miner[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Advanced Filters
  const [cellFilter, setCellFilter] = useState<number | null>(null);
  const [filterRarity, setFilterRarity] = useState<Rarity | 'Any'>('Any');
  const [minPower, setMinPower] = useState<string>('0');
  const [maxPowerFilter, setMaxPowerFilter] = useState<string>('');
  const [minBonus, setMinBonus] = useState<string>('0');
  const [maxBonusFilter, setMaxBonusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'power-desc' | 'power-asc' | 'bonus-desc' | 'bonus-asc'>('name-asc');

  // Pagination state
  const [displayLimit, setDisplayLimit] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [paginationMode, setPaginationMode] = useState<'pages' | 'load-more'>('pages');
  const [activeEllipsis, setActiveEllipsis] = useState<'left' | 'right' | null>(null);
  const [ellipsisInput, setEllipsisInput] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadMiners = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMiners();
      setApiMiners(data);
    } catch (error) {
      console.error('Error loading miners:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteMiner(id);
      await loadMiners();
    } catch (error) {
      console.error('Failed to delete miner:', error);
      alert('Failed to delete miner. Please try again.');
    }
  };

  useEffect(() => {
    loadMiners();
  }, [loadMiners]);

  const allMiners = useMemo(() => {
    return apiMiners;
  }, [apiMiners]);

  const currentMaxStats = useMemo(() => {
    let p = 0;
    let b = 0;
    allMiners.forEach(m => {
      if (filterRarity === 'Any') {
        Object.values(m.rarities).forEach(r => {
          const stats = r as MinerRarity | undefined;
          if (stats) {
            if (stats.power > p) p = stats.power;
            if (stats.bonus > b) b = stats.bonus;
          }
        });
      } else {
        const stats = m.rarities[filterRarity as Rarity] as MinerRarity | undefined;
        if (stats) {
          if (stats.power > p) p = stats.power;
          if (stats.bonus > b) b = stats.bonus;
        }
      }
    });
    return { power: p, bonus: b };
  }, [allMiners, filterRarity]);

  useEffect(() => {
    setMaxPowerFilter(currentMaxStats.power.toString());
    setMaxBonusFilter(currentMaxStats.bonus.toString());
  }, [currentMaxStats]);

  const filteredMiners = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    const tags = (identifiedTags || []).map(t => t.toLowerCase());

    const minP = parseFloat(minPower) || 0;
    const maxP = parseFloat(maxPowerFilter) || Infinity;
    const minB = parseFloat(minBonus) || 0;
    const maxB = parseFloat(maxBonusFilter) || Infinity;

    const scored = (allMiners || []).map(miner => {
      let score = 0;
      let matchesQuery = !queryStr;
      let matchesTags = tags.length === 0;
      let matchCount = 0;

      // Query match logic
      if (queryStr) {
        if (miner.name.toLowerCase().includes(queryStr)) {
          score += 50;
          matchesQuery = true;
        }
        if (miner.tags.some(t => t.toLowerCase().includes(queryStr))) {
          score += 30;
          matchesQuery = true;
        }
        if (miner.description?.toLowerCase().includes(queryStr)) {
          score += 10;
          matchesQuery = true;
        }
      }

      // Tag match logic (from AI identification)
      if (tags.length > 0) {
        tags.forEach((tag, index) => {
          const normalizedTag = tag.replace(/[^a-z0-9]/g, '');
          const normalizedName = miner.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Higher weight for first few tags (AI often puts recognized name first)
          const weight = index === 0 ? 3 : (index < 3 ? 1.5 : 1);
          let tagMatched = false;

          if (normalizedName === normalizedTag) {
            score += 250 * weight;
            tagMatched = true;
          } else if (normalizedName.includes(normalizedTag) || normalizedTag.includes(normalizedName)) {
            score += 100 * weight;
            tagMatched = true;
          }
          
          miner.tags.forEach(t => {
            const normalizedT = t.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedT === normalizedTag) {
              score += 50 * weight;
              tagMatched = true;
            } else if (normalizedT.includes(normalizedTag) || normalizedTag.includes(normalizedT)) {
              score += 25 * weight;
              tagMatched = true;
            }
          });

          if (tagMatched) {
            matchCount++;
            matchesTags = true;
          }
        });
      }

      // Significant bonus for matching multiple tags
      if (matchCount > 1) {
        score += matchCount * 75;
      }

      const matchesCells = cellFilter === null || miner.cells === cellFilter;
      
      let matchesRange = false;
      if (filterRarity === 'Any') {
        matchesRange = Object.values(miner.rarities).some(s => {
          const stats = s as MinerRarity | undefined;
          return stats && 
            stats.power >= minP && stats.power <= maxP && 
            stats.bonus >= minB && stats.bonus <= maxB;
        });
      } else {
        const stats = miner.rarities[filterRarity as Rarity] as MinerRarity | undefined;
        matchesRange = !!stats && 
          stats.power >= minP && stats.power <= maxP && 
          stats.bonus >= minB && stats.bonus <= maxB;
      }

      return { miner, score, matchCount, matchesQuery, matchesTags, matchesCells, matchesRange };
    });

    return scored
      .filter(item => item.matchesQuery && item.matchesTags && item.matchesCells && item.matchesRange)
      .sort((a, b) => {
        // Helper to get stats for sorting
        const getStats = (m: Miner) => {
          if (filterRarity !== 'Any') {
            return m.rarities[filterRarity as Rarity];
          }
          // If 'Any', use the max across all rarities
          const statsList = Object.values(m.rarities);
          return {
            power: Math.max(...(statsList || []).map(s => s.power)),
            bonus: Math.max(...(statsList || []).map(s => s.bonus))
          };
        };

        const statsA = getStats(a.miner);
        const statsB = getStats(b.miner);

        switch (sortBy) {
          case 'power-desc':
            return (statsB?.power || 0) - (statsA?.power || 0);
          case 'power-asc':
            return (statsA?.power || 0) - (statsB?.power || 0);
          case 'bonus-desc':
            return (statsB?.bonus || 0) - (statsA?.bonus || 0);
          case 'bonus-asc':
            return (statsA?.bonus || 0) - (statsB?.bonus || 0);
          case 'name-asc':
            return a.miner.name.localeCompare(b.miner.name);
          case 'name-desc':
            return b.miner.name.localeCompare(a.miner.name);
          default:
            // Default to name ascending
            return a.miner.name.localeCompare(b.miner.name);
        }
      })
      .map(item => item.miner);
  }, [allMiners, searchQuery, identifiedTags, cellFilter, minPower, maxPowerFilter, minBonus, maxBonusFilter, filterRarity, sortBy]);

  // Reset pagination when filters change
  useEffect(() => {
    setDisplayLimit(itemsPerPage);
    setCurrentPage(1);
  }, [searchQuery, identifiedTags, cellFilter, minPower, maxPowerFilter, minBonus, maxBonusFilter, filterRarity, itemsPerPage]);

  const totalPages = Math.ceil((filteredMiners || []).length / itemsPerPage);

  const displayedMiners = useMemo(() => {
    if (paginationMode === 'load-more') {
      return filteredMiners.slice(0, displayLimit);
    } else {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredMiners.slice(start, start + itemsPerPage);
    }
  }, [filteredMiners, paginationMode, displayLimit, currentPage, itemsPerPage]);

  const hasMore = paginationMode === 'load-more' && displayLimit < (filteredMiners || []).length;

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const pages = new Set<number>();

    // Always show first 3
    for (let i = 1; i <= Math.min(3, totalPages); i++) pages.add(i);
    
    // Always show last 3
    for (let i = Math.max(1, totalPages - 2); i <= totalPages; i++) pages.add(i);

    // Show current page and neighbors
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) pages.add(i);

    const sortedPages = Array.from(pages).sort((a, b) => a - b);

    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      const prevPage = sortedPages[i - 1];

      if (prevPage && page - prevPage > 1) {
        // Add ellipsis
        const ellipsisKey = page > currentPage ? 'right' : 'left';
        buttons.push(
          activeEllipsis === ellipsisKey ? (
            <div key={`ellipsis-input-${ellipsisKey}`} className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={ellipsisInput}
                onChange={(e) => setEllipsisInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const p = parseInt(ellipsisInput);
                    if (!isNaN(p) && p >= 1 && p <= totalPages) {
                      handlePageChange(p);
                    }
                    setActiveEllipsis(null);
                    setEllipsisInput('');
                  } else if (e.key === 'Escape') {
                    setActiveEllipsis(null);
                    setEllipsisInput('');
                  }
                }}
                onBlur={() => {
                  setActiveEllipsis(null);
                  setEllipsisInput('');
                }}
                className="w-12 h-8 bg-slate-900 border border-emerald-500 rounded-lg text-[10px] font-bold text-white text-center focus:outline-none"
                placeholder="..."
              />
            </div>
          ) : (
            <button
              key={`ellipsis-${page}`}
              onClick={() => setActiveEllipsis(ellipsisKey)}
              className="w-8 h-8 rounded-lg text-[10px] font-bold transition-all border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 flex items-center justify-center"
              title="Click to enter page number"
            >
              ...
            </button>
          )
        );
      }

      buttons.push(
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={cn(
            "w-8 h-8 rounded-lg text-[10px] font-bold transition-all border",
            currentPage === page 
              ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500"
          )}
        >
          {page}
        </button>
      );
    }

    return buttons;
  };

  const identifyMiner = async (base64Image: string) => {
    setIsIdentifying(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      // Get all miner names to help the AI identify the correct one from our database
      const minerNames = (allMiners || []).map(m => m.name).join(', ');
      
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
              text: `This is an image of a pixel-art mining machine from a game called RollerCoin. 
              
              Your task is to identify which miner this is from the following list of known names:
              [${minerNames}]
              
              If you are confident it matches one of these names, include that name as the first tag.
              Also provide 8-12 highly specific visual tags (e.g., "pink dome", "hexagonal shape", "blue speakers", "neon", "hamster", "circuit board").
              
              Return ONLY the tags separated by commas. Do not include generic terms like "pixel art", "miner", or "machine". Be as specific as possible with colors, shapes, and unique features.`,
            },
          ],
        },
      });

      const tags = (response.text || '').split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t && t !== 'pixel art' && t !== 'pixel-art' && t !== 'miner' && t !== 'machine');
      
      setIdentifiedTags(tags);
      // Clear search query when image is uploaded to avoid conflicting filters
      setSearchQuery('');
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Miner Search</h2>
          <p className="text-slate-400">Find and upgrade your miners.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Search & Upload (1/3) */}
        <div className="lg:col-span-1 space-y-3">
          <div className="p-4 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by name or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div 
              {...getRootProps()} 
              className={cn(
                "border-2 border-dashed rounded-2xl p-2 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2",
                isDragActive ? "border-emerald-500 bg-emerald-500/5" : "border-slate-700 hover:border-slate-500 bg-slate-900/50"
              )}
            >
              <input {...getInputProps()} />
              {uploadedImage ? (
                <div className="relative w-full rounded-xl overflow-hidden group">
                  <img src={uploadedImage} alt="Uploaded" className="w-full h-auto block" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-xs">Upload Miner Image</p>
                    <p className="text-[10px] text-slate-500">Drag & drop or click</p>
                  </div>
                </>
              )}
            </div>

            {isIdentifying && (
              <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-[10px] text-emerald-400 font-medium">AI is identifying visual tags...</span>
              </div>
            )}

            {identifiedTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Identified Tags</p>
                  <button 
                    onClick={() => { setIdentifiedTags([]); setUploadedImage(null); }}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(identifiedTags || []).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-700 text-slate-200 rounded-full text-[10px] font-medium border border-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Filters (2/3) */}
        <div className="lg:col-span-2">
          <div className="p-4 bg-slate-800/50 rounded-3xl border border-slate-700 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Advanced Filters</h3>
              <button 
                onClick={() => {
                  setCellFilter(null);
                  setMinPower('0');
                  setMaxPowerFilter(currentMaxStats.power.toString());
                  setMinBonus('0');
                  setMaxBonusFilter(currentMaxStats.bonus.toString());
                  setFilterRarity('Any');
                }}
                className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reset Filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                {/* Cell Count */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[65px]">Cell Count</label>
                  <div className="flex gap-1 flex-1">
                    {[null, 1, 2].map(cells => (
                      <button
                        key={cells === null ? 'all' : cells}
                        onClick={() => setCellFilter(cells)}
                        className={cn(
                          "flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all",
                          cellFilter === cells 
                            ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                        )}
                      >
                        {cells === null ? 'Any' : cells}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rarity Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[65px]">Rarity</label>
                  <select 
                    value={filterRarity}
                    onChange={(e) => setFilterRarity(e.target.value as Rarity | 'Any')}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Any">Any</option>
                    {RARITY_ORDER.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Power Text Boxes */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[65px]">Power</label>
                <div className="flex gap-1 flex-1">
                  <input 
                    type="text"
                    placeholder="Min"
                    value={minPower}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setMinPower(val);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Bonus Text Boxes */}
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider min-w-[65px]">Bonus</label>
                <div className="flex gap-1 flex-1">
                  <input 
                    type="text"
                    placeholder="Min"
                    value={minBonus}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setMinBonus(val);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results (Full Width) */}
      <div className="space-y-6" ref={resultsRef}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Showing {(filteredMiners || []).length} results
            </p>
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setPaginationMode('pages')}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                  paginationMode === 'pages' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Pages
              </button>
              <button
                onClick={() => setPaginationMode('load-more')}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                  paginationMode === 'load-more' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Load More
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort By</label>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="name-asc">Name: A-Z</option>
              <option value="name-desc">Name: Z-A</option>
              <option value="power-desc">Power: High to Low</option>
              <option value="power-asc">Power: Low to High</option>
              <option value="bonus-desc">Bonus: High to Low</option>
              <option value="bonus-asc">Bonus: Low to High</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {(displayedMiners || []).map((miner) => (
              <MinerCard 
                key={miner.id} 
                miner={miner} 
                onEdit={onEdit} 
                onDelete={handleDelete}
                currentUser={user}
              />
            ))}
          </AnimatePresence>
          {(filteredMiners || []).length === 0 && (
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

        {/* Pagination / Load More */}
        {paginationMode === 'load-more' ? (
          hasMore && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 transition-all flex items-center gap-2 group"
              >
                Load More Miners
                <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          )
        ) : (
          totalPages > 1 && (
            <div className="mt-12 flex flex-col items-center gap-4">
              <div className="flex items-center gap-1.5">
                {renderPaginationButtons()}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
