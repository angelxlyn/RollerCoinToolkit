import React, { useState, useMemo, useEffect } from 'react';
import { Miner, Rack, Rarity, MinerRarity } from '../types';
import { fetchMiners } from '../services/apiService';
import MinerImage from './MinerImage';
import { Layout as LayoutIcon, Plus, Trash2, Zap, Shield, Info, Layers, Search, Filter, ArrowUpDown, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PlacedMiner {
  id: string;
  minerId: string;
  rarity: Rarity;
  slotIndex: number;
}

interface PlacedRack {
  id: string;
  rackId: string;
  slotIndex: number;
  miners: (PlacedMiner | null)[];
}

const RARITY_ROMAN = {
  [Rarity.COMMON]: 'I',
  [Rarity.UNCOMMON]: 'II',
  [Rarity.RARE]: 'III',
  [Rarity.EPIC]: 'IV',
  [Rarity.LEGENDARY]: 'V',
  [Rarity.UNREAL]: 'VI',
};

const RARITY_BADGE_COLORS = {
  [Rarity.COMMON]: 'bg-gray-500',
  [Rarity.UNCOMMON]: 'bg-green-500',
  [Rarity.RARE]: 'bg-cyan-500',
  [Rarity.EPIC]: 'bg-magenta-500',
  [Rarity.LEGENDARY]: 'bg-yellow-500',
  [Rarity.UNREAL]: 'bg-red-500',
};

function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <div className={cn(
      "absolute top-1 left-1 px-1 py-0.5 rounded-sm text-[8px] font-black text-white shadow-sm z-10 flex items-center justify-center min-w-[14px] border border-white/20",
      RARITY_BADGE_COLORS[rarity] || 'bg-slate-500'
    )}>
      {RARITY_ROMAN[rarity]}
    </div>
  );
}

export default function RoomSimulator() {
  const [activeRoom, setActiveRoom] = useState(1);
  const [placedRacks, setPlacedRacks] = useState<PlacedRack[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [miners, setMiners] = useState<Miner[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [minersData, racksRes] = await Promise.all([
          fetchMiners(),
          fetch(`${window.location.origin}/api/racks`).then(res => res.json())
        ]);
        setMiners(minersData);
        setRacks(racksRes);
      } catch (err) {
        console.error('Failed to load simulator data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // UI State
  const [inventoryTab, setInventoryTab] = useState<'racks' | 'miners'>('racks');

  // Rack Filters
  const [rackSearch, setRackSearch] = useState('');
  const [rackSlotsFilter, setRackSlotsFilter] = useState<number[]>([]);
  const [rackMinBonus, setRackMinBonus] = useState<number | ''>('');
  const [rackMaxBonus, setRackMaxBonus] = useState<number | ''>('');
  const [rackSortBy, setRackSortBy] = useState<'bonus-desc' | 'bonus-asc' | 'name-asc' | 'name-desc'>('bonus-desc');

  // Miner Filters
  const [minerSearch, setMinerSearch] = useState('');
  const [selectedShelf, setSelectedShelf] = useState<number | null>(null);

  // Auto-switch inventory tab based on selection
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    if (selectedSlot !== null) {
      setIsEditing(true);
      const hasRack = placedRacks.some(r => r.slotIndex === selectedSlot);
      setInventoryTab(hasRack ? 'miners' : 'racks');
    } else {
      setIsEditing(false);
    }
  }, [selectedSlot, placedRacks]);

  const [minerCellFilter, setMinerCellFilter] = useState<number | null>(null);
  const [minerFilterRarity, setMinerFilterRarity] = useState<Rarity | 'Any'>('Any');
  const [minerMinPower, setMinerMinPower] = useState<number | ''>('');
  const [minerMaxPower, setMinerMaxPower] = useState<number | ''>('');
  const [minerMinBonus, setMinerMinBonus] = useState<number | ''>('');
  const [minerMaxBonus, setMinerMaxBonus] = useState<number | ''>('');
  const [minerSortBy, setMinerSortBy] = useState<'name-asc' | 'name-desc' | 'power-desc' | 'power-asc' | 'bonus-desc' | 'bonus-asc'>('power-desc');
  const [selectedMinerForRarity, setSelectedMinerForRarity] = useState<string | null>(null);

  useEffect(() => {
    setSelectedMinerForRarity(null);
  }, [inventoryTab]);

  const [showFilters, setShowFilters] = useState(false);

  const filteredRacks = useMemo(() => {
    return racks
      .filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(rackSearch.toLowerCase());
        const matchesSlots = rackSlotsFilter.length > 0 ? rackSlotsFilter.includes(r.slots) : true;
        const matchesMinBonus = rackMinBonus !== '' ? r.bonus >= Number(rackMinBonus) : true;
        const matchesMaxBonus = rackMaxBonus !== '' ? r.bonus <= Number(rackMaxBonus) : true;
        return matchesSearch && matchesSlots && matchesMinBonus && matchesMaxBonus;
      })
      .sort((a, b) => {
        if (rackSortBy === 'bonus-desc') return b.bonus - a.bonus;
        if (rackSortBy === 'bonus-asc') return a.bonus - b.bonus;
        if (rackSortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (rackSortBy === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [racks, rackSearch, rackSlotsFilter, rackMinBonus, rackMaxBonus, rackSortBy]);

  const filteredMiners = useMemo(() => {
    return miners
      .filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(minerSearch.toLowerCase());
        const matchesCells = minerCellFilter ? m.cells === minerCellFilter : true;
        
        let matchesRarity = true;
        if (minerFilterRarity !== 'Any') {
          matchesRarity = !!m.rarities[minerFilterRarity];
        }

        const stats = minerFilterRarity === 'Any' 
          ? m.rarities[m.defaultRarity] 
          : m.rarities[minerFilterRarity as Rarity];
        
        const power = stats?.power || 0;
        const bonus = stats?.bonus || 0;

        const matchesMinPower = minerMinPower !== '' ? power >= Number(minerMinPower) : true;
        const matchesMaxPower = minerMaxPower !== '' ? power <= Number(minerMaxPower) : true;
        const matchesMinBonus = minerMinBonus !== '' ? bonus >= Number(minerMinBonus) : true;
        const matchesMaxBonus = minerMaxBonus !== '' ? bonus <= Number(minerMaxBonus) : true;

        return matchesSearch && matchesCells && matchesRarity && matchesMinPower && matchesMaxPower && matchesMinBonus && matchesMaxBonus;
      })
      .sort((a, b) => {
        const statsA = minerFilterRarity === 'Any' ? a.rarities[a.defaultRarity] : a.rarities[minerFilterRarity as Rarity];
        const statsB = minerFilterRarity === 'Any' ? b.rarities[b.defaultRarity] : b.rarities[minerFilterRarity as Rarity];
        
        if (minerSortBy === 'power-desc') return (statsB?.power || 0) - (statsA?.power || 0);
        if (minerSortBy === 'power-asc') return (statsA?.power || 0) - (statsB?.power || 0);
        if (minerSortBy === 'bonus-desc') return (statsB?.bonus || 0) - (statsA?.bonus || 0);
        if (minerSortBy === 'bonus-asc') return (statsA?.bonus || 0) - (statsB?.bonus || 0);
        if (minerSortBy === 'name-asc') return a.name.localeCompare(b.name);
        if (minerSortBy === 'name-desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [miners, minerSearch, minerCellFilter, minerFilterRarity, minerMinPower, minerMaxPower, minerMinBonus, minerMaxBonus, minerSortBy]);

  const roomConfig = {
    1: { slots: 12 },
    2: { slots: 18 },
    3: { slots: 18 },
    4: { slots: 18 },
  };

  const currentRoomSlots = roomConfig[activeRoom as keyof typeof roomConfig].slots;

  const stats = useMemo(() => {
    let totalRawMinerPower = 0;
    let totalBonusPercentage = 0;
    let totalRackBonusPower = 0;
    const uniqueMiners = new Set<string>();

    placedRacks.forEach(pr => {
      const rack = racks.find(r => r.id === pr.rackId);
      let rackRawPower = 0;
      
      pr.miners.forEach(pm => {
        if (!pm) return;
        const miner = miners.find(m => m.id === pm.minerId);
        if (miner) {
          const minerStats = miner.rarities[pm.rarity];
          if (minerStats) {
            rackRawPower += minerStats.power;
            totalRawMinerPower += minerStats.power;
            
            // Unique bonus logic: Only the first miner of each rarity provides a bonus
            const uniqueKey = `${miner.id}-${pm.rarity}`;
            if (!uniqueMiners.has(uniqueKey)) {
              totalBonusPercentage += minerStats.bonus;
              uniqueMiners.add(uniqueKey);
            }
          }
        }
      });

      // Rack bonus applies to miners inside it
      const rackBonusMultiplier = (rack?.bonus || 0) / 100;
      totalRackBonusPower += rackRawPower * rackBonusMultiplier;
    });

    const bonusHashRate = totalRawMinerPower * (totalBonusPercentage / 100);
    const finalPower = totalRawMinerPower + bonusHashRate + totalRackBonusPower;

    return {
      rawMinerPower: totalRawMinerPower,
      bonusPercentage: totalBonusPercentage,
      bonusHashRate: bonusHashRate,
      rackBonusPower: totalRackBonusPower,
      finalPower
    };
  }, [placedRacks]);

  const addRack = (rackId: string) => {
    if (selectedSlot === null) return;
    const rackDef = racks.find(r => r.id === rackId);
    if (!rackDef) return;

    const newRack: PlacedRack = {
      id: Math.random().toString(36).substr(2, 9),
      rackId,
      slotIndex: selectedSlot,
      miners: Array(rackDef.slots).fill(null)
    };
    setPlacedRacks([...placedRacks, newRack]);
    setSelectedSlot(null);
  };

  const addMiner = (rackId: string, minerId: string, rarity: Rarity) => {
    const rackIndex = placedRacks.findIndex(r => r.id === rackId);
    if (rackIndex === -1) return;

    const rackDef = racks.find(r => r.id === placedRacks[rackIndex].rackId);
    if (!rackDef) return;

    const newPlacedRacks = [...placedRacks];
    const targetRack = { ...newPlacedRacks[rackIndex] };
    
    // Ensure miners array is initialized to the correct size
    if (targetRack.miners.length === 0) {
      targetRack.miners = Array(rackDef.slots).fill(null);
    }

    // If a shelf is selected, use it, otherwise find the first available
    let targetShelf = selectedShelf;
    if (targetShelf === null) {
      const firstEmpty = targetRack.miners.findIndex(m => m === null);
      if (firstEmpty !== -1) {
        targetShelf = firstEmpty;
      }
    }

    if (targetShelf !== null && targetShelf >= 0 && targetShelf < targetRack.miners.length) {
      targetRack.miners[targetShelf] = {
        id: Math.random().toString(36).substr(2, 9),
        minerId,
        rarity,
        slotIndex: targetShelf
      };
      newPlacedRacks[rackIndex] = targetRack;
      setPlacedRacks(newPlacedRacks);
      // Don't reset shelf selection if we want to keep adding to it, 
      // but usually we want to move to the next one or just stay.
      // Let's keep it selected for now or reset if it was a manual selection.
      if (selectedShelf !== null) setSelectedShelf(null);
    }
  };

  const removeRack = (id: string) => {
    setPlacedRacks(placedRacks.filter(r => r.id !== id));
    if (selectedSlot !== null) {
      const rack = placedRacks.find(r => r.id === id);
      if (rack?.slotIndex === selectedSlot) {
        setSelectedSlot(null);
        setSelectedShelf(null);
      }
    }
  };

  const removeMiner = (rackId: string, shelfIdx: number) => {
    const newPlacedRacks = [...placedRacks];
    const rackIndex = newPlacedRacks.findIndex(r => r.id === rackId);
    if (rackIndex === -1) return;

    const targetRack = { ...newPlacedRacks[rackIndex] };
    if (targetRack.miners[shelfIdx]) {
      targetRack.miners[shelfIdx] = null;
      newPlacedRacks[rackIndex] = targetRack;
      setPlacedRacks(newPlacedRacks);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-slate-400 font-bold animate-pulse">Loading Simulator Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {!isEditing && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">Room Simulator</h2>
            <p className="text-slate-400">Plan your layout and maximize your power potential.</p>
          </div>
          <div className="flex w-full md:w-fit gap-1.5 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
            {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => setActiveRoom(num)}
                  className={cn(
                    "flex-1 md:w-10 h-10 rounded-lg text-sm md:text-base font-bold transition-all flex items-center justify-center",
                    activeRoom === num 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                      : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                  )}
                >
                  {num}
                </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn(
        "transition-all duration-500 ease-in-out",
        isEditing ? "fixed inset-0 z-[100] bg-[#0f0f14] p-8 flex flex-col gap-6" : "grid grid-cols-1 lg:grid-cols-4 gap-8"
      )}>
        {/* Room Grid */}
        <div className={cn(
          "space-y-6 transition-all duration-500",
          isEditing ? "flex-[2] flex flex-col min-h-0" : "lg:col-span-3"
        )}>
          {isEditing && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Room:</span>
                  <div className="flex gap-1.5 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setActiveRoom(num)}
                        className={cn(
                          "w-10 h-10 rounded-lg text-base font-bold transition-all flex items-center justify-center",
                          activeRoom === num 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                            : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                    Slot {selectedSlot! + 1} {selectedShelf !== null ? `(Shelf ${selectedShelf + 1})` : ''} Selected
                  </span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedSlot(null);
                  setSelectedShelf(null);
                }}
                className="flex items-center justify-center w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                title="Exit Editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className={cn(
            "flex-1 overflow-auto custom-scrollbar transition-all duration-500",
            isEditing ? "p-6" : ""
          )}>
            <div className={cn(
              "bg-[#2d2d3d] rounded-[32px] border-8 border-[#1a1a24] shadow-2xl relative transition-all duration-500 mx-auto",
              isEditing ? "p-12 w-fit h-fit" : "p-8 w-full h-fit overflow-hidden"
            )}>
              {/* Blueprint Grid Pattern */}
              <div className="absolute inset-0 opacity-20 pointer-events-none" 
                   style={{ 
                     backgroundImage: `
                       linear-gradient(to right, #475569 1px, transparent 1px),
                       linear-gradient(to bottom, #475569 1px, transparent 1px)
                     `,
                     backgroundSize: '40px 40px'
                   }} />
              
              {/* Blueprint Sub-grid */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" 
                   style={{ 
                     backgroundImage: `
                       linear-gradient(to right, #475569 1px, transparent 1px),
                       linear-gradient(to bottom, #475569 1px, transparent 1px)
                     `,
                     backgroundSize: '10px 10px'
                   }} />

              {/* Blueprint Markings */}
              <div className="absolute top-6 left-6 w-16 h-16 border-t-2 border-l-2 border-white/10 pointer-events-none" />
              <div className="absolute top-6 right-6 w-16 h-16 border-t-2 border-r-2 border-white/10 pointer-events-none" />
              <div className="absolute bottom-6 left-6 w-16 h-16 border-b-2 border-l-2 border-white/10 pointer-events-none" />
              <div className="absolute bottom-6 right-6 w-16 h-16 border-b-2 border-r-2 border-white/10 pointer-events-none" />
              
              <div className={cn(
                "relative grid grid-cols-6 gap-x-4 gap-y-8 transition-all duration-500",
                isEditing ? "w-[900px]" : "w-full max-w-[750px] mx-auto"
              )}>
              {Array.from({ length: currentRoomSlots }).map((_, i) => {
                const placedRack = placedRacks.find(r => r.slotIndex === i);
                const rackDef = placedRack ? racks.find(r => r.id === placedRack.rackId) : null;
                
                return (
                  <div 
                    key={i}
                    onClick={() => setSelectedSlot(selectedSlot === i ? null : i)}
                    className={cn(
                      "relative aspect-[2/3] transition-all cursor-pointer group",
                      !placedRack && (selectedSlot === i ? "bg-emerald-500/20 border-2 border-emerald-500 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-black/20 border-2 border-dashed border-white/5 rounded-xl hover:border-white/20")
                    )}
                  >
                    {placedRack && rackDef ? (
                      <div className={cn(
                        "w-full h-full flex flex-col relative transition-all",
                        selectedSlot === i && "ring-2 ring-emerald-500 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      )}>
                        {/* Rack Structure (Fallback/Base) */}
                        <div className={cn(
                          "absolute inset-0 border-x-4 border-slate-400/30 flex flex-col justify-between py-2",
                          rackDef.image ? "opacity-20" : "opacity-100"
                        )}>
                          <div className="h-1 bg-slate-400/20 w-full" />
                          <div className="h-1 bg-slate-400/20 w-full" />
                          <div className="h-1 bg-slate-400/20 w-full" />
                          <div className="h-1 bg-slate-400/20 w-full" />
                        </div>

                        {/* Rack Image from RC */}
                        {rackDef.image && (
                          <MinerImage 
                            image={rackDef.image} 
                            name={rackDef.name}
                            baseUrl="racks"
                            extension=".png"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-0" 
                            fallbackClassName="absolute inset-0 w-full h-full"
                          />
                        )}

                        {/* Shelves */}
                        <div className="flex-1 flex flex-col justify-around px-2 py-1 gap-1">
                          {placedRack.miners.map((m, shelfIdx) => {
                            const minerDef = m ? miners.find(min => min.id === m.minerId) : null;
                            const isShelfSelected = selectedSlot === i && selectedShelf === shelfIdx;
                            
                            return (
                              <div 
                                key={shelfIdx} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSlot(i);
                                  setSelectedShelf(selectedShelf === shelfIdx ? null : shelfIdx);
                                }}
                                className={cn(
                                  "relative h-full bg-black/40 rounded border border-white/5 flex items-center justify-center group/shelf hover:border-emerald-500/50 transition-all cursor-pointer",
                                  isShelfSelected && "border-emerald-500 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                )}
                              >
                                {minerDef ? (
                                  <div className="w-full h-full p-0.5 flex items-center justify-center group/miner relative">
                                    <MinerImage 
                                      image={minerDef.image} 
                                      name={minerDef.name}
                                      className="h-full object-contain" 
                                      fallbackClassName="h-full"
                                    />
                                    
                                    {/* Miner Context Menu on Hover */}
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/miner:opacity-100 transition-opacity flex items-center justify-center gap-1 z-20">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMiner(placedRack.id, shelfIdx);
                                        }}
                                        className="p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-500 transition-colors"
                                        title="Remove Miner"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <Plus className={cn(
                                    "w-3 h-3 transition-all",
                                    isShelfSelected ? "text-emerald-500 scale-125" : "text-white/5 group-hover/shelf:text-white/20"
                                  )} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Rack Actions on Hover */}
                        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRack(placedRack.id);
                            }}
                            className="p-1.5 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus className={cn("w-8 h-8 transition-colors", selectedSlot === i ? "text-emerald-500" : "text-white/10")} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {/* Sidebar Stats (Visible when not editing) */}
        {!isEditing && (
          <div className="space-y-6">
            <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[32px] shadow-xl shadow-emerald-500/20 text-white">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-4">Total Power</p>
              <div className="space-y-4">
                <div>
                  <p className="text-4xl font-black">{stats.finalPower.toLocaleString()} <span className="text-lg font-bold opacity-80">Gh/s</span></p>
                </div>
                <div className="pt-4 border-t border-white/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Miners</span>
                    <span className="font-bold">{stats.rawMinerPower.toLocaleString()} Gh/s</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Bonus</span>
                    <span className="font-bold">+{stats.bonusPercentage.toFixed(2)}% | {stats.bonusHashRate.toLocaleString()} Gh/s</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Rack Bonus</span>
                    <span className="font-bold">{stats.rackBonusPower.toLocaleString()} Gh/s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#1a1a24] rounded-[32px] border border-slate-800">
              <div className="flex items-center gap-3 text-slate-400 mb-4">
                <Info className="w-5 h-5" />
                <p className="text-xs font-medium">Click any slot in the room to start editing your layout.</p>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Inventory (Visible only when editing) */}
        {isEditing && (
          <div className="flex-1 bg-[#1a1a24] rounded-t-[32px] border-t border-x border-slate-800 flex flex-col overflow-hidden shadow-2xl shrink-0 min-h-0">
            {/* Inventory Toolbar */}
            <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-[#1a1a24]/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex gap-1 p-1 bg-[#0f0f14] rounded-xl border border-slate-800">
                  <button 
                    onClick={() => setInventoryTab('racks')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      inventoryTab === 'racks' ? "bg-slate-700 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Racks
                  </button>
                  <button 
                    onClick={() => setInventoryTab('miners')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      inventoryTab === 'miners' ? "bg-slate-700 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Miners
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input 
                      type="text"
                      placeholder={inventoryTab === 'racks' ? "Search racks..." : "Search miners..."}
                      value={inventoryTab === 'racks' ? rackSearch : minerSearch}
                      onChange={(e) => inventoryTab === 'racks' ? setRackSearch(e.target.value) : setMinerSearch(e.target.value)}
                      className="bg-[#0f0f14] border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all w-40 md:w-56"
                    />
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        "p-2 border rounded-xl transition-all",
                        showFilters ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-[#0f0f14] border-slate-800 text-slate-500 hover:text-white"
                      )}
                    >
                      <Filter className="w-4 h-4" />
                    </button>

                    {showFilters && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1a24] border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Filters</h4>
                          <button onClick={() => setShowFilters(false)} className="text-slate-500 hover:text-white">
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {inventoryTab === 'racks' ? (
                          <>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Slots</p>
                              <div className="flex gap-2">
                                {[6, 8].map(slots => (
                                  <button
                                    key={slots}
                                    onClick={() => {
                                      setRackSlotsFilter(prev => 
                                        prev.includes(slots) ? prev.filter(s => s !== slots) : [...prev, slots]
                                      );
                                    }}
                                    className={cn(
                                      "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                      rackSlotsFilter.includes(slots)
                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                        : "bg-[#0f0f14] border-slate-800 text-slate-500 hover:text-slate-300"
                                    )}
                                  >
                                    {slots} Slots
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Bonus Range (%)</p>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  placeholder="Min"
                                  value={rackMinBonus}
                                  onChange={(e) => setRackMinBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0f0f14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-slate-600">-</span>
                                <input 
                                  type="number" 
                                  placeholder="Max"
                                  value={rackMaxBonus}
                                  onChange={(e) => setRackMaxBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0f0f14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Cells</p>
                              <div className="flex gap-2">
                                {[1, 2].map(cells => (
                                  <button
                                    key={cells}
                                    onClick={() => setMinerCellFilter(minerCellFilter === cells ? null : cells)}
                                    className={cn(
                                      "flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                      minerCellFilter === cells
                                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                                        : "bg-[#0f0f14] border-slate-800 text-slate-500 hover:text-slate-300"
                                    )}
                                  >
                                    {cells} Cell{cells > 1 ? 's' : ''}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Rarity</p>
                              <select 
                                value={minerFilterRarity}
                                onChange={(e) => setMinerFilterRarity(e.target.value as any)}
                                className="w-full bg-[#0f0f14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                              >
                                <option value="Any">Any Rarity</option>
                                {Object.values(Rarity).map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Power Range (Gh/s)</p>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  placeholder="Min"
                                  value={minerMinPower}
                                  onChange={(e) => setMinerMinPower(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0f0f14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-slate-600">-</span>
                                <input 
                                  type="number" 
                                  placeholder="Max"
                                  value={minerMaxPower}
                                  onChange={(e) => setMinerMaxPower(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0f0f14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-500 uppercase">Bonus Range (%)</p>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" 
                                  placeholder="Min"
                                  value={minerMinBonus}
                                  onChange={(e) => setMinerMinBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0f0f14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                                <span className="text-slate-600">-</span>
                                <input 
                                  type="number" 
                                  placeholder="Max"
                                  value={minerMaxBonus}
                                  onChange={(e) => setMinerMaxBonus(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="w-full bg-[#0f0f14] border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </>
                        )}
                        
                        <button 
                          onClick={() => {
                            if (inventoryTab === 'racks') {
                              setRackSlotsFilter([]);
                              setRackMinBonus('');
                              setRackMaxBonus('');
                            } else {
                              setMinerCellFilter(null);
                              setMinerFilterRarity('Any');
                              setMinerMinPower('');
                              setMinerMaxPower('');
                              setMinerMinBonus('');
                              setMinerMaxBonus('');
                            }
                          }}
                          className="w-full py-2 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors"
                        >
                          Reset Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group/sort">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f0f14] border border-slate-800 rounded-xl cursor-pointer hover:border-slate-600 transition-all">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap">
                      {inventoryTab === 'racks' ? (
                        rackSortBy === 'bonus-desc' ? 'Bonus: High - Low' :
                        rackSortBy === 'bonus-asc' ? 'Bonus: Low - High' :
                        rackSortBy === 'name-asc' ? 'Name: A - Z' : 'Name: Z - A'
                      ) : (
                        minerSortBy === 'power-desc' ? 'Power: High - Low' :
                        minerSortBy === 'power-asc' ? 'Power: Low - High' :
                        minerSortBy === 'bonus-desc' ? 'Bonus: High - Low' :
                        minerSortBy === 'bonus-asc' ? 'Bonus: Low - High' :
                        minerSortBy === 'name-asc' ? 'Name: A - Z' : 'Name: Z - A'
                      )}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a1a24] border border-slate-800 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover/sort:opacity-100 group-hover/sort:visible transition-all z-50">
                    {inventoryTab === 'racks' ? (
                      <>
                        <button onClick={() => setRackSortBy('bonus-desc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: High - Low</button>
                        <button onClick={() => setRackSortBy('bonus-asc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: Low - High</button>
                        <button onClick={() => setRackSortBy('name-asc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: A - Z</button>
                        <button onClick={() => setRackSortBy('name-desc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: Z - A</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setMinerSortBy('power-desc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Power: High - Low</button>
                        <button onClick={() => setMinerSortBy('power-asc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Power: Low - High</button>
                        <button onClick={() => setMinerSortBy('bonus-desc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: High - Low</button>
                        <button onClick={() => setMinerSortBy('bonus-asc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: Low - High</button>
                        <button onClick={() => setMinerSortBy('name-asc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: A - Z</button>
                        <button onClick={() => setMinerSortBy('name-desc')} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: Z - A</button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button className="p-1.5 bg-[#0f0f14] border border-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                    <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                  </button>
                  <button className="p-1.5 bg-[#0f0f14] border border-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                    <ChevronUp className="w-4 h-4 rotate-90" />
                  </button>
                </div>
              </div>
            </div>

            {/* Horizontal Scrollable List */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-4">
              <div className="flex gap-2 min-w-max h-full items-center">
                {inventoryTab === 'racks' ? (
                  filteredRacks.map(r => (
                    <button
                      key={r.id}
                      onClick={() => addRack(r.id)}
                      className="w-36 h-full rounded-xl border border-slate-800 bg-[#0f0f14] text-left transition-all flex flex-col group relative overflow-hidden hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10"
                    >
                      <div className="relative flex-1 bg-slate-900/30 flex items-center justify-center">
                        {r.image ? (
                          <MinerImage 
                            image={r.image} 
                            name={r.name}
                            baseUrl="racks"
                            extension=".png"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                          />
                        ) : (
                          <LayoutIcon className="w-6 h-6 text-slate-600 group-hover:text-emerald-500 transition-colors" />
                        )}
                        {r.setId && (
                          <div className="absolute top-1 left-1 w-4 h-4 z-10">
                            <img 
                              src="https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/QoLz7tdVdjJnpmvG-wFgQ.png" 
                              alt="Set Icon"
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-[#1a1a24] border-t border-slate-800/50">
                        <p className="text-[10px] font-bold text-white truncate mb-0.5">{r.name}</p>
                        <p className="text-[10px] text-emerald-400 font-bold">{r.bonus}%</p>
                      </div>
                      <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors flex items-center justify-center">
                        <Plus className="w-6 h-6 text-emerald-500 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
                      </div>
                    </button>
                  ))
                ) : selectedMinerForRarity ? (
                  (() => {
                    const m = miners.find(min => min.id === selectedMinerForRarity);
                    if (!m) return null;
                    const selectedRack = selectedSlot !== null ? placedRacks.find(r => r.slotIndex === selectedSlot) : null;
                    
                    return (
                      <>
                        <button 
                          onClick={() => setSelectedMinerForRarity(null)}
                          className="w-12 h-full bg-slate-800/50 hover:bg-slate-700/50 rounded-xl flex items-center justify-center text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        {Object.entries(m.rarities).map(([rarity, data]) => {
                          const rarityKey = rarity as Rarity;
                          const rarityData = data as MinerRarity;
                          return (
                            <button 
                              key={rarityKey} 
                              onClick={() => selectedRack && addMiner(selectedRack.id, m.id, rarityKey)}
                              className="w-40 h-full bg-[#0f0f14] border border-slate-800 rounded-xl overflow-hidden flex flex-col group/rarity-card transition-all text-left hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                            >
                              <div className="relative flex-1 bg-slate-900/30 flex items-center justify-center">
                                <MinerImage 
                                  image={m.image} 
                                  name={m.name}
                                  className="w-full h-full object-contain group-hover/rarity-card:scale-110 transition-transform" 
                                />
                                <div className="absolute top-1 left-1">
                                  <RarityBadge rarity={rarityKey} />
                                </div>
                              </div>
                              <div className="p-2 bg-[#1a1a24] border-t border-slate-800/50 space-y-1">
                                <p className="text-[10px] font-bold text-white truncate">{m.name}</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-white font-bold">{(rarityData?.power || 0).toLocaleString()} <span className="text-slate-500 font-medium">Gh/s</span></span>
                                  <span className="text-[10px] text-emerald-400 font-bold">| {rarityData?.bonus || 0}%</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    );
                  })()
                ) : (
                  filteredMiners.map(m => {
                    return (
                      <button 
                        key={m.id} 
                        onClick={() => setSelectedMinerForRarity(m.id)}
                        className="w-40 h-full bg-[#0f0f14] border border-slate-800 rounded-xl overflow-hidden flex flex-col group/miner-card transition-all text-left hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                      >
                        <div className="relative flex-1 bg-slate-900/30 flex items-center justify-center">
                          <MinerImage 
                            image={m.image} 
                            name={m.name}
                            className="w-full h-full object-contain group-hover/miner-card:scale-110 transition-transform" 
                            fallbackClassName="w-full h-full"
                          />
                        </div>
                        <div className="p-2 bg-[#1a1a24] border-t border-slate-800/50">
                          <p className="text-[10px] font-bold text-white truncate">{m.name}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
