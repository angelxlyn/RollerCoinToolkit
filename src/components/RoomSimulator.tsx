import React, { useState, useMemo } from 'react';
import { Miner, Rack, Rarity } from '../types';
import { MINERS_DB, RACKS } from '../constants';
import MinerImage from './MinerImage';
import { Layout as LayoutIcon, Plus, Trash2, Zap, Shield, Info, Layers, Search, Filter, ArrowUpDown, ChevronDown, ChevronUp, X } from 'lucide-react';
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
  miners: PlacedMiner[];
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

  // UI State
  const [inventoryTab, setInventoryTab] = useState<'racks' | 'miners'>('racks');

  // Rack Filters
  const [rackSearch, setRackSearch] = useState('');
  const [rackSlotsFilter, setRackSlotsFilter] = useState<number | null>(null);

  // Miner Filters
  const [minerSearch, setMinerSearch] = useState('');
  const [minerCellFilter, setMinerCellFilter] = useState<number | null>(null);
  const [minerSortBy, setMinerSortBy] = useState<'power' | 'bonus' | 'name'>('power');
  const [minerSortOrder, setMinerSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minerMinPower, setMinerMinPower] = useState<number | ''>('');
  const [minerMaxPower, setMinerMaxPower] = useState<number | ''>('');
  const [minerMinBonus, setMinerMinBonus] = useState<number | ''>('');
  const [minerMaxBonus, setMinerMaxBonus] = useState<number | ''>('');

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
      const rack = RACKS.find(r => r.id === pr.rackId);
      let rackRawPower = 0;
      
      pr.miners.forEach(pm => {
        const miner = MINERS_DB.find(m => m.id === pm.minerId);
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
    const newRack: PlacedRack = {
      id: Math.random().toString(36).substr(2, 9),
      rackId,
      slotIndex: selectedSlot,
      miners: []
    };
    setPlacedRacks([...placedRacks, newRack]);
    setSelectedSlot(null);
  };

  const addMiner = (rackId: string, minerId: string, rarity: Rarity) => {
    const rackIndex = placedRacks.findIndex(r => r.id === rackId);
    if (rackIndex === -1) return;

    const rack = RACKS.find(r => r.id === placedRacks[rackIndex].rackId);
    if (placedRacks[rackIndex].miners.length >= (rack?.slots || 0)) return;

    const newMiner: PlacedMiner = {
      id: Math.random().toString(36).substr(2, 9),
      minerId,
      rarity,
      slotIndex: placedRacks[rackIndex].miners.length
    };

    const newRacks = [...placedRacks];
    newRacks[rackIndex].miners.push(newMiner);
    setPlacedRacks(newRacks);
  };

  const removeRack = (id: string) => {
    setPlacedRacks(placedRacks.filter(r => r.id !== id));
  };

  return (
    <div className="space-y-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Room Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-8 bg-[#2d2d3d] rounded-[20px] border-4 border-[#1a1a24] shadow-2xl relative overflow-hidden">
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
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-white/10 pointer-events-none" />
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/10 pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/10 pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-white/10 pointer-events-none" />
            
            {/* Decorative Blueprint hamsters/technical drawings */}
            <div className="absolute top-10 left-10 opacity-5 pointer-events-none select-none">
              <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M20 50C20 33.4315 33.4315 20 50 20C66.5685 20 80 33.4315 80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50Z" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4"/>
                <path d="M35 40L65 60M65 40L35 60" stroke="currentColor" strokeWidth="1"/>
                <circle cx="50" cy="50" r="5" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </div>
            <div className="absolute bottom-10 right-10 opacity-5 pointer-events-none select-none rotate-180">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <rect x="20" y="20" width="80" height="80" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
                <path d="M20 20L100 100M100 20L20 100" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                <text x="25" y="15" fill="currentColor" fontSize="8" fontFamily="monospace">REF: RC-SIM-01</text>
              </svg>
            </div>
            
            <div className="relative grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-12">
              {Array.from({ length: currentRoomSlots }).map((_, i) => {
                const placedRack = placedRacks.find(r => r.slotIndex === i);
                const rackDef = placedRack ? RACKS.find(r => r.id === placedRack.rackId) : null;
                
                return (
                  <div 
                    key={i}
                    onClick={() => setSelectedSlot(i)}
                    className={cn(
                      "relative aspect-[2/3] transition-all cursor-pointer group",
                      !placedRack && (selectedSlot === i ? "bg-emerald-500/10 border-2 border-emerald-500 rounded-xl" : "bg-black/20 border-2 border-dashed border-white/5 rounded-xl hover:border-white/20")
                    )}
                  >
                    {placedRack && rackDef ? (
                      <div className="w-full h-full flex flex-col relative">
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

                        {/* Miners on Shelves */}
                        <div className="relative z-10 flex-1 grid grid-rows-4 gap-2 p-1">
                          {Array.from({ length: 4 }).map((_, shelfIdx) => {
                            const slotsPerShelf = rackDef.slots / 4;
                            const shelfMiners = placedRack.miners.filter(m => 
                              m.slotIndex >= shelfIdx * slotsPerShelf && m.slotIndex < (shelfIdx + 1) * slotsPerShelf
                            );

                            return (
                              <div key={shelfIdx} className="relative flex items-end justify-center gap-1 border-b border-slate-400/40 pb-1">
                                {shelfMiners.map(pm => {
                                  const minerDef = MINERS_DB.find(m => m.id === pm.minerId);
                                  return (
                                    <div key={pm.id} className="relative group/miner-placed">
                                      <RarityBadge rarity={pm.rarity} />
                                      <MinerImage 
                                        image={minerDef?.image} 
                                        name={minerDef?.name || ''}
                                        className="h-8 md:h-10 object-contain drop-shadow-md" 
                                        fallbackClassName="h-8 md:h-10"
                                      />
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newRacks = [...placedRacks];
                                          const rIdx = newRacks.findIndex(r => r.id === placedRack.id);
                                          newRacks[rIdx].miners = newRacks[rIdx].miners.filter(m => m.id !== pm.id);
                                          setPlacedRacks(newRacks);
                                        }}
                                        className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover/miner-placed:opacity-100 transition-opacity"
                                      >
                                        <Trash2 className="w-2 h-2 text-white" />
                                      </button>
                                    </div>
                                  );
                                })}
                                
                                {/* Add Miner Button for Shelf */}
                                {shelfMiners.length < slotsPerShelf && (
                                  <div className="relative group/add-miner">
                                    <button className="w-8 h-8 rounded border border-dashed border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
                                      <Plus className="w-3 h-3 text-white/20" />
                                    </button>
                                    
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[400px] bg-[#1a1a24] border border-slate-700 rounded-xl shadow-2xl p-4 hidden group-hover/add-miner:block z-50">
                                      <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                          <p className="text-xs font-bold text-white uppercase tracking-wider">Select Miner</p>
                                        </div>
                                        <div className="flex gap-1">
                                          <button 
                                            onClick={() => {
                                              setMinerSearch('');
                                              setMinerCellFilter(null);
                                              setMinerMinPower('');
                                              setMinerMaxPower('');
                                              setMinerMinBonus('');
                                              setMinerMaxBonus('');
                                            }}
                                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                                            title="Clear Filters"
                                          >
                                            <X className="w-4 h-4 text-slate-400" />
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setMinerSortOrder(minerSortOrder === 'asc' ? 'desc' : 'asc');
                                            }}
                                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                                          >
                                            <ArrowUpDown className="w-4 h-4 text-slate-400" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Miner Filters */}
                                      <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="relative col-span-2">
                                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                          <input 
                                            type="text"
                                            placeholder="Search miners..."
                                            value={minerSearch}
                                            onChange={(e) => setMinerSearch(e.target.value)}
                                            className="w-full bg-[#0f0f14] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                        
                                        <select 
                                          value={minerCellFilter || ''}
                                          onChange={(e) => setMinerCellFilter(e.target.value ? Number(e.target.value) : null)}
                                          className="bg-[#0f0f14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                        >
                                          <option value="">All Cells</option>
                                          <option value="1">1 Cell</option>
                                          <option value="2">2 Cells</option>
                                        </select>
                                        <select 
                                          value={minerSortBy}
                                          onChange={(e) => setMinerSortBy(e.target.value as any)}
                                          className="bg-[#0f0f14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                                        >
                                          <option value="power">Sort by Power</option>
                                          <option value="bonus">Sort by Bonus</option>
                                          <option value="name">Sort by Name</option>
                                        </select>
                                      </div>

                                      <div className="max-h-[400px] overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar pr-1">
                                        {MINERS_DB
                                          .filter(m => {
                                            const matchesSearch = m.name.toLowerCase().includes(minerSearch.toLowerCase());
                                            const matchesCell = minerCellFilter ? m.cells === minerCellFilter : true;
                                            
                                            const matchesStats = Object.values(m.rarities).some(s => {
                                              if (!s) return false;
                                              const matchesMinPower = minerMinPower !== '' ? s.power >= minerMinPower : true;
                                              const matchesMaxPower = minerMaxPower !== '' ? s.power <= minerMaxPower : true;
                                              const matchesMinBonus = minerMinBonus !== '' ? s.bonus >= minerMinBonus : true;
                                              const matchesMaxBonus = minerMaxBonus !== '' ? s.bonus <= minerMaxBonus : true;
                                              return matchesMinPower && matchesMaxPower && matchesMinBonus && matchesMaxBonus;
                                            });

                                            return matchesSearch && matchesCell && matchesStats;
                                          })
                                          .sort((a, b) => {
                                            let valA: any, valB: any;
                                            if (minerSortBy === 'name') {
                                              valA = a.name;
                                              valB = b.name;
                                            } else {
                                              valA = a.rarities[a.defaultRarity]?.power || 0;
                                              valB = b.rarities[b.defaultRarity]?.power || 0;
                                              if (minerSortBy === 'bonus') {
                                                valA = a.rarities[a.defaultRarity]?.bonus || 0;
                                                valB = b.rarities[b.defaultRarity]?.bonus || 0;
                                              }
                                            }
                                            return minerSortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
                                          })
                                          .map(m => (
                                          <div key={m.id} className="bg-[#1a1a24] border border-slate-800 rounded-lg overflow-hidden flex flex-col group/miner-card hover:border-emerald-500/50 transition-all">
                                            <div className="relative aspect-[4/3] bg-[#0f0f14] flex items-center justify-center p-2">
                                              <MinerImage 
                                                image={m.image} 
                                                name={m.name}
                                                className="h-10 object-contain group-hover/miner-card:scale-110 transition-transform" 
                                                fallbackClassName="h-10"
                                              />
                                              <div className="absolute top-1 right-1 bg-slate-800/80 px-1 rounded text-[8px] text-white font-bold">1</div>
                                              <div className="absolute top-1 left-1 bg-emerald-500 px-1 rounded text-[8px] text-white font-bold">I</div>
                                            </div>
                                            <div className="p-1.5 space-y-1">
                                              <p className="text-[9px] font-bold text-white truncate">{m.name}</p>
                                              <div className="flex flex-wrap gap-1">
                                                {(Object.keys(m.rarities) as Rarity[]).map(rarity => {
                                                  const rStats = m.rarities[rarity];
                                                  if (!rStats) return null;
                                                  return (
                                                    <button
                                                      key={rarity}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        addMiner(placedRack.id, m.id, rarity);
                                                      }}
                                                      className={cn(
                                                        "flex-1 py-0.5 rounded text-[8px] font-bold text-white transition-all hover:brightness-110",
                                                        RARITY_BADGE_COLORS[rarity] || 'bg-slate-600'
                                                      )}
                                                    >
                                                      {RARITY_ROMAN[rarity]}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                            <div className="bg-[#2a4a5a] px-1.5 py-0.5 flex justify-between items-center">
                                              <span className="text-[8px] text-emerald-400 font-bold">{(m.rarities[m.defaultRarity]?.power || 0).toLocaleString()} Th/s</span>
                                              <span className="text-[8px] text-blue-400 font-bold">+{m.rarities[m.defaultRarity]?.bonus}%</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Rack Controls Menu (RollerCoin Style) */}
                        <div className="absolute -left-28 top-0 w-24 bg-[#1a1a24]/95 border border-slate-700 rounded-lg shadow-2xl p-1 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          <button 
                            onClick={(e) => { e.stopPropagation(); /* Edit logic */ }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Layers className="w-3 h-3" /> Edit
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const newRacks = [...placedRacks];
                              const rIdx = newRacks.findIndex(r => r.id === placedRack.id);
                              newRacks[rIdx].miners = [];
                              setPlacedRacks(newRacks);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 rounded transition-colors"
                          >
                            <Zap className="w-3 h-3" /> Unmount Miners
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeRack(placedRack.id); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <X className="w-3 h-3" /> Unmount Rack
                          </button>
                        </div>

                        {/* Rack Info Badge */}
                        <div className="absolute -top-6 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-bold text-white bg-[#1a1a24] border border-slate-700 px-2 py-0.5 rounded-full shadow-lg">
                            {rackDef.name}
                          </span>
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

        {/* Controls & Stats */}
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-xl shadow-emerald-500/20 text-white">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-4">Total Power</p>
            <div className="space-y-4">
              <div>
                <p className="text-4xl font-black">{stats.finalPower.toLocaleString()} <span className="text-lg font-bold opacity-80">Th/s</span></p>
              </div>
              <div className="pt-4 border-t border-white/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Miners</span>
                  <span className="font-bold">{stats.rawMinerPower.toLocaleString()} Th/s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Bonus Power</span>
                  <span className="font-bold">+{stats.bonusPercentage.toFixed(2)}% | {stats.bonusHashRate.toLocaleString()} Th/s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Rack Bonus</span>
                  <span className="font-bold">{stats.rackBonusPower.toLocaleString()} Th/s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#1a1a24] rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-1 p-1 bg-[#0f0f14] rounded-xl border border-slate-800">
                <button 
                  onClick={() => setInventoryTab('racks')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    inventoryTab === 'racks' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Racks
                </button>
                <button 
                  onClick={() => setInventoryTab('miners')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    inventoryTab === 'miners' ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Miners
                </button>
              </div>
              <div className="flex gap-2">
                <button className="p-2 bg-[#0f0f14] border border-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                  <Search className="w-4 h-4" />
                </button>
                <button className="p-2 bg-[#0f0f14] border border-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {inventoryTab === 'racks' ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Rack</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setRackSlotsFilter(null)}
                        className={cn("text-[10px] px-2 py-0.5 rounded transition-colors", rackSlotsFilter === null ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-200")}
                      >
                        All
                      </button>
                      <button 
                        onClick={() => setRackSlotsFilter(6)}
                        className={cn("text-[10px] px-2 py-0.5 rounded transition-colors", rackSlotsFilter === 6 ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-200")}
                      >
                        6 Slots
                      </button>
                      <button 
                        onClick={() => setRackSlotsFilter(8)}
                        className={cn("text-[10px] px-2 py-0.5 rounded transition-colors", rackSlotsFilter === 8 ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-slate-200")}
                      >
                        8 Slots
                      </button>
                    </div>
                  </div>

                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Search racks..."
                      value={rackSearch}
                      onChange={(e) => setRackSearch(e.target.value)}
                      className="w-full bg-[#0f0f14] border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    {rackSearch && (
                      <button 
                        onClick={() => setRackSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                    {RACKS
                      .filter(r => {
                        const matchesSearch = r.name.toLowerCase().includes(rackSearch.toLowerCase());
                        const matchesSlots = rackSlotsFilter ? r.slots === rackSlotsFilter : true;
                        return matchesSearch && matchesSlots;
                      })
                      .map(r => (
                      <button
                        key={r.id}
                        onClick={() => addRack(r.id)}
                        disabled={selectedSlot === null}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex justify-between items-center group",
                          selectedSlot !== null 
                            ? "bg-[#0f0f14] border-slate-800 hover:border-emerald-500" 
                            : "bg-[#0f0f14]/50 border-slate-900 opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div>
                          <p className="text-sm font-bold text-white">{r.name}</p>
                          <p className="text-[10px] text-slate-500">{r.slots} Slots • {r.bonus}% Bonus</p>
                        </div>
                        <Plus className="w-4 h-4 text-slate-600 group-hover:text-emerald-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Search miners..."
                      value={minerSearch}
                      onChange={(e) => setMinerSearch(e.target.value)}
                      className="w-full bg-[#0f0f14] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {MINERS_DB
                      .filter(m => m.name.toLowerCase().includes(minerSearch.toLowerCase()))
                      .map(m => (
                      <div key={m.id} className="bg-[#1a1a24] border border-slate-800 rounded-lg overflow-hidden flex flex-col group/miner-card hover:border-emerald-500/50 transition-all">
                        <div className="relative aspect-[4/3] bg-[#0f0f14] flex items-center justify-center p-2">
                          <MinerImage 
                            image={m.image} 
                            name={m.name}
                            className="h-12 object-contain group-hover/miner-card:scale-110 transition-transform" 
                            fallbackClassName="h-12"
                          />
                          <div className="absolute top-1 right-1 bg-slate-800/80 px-1 rounded text-[8px] text-white font-bold">1</div>
                          <div className="absolute top-1 left-1 bg-emerald-500 px-1 rounded text-[8px] text-white font-bold">I</div>
                        </div>
                        <div className="p-2 space-y-1">
                          <p className="text-[10px] font-bold text-white truncate">{m.name}</p>
                          <div className="grid grid-cols-3 gap-1">
                            {(Object.keys(m.rarities) as Rarity[]).map(rarity => {
                              const rStats = m.rarities[rarity];
                              if (!rStats) return null;
                              return (
                                <div
                                  key={rarity}
                                  className={cn(
                                    "py-0.5 rounded text-[8px] font-bold text-white text-center opacity-50",
                                    RARITY_BADGE_COLORS[rarity] || 'bg-slate-600'
                                  )}
                                >
                                  {RARITY_ROMAN[rarity]}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="bg-[#2a4a5a] px-2 py-1 flex justify-between items-center">
                          <span className="text-[9px] text-emerald-400 font-bold">{(m.rarities[m.defaultRarity]?.power || 0).toLocaleString()} Th/s</span>
                          <span className="text-[9px] text-blue-400 font-bold">+{m.rarities[m.defaultRarity]?.bonus}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
