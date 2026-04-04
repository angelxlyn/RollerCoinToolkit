import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Miner, Rarity, MinerRarity, Rack, CollectionSet } from '../types';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Save, 
  LogIn, 
  LogOut, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Shield,
  Image as ImageIcon,
  Link as LinkIcon,
  Tag as TagIcon,
  Zap,
  X,
  ArrowLeft,
  Database,
  Box,
  Clock,
  Download,
  Layout as LayoutIcon,
  ChevronDown,
  ChevronUp,
  Layers,
  Edit2,
  Copy,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { cn, ensureFullUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { fetchMiners, saveMiner, bulkUploadMiners, bulkUploadRacks, uploadImage, fetchSettings, saveSettings } from '../services/apiService';
import { CURRENCIES, LEAGUE_BLOCK_REWARDS, RARITY_ORDER, ASSET_URLS, MARKET_BASE_URL, RACK_MARKET_BASE_URL } from '../constants';
import MinerImage from './MinerImage';

interface FormMinerRarity {
  power: number | string;
  bonus: number | string;
  marketUrl?: string;
}

interface DatabaseManagerProps {
  editMiner?: Miner | null;
  onCancelEdit?: () => void;
  onEdit?: (miner: Miner) => void;
}

export default function DatabaseManager({ editMiner, onCancelEdit, onEdit }: DatabaseManagerProps) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'miner' | 'blocks' | 'racks' | 'sets'>('miner');
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form State
  const [miners, setMiners] = useState<Miner[]>([]);
  const [minerName, setMinerName] = useState('');
  const [minerDescription, setMinerDescription] = useState('');
  const [minerCells, setMinerCells] = useState<number>(1);
  const [minerImage, setMinerImage] = useState('');
  const [minerTags, setMinerTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [rarities, setRarities] = useState<Partial<Record<Rarity, MinerRarity>>>({});
  const [minerSetId, setMinerSetId] = useState<string>('');
  const [minerSellable, setMinerSellable] = useState<boolean>(true);

  // Rack Form State
  const [racks, setRacks] = useState<any[]>([]);
  const [rackName, setRackName] = useState('');
  const [rackSlots, setRackSlots] = useState<number>(8);
  const [rackBonus, setRackBonus] = useState<number>(0);
  const [rackImage, setRackImage] = useState('');
  const [rackSetId, setRackSetId] = useState<string>('');
  const [rackMarketUrl, setRackMarketUrl] = useState('');
  const [editingRackId, setEditingRackId] = useState<string | null>(null);

  // Rack Search & Pagination State
  const [rackSearchQuery, setRackSearchQuery] = useState('');
  const [rackSortBy, setRackSortBy] = useState<'name' | 'slots' | 'bonus'>('name');
  const [rackSortOrder, setRackSortOrder] = useState<'asc' | 'desc'>('asc');
  const [rackCurrentPage, setRackCurrentPage] = useState(1);
  const rackItemsPerPage = 10;

  // Set Form State
  const [sets, setSets] = useState<CollectionSet[]>([]);
  const [setName, setSetName] = useState('');
  const [setLevels, setSetLevels] = useState<{ level: number; count: number; power?: number; bonus?: number }[]>([{ level: 1, count: 1, bonus: 0 }]);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  // Set Search & Pagination State
  const [setSearchQuery, setSetSearchQuery] = useState('');
  const [setCurrentPage, setSetCurrentPage] = useState(1);
  const setItemsPerPage = 6;
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);

  const [showSyncConfig, setShowSyncConfig] = useState<Record<string, boolean>>({
    miners: false,
    racks: false,
    blocks: false,
    sets: false
  });
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Clear error after 3 seconds
  useEffect(() => {
    if (uploadError) {
      const timer = setTimeout(() => setUploadError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadError]);

  const [isIdentifying, setIsIdentifying] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<{ total: number, processed: number, errors: string[] } | null>(null);
  
  const [sheetConfigs, setSheetConfigs] = useState<Record<string, { sheetId: string, lastSync?: string, status?: string }>>({
    miners: { sheetId: '' },
    rewards: { sheetId: '' },
    times: { sheetId: '' },
    racks: { sheetId: '' },
    sets: { sheetId: '' }
  });

  // Clear sheet config error status after 3 seconds
  useEffect(() => {
    const hasError = Object.values(sheetConfigs).some((config: any) => config.status?.startsWith('Error'));
    if (hasError) {
      const timer = setTimeout(() => {
        setSheetConfigs(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
            if (next[key].status?.startsWith('Error')) {
              next[key] = { ...next[key], status: undefined };
            }
          });
          return next;
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [sheetConfigs]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState<{ type: string } | null>(null);

  // Global Settings State
  const [blockRewards, setBlockRewards] = useState<Record<string, Record<string, number>>>(LEAGUE_BLOCK_REWARDS);
  const [blockTimes, setBlockTimes] = useState<Record<string, Record<string, number>>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [rewardsUpdatedAt, setRewardsUpdatedAt] = useState<string | null>(null);
  const [timesUpdatedAt, setTimesUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchServiceAccount = async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/sheets/service-account`);
        const data = await res.json();
        if (data.email) setServiceAccountEmail(data.email);
      } catch (err) {
        console.error("Failed to fetch service account email", err);
      }
    };
    fetchServiceAccount();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'blocks') {
      loadSettings();
    }
    if (user && (activeTab === 'miners' || activeTab === 'sets')) {
      fetchAllMiners();
    }
    if (user && activeTab === 'racks') {
      fetchRacks();
    }
    if (user && activeTab === 'sets') {
      fetchSets();
      fetchRacks();
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user) {
      fetchSheetsConfig();
      fetchSets();
    }
  }, [user]);

  const fetchSets = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/sets`);
      const data = await res.json();
      setSets(data);
    } catch (err) {
      console.error("Failed to fetch sets", err);
    }
  };

  const fetchRacks = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/racks`);
      const data = await res.json();
      setRacks(data);
    } catch (err) {
      console.error("Failed to fetch racks", err);
    }
  };

  const fetchAllMiners = async () => {
    try {
      const data = await fetchMiners();
      setMiners(data);
    } catch (err) {
      console.error("Failed to fetch miners", err);
    }
  };

  const handleSaveRack = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const id = editingRackId || rackName.toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
      const res = await fetch(`${window.location.origin}/api/racks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: rackName,
          slots: rackSlots,
          bonus: rackBonus,
          image: ensureFullUrl(rackImage, 'racks', '.png'),
          setId: rackSetId || undefined,
          marketUrl: rackMarketUrl ? ensureFullUrl(rackMarketUrl, RACK_MARKET_BASE_URL) : undefined
        })
      });
      if (res.ok) {
        setUploadSuccess(true);
        setRackName('');
        setRackSlots(8);
        setRackBonus(0);
        setRackImage('');
        setRackSetId('');
        setEditingRackId(null);
        fetchRacks();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'miner' | 'rack' | 'set', id: string, name: string } | null>(null);

  const handleDeleteMiner = async () => {
    if (!showDeleteConfirm || showDeleteConfirm.type !== 'miner') return;
    setUploading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/miners/${showDeleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setUploadSuccess(true);
        setShowDeleteConfirm(null);
        setTimeout(() => {
          setUploadSuccess(false);
          if (onCancelEdit) onCancelEdit();
          fetchAllMiners();
        }, 1500);
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRack = async (id: string, name: string) => {
    setShowDeleteConfirm({ type: 'rack', id, name });
  };

  const confirmDeleteRack = async () => {
    if (!showDeleteConfirm || showDeleteConfirm.type !== 'rack') return;
    try {
      const res = await fetch(`${window.location.origin}/api/racks/${showDeleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(null);
        fetchRacks();
      }
    } catch (err: any) {
      setUploadError(err.message);
    }
  };

  const handleDeleteSet = async (id: string, name: string) => {
    setShowDeleteConfirm({ type: 'set', id, name });
  };

  const confirmDeleteSet = async () => {
    if (!showDeleteConfirm || showDeleteConfirm.type !== 'set') return;
    try {
      const res = await fetch(`${window.location.origin}/api/sets/${showDeleteConfirm.id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(null);
        fetchSets();
      }
    } catch (err: any) {
      setUploadError(err.message);
    }
  };

  const fetchSheetsConfig = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/sheets-config`);
      const data = await res.json();
      if (data.configs) {
        setSheetConfigs(prev => ({
          ...prev,
          ...data.configs
        }));
      }
    } catch (err) {
      console.error("Failed to fetch sheets config", err);
    }
  };

  const handleSaveSheetId = async (type: string) => {
    try {
      const rawId = sheetConfigs[type].sheetId;
      const match = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const sheetId = match ? match[1] : rawId.trim();

      const res = await fetch(`${window.location.origin}/api/sheets-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, sheetId })
      });
      if (res.ok) {
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
        fetchSheetsConfig();
      }
    } catch (err: any) {
      setUploadError(err.message);
    }
  };

  const filteredRacks = useMemo(() => {
    let result = [...(racks || [])];
    
    if (rackSearchQuery) {
      const q = rackSearchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(q) || 
        (r.id && r.id.toLowerCase().includes(q))
      );
    }
    
    result.sort((a, b) => {
      let valA, valB;
      if (rackSortBy === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (rackSortBy === 'slots') {
        valA = a.slots;
        valB = b.slots;
      } else {
        valA = a.bonus;
        valB = b.bonus;
      }
      
      if (valA < valB) return rackSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return rackSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [racks, rackSearchQuery, rackSortBy, rackSortOrder]);

  const paginatedRacks = useMemo(() => {
    const start = (rackCurrentPage - 1) * rackItemsPerPage;
    return filteredRacks.slice(start, start + rackItemsPerPage);
  }, [filteredRacks, rackCurrentPage]);

  const totalRackPages = Math.ceil(filteredRacks.length / rackItemsPerPage);

  const filteredSets = useMemo(() => {
    let result = [...(sets || [])];
    
    if (setSearchQuery) {
      const q = setSearchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        (s.id && s.id.toLowerCase().includes(q))
      );
    }
    
    result.sort((a, b) => a.name.localeCompare(b.name));
    
    return result;
  }, [sets, setSearchQuery]);

  const paginatedSets = useMemo(() => {
    const start = (setCurrentPage - 1) * setItemsPerPage;
    return filteredSets.slice(start, start + setItemsPerPage);
  }, [filteredSets, setCurrentPage]);

  const totalSetPages = Math.ceil(filteredSets.length / setItemsPerPage);

  const handleManualSync = async (type: string, overwrite: boolean = false) => {
    setIsSyncing(type);
    setUploadError(null);
    try {
      // Auto-save sheet ID if provided but might not be in DB
      if (sheetConfigs[type]?.sheetId) {
        const rawId = sheetConfigs[type].sheetId;
        const match = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        const sheetId = match ? match[1] : rawId.trim();

        await fetch(`${window.location.origin}/api/sheets-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, sheetId })
        });
      }

      const res = await fetch(`${window.location.origin}/api/sync-sheets`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, overwrite, sheetId: sheetConfigs[type]?.sheetId })
      });
      const data = await res.json();
      if (data.success) {
        setSyncSuccess(type);
        setTimeout(() => setSyncSuccess(null), 3000);
        if (type === 'miners') fetchAllMiners();
        if (type === 'racks') fetchRacks();
        if (type === 'sets') fetchSets();
        fetchSheetsConfig();
      } else {
        setUploadError(data.message || data.error || "Sync failed");
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const id = editingSetId || setName.toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
      const res = await fetch(`${window.location.origin}/api/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: setName,
          levels: setLevels
        })
      });
      if (res.ok) {
        setUploadSuccess(true);
        setSetName('');
        setSetLevels([{ level: 1, count: 1, bonus: 0 }]);
        setEditingSetId(null);
        fetchSets();
        setTimeout(() => setUploadSuccess(false), 3000);
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const addSetLevel = () => {
    const sortedLevels = [...(setLevels || [])].sort((a, b) => a.level - b.level);
    const existingLevels = sortedLevels.map(l => l.level);
    let nextLevel = 1;
    while (existingLevels.includes(nextLevel)) {
      nextLevel++;
    }
    
    // Find the level just before this one to get the count
    const prevLevel = sortedLevels.filter(l => l.level < nextLevel).pop();
    const nextCount = prevLevel ? prevLevel.count + 1 : 1;

    setSetLevels([...setLevels, { level: nextLevel, count: nextCount, power: 0, bonus: 0 }].sort((a, b) => a.level - b.level));
  };

  const removeSetLevel = (index: number) => {
    setSetLevels(setLevels.filter((_, i) => i !== index));
  };

  const updateSetLevel = (index: number, field: 'level' | 'count' | 'power' | 'bonus', value: number) => {
    const newLevels = [...setLevels];
    
    if (field === 'count') {
      // Find previous level (by level number, not index)
      const currentLevelNum = newLevels[index].level;
      const prevLevel = newLevels.filter(l => l.level < currentLevelNum).sort((a, b) => a.level - b.level).pop();
      
      if (prevLevel && value < prevLevel.count) {
        // Don't allow count lower than previous level
        return;
      }
    }

    newLevels[index] = { ...newLevels[index], [field]: value };
    setSetLevels(newLevels);
  };

  const loadSettings = async () => {
    try {
      const settings = await fetchSettings();
      if (!settings || Object.keys(settings).length === 0) {
        // Initialize with defaults if no settings found
        const initialTimes: Record<string, Record<string, number>> = {};
        Object.keys(LEAGUE_BLOCK_REWARDS).forEach(league => {
          initialTimes[league] = {};
          CURRENCIES.forEach(c => {
            const isAvailable = LEAGUE_BLOCK_REWARDS[league]?.[c.id] !== undefined;
            initialTimes[league][c.id] = isAvailable ? c.blockTime : 0;
          });
        });
        setBlockTimes(initialTimes);
        setBlockRewards(LEAGUE_BLOCK_REWARDS);
        return;
      }

      if (settings.blockRewards) {
        setBlockRewards(settings.blockRewards);
      } else {
        setBlockRewards(LEAGUE_BLOCK_REWARDS);
      }
      if (settings.rewardsUpdatedAt) setRewardsUpdatedAt(settings.rewardsUpdatedAt);
      if (settings.timesUpdatedAt) setTimesUpdatedAt(settings.timesUpdatedAt);
      
      if (settings.blockTimes) {
        // If it's the old flat structure, migrate it
        const blockTimesData = settings.blockTimes as any;
        const firstKey = Object.keys(blockTimesData)[0];
        if (firstKey && typeof blockTimesData[firstKey] === 'number') {
          const migratedTimes: Record<string, Record<string, number>> = {};
          Object.keys(LEAGUE_BLOCK_REWARDS).forEach(league => {
            migratedTimes[league] = {};
            CURRENCIES.forEach(c => {
              const isAvailable = LEAGUE_BLOCK_REWARDS[league]?.[c.id] !== undefined;
              migratedTimes[league][c.id] = isAvailable ? (blockTimesData[c.id] || c.blockTime) : 0;
            });
          });
          setBlockTimes(migratedTimes);
        } else {
          setBlockTimes(settings.blockTimes);
        }
      } else {
        // Initialize block times from CURRENCIES if not in Firestore
        const initialTimes: Record<string, Record<string, number>> = {};
        Object.keys(LEAGUE_BLOCK_REWARDS).forEach(league => {
          initialTimes[league] = {};
          CURRENCIES.forEach(c => {
            const isAvailable = LEAGUE_BLOCK_REWARDS[league]?.[c.id] !== undefined;
            initialTimes[league][c.id] = isAvailable ? c.blockTime : 0;
          });
        });
        setBlockTimes(initialTimes);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const now = new Date().toISOString();
      await saveSettings({ 
        blockRewards, 
        blockTimes, 
        updatedAt: now,
        rewardsUpdatedAt: rewardsUpdatedAt || now,
        timesUpdatedAt: timesUpdatedAt || now
      });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBulkUploadRewards = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      const newRewards: Record<string, Record<string, number>> = { ...blockRewards };

      rows.forEach(row => {
        const league = row[""] || row.League || row.league;
        if (!league) return;

        const matchedLeague = Object.keys(LEAGUE_BLOCK_REWARDS).find(
          k => k.toLowerCase() === league.toLowerCase()
        );

        if (matchedLeague) {
          if (!newRewards[matchedLeague]) newRewards[matchedLeague] = {};

          CURRENCIES.forEach(c => {
            const rewardKey = c.symbol;
            if (row[rewardKey] !== undefined) {
              newRewards[matchedLeague][c.id] = parseFloat(row[rewardKey]) || 0;
            }
          });
        }
      });

      setBlockRewards(newRewards);
      setRewardsUpdatedAt(new Date().toISOString());
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse rewards file');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleBulkUploadTimes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      const newTimes: Record<string, Record<string, number>> = { ...blockTimes };

      rows.forEach(row => {
        const league = row[""] || row.League || row.league;
        if (!league) return;

        const matchedLeague = Object.keys(LEAGUE_BLOCK_REWARDS).find(
          k => k.toLowerCase() === league.toLowerCase()
        );

        if (matchedLeague) {
          if (!newTimes[matchedLeague]) newTimes[matchedLeague] = {};

          CURRENCIES.forEach(c => {
            const timeKey = c.symbol;
            if (row[timeKey] !== undefined) {
              newTimes[matchedLeague][c.id] = parseInt(row[timeKey]) || 0;
            }
          });
        }
      });

      setBlockTimes(newTimes);
      setTimesUpdatedAt(new Date().toISOString());
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse times file');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDownloadRewardsTemplate = () => {
    const templateRows = Object.keys(LEAGUE_BLOCK_REWARDS).map(league => {
      const row: any = { "": league };
      CURRENCIES.forEach(c => {
        row[c.symbol] = blockRewards[league]?.[c.id] || LEAGUE_BLOCK_REWARDS[league]?.[c.id] || 0;
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rewards");
    XLSX.writeFile(wb, "Block_Rewards_Template.xlsx");
  };

  const handleDownloadTimesTemplate = () => {
    const templateRows = Object.keys(LEAGUE_BLOCK_REWARDS).map(league => {
      const row: any = { "": league };
      CURRENCIES.forEach(c => {
        const isAvailable = LEAGUE_BLOCK_REWARDS[league]?.[c.id] !== undefined;
        row[c.symbol] = isAvailable ? (blockTimes[league]?.[c.id] || 600) : 0;
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Times");
    XLSX.writeFile(wb, "Block_Times_Template.xlsx");
  };

  useEffect(() => {
    if (editMiner) {
      setMinerName(editMiner.name);
      setMinerDescription(editMiner.description || '');
      setMinerCells(editMiner.cells);
      setMinerImage(editMiner.image || '');
      setMinerTags(editMiner.tags);
      
      // Handle both array and object formats for rarities
      let loadedRarities: Partial<Record<Rarity, MinerRarity>> = {};
      if (Array.isArray(editMiner.rarities)) {
        (editMiner.rarities as any[]).forEach((r: any) => {
          loadedRarities[r.rarity as Rarity] = {
            power: r.power,
            bonus: r.bonus,
            marketUrl: r.marketUrl
          };
        });
      } else {
        loadedRarities = { ...editMiner.rarities };
      }
      setRarities(loadedRarities);
      
      setMinerSetId(editMiner.setId || '');
      setMinerSellable(editMiner.sellable !== false);
    } else {
      // Reset form if not editing
      setMinerName('');
      setMinerDescription('');
      setMinerCells(1);
      setMinerImage('');
      setMinerTags([]);
      setCurrentTag('');
      setRarities({ [Rarity.COMMON]: { power: 0, bonus: 0, marketUrl: '' } });
      setMinerSetId('');
      setMinerSellable(true);
    }
  }, [editMiner]);

  // Handle auto-generation of ID for NEW miners
  useEffect(() => {
    if (minerName && !editMiner && !minerImage) {
      const id = generateMinerId(minerName);
      setMinerImage(id);
    }
  }, [minerName, editMiner]);

  const generateMinerId = (name: string) => {
    return name.toLowerCase()
      .replace(/'/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '')
      .replace(/-/g, '_')
      .replace(/\+/g, 'plus')
      .replace(/\s+/g, '_');
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadError(null);
    setBulkStatus(null);

    try {
      const result = await bulkUploadMiners(file);
      setBulkStatus({ total: result.processed, processed: result.processed, errors: result.errors });
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      setUploadError(error.message || 'Failed to process bulk upload');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };


  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${window.location.origin}/api/debug-supabase`);
      const data = await res.json();
      setDebugInfo(data);
      setShowDebug(true);
      
      if (data.fetchError) {
        setAuthError(`DNS/Network Error: The server cannot reach ${data.url}. Please verify your Supabase project ID.`);
      } else if (data.dbTest?.error) {
        setAuthError(`Database Error: ${data.dbTest.error.message || 'Could not query database'}`);
      } else {
        setAuthError('Connection test successful! If you still see "Failed to fetch" in the browser, it may be a local network/firewall issue.');
      }
    } catch (err: any) {
      setAuthError(`Diagnostic failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      console.log('Attempting login for:', email);
      
      // Try direct login first
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        console.log('Direct login successful:', data.user?.id);
        return;
      } catch (directError: any) {
        console.warn('Direct login failed:', directError);
        
        // If it's a network error, try the proxy
        const isNetworkError = directError.message === 'Failed to fetch' || 
                              directError.name === 'TypeError' || 
                              directError.message?.includes('fetch');
                              
        if (isNetworkError) {
          console.warn('Direct login failed with network error, trying server-side proxy...');
          const proxyRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          
          const contentType = proxyRes.headers.get('content-type');
          if (!proxyRes.ok) {
            if (contentType && contentType.includes('application/json')) {
              const errorData = await proxyRes.json();
              console.error('Proxy login failed (JSON):', errorData);
              throw new Error(errorData.error || 'Authentication failed via proxy');
            } else {
              const text = await proxyRes.text();
              console.error('Proxy login failed (Non-JSON):', text.substring(0, 200));
              throw new Error(`Server error (${proxyRes.status}): The authentication service returned an invalid response. This often happens if the API route is missing or the server is misconfigured.`);
            }
          }
          
          const proxyData = await proxyRes.json();
          console.log('Proxy login successful:', proxyData.user?.id);
          
          // Set the session manually on the client
          const { error: sessionError } = await supabase.auth.setSession(proxyData.session);
          if (sessionError) throw sessionError;
          return;
        } else {
          throw directError;
        }
      }
    } catch (err: any) {
      console.error('Auth error caught:', err);
      let errorMessage = err.message || 'An unexpected error occurred';
      
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
        errorMessage = 'DNS Error: The server cannot find your Supabase project. Please check if your project ID is correct and the project is active.';
      } else if (errorMessage === 'Failed to fetch' || errorMessage === 'fetch failed') {
        errorMessage = 'Connection Error: Failed to reach Supabase. This usually means the URL is wrong or the project is paused.';
      }
      
      setAuthError(errorMessage);
      // Auto-run diagnostics on failure
      runDiagnostics();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setMinerImage(base64);
        
        // Auto-generate tags using AI
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
                    data: base64.split(',')[1],
                  },
                },
                {
                  text: 'Identify 8-12 highly specific visual tags for this pixel-art mining machine (e.g., colors, shapes, unique features like "pink dome", "neon", "hamster"). Return ONLY the tags separated by commas. Do not include generic terms like "pixel art" or "miner".',
                },
              ],
            },
          });

          const newTags = (response.text || '').split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t && t !== 'pixel art' && t !== 'pixel-art' && t !== 'miner' && t !== 'machine');
          
          // Merge with existing tags, avoiding duplicates
          setMinerTags(prev => Array.from(new Set([...prev, ...newTags])));
        } catch (error) {
          console.error('AI Tag generation failed:', error);
        } finally {
          setIsIdentifying(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addTag = () => {
    if (currentTag && !minerTags.includes(currentTag)) {
      setMinerTags([...minerTags, currentTag]);
      setCurrentTag('');
    }
  };

  const removeTag = (tag: string) => {
    setMinerTags(minerTags.filter(t => t !== tag));
  };

  const updateRarity = (rarity: Rarity, field: keyof MinerRarity, value: string) => {
    setRarities(prev => ({
      ...prev,
      [rarity]: {
        ...(prev[rarity] || { power: 0, bonus: 0, marketUrl: '' }),
        [field]: field === 'marketUrl' ? value : parseFloat(value) || 0
      }
    }));
  };

  const toggleRarity = (rarity: Rarity) => {
    setRarities(prev => {
      const newRarities = { ...prev };
      if (newRarities[rarity]) {
        if (rarity === Rarity.COMMON) return prev; // Common is required
        delete newRarities[rarity];
      } else {
        newRarities[rarity] = { power: 0, bonus: 0, marketUrl: '' };
      }
      return newRarities;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const id = editMiner?.id || generateMinerId(minerName);
      
      // Upload image if it's base64
      let finalImageUrl = minerImage;
      if (finalImageUrl.startsWith('data:')) {
        finalImageUrl = await uploadImage(finalImageUrl, id);
      } else if (finalImageUrl) {
        finalImageUrl = ensureFullUrl(finalImageUrl, 'miners', '.gif');
      }

      // Process rarities to ensure they are numbers and in correct order
      const processedRarities: Partial<Record<Rarity, MinerRarity>> = {};
      RARITY_ORDER.forEach(rarity => {
        const stats = rarities[rarity];
        if (stats) {
          const power = parseFloat(String(stats.power || 0));
          const bonus = parseFloat(String(stats.bonus || 0));
          const hasMarketUrl = !!stats.marketUrl && stats.marketUrl.trim() !== '';
          
          if (rarity === Rarity.COMMON || power > 0 || bonus > 0 || hasMarketUrl) {
            processedRarities[rarity] = {
              power,
              bonus,
              marketUrl: hasMarketUrl ? ensureFullUrl(stats.marketUrl!, MARKET_BASE_URL) : undefined
            };
          }
        }
      });

      const minerData: Miner = {
        id,
        name: minerName,
        description: minerDescription,
        cells: minerCells,
        image: finalImageUrl,
        tags: minerTags,
        rarities: processedRarities,
        defaultRarity: Rarity.COMMON,
        setId: minerSetId || undefined,
        sellable: minerSellable,
        updatedAt: new Date().toISOString()
      };

      await saveMiner(minerData);
      
      setUploadSuccess(true);
      fetchAllMiners(); // Refresh local list
      setTimeout(() => setUploadSuccess(false), 3000);
      
      if (editMiner && onCancelEdit) {
        setTimeout(() => onCancelEdit(), 1500);
      } else {
        // Reset form
        setMinerName('');
        setMinerDescription('');
        setMinerCells(1);
        setMinerImage('');
        setMinerTags([]);
        setRarities({ [Rarity.COMMON]: { power: 0, bonus: 0, marketUrl: '' } });
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
              <LogIn className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Authorized Access</h2>
            <p className="text-slate-400 text-center mt-2">
              Login to upload new miners to the database.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {authError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2 text-red-400 text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="font-bold">Authentication Error</p>
                </div>
                <p>{authError}</p>
                <button 
                  type="button"
                  onClick={runDiagnostics}
                  className="text-xs underline hover:text-red-300 transition-colors"
                >
                  Run Connection Diagnostics
                </button>
              </div>
            )}

            {showDebug && debugInfo && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-bold uppercase tracking-wider opacity-70">Diagnostic Report</p>
                  <button onClick={() => setShowDebug(false)} className="hover:text-white transition-colors">✕</button>
                </div>
                <div className="bg-slate-900/50 p-2 rounded border border-blue-500/10 overflow-auto max-h-40 font-mono">
                  <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                </div>
                {debugInfo.fetchError && (
                  <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-300">
                    <p className="font-bold">⚠️ DNS/Network Error Detected</p>
                    <p>The server cannot resolve the Supabase hostname. Please verify your project ID in the Secrets panel.</p>
                  </div>
                )}
              </div>
            )}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Sign In
            </button>
            
            {!authError && !showDebug && (
              <button
                type="button"
                onClick={runDiagnostics}
                className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs transition-colors flex items-center justify-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                Troubleshoot Connection
              </button>
            )}
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Confirmation Modal */}
      <AnimatePresence>
        {showPurgeConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              
              <div className="text-center space-y-2 mb-8">
                <h3 className="text-2xl font-bold text-white">Purge & Sync?</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  This will <span className="text-red-400 font-bold">DELETE ALL</span> {showPurgeConfirm.type} in the database and replace them with the data from the Google Sheet. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowPurgeConfirm(null)}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-2xl border border-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleManualSync(showPurgeConfirm.type, true);
                    setShowPurgeConfirm(null);
                  }}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-400 text-white font-bold rounded-2xl shadow-xl shadow-red-500/20 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              
              <h3 className="text-2xl font-bold text-white text-center mb-2">Confirm Deletion</h3>
              <p className="text-slate-400 text-center mb-8">
                Are you sure you want to delete <span className="text-white font-semibold">"{showDeleteConfirm.name}"</span>? 
                This will also remove it from the Google Sheet and cannot be undone.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showDeleteConfirm.type === 'miner') handleDeleteMiner();
                    else if (showDeleteConfirm.type === 'rack') confirmDeleteRack();
                    else if (showDeleteConfirm.type === 'set') confirmDeleteSet();
                  }}
                  disabled={uploading}
                  className="px-6 py-3 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-semibold rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {editMiner && (
            <button 
              onClick={onCancelEdit}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"
              title="Back to Search"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-bold text-white">Database Manager</h2>
            <p className="text-slate-400">
              Manage miners, block rewards, and league settings.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!editMiner && (
            <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700">
              <button 
                onClick={() => setActiveTab('miner')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'miner' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Zap className="w-4 h-4" /> Miner
              </button>
              <button 
                onClick={() => setActiveTab('racks')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'racks' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <LayoutIcon className="w-4 h-4" /> Racks
              </button>
              <button 
                onClick={() => setActiveTab('sets')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'sets' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Layers className="w-4 h-4" /> Sets
              </button>
              <button 
                onClick={() => setActiveTab('blocks')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                  activeTab === 'blocks' ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Box className="w-4 h-4" /> Blocks
              </button>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {activeTab === 'miner' && (
        <>
          {/* Sync Section */}
          {!editMiner && (
            <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Database className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Miner Sync Configuration</h3>
                    <p className="text-xs text-slate-500">Sync your miner database with a Google Sheet for bulk updates. ({(miners || []).length} miners in DB)</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const templateRow = { 
                      "Miner": "Miner Name", 
                      "Description": "Miner Description", 
                      "Cells": 1, 
                      "Image ID": "miner_image_id",
                      "Market ID": "64f0a...",
                      "Set": "set_id_here",
                      "Sellable": "Yes",
                      "Common Power": 1000,
                      "Common Bonus": 0.5,
                      "Uncommon Power": 2000,
                      "Uncommon Bonus": 1.0,
                      "Rare Power": 4000,
                      "Rare Bonus": 2.0,
                      "Epic Power": 8000,
                      "Epic Bonus": 4.0,
                      "Legendary Power": 16000,
                      "Legendary Bonus": 8.0,
                      "Unreal Power": 32000,
                      "Unreal Bonus": 16.0
                    };
                    const ws = XLSX.utils.json_to_sheet([templateRow]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Miners");
                    XLSX.writeFile(wb, "Miners_Template.xlsx");
                  }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-all flex items-center gap-2 text-xs font-bold"
                  title="Download Template"
                >
                  <Download className="w-4 h-4" /> Template
                </button>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={sheetConfigs.miners.sheetId}
                  onChange={(e) => setSheetConfigs(prev => ({
                    ...prev,
                    miners: { ...prev.miners, sheetId: e.target.value }
                  }))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="Enter Sheet ID..."
                />
                <button 
                  onClick={() => handleSaveSheetId('miners')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-xs font-bold transition-all"
                >
                  Save
                </button>
                <button 
                  onClick={() => setShowPurgeConfirm({ type: 'miners' })}
                  disabled={!!isSyncing || !sheetConfigs.miners.sheetId}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  title="Delete all DB miners and re-sync from sheet"
                >
                  Purge
                </button>
                <button 
                  onClick={() => handleManualSync('miners')}
                  disabled={!!isSyncing || !sheetConfigs.miners.sheetId}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50",
                    syncSuccess === 'miners' 
                      ? "bg-emerald-500 text-white" 
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500"
                  )}
                >
                  {isSyncing === 'miners' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : syncSuccess === 'miners' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Database className="w-3 h-3" />
                  )}
                  {syncSuccess === 'miners' ? 'Synced!' : 'Sync'}
                </button>
              </div>

              {uploadError && isSyncing === null && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <p>{uploadError}</p>
                </div>
              )}

              {syncSuccess === 'miners' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <p>Miners database successfully synchronized with Google Sheets!</p>
                </div>
              )}

              {sheetConfigs.miners.status && sheetConfigs.miners.status.startsWith("Error") && (
                <p className="text-[10px] font-bold text-red-400">
                  {sheetConfigs.miners.status}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Basic Info */}
            <div className="space-y-6">
              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  Basic Information
                </h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Miner Name</label>
                  <input 
                    type="text" 
                    value={minerName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setMinerName(newName);
                      if (!editMiner && newName) {
                        setMinerImage(generateMinerId(newName));
                      } else if (!editMiner && !newName) {
                        setMinerImage('');
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g., Chromaflux"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea 
                    value={minerDescription}
                    onChange={(e) => setMinerDescription(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all h-24 resize-none"
                    placeholder="Describe the miner..."
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Cells</label>
                    <select 
                      value={minerCells}
                      onChange={(e) => setMinerCells(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    >
                      <option value={1}>1 Cell</option>
                      <option value={2}>2 Cells</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sellable</label>
                    <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700">
                      <button 
                        type="button"
                        onClick={() => setMinerSellable(true)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                          minerSellable ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        Yes
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMinerSellable(false)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                          !minerSellable ? "bg-emerald-500 text-white" : "text-slate-500 hover:text-slate-300"
                        )}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Set</label>
                  <select 
                    value={minerSetId}
                    onChange={(e) => setMinerSetId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">None</option>
                    {(sets || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-500" />
                  Miner Image
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <input 
                        type="text" 
                        list="image-ids"
                        value={minerImage}
                        onChange={(e) => setMinerImage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                        placeholder="e.g., chromaflux (or full URL)"
                      />
                    </div>
                    <datalist id="image-ids">
                      {Array.from(new Set([
                        ...(miners || []).map(m => m.image).filter(Boolean),
                        ...(racks || []).map(r => r.image).filter(Boolean)
                      ])).map(id => <option key={id} value={id} />)}
                    </datalist>
                  </div>
                </div>

                {isIdentifying && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">AI is generating visual tags...</span>
                  </div>
                )}

                {minerImage && (
                  <div className="w-full h-40 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden p-4 relative group">
                    <MinerImage 
                      image={minerImage} 
                      name={minerName} 
                      className="max-w-full max-h-full object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-500"
                      fallbackClassName="w-full h-full"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Preview</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TagIcon className="w-5 h-5 text-emerald-500" />
                  Tags (Optional)
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="Add a tag..."
                  />
                  <button 
                    type="button"
                    onClick={addTag}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(minerTags || []).map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-3 py-1 bg-slate-900 text-slate-300 rounded-full text-xs font-medium border border-slate-700">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Rarities */}
            <div className="space-y-6">
              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  Rarity Stats
                </h3>
                
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {RARITY_ORDER.map(r => {
                    const stats = rarities[r];
                    const isEnabled = !!stats;
                    return (
                      <div 
                        key={r}
                        className={cn(
                          "p-4 rounded-2xl border transition-all",
                          isEnabled ? "bg-slate-900 border-emerald-500/30" : "bg-slate-900/40 border-slate-700 opacity-60"
                        )}
                      >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <img src={ASSET_URLS.rarity(r)} alt={r} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                              <span className="font-bold text-white">{r}</span>
                            </div>
                            {r !== Rarity.COMMON && (
                              <button 
                                type="button"
                                onClick={() => toggleRarity(r)}
                                className={cn(
                                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                  isEnabled ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                )}
                              >
                                {isEnabled ? "Remove" : "Enable"}
                              </button>
                            )}
                          </div>

                        {isEnabled && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Power (Gh/s)</label>
                              <input 
                                type="text" 
                                value={stats.power ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    updateRarity(r, 'power', val);
                                  }
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bonus (%)</label>
                              <input 
                                type="text" 
                                value={stats.bonus ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    updateRarity(r, 'bonus', val);
                                  }
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Market ID / URL (Optional)</label>
                              <input 
                                type="text" 
                                value={stats.marketUrl || ''}
                                onChange={(e) => updateRarity(r, 'marketUrl', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                                placeholder="e.g., 64f0a... (or full URL)"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Section */}
              <div className="space-y-4">
                {uploadSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p className="text-sm">Miner uploaded successfully!</p>
                  </div>
                )}
                <div className="flex gap-4">
                  <button 
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : editMiner ? (
                      <Save className="w-6 h-6" />
                    ) : (
                      <Plus className="w-6 h-6" />
                    )}
                    <span className="text-lg">{editMiner ? 'Save Changes' : 'Add Miner'}</span>
                  </button>
                  {editMiner ? (
                    <button 
                      type="button"
                      onClick={onCancelEdit}
                      disabled={uploading}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-3"
                    >
                      <X className="w-6 h-6" />
                      Cancel
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => {
                        setMinerName('');
                        setMinerDescription('');
                        setMinerCells(1);
                        setMinerImage('');
                        setMinerTags([]);
                        setCurrentTag('');
                        setRarities({ [Rarity.COMMON]: { power: 0, bonus: 0 } });
                        setMinerSetId('');
                        setMinerSellable(true);
                      }}
                      className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-3"
                    >
                      <X className="w-6 h-6" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </>
      )}

      {activeTab === 'blocks' && (
        <div className="space-y-8">
          <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Box className="w-6 h-6 text-emerald-500" />
                League Block Rewards & Times
              </h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save All Settings
                </button>
              </div>
            </div>

            {/* Google Sheets Sync Section for Blocks */}
            <div className="p-4 bg-slate-900/30 rounded-2xl border border-slate-700/50 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Database className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-white">Google Sheets Sync Configuration</h3>
                  <p className="text-[10px] text-slate-500">Configure sheet IDs for rewards and times</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['rewards', 'times'] as const).map((type) => (
                  <div key={type} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {type === 'rewards' ? 'Block Rewards' : 'Block Times'}
                      </label>
                      <button 
                        onClick={type === 'rewards' ? handleDownloadRewardsTemplate : handleDownloadTimesTemplate}
                        className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-all"
                        title="Download Template"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={sheetConfigs[type].sheetId}
                        onChange={(e) => setSheetConfigs(prev => ({
                          ...prev,
                          [type]: { ...prev[type], sheetId: e.target.value }
                        }))}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500 transition-all"
                        placeholder="Sheet ID..."
                      />
                      <button 
                        onClick={() => handleSaveSheetId(type)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-[10px] font-bold transition-all"
                      >
                        Save Sync
                      </button>
                      <button 
                        onClick={() => handleManualSync(type)}
                        disabled={!!isSyncing || !sheetConfigs[type].sheetId}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 disabled:opacity-50",
                          syncSuccess === type 
                            ? "bg-emerald-500 text-white" 
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500"
                        )}
                      >
                        {isSyncing === type ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : syncSuccess === type ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <Database className="w-3 h-3" />
                        )}
                        {syncSuccess === type ? 'Synced!' : 'Sync'}
                      </button>
                    </div>

                    {uploadError && isSyncing === type && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[9px] font-bold">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <p>{uploadError}</p>
                      </div>
                    )}

                    {syncSuccess === type && (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[9px] font-bold">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <p>{type === 'rewards' ? 'Rewards' : 'Times'} synced!</p>
                      </div>
                    )}

                    {sheetConfigs[type].status && sheetConfigs[type].status.startsWith("Error") && (
                      <div className="px-2 py-1 rounded-lg border text-[9px] font-bold truncate bg-red-500/10 border-red-500/20 text-red-400">
                        {sheetConfigs[type].status}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {uploadSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-sm">Settings saved successfully!</p>
              </div>
            )}

            <div className="space-y-12">
              {/* Block Rewards Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Block Rewards
                    </h4>
                    {rewardsUpdatedAt && (
                      <p className="text-[10px] text-slate-500 font-medium">
                        Last updated: {new Date(rewardsUpdatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDownloadRewardsTemplate}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      Template
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50">
                        <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-700 sticky left-0 bg-slate-800 z-10 min-w-[100px]"></th>
                        {CURRENCIES.map(c => (
                          <th key={c.id} className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-700 min-w-[120px]">
                            <div className="flex justify-center">
                              <img src={ASSET_URLS.currency(c.id)} alt={c.symbol} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(LEAGUE_BLOCK_REWARDS).map(league => (
                        <tr key={league} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 text-xs font-bold text-white border-b border-slate-800 sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10">
                            <div className="flex items-center justify-center">
                              <img src={ASSET_URLS.league(league)} alt={league} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </td>
                          {CURRENCIES.map(c => (
                            <td key={c.id} className="p-2 border-b border-slate-800">
                              <input 
                                type="number"
                                step="any"
                                value={blockRewards[league]?.[c.id] ?? 0}
                                onChange={(e) => {
                                  const newVal = parseFloat(e.target.value) || 0;
                                  setBlockRewards(prev => ({
                                    ...prev,
                                    [league]: { ...prev[league], [c.id]: newVal }
                                  }));
                                }}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Block Times Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Block Times (Seconds)
                    </h4>
                    {timesUpdatedAt && (
                      <p className="text-[10px] text-slate-500 font-medium">
                        Last updated: {new Date(timesUpdatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleDownloadTimesTemplate}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-lg transition-all flex items-center gap-2"
                    >
                      <Download className="w-3 h-3" />
                      Template
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/50">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50">
                        <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-700 sticky left-0 bg-slate-800 z-10 min-w-[100px]"></th>
                        {CURRENCIES.map(c => (
                          <th key={c.id} className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-700 min-w-[120px]">
                            <div className="flex justify-center">
                              <img src={ASSET_URLS.currency(c.id)} alt={c.symbol} className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(LEAGUE_BLOCK_REWARDS).map(league => (
                        <tr key={league} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 text-xs font-bold text-white border-b border-slate-800 sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10">
                            <div className="flex items-center justify-center">
                              <img src={ASSET_URLS.league(league)} alt={league} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                            </div>
                          </td>
                          {CURRENCIES.map(c => (
                            <td key={c.id} className="p-2 border-b border-slate-800">
                              <input 
                                type="number"
                                value={blockTimes[league]?.[c.id] || 0}
                                onChange={(e) => {
                                  const newVal = parseInt(e.target.value) || 0;
                                  setBlockTimes(prev => ({
                                    ...prev,
                                    [league]: { ...prev[league], [c.id]: newVal }
                                  }));
                                }}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          {activeTab === 'racks' && (
            <>
              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Database className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Rack Sync Configuration</h3>
                    <p className="text-xs text-slate-500">Sync your rack database with a Google Sheet for bulk updates. ({(racks || []).length} racks in DB)</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const templateRow = { 
                      "Rack": "Rack 8 Slots", 
                      "Slots": 8, 
                      "Bonus": 0.5, 
                      "ID": "rack_8_slots",
                      "Set": "set_id_here"
                    };
                    const ws = XLSX.utils.json_to_sheet([templateRow]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Racks");
                    XLSX.writeFile(wb, "Racks_Template.xlsx");
                  }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-all flex items-center gap-2 text-xs font-bold"
                  title="Download Template"
                >
                  <Download className="w-4 h-4" />
                  Template
                </button>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={sheetConfigs.racks.sheetId}
                  onChange={(e) => setSheetConfigs(prev => ({
                    ...prev,
                    racks: { ...prev.racks, sheetId: e.target.value }
                  }))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="Enter Sheet ID..."
                />
                <button 
                  onClick={() => handleSaveSheetId('racks')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-xs font-bold transition-all"
                >
                  Save
                </button>
                <button 
                  onClick={() => setShowPurgeConfirm({ type: 'racks' })}
                  disabled={!!isSyncing || !sheetConfigs.racks.sheetId}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  title="Delete all DB racks and re-sync from sheet"
                >
                  Purge
                </button>
                <button 
                  onClick={() => handleManualSync('racks')}
                  disabled={!!isSyncing || !sheetConfigs.racks.sheetId}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50",
                    syncSuccess === 'racks' 
                      ? "bg-emerald-500 text-white" 
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500"
                  )}
                >
                  {isSyncing === 'racks' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : syncSuccess === 'racks' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Database className="w-3 h-3" />
                  )}
                  {syncSuccess === 'racks' ? 'Synced!' : 'Sync'}
                </button>
              </div>

              {uploadError && isSyncing === 'racks' && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <p>{uploadError}</p>
                </div>
              )}

              {syncSuccess === 'racks' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <p>Racks database successfully synchronized with Google Sheets!</p>
                </div>
              )}

              {sheetConfigs.racks.status && sheetConfigs.racks.status.startsWith("Error") && (
                <p className="text-[10px] font-bold text-red-400">
                  {sheetConfigs.racks.status}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <form onSubmit={handleSaveRack} className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  {editingRackId ? 'Edit Rack' : 'Add New Rack'}
                </h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rack Name</label>
                  <input 
                    type="text" 
                    value={rackName}
                    onChange={(e) => setRackName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g., Rack 8 Slots"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Slots</label>
                    <input 
                      type="number" 
                      value={rackSlots}
                      onChange={(e) => setRackSlots(parseInt(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                      min={1}
                      max={8}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bonus (%)</label>
                    <input 
                      type="number" 
                      step="any"
                      value={rackBonus}
                      onChange={(e) => setRackBonus(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Rack ID</label>
                  <input 
                    type="text" 
                    value={rackImage}
                    onChange={(e) => {
                      setRackImage(e.target.value);
                      setRackMarketUrl(e.target.value);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g., rack_8_slots"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">This ID is used for both the image and the market link.</p>
                </div>

                {rackImage && (
                  <div className="w-full h-32 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden p-4 relative group">
                    <MinerImage 
                      image={rackImage} 
                      name={rackName} 
                      baseUrl="racks"
                      extension=".png"
                      className="max-w-full max-h-full object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-500"
                      fallbackClassName="w-full h-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Set (Optional)</label>
                  <select 
                    value={rackSetId || ''}
                    onChange={(e) => setRackSetId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">No Set</option>
                    {(sets || []).map(set => (
                      <option key={set.id} value={set.id}>{set.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-3">
                  {uploadSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p className="text-sm">Rack saved successfully!</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button 
                      type="submit"
                      disabled={uploading}
                      className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : editingRackId ? (
                        <Save className="w-6 h-6" />
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                      <span className="text-lg">{editingRackId ? 'Save Changes' : 'Add Rack'}</span>
                    </button>
                    {editingRackId ? (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingRackId(null);
                          setRackName('');
                          setRackSlots(8);
                          setRackBonus(0);
                          setRackImage('');
                          setRackSetId('');
                        }}
                        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-3"
                      >
                        <X className="w-6 h-6" />
                        Cancel
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => {
                          setRackName('');
                          setRackSlots(8);
                          setRackBonus(0);
                          setRackImage('');
                          setRackSetId('');
                        }}
                        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-3"
                      >
                        <X className="w-6 h-6" />
                        Clear
                      </button>
                    )}
                  </div>
              </div>
                
                {/* Existing Racks List below */}
              </form>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <LayoutIcon className="w-5 h-5 text-emerald-500" />
                  Existing Racks
                </h3>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search racks..."
                      value={rackSearchQuery}
                      onChange={(e) => {
                        setRackSearchQuery(e.target.value);
                        setRackCurrentPage(1);
                      }}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={rackSortBy}
                      onChange={(e) => setRackSortBy(e.target.value as any)}
                      className="bg-slate-900/50 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="name">Name</option>
                      <option value="slots">Slots</option>
                      <option value="bonus">Bonus</option>
                    </select>
                    <button
                      onClick={() => setRackSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="p-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedRacks.map(rack => (
                    <div key={rack.id} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700 flex items-center gap-4 group">
                      <div className="w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden p-1 border border-slate-700">
                        <MinerImage 
                          image={rack.image} 
                          name={rack.name} 
                          baseUrl="racks"
                          extension=".png"
                          className="max-w-full max-h-full object-contain"
                          fallbackClassName="w-full h-full"
                          showFallbackText={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white truncate">{rack.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">+{rack.bonus}% Bonus</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingRackId(rack.id);
                            setRackName(rack.name);
                            setRackSlots(rack.slots);
                            setRackBonus(rack.bonus);
                            setRackImage(rack.image || '');
                            setRackSetId(rack.setId || '');
                            setRackMarketUrl(rack.marketUrl || '');
                          }}
                          className="p-1.5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteRack(rack.id, rack.name)}
                          className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {paginatedRacks.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                      <p className="text-slate-500 italic">No racks found matching your criteria.</p>
                    </div>
                  )}
                </div>

                {totalRackPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <div className="flex items-center gap-1 overflow-x-auto max-w-full px-2 py-1 no-scrollbar">
                      {Array.from({ length: totalRackPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setRackCurrentPage(i + 1)}
                          className={cn(
                            "w-10 h-10 min-w-[40px] rounded-xl font-bold transition-all",
                            rackCurrentPage === i + 1
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

          {activeTab === 'sets' && (
            <>
              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-xl">
                    <Database className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Set Sync Configuration</h3>
                    <p className="text-xs text-slate-500">Sync your collection sets with a Google Sheet for bulk updates.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const templateRows = [
                      { 
                        "Set": "Bronze Farm", 
                        "L1 Miners": 2, "L1 Power": 1500000, "L1 Bonus": 0,
                        "L2 Miners": 4, "L2 Power": 2500000, "L2 Bonus": 0,
                        "L3 Miners": 6, "L3 Power": 3500000, "L3 Bonus": 0,
                        "L4 Miners": 8, "L4 Power": 4500000, "L4 Bonus": 0,
                        "L5 Miners": 10, "L5 Power": 5500000, "L5 Bonus": 0,
                        "L6 Miners": 12, "L6 Power": 6500000, "L6 Bonus": 0
                      },
                      { 
                        "Set": "Golden Farm", 
                        "L1 Miners": 2, "L1 Power": 0, "L1 Bonus": 2,
                        "L2 Miners": 4, "L2 Power": 0, "L2 Bonus": 7,
                        "L3 Miners": 6, "L3 Power": 0, "L3 Bonus": 15,
                        "L4 Miners": 8, "L4 Power": 0, "L4 Bonus": 25,
                        "L5 Miners": 10, "L5 Power": 0, "L5 Bonus": 40,
                        "L6 Miners": 12, "L6 Power": 0, "L6 Bonus": 60
                      }
                    ];
                    const ws = XLSX.utils.json_to_sheet(templateRows);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Sets");
                    XLSX.writeFile(wb, "Sets_Template.xlsx");
                  }}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-all flex items-center gap-2 text-xs font-bold"
                  title="Download Template"
                >
                  <Download className="w-4 h-4" /> Template
                </button>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={sheetConfigs.sets.sheetId}
                  onChange={(e) => setSheetConfigs(prev => ({
                    ...prev,
                    sets: { ...prev.sets, sheetId: e.target.value }
                  }))}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 transition-all"
                  placeholder="Enter Sheet ID..."
                />
                <button 
                  onClick={() => handleSaveSheetId('sets')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white text-xs font-bold transition-all"
                >
                  Save
                </button>
                <button 
                  onClick={() => setShowPurgeConfirm({ type: 'sets' })}
                  disabled={!!isSyncing || !sheetConfigs.sets.sheetId}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                  title="Delete all DB sets and re-sync from sheet"
                >
                  Purge
                </button>
                <button 
                  onClick={() => handleManualSync('sets')}
                  disabled={!!isSyncing || !sheetConfigs.sets.sheetId}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50",
                    syncSuccess === 'sets' 
                      ? "bg-emerald-500 text-white" 
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500"
                  )}
                >
                  {isSyncing === 'sets' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : syncSuccess === 'sets' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Database className="w-3 h-3" />
                  )}
                  {syncSuccess === 'sets' ? 'Synced!' : 'Sync'}
                </button>
              </div>

              {uploadError && isSyncing === 'sets' && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-[10px] font-bold">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <p>{uploadError}</p>
                </div>
              )}

              {syncSuccess === 'sets' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <p>Sets database successfully synchronized with Google Sheets!</p>
                </div>
              )}

              {sheetConfigs.sets.status && sheetConfigs.sets.status.startsWith("Error") && (
                <p className="text-[10px] font-bold text-red-400">
                  {sheetConfigs.sets.status}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <form onSubmit={handleSaveSet} className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  {editingSetId ? 'Edit Set' : 'Add New Set'}
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Set Name</label>
                  <input 
                    type="text" 
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    placeholder="e.g., Cyberpunk 2077"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rewards per Level</label>
                    <button 
                      type="button"
                      onClick={addSetLevel}
                      className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {(setLevels || []).map((lvl, index) => (
                      <div key={index} className="flex flex-col gap-2 p-3 bg-slate-900/50 border border-slate-700 rounded-2xl">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Level</span>
                            <input 
                              type="number"
                              value={lvl.level}
                              onChange={(e) => updateSetLevel(index, 'level', parseInt(e.target.value))}
                              className="w-10 bg-transparent border-none text-white text-xs focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Miners</span>
                            <input 
                              type="number"
                              value={lvl.count}
                              onChange={(e) => updateSetLevel(index, 'count', parseInt(e.target.value))}
                              className="w-10 bg-transparent border-none text-white text-xs focus:outline-none"
                            />
                          </div>
                          {(setLevels || []).length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeSetLevel(index)}
                              className="p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Power</span>
                            <input 
                              type="number"
                              value={lvl.power || ''}
                              onChange={(e) => updateSetLevel(index, 'power', parseFloat(e.target.value))}
                              className="w-full bg-transparent border-none text-white text-xs focus:outline-none"
                              placeholder="Gh/s"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Bonus</span>
                            <input 
                              type="number"
                              step="any"
                              value={lvl.bonus || ''}
                              onChange={(e) => updateSetLevel(index, 'bonus', parseFloat(e.target.value))}
                              className="w-full bg-transparent border-none text-white text-xs focus:outline-none"
                              placeholder="%"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {uploadSuccess && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <p className="text-sm">Set saved successfully!</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button 
                      type="submit"
                      disabled={uploading}
                      className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : editingSetId ? (
                        <Save className="w-6 h-6" />
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                      <span className="text-lg">{editingSetId ? 'Save Changes' : 'Add Set'}</span>
                    </button>
                    {editingSetId ? (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingSetId(null);
                          setSetName('');
                          setSetLevels([{ level: 1, count: 0, power: 0, bonus: 0 }]);
                        }}
                        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-3"
                      >
                        <X className="w-6 h-6" />
                        Cancel
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={() => {
                          setSetName('');
                          setSetLevels([{ level: 1, count: 0, power: 0, bonus: 0 }]);
                        }}
                        className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold border border-slate-700 transition-all flex items-center justify-center gap-3"
                      >
                        <X className="w-6 h-6" />
                        Clear
                      </button>
                    )}
                  </div>
              </div>
                
                {/* Existing Sets List below */}
              </form>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-slate-800/50 rounded-3xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  Existing Sets
                </h3>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search sets..."
                      value={setSearchQuery}
                      onChange={(e) => {
                        setSetSearchQuery(e.target.value);
                        setSetCurrentPage(1);
                      }}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedSets.map(set => (
                    <div key={set.id} className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700 flex flex-col gap-4 group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-white">{set.name} Set</h4>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setEditingSetId(set.id);
                              setSetName(set.name);
                              setSetLevels(set.levels);
                            }}
                            className="p-1.5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteSet(set.id, set.name)}
                            className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-700 pb-1">
                          <span>Level (Miners)</span>
                          <span>Reward</span>
                        </div>
                        {(set.levels || []).map((lvl, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Lvl {lvl.level} ({lvl.count} Miners)</span>
                            <div className="flex gap-2">
                              {lvl.power && <span className="text-emerald-500 font-bold">+{lvl.power} Gh/s</span>}
                              {lvl.bonus && <span className="text-blue-500 font-bold">+{lvl.bonus}%</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Associated Miners</label>
                          <div className="flex flex-wrap gap-1">
                            {(miners || []).filter(m => m.setId === set.id).map(m => (
                              <div key={m.id} className="flex items-center gap-2 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg">
                                <MinerImage 
                                  image={m.image} 
                                  name={m.name} 
                                  className="w-6 h-6 object-contain"
                                  fallbackClassName="w-6 h-6"
                                  showFallbackText={false}
                                />
                                <span className="text-[10px] text-slate-400">{m.name}</span>
                              </div>
                            ))}
                            {(miners || []).filter(m => m.setId === set.id).length === 0 && (
                              <span className="text-[9px] text-slate-600 italic">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Associated Racks</label>
                          <div className="flex flex-wrap gap-1">
                            {(racks || []).filter(r => r.setId === set.id).map(r => (
                              <div key={r.id} className="flex items-center gap-2 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg">
                                <MinerImage 
                                  image={r.image} 
                                  name={r.name} 
                                  baseUrl="racks"
                                  extension=".png"
                                  className="w-6 h-6 object-contain"
                                  fallbackClassName="w-6 h-6"
                                  showFallbackText={false}
                                />
                                <span className="text-[10px] text-slate-400">{r.name}</span>
                              </div>
                            ))}
                            {(racks || []).filter(r => r.setId === set.id).length === 0 && (
                              <span className="text-[9px] text-slate-600 italic">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {paginatedSets.length === 0 && (
                    <div className="col-span-full py-12 text-center">
                      <p className="text-slate-500 italic">No sets found matching your criteria.</p>
                    </div>
                  )}
                </div>

                {totalSetPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <div className="flex items-center gap-1 overflow-x-auto max-w-full px-2 py-1 no-scrollbar">
                      {Array.from({ length: totalSetPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setSetCurrentPage(i + 1)}
                          className={cn(
                            "w-10 h-10 min-w-[40px] rounded-xl font-bold transition-all",
                            setCurrentPage === i + 1
                              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
