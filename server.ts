import express from 'express';
import { createServer as createViteServer } from 'vite';

console.log('Server script starting...');
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import multer from 'multer';
import * as XLSX from 'xlsx';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint for environment variables
app.get('/api/debug-env', (req, res) => {
  const envs = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL.substring(0, 15)}...` : 'MISSING',
    SUPABASE_URL: process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.substring(0, 15)}...` : 'MISSING',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? 'PRESENT (length: ' + process.env.VITE_SUPABASE_ANON_KEY.length + ')' : 'MISSING',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'PRESENT (length: ' + process.env.SUPABASE_ANON_KEY.length + ')' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
  };
  res.json(envs);
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Helper to normalize Supabase URL
const normalizeUrl = (url: string) => {
  if (!url) return "";
  let normalized = url.trim();
  
  // If it's just the project ID (e.g. 20 chars, no dots, no slashes)
  if (normalized.length === 20 && !normalized.includes('.') && !normalized.includes('/')) {
    normalized = `${normalized}.supabase.co`;
  }
  
  if (!normalized.startsWith('http')) {
    normalized = `https://${normalized}`;
  }
  // Remove trailing slash
  return normalized.replace(/\/$/, "");
};

// Supabase Setup
const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseUrl = normalizeUrl(rawUrl);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

console.log('Server Supabase Config:', {
  rawUrl: rawUrl ? `${rawUrl.substring(0, 10)}...` : 'MISSING',
  normalizedUrl: supabaseUrl,
  hasServiceKey: !!supabaseServiceKey,
  hasAnonKey: !!supabaseAnonKey
});

let supabaseClient: any = null;
let supabaseAnonClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase URL or Service Key not found in environment variables.");
      throw new Error("Supabase URL or Service Key not found in environment variables. Please configure them in the AI Studio Secrets panel.");
    }
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

function getAnonSupabase() {
  if (!supabaseAnonClient) {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Supabase URL or Anon Key not found in environment variables.");
      throw new Error("Supabase URL or Anon Key not found in environment variables.");
    }
    supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseAnonClient;
}

// Auth Proxy to bypass browser-side network blocks
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const client = getAnonSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Server-side Auth Error:', err);
    res.status(err.status || 400).json({ error: err.message || 'Authentication failed' });
  }
});

// Diagnostic endpoint to test Supabase connectivity
app.get('/api/debug-supabase', async (req, res) => {
  const results: any = {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    timestamp: new Date().toISOString()
  };

  try {
    console.log(`[DEBUG] Attempting to fetch Supabase URL: ${supabaseUrl}`);
    const start = Date.now();
    const response = await fetch(supabaseUrl, { method: 'GET' });
    results.fetchStatus = response.status;
    results.fetchStatusText = response.statusText;
    results.fetchTime = Date.now() - start;
    
    const text = await response.text();
    results.fetchBodySnippet = text.substring(0, 100);
  } catch (err: any) {
    console.error('[DEBUG] Supabase fetch failed:', err);
    results.fetchError = {
      message: err.message,
      name: err.name,
      code: err.code,
      stack: err.stack,
      cause: err.cause
    };
    
    // Add specific DNS troubleshooting
    if (err.code === 'ENOTFOUND') {
      results.dnsTroubleshooting = {
        issue: "DNS Resolution Failed",
        possibleCauses: [
          "The project ID in the URL is incorrect.",
          "The Supabase project has been deleted or paused.",
          "The server environment has DNS resolution restrictions."
        ],
        recommendation: "Verify your VITE_SUPABASE_URL in the Secrets panel. It should be in the format: https://[project-id].supabase.co"
      };
    }
  }

  try {
    const client = getAnonSupabase();
    const { data, error } = await client.from('miners').select('count', { count: 'exact', head: true });
    results.dbTest = error ? { error } : { success: true, count: data };
  } catch (err: any) {
    results.dbTest = { error: err.message };
  }

  res.json(results);
});

async function checkSupabaseConnection() {
  try {
    getSupabase();
    console.log("Supabase client initialized.");
    // Start background sync
    startBackgroundSync();
  } catch (err: any) {
    console.warn(err.message);
  }
}

const MARKET_BASE_URL = 'https://rollercoin.com/marketplace/buy/miner/';
const MINER_ASSET_BASE_URL = 'https://static.rollercoin.com/static/img/market/miners/';
const RACK_MARKET_BASE_URL = 'https://rollercoin.com/marketplace/buy/rack/';
const RACK_ASSET_BASE_URL = 'https://static.rollercoin.com/static/img/market/racks/';

function ensureFullUrl(val: any, baseUrl: string, extension: string = '') {
  if (!val) return '';
  const sVal = String(val).trim();
  if (!sVal) return '';
  if (sVal.startsWith('http') || sVal.startsWith('data:')) return sVal;
  const ext = extension ? (extension.startsWith('.') ? extension : '.' + extension) : '';
  return `${baseUrl}${sVal}${ext}`;
}

// Helper to extract Sheet ID from URL if provided
function extractSheetId(input: string): string {
  if (!input) return "";
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input.trim();
}

// Google Sheets Sync Logic
async function syncGoogleSheets(syncType: string = "miners", overwrite: boolean = false) {
  try {
    const supabase = getSupabase();
    const { data: configDoc } = await supabase.from('settings').select('*').eq('type', 'sheets_config').single();
    const config = configDoc?.configs?.[syncType];
    
    if (!config || !config.sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return { success: false, message: `Google Sheets for ${syncType} not configured` };
    }

    const spreadsheetId = extractSheetId(config.sheetId);
    console.log(`Attempting sync for ${syncType} with ID: ${spreadsheetId}`);

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:ZZ',
    }).catch(err => {
      if (err.code === 404 || err.message?.includes('not found')) {
        throw new Error("Google Sheet not found. Please verify the Sheet ID or URL is correct.");
      }
      if (err.message?.includes('operation is not supported') || err.status === 'FAILED_PRECONDITION') {
        throw new Error("This document is not a Google Sheet. If you uploaded an Excel file, please open it in Google Sheets and go to File > Save as Google Sheets.");
      }
      throw err;
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return { success: false, message: "No data found in sheet" };

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    const errors: string[] = [];
    
    if (syncType === "miners") {
      console.log(`Processing ${data.length} miners from sheet...`);
      if (overwrite) {
        console.log("Overwrite mode enabled. Purging existing miners...");
        const { error: deleteError } = await supabase.from('miners').delete().neq('id', '');
        if (deleteError) throw deleteError;
      }
      const upsertData = data.map(raw => {
        try {
          const name = raw.Miner || raw.name || raw.Name || raw["Miner Name"] || raw["Miner name"] || raw.Miners;
          if (!name) {
            console.warn(`[SYNC] Skipping row: No miner name found in columns: ${Object.keys(raw).join(', ')}`);
            return null;
          }
          const id = name.toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
          
          const rarities: any = {};
          const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unreal', 'Legacy'];
          
          RARITY_ORDER.forEach(r => {
            const powerKey = `${r} Power`;
            const bonusKey = `${r} Bonus`;
            const marketKey = `${r} Market ID`;
            
            if (raw[powerKey] !== undefined || raw[bonusKey] !== undefined) {
              // Handle commas in numbers
              const powerVal = String(raw[powerKey] || 0).replace(/,/g, '');
              const bonusVal = String(raw[bonusKey] || 0).replace(/,/g, '').replace(/%/g, '');
              
              rarities[r] = {
                power: parseFloat(powerVal),
                bonus: parseFloat(bonusVal),
                marketUrl: ensureFullUrl(raw[marketKey], MARKET_BASE_URL)
              };
            }
          });

          // Handle Set ID mapping and normalization
          const rawSetId = raw.Set || raw.setId || raw.collectionSet || raw["Part of a Set?"] || raw["isPartOfSet"] || raw["Set ID"] || raw["set_id"] || '';
          let setId = undefined;
          if (rawSetId && !['true', 'yes', '1', 'y', 'false', 'no', '0', 'n'].includes(String(rawSetId).toLowerCase())) {
            setId = String(rawSetId).toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
          }

          const minerData = {
            id,
            name,
            image: ensureFullUrl(raw["Image ID"] || raw.image, MINER_ASSET_BASE_URL, '.gif'),
            cells: parseInt(String(raw.Cell || raw.cells || 1)),
            description: raw.Description || raw.description || '',
            tags: raw.Tags ? String(raw.Tags).split(',').map((t: string) => t.trim()) : [],
            rarities,
            sellable: String(raw.Sellable || raw.sellable).toLowerCase() === 'true',
            setId,
            marketUrl: ensureFullUrl(raw["Market ID"] || raw.marketUrl, MARKET_BASE_URL),
            updatedAt: new Date().toISOString()
          };

          return minerData;
        } catch (err: any) {
          errors.push(`Error processing ${raw.name || 'unknown'}: ${err.message}`);
          return null;
        }
      }).filter(op => op !== null);

      if (upsertData.length > 0) {
        console.log(`[SYNC] Executing upsert for ${upsertData.length} miners...`);
        const { error: upsertError } = await supabase.from('miners').upsert(upsertData);
        if (upsertError) throw upsertError;
        
        const { count: totalMiners } = await supabase.from('miners').select('*', { count: 'exact', head: true });
        console.log(`[SYNC] Successfully synced miners. Total in DB: ${totalMiners}`);
        return { success: true, processed: upsertData.length, total: totalMiners, errors };
      } else {
        console.warn(`[SYNC] No valid miners found in the ${data.length} rows processed.`);
        return { success: false, message: "No valid miners found in sheet. Please check your column headers (e.g., 'Miner', 'Common Power').", processed: 0, errors };
      }
    } 
    else if (syncType === "racks") {
      console.log(`[SYNC] Processing ${data.length} racks from sheet...`);
      if (overwrite) {
        console.log(`[SYNC] Overwrite mode enabled. Purging existing racks...`);
        const { error: deleteError } = await supabase.from('racks').delete().neq('id', '');
        if (deleteError) throw deleteError;
      }
      const upsertData = data.map(raw => {
        try {
          const name = raw.Rack || raw.name || raw.Name || raw["Rack Name"] || raw["Rack name"] || raw.Racks;
          if (!name) {
            console.warn(`[SYNC] Skipping row: No rack name found in columns: ${Object.keys(raw).join(', ')}`);
            return null;
          }
          const id = name.toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');

          // Handle Set ID mapping and normalization
          const rawSetId = raw.Set || raw.setId || raw.collectionSet || raw["Part of a Set?"] || raw["isPartOfSet"] || raw["Set ID"] || raw["set_id"] || '';
          let setId = undefined;
          if (rawSetId && !['true', 'yes', '1', 'y', 'false', 'no', '0', 'n'].includes(String(rawSetId).toLowerCase())) {
            setId = String(rawSetId).toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
          }

          // Use "ID" column if available, otherwise fallback to name-based id
          const rackId = raw.ID || raw.id || raw["Rack ID"] || id;

          const rackData = {
            id,
            name,
            slots: parseInt(String(raw.Slots || raw.slots || 8).replace(/,/g, '')),
            bonus: parseFloat(String(raw.Bonus || raw.bonus || 0).replace(/,/g, '').replace(/%/g, '')),
            image: ensureFullUrl(rackId, RACK_ASSET_BASE_URL, '.png'),
            marketUrl: ensureFullUrl(rackId, RACK_MARKET_BASE_URL),
            setId,
            updatedAt: new Date().toISOString()
          };

          return rackData;
        } catch (err: any) {
          errors.push(`Error processing ${raw.name || 'unknown'}: ${err.message}`);
          return null;
        }
      }).filter(op => op !== null);

      if (upsertData.length > 0) {
        console.log(`[SYNC] Executing upsert for ${upsertData.length} racks...`);
        const { error: upsertError } = await supabase.from('racks').upsert(upsertData);
        if (upsertError) throw upsertError;
        
        const { count: totalRacks } = await supabase.from('racks').select('*', { count: 'exact', head: true });
        console.log(`[SYNC] Successfully synced racks. Total in DB: ${totalRacks}`);
        return { success: true, processed: upsertData.length, total: totalRacks, errors };
      } else {
        console.warn(`[SYNC] No valid racks found in the ${data.length} rows processed.`);
        return { success: false, message: "No valid racks found in sheet. Please check your column headers (e.g., 'Rack', 'Slots', 'Bonus').", processed: 0, errors };
      }
    }
    else if (syncType === "sets") {
      console.log(`[SYNC] Processing ${data.length} rows for sets from sheet...`);
      if (overwrite) {
        console.log(`[SYNC] Overwrite mode enabled. Purging existing sets...`);
        const { error: deleteError } = await supabase.from('sets').delete().neq('id', '');
        if (deleteError) throw deleteError;
      }

      // Group by Set name
      const setsMap: Record<string, any> = {};
      data.forEach(row => {
        const name = row.name || row["Set"] || row.Name;
        if (!name) return;
        
        const id = name.toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
        const levels = [];
        
        for (let i = 1; i <= 6; i++) {
          const count = parseInt(String(row[`L${i} Miners`] || row[`Level ${i} Miners`] || ''));
          if (isNaN(count)) continue;
          
          const powerStr = String(row[`L${i} Power`] || row[`Level ${i} Power`] || '');
          const bonusStr = String(row[`L${i} Bonus`] || row[`Level ${i} Bonus`] || '');
          
          const power = powerStr ? parseFloat(powerStr.replace(/,/g, '')) : undefined;
          const bonus = bonusStr ? parseFloat(bonusStr.replace(/,/g, '').replace(/%/g, '')) : undefined;
          
          levels.push({ level: i, count, power, bonus });
        }
        
        if (levels.length > 0) {
          setsMap[name] = {
            id,
            name,
            levels,
            updatedAt: new Date().toISOString()
          };
        }
      });

      const upsertData = Object.values(setsMap).map(setData => {
        // Sort levels by level number
        setData.levels.sort((a: any, b: any) => a.level - b.level);
        return setData;
      });

      if (upsertData.length > 0) {
        console.log(`[SYNC] Executing upsert for ${upsertData.length} sets...`);
        const { error: upsertError } = await supabase.from('sets').upsert(upsertData);
        if (upsertError) throw upsertError;
        
        console.log(`[SYNC] Successfully synced sets.`);
        return { success: true, processed: upsertData.length, errors };
      } else {
        console.warn(`[SYNC] No valid sets found in the ${data.length} rows processed.`);
        return { success: false, message: "No valid sets found in sheet. Please check your column headers (e.g., 'Set', 'L1 Miners').", processed: 0, errors };
      }
    }
    else if (syncType === "rewards" || syncType === "times") {
      const { data: settingsDoc } = await supabase.from('settings').select('*').eq('type', 'global').single();
      const settings = settingsDoc || { type: "global", configs: {} };
      const field = syncType === "rewards" ? "blockRewards" : "blockTimes";
      
      if (!settings.configs) settings.configs = {};
      if (!settings.configs.blockRewards) settings.configs.blockRewards = {};
      if (!settings.configs.blockTimes) settings.configs.blockTimes = {};
      
      let processedCount = 0;
      data.forEach(row => {
        const league = row[""] || row.League || row.league || row["__EMPTY"] || row["League Name"];
        if (!league) return;
        
        // Normalize league name to match LEAGUE_BLOCK_REWARDS keys
        const normalizedLeague = String(league).trim().toUpperCase();
        if (!settings.configs[field][normalizedLeague]) settings.configs[field][normalizedLeague] = {};
        
        Object.keys(row).forEach(key => {
          const normalizedKey = key.trim();
          if (normalizedKey && normalizedKey !== "League" && normalizedKey !== "League Name" && normalizedKey !== "" && normalizedKey !== "__EMPTY") {
            const currencyId = normalizedKey.toLowerCase();
            settings.configs[field][normalizedLeague][currencyId] = parseFloat(String(row[key]).replace(/,/g, '')) || 0;
          }
        });
        processedCount++;
      });

      if (processedCount > 0) {
        const { error: upsertError } = await supabase.from('settings').upsert({ 
          ...settings, 
          updatedAt: new Date().toISOString() 
        });
        if (upsertError) throw upsertError;
        
        return { success: true, processed: processedCount, errors };
      } else {
        return { success: false, message: "No valid league data found in sheet.", processed: 0, errors };
      }
    }

    const updatePath = `configs.${syncType}`;
    const { data: currentConfig } = await getSupabase().from('settings').select('*').eq('type', 'sheets_config').single();
    const updatedConfigs = { ...(currentConfig?.configs || {}) };
    updatedConfigs[syncType] = { 
      ...(updatedConfigs[syncType] || {}), 
      lastSync: new Date().toISOString(), 
      status: "Success" 
    };

    await getSupabase().from('settings').upsert({
      type: "sheets_config",
      configs: updatedConfigs,
      updatedAt: new Date().toISOString()
    });

    return { success: true, processed: data.length, errors };
  } catch (err: any) {
    console.error(`Google Sheets Sync Error (${syncType}):`, err);
    const updatePath = `configs.${syncType}`;
    const { data: currentConfig } = await getSupabase().from('settings').select('*').eq('type', 'sheets_config').single();
    const updatedConfigs = { ...(currentConfig?.configs || {}) };
    updatedConfigs[syncType] = { 
      ...(updatedConfigs[syncType] || {}), 
      lastSync: new Date().toISOString(), 
      status: "Error: " + err.message 
    };

    await getSupabase().from('settings').upsert({
      type: "sheets_config",
      configs: updatedConfigs,
      updatedAt: new Date().toISOString()
    });
    return { success: false, error: err.message };
  }
}

function startBackgroundSync() {
  // Check every 15 minutes
  setInterval(async () => {
    console.log("Running background Google Sheets sync...");
    const types = ["miners", "rewards", "times", "racks", "sets"];
    for (const type of types) {
      await syncGoogleSheets(type);
    }
  }, 15 * 60 * 1000);
}

// Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// API Routes
app.get('/api/status', (req, res) => {
  res.json({ 
    connected: !!supabaseClient,
    supabaseUrl: supabaseUrl ? "Configured" : "Missing",
  });
});

app.get('/api/sheets-config', async (req, res) => {
  try {
    const { data, error } = await getSupabase().from('settings').select('*').eq('type', 'sheets_config').single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || { configs: {} });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sheets-config', async (req, res) => {
  try {
    const { type, sheetId } = req.body;
    const { data: currentConfig, error: fetchError } = await getSupabase().from('settings').select('*').eq('type', 'sheets_config').single();
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    const updatedConfigs = { ...(currentConfig?.configs || {}) };
    updatedConfigs[type] = { 
      ...(updatedConfigs[type] || {}), 
      sheetId, 
      updatedAt: new Date().toISOString() 
    };

    const { error: upsertError } = await getSupabase().from('settings').upsert({
      type: "sheets_config",
      configs: updatedConfigs,
      updatedAt: new Date().toISOString()
    });

    if (upsertError) throw upsertError;
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sync-sheets', async (req, res) => {
  const { type, overwrite } = req.body;
  const result = await syncGoogleSheets(type || "miners", overwrite);
  res.json(result);
});

app.get('/api/racks', async (req, res) => {
  try {
    const { data: racks, error } = await getSupabase().from('racks').select('*');
    if (error) throw error;
    res.json(racks || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sets', async (req, res) => {
  try {
    const { data: sets, error } = await getSupabase().from('sets').select('*');
    if (error) throw error;
    res.json(sets || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sheets/service-account', (req, res) => {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return res.status(404).json({ error: 'Service account not configured' });
    }
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    res.json({ email: credentials.client_email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse service account JSON' });
  }
});

app.get('/api/miners', async (req, res) => {
  console.log('GET /api/miners hit');
  try {
    const { data: miners, error } = await getSupabase().from('miners').select('*');
    if (error) throw error;
    res.json(miners || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function updateGoogleSheetRow(type: string, item: any, isDeletion: boolean = false) {
  try {
    const { data: configDoc, error: fetchError } = await getSupabase().from('settings').select('*').eq('type', 'sheets_config').single();
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    const config = configDoc?.configs?.[type];
    
    if (!config || !config.sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.log(`[Google Sheets] Skipping update for ${type}: Missing config or service account.`, {
        hasConfig: !!config,
        hasSheetId: !!config?.sheetId,
        hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
      });
      return;
    }

    const spreadsheetId = extractSheetId(config.sheetId);
    console.log(`[Google Sheets] Updating ${type} in sheet: ${spreadsheetId}`, {
      itemName: item.name,
      itemId: item.id,
      isDeletion
    });
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get current sheet data to find headers and row index
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A:ZZ',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) return;

    const headers = rows[0];
    const nameHeaderIndex = headers.findIndex(h => ['Miner', 'Rack', 'Set', 'name', 'Name', 'Rack Name', 'Set Name'].includes(String(h || '').trim()));
    const idHeaderIndex = headers.findIndex(h => ['ID', 'id', 'Id'].includes(String(h || '').trim()));
    
    if (nameHeaderIndex === -1 && idHeaderIndex === -1) {
      console.error(`Could not find name or ID header in sheet for ${type}`);
      return;
    }

    // 2. Find if row exists
    let rowIndex = -1;
    if (idHeaderIndex !== -1 && item.id) {
      rowIndex = rows.findIndex((row, idx) => idx > 0 && String(row[idHeaderIndex] || '').trim() === item.id);
    }
    
    // Fallback to name if ID not found or ID header missing
    if (rowIndex === -1 && nameHeaderIndex !== -1 && item.name) {
      rowIndex = rows.findIndex((row, idx) => idx > 0 && String(row[nameHeaderIndex] || '').trim() === item.name);
    }

    if (isDeletion) {
      if (rowIndex !== -1) {
        // Delete the row
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: sheetId,
                    dimension: 'ROWS',
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1
                  }
                }
              }
            ]
          }
        });
        console.log(`Deleted row ${rowIndex + 1} from Google Sheet for ${item.name || item.id}`);
      }
      return;
    }

    // 3. Map item to row values based on headers
    const newRow = new Array(headers.length).fill('');
    headers.forEach((header, index) => {
      const h = String(header || '').trim();
      if (type === 'miners') {
        if (['Miner', 'name', 'Name'].includes(h)) newRow[index] = item.name;
        else if (['Image ID', 'image'].includes(h)) newRow[index] = item.image?.split('/').pop()?.replace('.gif', '') || '';
        else if (['Cell', 'cells'].includes(h)) newRow[index] = item.cells;
        else if (['Description', 'description'].includes(h)) newRow[index] = item.description || '';
        else if (['Tags', 'tags'].includes(h)) newRow[index] = (item.tags || []).join(', ');
        else if (['Sellable', 'sellable'].includes(h)) newRow[index] = item.sellable ? 'TRUE' : 'FALSE';
        else if (['Set', 'setId', 'collectionSet', 'Set ID'].includes(h)) newRow[index] = item.setId || '';
        else if (['Market ID', 'marketUrl'].includes(h)) newRow[index] = item.marketUrl?.split('/').pop() || '';
        else if (['ID', 'id', 'Id'].includes(h)) newRow[index] = item.id;
        else {
          // Handle rarities
          const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unreal', 'Legacy'];
          for (const r of RARITY_ORDER) {
            if (h === `${r} Power`) newRow[index] = item.rarities?.[r]?.power || 0;
            else if (h === `${r} Bonus`) newRow[index] = item.rarities?.[r]?.bonus || 0;
            else if (h === `${r} Market ID`) newRow[index] = item.rarities?.[r]?.marketUrl?.split('/').pop() || '';
          }
        }
      } else if (type === 'racks') {
        if (['Rack', 'name', 'Name'].includes(h)) newRow[index] = item.name;
        else if (['Slots', 'slots'].includes(h)) newRow[index] = item.slots;
        else if (['Bonus', 'bonus'].includes(h)) newRow[index] = item.bonus;
        else if (['Image ID', 'image'].includes(h)) newRow[index] = item.image?.split('/').pop()?.replace('.png', '') || '';
        else if (['Market ID', 'marketUrl'].includes(h)) newRow[index] = item.marketUrl?.split('/').pop() || '';
        else if (['Set', 'setId', 'collectionSet', 'Set ID'].includes(h)) newRow[index] = item.setId || '';
        else if (['ID', 'id', 'Id'].includes(h)) newRow[index] = item.id;
      } else if (type === 'sets') {
        if (['Set', 'name', 'Name'].includes(h)) newRow[index] = item.name;
        else if (h === 'levels') newRow[index] = JSON.stringify(item.levels);
        else if (['ID', 'id', 'Id'].includes(h)) newRow[index] = item.id;
        else {
          // Handle L1 Miners, L1 Power, etc.
          const match = h.match(/^L(\d+)\s+(Miners|Power|Bonus)$/) || h.match(/^Level\s+(\d+)\s+(Miners|Power|Bonus)$/);
          if (match) {
            const levelNum = parseInt(match[1]);
            const field = match[2].toLowerCase();
            const levelData = (item.levels || []).find((l: any) => l.level === levelNum);
            if (levelData) {
              if (field === 'miners') newRow[index] = levelData.count;
              else if (field === 'power') newRow[index] = levelData.power || 0;
              else if (field === 'bonus') newRow[index] = levelData.bonus || 0;
            }
          }
        }
      }
    });

    if (rowIndex !== -1) {
      // Update existing row (v4 uses 1-based indexing for ranges, so rowIndex + 1)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] },
      });
      console.log(`Updated row ${rowIndex + 1} in Google Sheet for ${item.name}`);
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] },
      });
      console.log(`Appended new row to Google Sheet for ${item.name}`);
    }
  } catch (err: any) {
    console.error(`Failed to update Google Sheet for ${type}:`, err.message);
  }
}

app.post('/api/miners', async (req, res) => {
  try {
    const minerData = req.body;
    
    const { error } = await getSupabase().from('miners').upsert({
      ...minerData,
      updatedAt: new Date().toISOString()
    });

    if (error) throw error;

    // Sync back to Google Sheets
    await updateGoogleSheetRow('miners', minerData);
    
    res.json({ success: true, miner: minerData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/miners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: miner, error: fetchError } = await getSupabase().from('miners').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;
    if (!miner) return res.status(404).json({ error: "Miner not found" });

    const { error: deleteError } = await getSupabase().from('miners').delete().eq('id', id);
    if (deleteError) throw deleteError;

    // Sync back to Google Sheets (deletion)
    await updateGoogleSheetRow('miners', miner, true);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/racks', async (req, res) => {
  try {
    const data = req.body;
    
    const { error } = await getSupabase().from('racks').upsert({
      ...data,
      updatedAt: new Date().toISOString()
    });

    if (error) throw error;

    // Sync back to Google Sheets
    await updateGoogleSheetRow('racks', data);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/racks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: rack, error: fetchError } = await getSupabase().from('racks').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;
    if (!rack) return res.status(404).json({ error: "Rack not found" });

    const { error: deleteError } = await getSupabase().from('racks').delete().eq('id', id);
    if (deleteError) throw deleteError;

    // Sync back to Google Sheets (deletion)
    await updateGoogleSheetRow('racks', rack, true);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sets', async (req, res) => {
  try {
    const data = req.body;
    
    const { error } = await getSupabase().from('sets').upsert({
      ...data,
      updatedAt: new Date().toISOString()
    });

    if (error) throw error;

    // Sync back to Google Sheets
    await updateGoogleSheetRow('sets', data);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: set, error: fetchError } = await getSupabase().from('sets').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;
    if (!set) return res.status(404).json({ error: "Set not found" });

    const { error: deleteError } = await getSupabase().from('sets').delete().eq('id', id);
    if (deleteError) throw deleteError;

    // Sync back to Google Sheets (deletion)
    await updateGoogleSheetRow('sets', set, true);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/miners/bulk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    
    let data: any[] = [];
    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'json') {
      data = JSON.parse(req.file.buffer.toString());
      if (!Array.isArray(data)) data = [data];
    } else {
      const workbook = XLSX.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    const errors: string[] = [];
    const upsertData = data.map(raw => {
      try {
        const name = raw.Miner || raw.name || raw.Name;
        if (!name) return null;

        const id = name.toLowerCase()
          .replace(/'/g, '')
          .replace(/\./g, '')
          .replace(/-/g, '_')
          .replace(/\s+/g, '_');

        const rarities: any = {};
        const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unreal', 'Legacy'];
        
          RARITY_ORDER.forEach(r => {
            const powerKey = `${r} Power`;
            const bonusKey = `${r} Bonus`;
            const marketKey = `${r} Market ID`;
            
            if (raw[powerKey] !== undefined || raw[bonusKey] !== undefined) {
              rarities[r] = {
                power: parseFloat(String(raw[powerKey] || 0)),
                bonus: parseFloat(String(raw[bonusKey] || 0)),
                marketUrl: raw[marketKey] || undefined
              };
            }
          });

        const minerData = {
          id,
          name,
          image: raw["Image ID"] || raw.image || '',
          cells: parseInt(String(raw.Cell || raw.cells || 1)),
          description: raw.Description || raw.description || '',
          tags: raw.Tags ? String(raw.Tags).split(',').map((t: string) => t.trim()) : [],
          rarities,
          sellable: String(raw.Sellable || raw.sellable).toLowerCase() === 'true',
          setId: raw.Set || raw.setId || undefined,
          updatedAt: new Date().toISOString()
        };

        return minerData;
      } catch (err: any) {
        errors.push(`Error processing ${raw.name || 'unknown'}: ${err.message}`);
        return null;
      }
    }).filter(op => op !== null);

    if (upsertData.length > 0) {
      const { error } = await getSupabase().from('miners').upsert(upsertData);
      if (error) throw error;
    }

    res.json({ success: true, processed: upsertData.length, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/racks/bulk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    
    let data: any[] = [];
    const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'json') {
      data = JSON.parse(req.file.buffer.toString());
      if (!Array.isArray(data)) data = [data];
    } else {
      const workbook = XLSX.read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    const errors: string[] = [];
    const upsertData = data.map(raw => {
      try {
        const name = raw.Rack || raw.name || raw.Name;
        if (!name) return null;

        const id = name.toLowerCase()
          .replace(/'/g, '')
          .replace(/\./g, '')
          .replace(/-/g, '_')
          .replace(/\s+/g, '_');

        const rackData = {
          id,
          name,
          slots: parseInt(String(raw.Slots || raw.slots || 8)),
          bonus: parseFloat(String(raw.Bonus || raw.bonus || 0)),
          image: raw["Image ID"] || raw.image || '',
          marketUrl: raw["Market ID"] || raw.marketUrl || '',
          setId: raw.Set || raw.setId || undefined,
          updatedAt: new Date().toISOString()
        };

        return rackData;
      } catch (err: any) {
        errors.push(`Error processing ${raw.name || 'unknown'}: ${err.message}`);
        return null;
      }
    }).filter(op => op !== null);

    if (upsertData.length > 0) {
      const { error } = await getSupabase().from('racks').upsert(upsertData);
      if (error) throw error;
    }

    res.json({ success: true, processed: upsertData.length, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload-image', async (req, res) => {
  try {
    // Since we don't have GCS, we just return the base64 or a placeholder
    // If the user wants Cloudinary, we'd implement it here.
    // For now, we'll just return the base64 as the URL if it's small,
    // or just tell them to use external URLs.
    const { base64, fileName } = req.body;
    if (!base64 || !fileName) throw new Error('Missing data');

    // Return the base64 as the URL for now (not ideal for large images, but works for demo)
    res.json({ url: base64 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const { data: settings, error } = await getSupabase().from('settings').select('*').eq('type', 'global').single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json(settings || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settingsData = req.body;
    
    const { error } = await getSupabase().from('settings').upsert({
      ...settingsData,
      type: "global",
      updatedAt: new Date().toISOString()
    });

    if (error) throw error;
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Integration
async function startServer() {
  await checkSupabaseConnection();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
