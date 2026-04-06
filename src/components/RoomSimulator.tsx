import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Miner, Rack, Rarity, MinerRarity, CollectionSet } from '../types';
import { fetchMiners } from '../services/apiService';
import MinerImage from './MinerImage';
import { Layout as LayoutIcon, Plus, Trash2, Zap, Shield, Info, Layers, Search, Filter, ArrowUpDown, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
  roomIndex: number;
  miners: (PlacedMiner | null)[];
}

const RARITY_ROMAN = {
  [Rarity.COMMON]: 'I',
  [Rarity.UNCOMMON]: 'II',
  [Rarity.RARE]: 'III',
  [Rarity.EPIC]: 'IV',
  [Rarity.LEGENDARY]: 'V',
  [Rarity.UNREAL]: 'VI',
  [Rarity.LEGACY]: 'L',
};

const RARITY_ICONS = {
  [Rarity.COMMON]: 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/miner_rarity_1.png',
  [Rarity.UNCOMMON]: 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/miner_rarity_2.png',
  [Rarity.RARE]: 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/miner_rarity_3.png',
  [Rarity.EPIC]: 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/miner_rarity_4.png',
  [Rarity.LEGENDARY]: 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/miner_rarity_5.png',
  [Rarity.UNREAL]: 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/miner_rarity_6.png',
  [Rarity.LEGACY]: 'https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/D_5qvuWhkX-PFUFKeh0mq.png',
};

const RARITY_BADGE_COLORS = {
  [Rarity.COMMON]: 'bg-slate-500',
  [Rarity.UNCOMMON]: 'bg-emerald-500',
  [Rarity.RARE]: 'bg-blue-500',
  [Rarity.EPIC]: 'bg-fuchsia-500',
  [Rarity.LEGENDARY]: 'bg-amber-500',
  [Rarity.UNREAL]: 'bg-red-500',
  [Rarity.LEGACY]: 'bg-slate-800',
};

function RarityBadge({ rarity, size = 'md' }: { rarity: Rarity, size?: 'sm' | 'md' }) {
  const [error, setError] = useState(false);

  const sizeClasses = size === 'sm' ? "w-3 h-3" : "w-4 h-4";
  const badgeClasses = size === 'sm' 
    ? "px-0.5 py-0 text-[6px] font-bold min-w-[10px] border-[0.5px]" 
    : "px-1 py-0.5 text-[8px] font-black min-w-[14px] border";

  if (!error) {
    return (
      <div className={cn("z-10", sizeClasses)}>
        <img 
          src={RARITY_ICONS[rarity]} 
          alt={rarity}
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-sm text-white shadow-sm z-10 flex items-center justify-center border-white/20",
      badgeClasses,
      RARITY_BADGE_COLORS[rarity] || 'bg-slate-500'
    )}>
      {RARITY_ROMAN[rarity]}
    </div>
  );
}

const formatPower = (ghs: number) => {
  if (ghs >= 1000000000) return `${(ghs / 1000000000).toFixed(3)} Eh/s`;
  if (ghs >= 1000000) return `${(ghs / 1000000).toFixed(3)} Ph/s`;
  if (ghs >= 1000) return `${(ghs / 1000).toFixed(3)} Th/s`;
  return `${ghs.toFixed(3)} Gh/s`;
};

export default function RoomSimulator() {
  const [activeRoom, setActiveRoom] = useState(() => {
    const saved = localStorage.getItem('room-simulator-active-room');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [placedRacks, setPlacedRacks] = useState<PlacedRack[]>(() => {
    const saved = localStorage.getItem('room-simulator-placed-racks');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [miners, setMiners] = useState<Miner[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [sets, setSets] = useState<CollectionSet[]>([]);
  const [loading, setLoading] = useState(true);

  // Persistence
  useEffect(() => {
    localStorage.setItem('room-simulator-placed-racks', JSON.stringify(placedRacks));
  }, [placedRacks]);

  useEffect(() => {
    localStorage.setItem('room-simulator-active-room', activeRoom.toString());
  }, [activeRoom]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [minersData, racksRes, setsRes] = await Promise.all([
          fetchMiners(),
          fetch(`${window.location.origin}/api/racks`).then(res => res.json()),
          fetch(`${window.location.origin}/api/sets`).then(res => res.json())
        ]);
        setMiners(minersData);
        setRacks(racksRes);
        setSets(setsRes);
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
      if (!hasRack) {
        setInventoryTab('racks');
      }
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
  const [showSort, setShowSort] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Click outside to close filters/sort
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setShowSort(false);
      }
    };
    if (showFilters || showSort) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, showSort]);

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
    
    // Set Bonuses
    const validSetMiners = new Map<string, Set<string>>();
    
    placedRacks.forEach(pr => {
      const rack = racks.find(r => r.id === pr.rackId);
      if (!rack?.setId) return;
      
      const setId = rack.setId;
      if (!validSetMiners.has(setId)) validSetMiners.set(setId, new Set());
      
      pr.miners.forEach(pm => {
        if (!pm) return;
        const miner = miners.find(m => m.id === pm.minerId);
        if (miner?.setId === setId) {
          // This miner is in the correct set rack
          validSetMiners.get(setId)!.add(`miner-${miner.id}-${pm.rarity}`);
        }
      });
    });

    let totalSetBonusPercentage = 0;
    let totalSetBonusPower = 0;
    const activeSets: { name: string; level: number; bonus: number; power: number }[] = [];

    validSetMiners.forEach((items, setId) => {
      const set = sets.find(s => s.id === setId);
      if (set) {
        const count = items.size;
        let highestLevel = 0;
        let setBonus = 0;
        let setPower = 0;

        // Sort levels by count to ensure cumulative logic works correctly
        const sortedLevels = [...set.levels].sort((a, b) => a.count - b.count);

        sortedLevels.forEach(lvl => {
          if (count >= lvl.count) {
            highestLevel = Math.max(highestLevel, lvl.level);
            setBonus += lvl.bonus || 0;
            setPower += lvl.power || 0;
          }
        });

        if (highestLevel > 0) {
          totalSetBonusPercentage += setBonus;
          totalSetBonusPower += setPower;
          activeSets.push({
            name: set.name,
            level: highestLevel,
            bonus: setBonus,
            power: setPower
          });
        }
      }
    });

    const finalBonusPercentage = totalBonusPercentage + totalSetBonusPercentage;
    const finalBonusHashRate = totalRawMinerPower * (finalBonusPercentage / 100);
    const finalPower = totalRawMinerPower + finalBonusHashRate + totalRackBonusPower + totalSetBonusPower;

    return {
      rawMinerPower: totalRawMinerPower,
      bonusPercentage: finalBonusPercentage,
      bonusHashRate: finalBonusHashRate,
      rackBonusPower: totalRackBonusPower,
      setBonusPower: totalSetBonusPower,
      activeSets,
      finalPower
    };
  }, [placedRacks, miners, racks, sets]);

  const addRack = (rackId: string) => {
    const rackDef = racks.find(r => r.id === rackId);
    if (!rackDef) return;

    let targetSlot = selectedSlot;
    const isOccupied = (slot: number) => placedRacks.some(pr => pr.slotIndex === slot && pr.roomIndex === activeRoom);

    if (targetSlot === null || isOccupied(targetSlot)) {
      const roomSlots = roomConfig[activeRoom as keyof typeof roomConfig].slots;
      for (let i = 0; i < roomSlots; i++) {
        if (!isOccupied(i)) {
          targetSlot = i;
          break;
        }
      }
    }

    if (targetSlot !== null && !isOccupied(targetSlot)) {
      const newRack: PlacedRack = {
        id: Math.random().toString(36).substr(2, 9),
        rackId,
        slotIndex: targetSlot,
        roomIndex: activeRoom,
        miners: Array(rackDef.slots).fill(null)
      };
      setPlacedRacks([...placedRacks, newRack]);
      setSelectedSlot(targetSlot);
    }
  };

  const addMiner = (rackId: string, minerId: string, rarity: Rarity) => {
    const rackIndex = placedRacks.findIndex(r => r.id === rackId);
    if (rackIndex === -1) return;

    const rackDef = racks.find(r => r.id === placedRacks[rackIndex].rackId);
    if (!rackDef) return;

    const minerDef = miners.find(m => m.id === minerId);
    if (!minerDef) return;

    const newPlacedRacks = [...placedRacks];
    const targetRack = { ...newPlacedRacks[rackIndex] };
    
    // Ensure miners array is initialized to the correct size
    if (targetRack.miners.length === 0) {
      targetRack.miners = Array(rackDef.slots).fill(null);
    }

    let targetSlot = selectedShelf;
    if (targetSlot === null) {
      // Find first available slot that can fit this miner
      if (minerDef.cells === 2) {
        // Find first empty row
        for (let i = 0; i < rackDef.slots; i += 2) {
          if (targetRack.miners[i] === null && targetRack.miners[i+1] === null) {
            targetSlot = i;
            break;
          }
        }
      } else {
        // Find first empty cell
        for (let i = 0; i < rackDef.slots; i++) {
          if (targetRack.miners[i] === null) {
            // If it's an odd index, check if the previous slot has a 2-cell miner
            if (i % 2 === 1) {
              const prev = targetRack.miners[i-1];
              if (prev) {
                const prevDef = miners.find(m => m.id === prev.minerId);
                if (prevDef?.cells === 2) continue;
              }
            }
            targetSlot = i;
            break;
          }
        }
      }
    }

    if (targetSlot !== null && targetSlot >= 0 && targetSlot < targetRack.miners.length) {
      if (minerDef.cells === 2) {
        const rowStart = Math.floor(targetSlot / 2) * 2;
        // Check if row is empty
        const m1 = targetRack.miners[rowStart];
        const m2 = targetRack.miners[rowStart + 1];
        if (m1 === null && m2 === null) {
          targetRack.miners[rowStart] = {
            id: Math.random().toString(36).substr(2, 9),
            minerId,
            rarity,
            slotIndex: rowStart
          };
          // Clear the other slot just in case
          targetRack.miners[rowStart + 1] = null;
        } else {
          return; // Row not empty
        }
      } else {
        // Check if slot is occupied by a 2-cell miner from the left
        if (targetSlot % 2 === 1) {
          const prev = targetRack.miners[targetSlot - 1];
          if (prev) {
            const prevDef = miners.find(m => m.id === prev.minerId);
            if (prevDef?.cells === 2) return; // Occupied
          }
        }
        targetRack.miners[targetSlot] = {
          id: Math.random().toString(36).substr(2, 9),
          minerId,
          rarity,
          slotIndex: targetSlot
        };
      }
      newPlacedRacks[rackIndex] = targetRack;
      setPlacedRacks(newPlacedRacks);
      setSelectedShelf(null);
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

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearRoom = () => {
    setPlacedRacks(placedRacks.filter(r => r.roomIndex !== activeRoom));
    setSelectedSlot(null);
    setSelectedShelf(null);
    setShowClearConfirm(false);
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
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-3xl font-bold text-white">Room Simulator</h2>
              <p className="text-slate-400">Plan your layout and maximize your power potential.</p>
            </div>
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
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Rooms:</span>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center justify-center w-10 h-10 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all"
                  title="Clear Room"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
              <div className={cn(
                "relative grid grid-cols-6 gap-x-4 gap-y-8 transition-all duration-500",
                isEditing ? "w-[900px]" : "w-full max-w-[750px] mx-auto"
              )}>
              {Array.from({ length: currentRoomSlots }).map((_, i) => {
                const placedRack = placedRacks.find(r => r.slotIndex === i && r.roomIndex === activeRoom);
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
                        {!rackDef.image && (
                          <div className="absolute inset-0 border-x-4 border-slate-400/30 flex flex-col justify-between py-2">
                            <div className="h-1 bg-slate-400/20 w-full" />
                            <div className="h-1 bg-slate-400/20 w-full" />
                            <div className="h-1 bg-slate-400/20 w-full" />
                            <div className="h-1 bg-slate-400/20 w-full" />
                          </div>
                        )}

                        {/* Rack Image from RC */}
                        {rackDef.image && (
                          <MinerImage 
                            image={rackDef.image} 
                            name={rackDef.name}
                            baseUrl="racks"
                            extension=".png"
                            className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0 opacity-100" 
                            fallbackClassName="absolute inset-0 w-full h-full"
                          />
                        )}

                        {/* Miners Wrapper - Absolute Positioning Template */}
                        <div className="absolute inset-0 flex justify-center pointer-events-none z-10">
                          <div className="relative w-[126px] h-full pointer-events-auto">
                            {Array.from({ length: rackDef.slots / 2 }).map((_, rowIdx) => {
                              const slot1Idx = rowIdx * 2;
                              const slot2Idx = rowIdx * 2 + 1;
                              const m1 = placedRack.miners[slot1Idx];
                              const m2 = placedRack.miners[slot2Idx];
                              
                              const miner1Def = m1 ? miners.find(min => min.id === m1.minerId) : null;
                              const miner2Def = m2 ? miners.find(min => min.id === m2.minerId) : null;
                              
                              const isM1TwoCell = miner1Def?.cells === 2;
                              
                              // RC Template Offsets (Adjusted to fit our container)
                              const topOffsets = [15, 60, 105, 150];
                              const top = topOffsets[rowIdx] || 0;

                              return (
                                <div key={rowIdx} className="absolute w-full h-[40px]" style={{ top: `${top}px` }}>
                                  {isM1TwoCell ? (
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSlot(i);
                                        setSelectedShelf(selectedShelf === slot1Idx ? null : slot1Idx);
                                      }}
                                      className={cn(
                                        "absolute w-[100px] h-[45px] transition-all cursor-pointer group/shelf",
                                        selectedSlot === i && selectedShelf === slot1Idx && "ring-1 ring-emerald-500 bg-emerald-500/10 rounded"
                                      )}
                                      style={{ left: '13px' }}
                                    >
                                      <div className="w-full h-full relative group/miner">
                                        <MinerImage 
                                          image={miner1Def?.image} 
                                          name={miner1Def?.name}
                                          className="w-full h-full object-contain" 
                                        />
                                        {m1 && (
                                          <div className="absolute top-0 left-[2px] z-20">
                                            <RarityBadge rarity={m1.rarity} size="sm" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/miner:opacity-100 transition-opacity flex items-center justify-center gap-1 z-30 rounded">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeMiner(placedRack.id, slot1Idx);
                                            }}
                                            className="p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-500 transition-colors"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {/* Cell 1 */}
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedSlot(i);
                                          setSelectedShelf(selectedShelf === slot1Idx ? null : slot1Idx);
                                        }}
                                        className={cn(
                                          "absolute w-[50px] h-[45px] transition-all cursor-pointer group/shelf",
                                          selectedSlot === i && selectedShelf === slot1Idx && "ring-1 ring-emerald-500 bg-emerald-500/10 rounded"
                                        )}
                                        style={{ left: '13px' }}
                                      >
                                        {miner1Def ? (
                                          <div className="w-full h-full relative group/miner">
                                            <MinerImage 
                                              image={miner1Def.image} 
                                              name={miner1Def.name}
                                              className="w-full h-full object-contain" 
                                            />
                                            {m1 && (
                                              <div className="absolute top-0 left-[2px] z-20">
                                                <RarityBadge rarity={m1.rarity} size="sm" />
                                              </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/miner:opacity-100 transition-opacity flex items-center justify-center gap-1 z-30 rounded">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeMiner(placedRack.id, slot1Idx);
                                                }}
                                                className="p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-500 transition-colors"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Plus className={cn(
                                              "w-3 h-3 transition-all",
                                              selectedSlot === i && selectedShelf === slot1Idx ? "text-emerald-500 scale-125" : "text-white/5 group-hover/shelf:text-white/20"
                                            )} />
                                          </div>
                                        )}
                                      </div>
                                      {/* Cell 2 */}
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedSlot(i);
                                          setSelectedShelf(selectedShelf === slot2Idx ? null : slot2Idx);
                                        }}
                                        className={cn(
                                          "absolute w-[50px] h-[45px] transition-all cursor-pointer group/shelf",
                                          selectedSlot === i && selectedShelf === slot2Idx && "ring-1 ring-emerald-500 bg-emerald-500/10 rounded"
                                        )}
                                        style={{ left: '63px' }}
                                      >
                                        {miner2Def ? (
                                          <div className="w-full h-full relative group/miner">
                                            <MinerImage 
                                              image={miner2Def.image} 
                                              name={miner2Def.name}
                                              className="w-full h-full object-contain" 
                                            />
                                            {m2 && (
                                              <div className="absolute top-0 left-[2px] z-20">
                                                <RarityBadge rarity={m2.rarity} size="sm" />
                                              </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/miner:opacity-100 transition-opacity flex items-center justify-center gap-1 z-30 rounded">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  removeMiner(placedRack.id, slot2Idx);
                                                }}
                                                className="p-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-500 transition-colors"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Plus className={cn(
                                              "w-3 h-3 transition-all",
                                              selectedSlot === i && selectedShelf === slot2Idx ? "text-emerald-500 scale-125" : "text-white/5 group-hover/shelf:text-white/20"
                                            )} />
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
                <div title={`${stats.finalPower.toLocaleString()} Gh/s`}>
                  <p className="text-4xl font-black">{formatPower(stats.finalPower)}</p>
                </div>
                <div className="pt-4 border-t border-white/20 space-y-2">
                  <div className="flex justify-between text-sm" title={`${stats.rawMinerPower.toLocaleString()} Gh/s`}>
                    <span className="opacity-80">Miners</span>
                    <span className="font-bold">{formatPower(stats.rawMinerPower)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="opacity-80">Bonus</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>+{stats.bonusPercentage.toFixed(2)}%</span>
                      <span className="opacity-80" title={`${stats.bonusHashRate.toLocaleString()} Gh/s`}>{formatPower(stats.bonusHashRate)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm" title={`${stats.rackBonusPower.toLocaleString()} Gh/s`}>
                    <span className="opacity-80">Rack Bonus</span>
                    <span className="font-bold">{formatPower(stats.rackBonusPower)}</span>
                  </div>
                  {stats.setBonusPower > 0 && (
                    <div className="flex justify-between text-sm" title={`${stats.setBonusPower.toLocaleString()} Gh/s`}>
                      <span className="opacity-80">Set Bonus</span>
                      <span className="font-bold">{formatPower(stats.setBonusPower)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {stats.activeSets.length > 0 && (
              <div className="p-6 bg-[#1a1a24] rounded-[32px] border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Active Sets</h3>
                </div>
                <div className="space-y-3">
                  {stats.activeSets.map((set, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-white">{set.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 font-bold">LVL {set.level}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>+{set.bonus.toFixed(2)}% Bonus</span>
                        {set.power > 0 && <span>+{formatPower(set.power)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
          <div className="flex-1 bg-[#1a1a24] rounded-t-[32px] border-t border-x border-slate-800 flex flex-col shadow-2xl shrink-0 min-h-0 relative">
            {/* Inventory Toolbar */}
            <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-[#1a1a24]/50 backdrop-blur-sm relative z-50">
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
                  <div className="relative" ref={filterRef}>
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
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-[#1a1a24] border border-slate-800 rounded-2xl shadow-2xl p-4 z-[100] space-y-4">
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
                <div className="relative" ref={sortRef}>
                  <div 
                    onClick={() => setShowSort(!showSort)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 bg-[#0f0f14] border rounded-xl cursor-pointer transition-all",
                      showSort ? "border-emerald-500 text-emerald-500" : "border-slate-800 text-slate-300 hover:border-slate-600"
                    )}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[10px] font-bold whitespace-nowrap">
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
                  
                  {showSort && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#1a1a24] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-[100]">
                      {inventoryTab === 'racks' ? (
                        <>
                          <button onClick={() => { setRackSortBy('bonus-desc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: High - Low</button>
                          <button onClick={() => { setRackSortBy('bonus-asc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: Low - High</button>
                          <button onClick={() => { setRackSortBy('name-asc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: A - Z</button>
                          <button onClick={() => { setRackSortBy('name-desc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: Z - A</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setMinerSortBy('power-desc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Power: High - Low</button>
                          <button onClick={() => { setMinerSortBy('power-asc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Power: Low - High</button>
                          <button onClick={() => { setMinerSortBy('bonus-desc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: High - Low</button>
                          <button onClick={() => { setMinerSortBy('bonus-asc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Bonus: Low - High</button>
                          <button onClick={() => { setMinerSortBy('name-asc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: A - Z</button>
                          <button onClick={() => { setMinerSortBy('name-desc'); setShowSort(false); }} className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Name: Z - A</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Horizontal Scrollable List */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-3 rounded-b-[32px]">
              <div className="flex gap-1.5 min-w-max h-full items-center">
                {inventoryTab === 'racks' ? (
                  filteredRacks.map(r => (
                    <button
                      key={r.id}
                      onClick={() => addRack(r.id)}
                      className="w-32 h-full rounded-xl border border-slate-700/50 bg-[#0f0f14] text-left transition-all flex flex-col group relative overflow-hidden hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10"
                    >
                      <div className="relative h-[65%] bg-slate-900/30 flex items-center justify-center p-2">
                        {r.image ? (
                          <MinerImage 
                            image={r.image} 
                            name={r.name}
                            baseUrl="racks"
                            extension=".png"
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform" 
                          />
                        ) : (
                          <LayoutIcon className="w-5 h-5 text-slate-600 group-hover:text-emerald-500 transition-colors" />
                        )}
                        {r.setId && (
                          <div className="absolute top-1 left-1 w-3.5 h-3.5 z-10">
                            <img 
                              src="https://productionassets.rollercoin.com/main-app/b43f9115959008ad0e7bb9bb4afbfc75/assets/img/QoLz7tdVdjJnpmvG-wFgQ.png" 
                              alt="Set Icon"
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-1.5 bg-[#1a1a24] border-t border-slate-800/50 flex flex-col justify-center">
                        <p className="text-[9px] font-bold text-white leading-tight line-clamp-2 mb-0.5">{r.name}</p>
                        <p className="text-[9px] text-emerald-400 font-bold">{r.bonus}%</p>
                      </div>
                      <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors flex items-center justify-center">
                        <Plus className="w-5 h-5 text-emerald-500 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all" />
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
                          className="w-10 h-full bg-slate-800/50 hover:bg-slate-700/50 rounded-xl flex items-center justify-center text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        {Object.entries(m.rarities)
                          .sort(([a], [b]) => {
                            const order = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.UNREAL, Rarity.LEGACY];
                            return order.indexOf(a as Rarity) - order.indexOf(b as Rarity);
                          })
                          .map(([rarity, data]) => {
                            const rarityKey = rarity as Rarity;
                            const rarityData = data as MinerRarity;
                            return (
                              <button 
                                key={rarityKey} 
                                onClick={() => selectedRack && addMiner(selectedRack.id, m.id, rarityKey)}
                                className="w-32 h-full bg-[#0f0f14] border border-slate-700/50 rounded-xl overflow-hidden flex flex-col group/rarity-card transition-all text-left hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                              >
                                <div className="relative h-[78%] bg-slate-900/30 flex items-center justify-center p-1">
                                  <MinerImage 
                                    image={m.image} 
                                    name={m.name}
                                    className="w-full h-full object-contain group-hover/rarity-card:scale-110 transition-transform" 
                                  />
                                  <div className="absolute top-1 left-1">
                                    <RarityBadge rarity={rarityKey} />
                                  </div>
                                </div>
                                <div className="flex-1 py-0.5 px-1 bg-[#1a1a24] border-t border-slate-800/50 flex flex-col justify-center">
                                  <div className="flex items-center justify-between px-0.5">
                                    <span className="text-[9px] text-white font-bold">{formatPower(rarityData?.power || 0)}</span>
                                    <span className="text-[9px] text-emerald-400 font-bold">{rarityData?.bonus || 0}%</span>
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
                        className="w-32 h-full bg-[#0f0f14] border border-slate-700/50 rounded-xl overflow-hidden flex flex-col group/miner-card transition-all text-left hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                      >
                        <div className="relative h-[75%] bg-slate-900/30 flex items-center justify-center p-2">
                          <MinerImage 
                            image={m.image} 
                            name={m.name}
                            className="w-full h-full object-contain group-hover/miner-card:scale-110 transition-transform" 
                            fallbackClassName="w-full h-full"
                          />
                        </div>
                        <div className="flex-1 p-1.5 bg-[#1a1a24] border-t border-slate-800/50 flex items-center">
                          <p className="text-[9px] font-bold text-white line-clamp-2 leading-tight">{m.name}</p>
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

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl"
          >
            <h3 className="text-xl font-bold text-white mb-2">Clear Entire Room?</h3>
            <p className="text-slate-400 mb-6">This will permanently remove all racks and miners from the current simulator. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearRoom}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
              >
                Yes, Clear All
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
