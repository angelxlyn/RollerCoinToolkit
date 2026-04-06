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
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'PRESENT (length: ' + process.env.GOOGLE_SERVICE_ACCOUNT_JSON.length + ')' : 'MISSING',
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

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey
  });
});

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
  console.log(`[AUTH] Proxy login attempt for: ${email}`);
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const client = getAnonSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[AUTH] Supabase Auth Error:', error);
      return res.status(error.status || 400).json({ error: error.message || 'Authentication failed' });
    }
    console.log(`[AUTH] Proxy login success for: ${email}`);
    res.json(data);
  } catch (err: any) {
    console.error('[AUTH] Server-side Auth Exception:', err);
    res.status(500).json({ error: err.message || 'Internal server error during authentication' });
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
    const { data, error } = await client.from('miners').select('id', { count: 'exact', head: true });
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
async function syncGoogleSheets(syncType: string = "miners", overwrite: boolean = false, providedSheetId?: string) {
  try {
    const supabase = getSupabase();
    let spreadsheetId = providedSheetId ? extractSheetId(providedSheetId) : null;

    if (!spreadsheetId) {
      const { data: configDoc } = await supabase.from('settings').select('*').eq('type', 'sheets_config').single();
      const config = configDoc?.configs?.[syncType];
      if (config?.sheetId) {
        spreadsheetId = extractSheetId(config.sheetId);
      }
    }
    
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return { success: false, message: "Google Service Account not configured in environment variables (GOOGLE_SERVICE_ACCOUNT_JSON is missing)" };
    }

    if (!spreadsheetId) {
      return { success: false, message: `Google Sheet ID for ${syncType} not found. Please enter the Sheet ID or URL in the Database Manager and click Save.` };
    }

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
          const name = raw.Miner || raw.name || raw.Name || raw["Miner Name"] || raw["Miner name"] || raw.Miners || raw.miner || raw.MINER;
          if (!name) {
            console.warn(`[SYNC] Skipping row: No miner name found. Available columns: ${Object.keys(raw).join(', ')}`);
            return null;
          }
          const id = name.toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
          
          const rarities: any = {};
          const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unreal', 'Legacy'];
          
          RARITY_ORDER.forEach(r => {
            const powerKey = `${r} Power`;
            const bonusKey = `${r} Bonus`;
            const marketKey = `${r} Market ID`;
            
            // Handle commas in numbers
            const powerVal = raw[powerKey] !== undefined ? String(raw[powerKey]).replace(/,/g, '') : '0';
            const bonusVal = raw[bonusKey] !== undefined ? String(raw[bonusKey]).replace(/,/g, '').replace(/%/g, '') : '0';
            
            const power = parseFloat(powerVal) || 0;
            const bonus = parseFloat(bonusVal) || 0;
            const marketUrl = raw[marketKey] ? ensureFullUrl(raw[marketKey], MARKET_BASE_URL) : undefined;

            // Include rarity if it has data or if it's one of the standard ones the user expects
            if (power > 0 || bonus > 0 || marketUrl || r === 'Common') {
              rarities[r] = {
                power,
                bonus,
                ...(marketUrl ? { marketUrl } : {})
              };
            }
          });

          // Handle Set ID mapping and normalization
          const rawSetId = raw.Set || raw.setId || raw.collectionSet || raw["Part of a Set?"] || raw["isPartOfSet"] || raw["Set ID"] || raw["set_id"] || '';
          let setId = undefined;
          if (rawSetId && !['true', 'yes', '1', 'y', 'false', 'no', '0', 'n', 'none', 'null'].includes(String(rawSetId).toLowerCase())) {
            setId = String(rawSetId).toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
          }

          const minerData: any = {
            id,
            name,
            image: ensureFullUrl(raw["Image ID"] || raw.image || raw.Image || raw["Miner Image"], MINER_ASSET_BASE_URL, '.gif'),
            cell: parseInt(String(raw.Cell || raw.cells || raw.Cells || raw.cell || 1)),
            description: raw.Description || raw.description || raw.desc || '',
            tags: (raw.Tags || raw.tags) ? String(raw.Tags || raw.tags).split(',').map((t: string) => t.trim()) : [],
            rarities,
            sellable: String(raw.Sellable || raw.sellable || 'true').toLowerCase() !== 'false' && String(raw.Sellable || raw.sellable || 'true').toLowerCase() !== 'no',
            setId,
            updatedAt: new Date().toISOString()
          };

          return minerData;
        } catch (err: any) {
          errors.push(`Error processing ${raw.name || 'unknown'}: ${err.message}`);
          return null;
        }
      }).filter(op => op !== null);

      if (upsertData.length > 0) {
        console.log(`[SYNC] Executing upsert for ${upsertData.length} miners in chunks...`);
        
        // Chunk upsert to avoid payload size limits
        const chunkSize = 500;
        for (let i = 0; i < upsertData.length; i += chunkSize) {
          const chunk = upsertData.slice(i, i + chunkSize);
          const { error: upsertError } = await supabase.from('miners').upsert(chunk).select('id');
          if (upsertError) throw upsertError;
          console.log(`[SYNC] Upserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(upsertData.length / chunkSize)}`);
        }
        
        const { count: totalMiners } = await supabase.from('miners').select('id', { count: 'exact', head: true });
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
            console.warn(`[SYNC] Skipping row: No rack name found. Available columns: ${Object.keys(raw).join(', ')}`);
            return null;
          }
          const id = name.toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');

          // Handle Set ID mapping and normalization
          const rawSetId = raw.Set || raw.setId || raw.collectionSet || raw["Part of a Set?"] || raw["isPartOfSet"] || raw["Set ID"] || raw["set_id"] || '';
          let setId = undefined;
          if (rawSetId && !['true', 'yes', '1', 'y', 'false', 'no', '0', 'n', 'none', 'null'].includes(String(rawSetId).toLowerCase())) {
            setId = String(rawSetId).toLowerCase().replace(/'/g, '').replace(/\./g, '').replace(/-/g, '_').replace(/\s+/g, '_');
          }

          // Use "ID" column if available, otherwise fallback to name-based id
          const rackId = raw.ID || raw.id || raw["Rack ID"] || id;

          const rackData: any = {
            id,
            name,
            slots: parseInt(String(raw.Slots || raw.slots || 8).replace(/,/g, '')),
            bonus: parseFloat(String(raw.Bonus || raw.bonus || 0).replace(/,/g, '').replace(/%/g, '')),
            image: ensureFullUrl(raw.image || rackId, RACK_ASSET_BASE_URL, '.png'),
            setId,
            updatedAt: new Date().toISOString()
          };

          const rackMarketId = raw["Market ID"] || raw.marketUrl || raw.marketID || rackId;
          rackData.marketUrl = ensureFullUrl(rackMarketId, RACK_MARKET_BASE_URL);

          return rackData;
        } catch (err: any) {
          errors.push(`Error processing ${raw.name || 'unknown'}: ${err.message}`);
          return null;
        }
      }).filter(op => op !== null);

      if (upsertData.length > 0) {
        console.log(`[SYNC] Executing upsert for ${upsertData.length} racks in chunks...`);
        
        // Chunk upsert to avoid payload size limits
        const chunkSize = 500;
        for (let i = 0; i < upsertData.length; i += chunkSize) {
          const chunk = upsertData.slice(i, i + chunkSize);
          const { error: upsertError } = await supabase.from('racks').upsert(chunk);
          if (upsertError) throw upsertError;
          console.log(`[SYNC] Upserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(upsertData.length / chunkSize)}`);
        }
        
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
        console.log(`[SYNC] Executing upsert for ${upsertData.length} sets in chunks...`);
        
        // Chunk upsert to avoid payload size limits
        const chunkSize = 500;
        for (let i = 0; i < upsertData.length; i += chunkSize) {
          const chunk = upsertData.slice(i, i + chunkSize);
          const { error: upsertError } = await supabase.from('sets').upsert(chunk);
          if (upsertError) throw upsertError;
          console.log(`[SYNC] Upserted chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(upsertData.length / chunkSize)}`);
        }
        
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
  const { type, overwrite, sheetId } = req.body;
  const result = await syncGoogleSheets(type || "miners", overwrite, sheetId);
  res.json(result);
});

app.get('/api/racks', async (req, res) => {
  try {
    const supabase = getSupabase();
    let allRacks: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data: racks, error } = await supabase
        .from('racks')
        .select('id, name, slots, bonus, image, "setId", "updatedAt", "marketUrl"')
        .range(from, to)
        .order('name', { ascending: true });

      if (error) throw error;
      
      if (racks && racks.length > 0) {
        allRacks = [...allRacks, ...racks];
        if (racks.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }

    res.json(allRacks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sets', async (req, res) => {
  try {
    const supabase = getSupabase();
    let allSets: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data: sets, error } = await supabase
        .from('sets')
        .select('id, name, levels, "updatedAt"')
        .range(from, to)
        .order('id', { ascending: true });

      if (error) throw error;
      
      if (sets && sets.length > 0) {
        allSets = [...allSets, ...sets];
        if (sets.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }

    res.json(allSets);
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
    const supabase = getSupabase();
    let allMiners: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data: miners, error } = await supabase
        .from('miners')
        .select('id, name, image, cells:cell, description, tags, rarities, sellable, "setId", "updatedAt"')
        .range(from, to)
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error fetching miners:', error);
        throw error;
      }
      
      if (miners && miners.length > 0) {
        allMiners = [...allMiners, ...miners];
        if (miners.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }

    res.json(allMiners);
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

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.error('[Google Sheets] GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing');
      return;
    }

    const spreadsheetId = extractSheetId(config.sheetId);
    console.log(`[Google Sheets] Syncing ${type} to spreadsheet: ${spreadsheetId}`, {
      itemName: item.name,
      itemId: item.id,
      isDeletion
    });
    
    let auth;
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      console.log(`[Google Sheets] Using service account: ${credentials.client_email}`);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } catch (parseErr: any) {
      console.error('[Google Sheets] Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', parseErr.message);
      return;
    }
    
    const sheets = google.sheets({ version: 'v4', auth });

    // 1. Get current sheet data to find headers and row index
    console.log(`[Google Sheets] Fetching spreadsheet metadata...`);
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetName = spreadsheet.data.sheets?.[0]?.properties?.title || 'Sheet1';
    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId || 0;
    console.log(`[Google Sheets] Target sheet: "${sheetName}" (ID: ${sheetId})`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A:ZZ`,
    });

    const rows = response.data.values || [];
    console.log(`[Google Sheets] Retrieved ${rows.length} rows from sheet.`);
    
    if (rows.length === 0) {
      console.warn(`[Google Sheets] Sheet "${sheetName}" is empty.`);
      return;
    }

    const headers = rows[0];
    console.log(`[Google Sheets] Headers:`, headers);

    const nameHeaderIndex = headers.findIndex(h => {
      const sh = String(h || '').trim().toLowerCase();
      return ['miner', 'rack', 'set', 'name', 'miner name', 'rack name', 'set name', 'league', 'league name'].includes(sh);
    });
    const idHeaderIndex = headers.findIndex(h => {
      const sh = String(h || '').trim().toLowerCase();
      return ['id', 'miner id', 'rack id', 'set id'].includes(sh);
    });
    
    if (nameHeaderIndex === -1 && idHeaderIndex === -1 && type !== 'rewards' && type !== 'times') {
      const errorMsg = `Could not find name or ID header in sheet for ${type}. Found headers: ${headers.join(', ')}`;
      console.error(`[Google Sheets] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Special handling for rewards and times (multiple rows)
    if (type === 'rewards' || type === 'times') {
      console.log(`[Google Sheets] Syncing all ${type} to sheet...`);
      const settingsMap = item; // Map of League -> Currency -> Value
      
      for (const [league, currencies] of Object.entries(settingsMap)) {
        let rowIndex = rows.findIndex((row, idx) => idx > 0 && String(row[nameHeaderIndex] || '').trim().toUpperCase() === league.toUpperCase());
        
        const newRow = new Array(headers.length).fill('');
        headers.forEach((header, index) => {
          const h = String(header || '').trim();
          if (index === nameHeaderIndex) {
            newRow[index] = league;
          } else {
            const currencyId = h.toLowerCase();
            if (currencies[currencyId] !== undefined) {
              newRow[index] = currencies[currencyId];
            }
          }
        });

        if (rowIndex !== -1) {
          console.log(`[Google Sheets] Updating existing row ${rowIndex + 1} for league: ${league}`);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${sheetName}'!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [newRow] },
          });
        } else {
          console.log(`[Google Sheets] Appending new row for league: ${league}`);
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `'${sheetName}'!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [newRow] },
          });
        }
      }
      return;
    }

    // 2. Find if row exists (for single items: miners, racks, sets)
    let rowIndex = -1;
    if (idHeaderIndex !== -1 && item.id) {
      const searchId = String(item.id).trim().toLowerCase();
      console.log(`[Google Sheets] Searching for ID: "${searchId}" in column ${idHeaderIndex}`);
      rowIndex = rows.findIndex((row, idx) => {
        if (idx === 0) return false;
        const rowId = String(row[idHeaderIndex] || '').trim().toLowerCase();
        return rowId === searchId;
      });
      if (rowIndex !== -1) console.log(`[Google Sheets] Match found by ID at row ${rowIndex + 1}`);
    }
    
    // Fallback to name if ID not found or ID header missing
    if (rowIndex === -1 && nameHeaderIndex !== -1 && item.name) {
      const searchName = String(item.name).trim().toLowerCase();
      console.log(`[Google Sheets] Searching for Name: "${searchName}" in column ${nameHeaderIndex}`);
      rowIndex = rows.findIndex((row, idx) => {
        if (idx === 0) return false;
        const rowName = String(row[nameHeaderIndex] || '').trim().toLowerCase();
        return rowName === searchName;
      });
      if (rowIndex !== -1) console.log(`[Google Sheets] Match found by Name at row ${rowIndex + 1}`);
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
      const hl = h.toLowerCase();
      
      if (type === 'miners') {
        if (['miner', 'name', 'miner name'].includes(hl)) newRow[index] = item.name;
        else if (['image id', 'image', 'miner image'].includes(hl)) newRow[index] = item.image?.split('/').pop()?.replace('.gif', '') || '';
        else if (['cell', 'cells'].includes(hl)) newRow[index] = item.cells || item.cell;
        else if (['description', 'desc'].includes(hl)) newRow[index] = item.description || '';
        else if (['tags'].includes(hl)) newRow[index] = (item.tags || []).join(', ');
        else if (['sellable'].includes(hl)) newRow[index] = item.sellable ? 'TRUE' : 'FALSE';
        else if (['set', 'setid', 'collectionset', 'set id', 'part of a set?', 'ispartofset'].includes(hl)) newRow[index] = item.setId || '';
        else if (['market id', 'marketurl'].includes(hl)) newRow[index] = ''; 
        else if (['id', 'miner id'].includes(hl)) newRow[index] = item.id;
        else {
          // Handle rarities
          const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unreal', 'Legacy'];
          for (const r of RARITY_ORDER) {
            const rl = r.toLowerCase();
            let rarityData = null;
            if (item.rarities) {
              if (Array.isArray(item.rarities)) {
                rarityData = item.rarities.find((rar: any) => rar.rarity === r);
              } else {
                rarityData = item.rarities[r];
              }
            }
            
            if (hl === `${rl} power`) newRow[index] = rarityData?.power || 0;
            else if (hl === `${rl} bonus`) newRow[index] = rarityData?.bonus || 0;
            else if (hl === `${rl} market id`) newRow[index] = rarityData?.marketUrl?.split('/').pop() || '';
          }
        }
      } else if (type === 'racks') {
        if (['rack', 'name', 'rack name'].includes(hl)) newRow[index] = item.name;
        else if (['slots'].includes(hl)) newRow[index] = item.slots;
        else if (['bonus'].includes(hl)) newRow[index] = item.bonus;
        else if (['image id', 'image', 'rack image'].includes(hl)) newRow[index] = item.image?.split('/').pop()?.replace('.png', '') || '';
        else if (['market id', 'marketurl'].includes(hl)) newRow[index] = item.marketUrl?.split('/').pop() || '';
        else if (['set', 'setid', 'collectionset', 'set id'].includes(hl)) newRow[index] = item.setId || '';
        else if (['id', 'rack id'].includes(hl)) newRow[index] = item.id;
      } else if (type === 'sets') {
        if (['set', 'name', 'set name'].includes(hl)) newRow[index] = item.name;
        else if (hl === 'levels') newRow[index] = JSON.stringify(item.levels);
        else if (['id', 'set id'].includes(hl)) newRow[index] = item.id;
        else {
          // Handle L1 Miners, L1 Power, etc.
          const match = hl.match(/^l(\d+)\s+(miners|power|bonus)$/) || hl.match(/^level\s+(\d+)\s+(miners|power|bonus)$/);
          if (match) {
            const levelNum = parseInt(match[1]);
            const field = match[2];
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

    console.log(`[Google Sheets] Prepared row for ${item.name}:`, newRow);

    if (rowIndex !== -1) {
      // Update existing row (v4 uses 1-based indexing for ranges, so rowIndex + 1)
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A${rowIndex + 1}:ZZ${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] },
      });
      console.log(`[Google Sheets] Updated row ${rowIndex + 1} in Google Sheet for ${item.name}`);
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${sheetName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] },
      });
      console.log(`[Google Sheets] Appended new row to Google Sheet for ${item.name}`);
    }
  } catch (err: any) {
    console.error(`[Google Sheets] Failed to update Google Sheet for ${type}:`, err.message);
    throw err; // Re-throw to be caught by the API handler
  }
}

app.post('/api/miners', async (req, res) => {
  try {
    console.log('[API] POST /api/miners body:', JSON.stringify(req.body, null, 2));
    const { id, name, description, cells, image, tags, rarities, sellable, setId } = req.body;
    const minerData = { 
      id, 
      name, 
      description, 
      cell: parseInt(String(cells || 1)), 
      image, 
      tags, 
      rarities, 
      sellable: sellable !== undefined ? sellable : true, 
      setId 
    };
    
    console.log('[API] Upserting minerData:', JSON.stringify(minerData, null, 2));
    const { error } = await getSupabase().from('miners').upsert({
      ...minerData,
      updatedAt: new Date().toISOString()
    }).select('id');

    if (error) {
      console.error('[API] Supabase upsert error:', error);
      throw error;
    }

    // Sync back to Google Sheets
    let sheetSyncError = null;
    try {
      await updateGoogleSheetRow('miners', minerData);
    } catch (sheetErr: any) {
      console.error('[API] Google Sheets sync error (non-fatal):', sheetErr.message);
      sheetSyncError = sheetErr.message;
    }
    
    res.json({ success: true, miner: minerData, sheetSyncError });
  } catch (err: any) {
    console.error('[API] POST /api/miners failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/miners/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: miner, error: fetchError } = await getSupabase().from('miners').select('id, name, image, cells:cell, description, tags, rarities, sellable, "setId", "updatedAt"').eq('id', id).single();
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
    let sheetSyncError = null;
    try {
      await updateGoogleSheetRow('racks', data);
    } catch (sheetErr: any) {
      console.error('[API] Google Sheets sync error (non-fatal):', sheetErr.message);
      sheetSyncError = sheetErr.message;
    }
    
    res.json({ success: true, sheetSyncError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/racks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: rack, error: fetchError } = await getSupabase().from('racks').select('id, name, slots, bonus, image, "setId", "updatedAt", "marketUrl"').eq('id', id).single();
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
    let sheetSyncError = null;
    try {
      await updateGoogleSheetRow('sets', data);
    } catch (sheetErr: any) {
      console.error('[API] Google Sheets sync error (non-fatal):', sheetErr.message);
      sheetSyncError = sheetErr.message;
    }
    
    res.json({ success: true, sheetSyncError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: set, error: fetchError } = await getSupabase().from('sets').select('id, name, levels, "updatedAt"').eq('id', id).single();
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

        const rarities: Record<string, any> = {};
        const RARITY_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Unreal', 'Legacy'];
        
        RARITY_ORDER.forEach(r => {
          const powerKey = `${r} Power`;
          const bonusKey = `${r} Bonus`;
          const marketKey = `${r} Market ID`;
          
          const powerVal = raw[powerKey] !== undefined ? String(raw[powerKey]).replace(/,/g, '') : '0';
          const bonusVal = raw[bonusKey] !== undefined ? String(raw[bonusKey]).replace(/,/g, '').replace(/%/g, '') : '0';

          const power = parseFloat(powerVal) || 0;
          const bonus = parseFloat(bonusVal) || 0;
          const marketUrl = raw[marketKey] || undefined;

          if (r === 'Common' || power > 0 || bonus > 0 || marketUrl) {
            rarities[r] = {
              power,
              bonus,
              marketUrl: marketUrl ? (marketUrl.startsWith('http') ? marketUrl : `https://rollercoin.com/marketplace/item/${marketUrl}`) : undefined
            };
          }
        });

        const minerData = {
          id,
          name,
          image: raw["Image ID"] || raw.image || '',
          cell: parseInt(String(raw.Cell || raw.cells || 1)),
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
      console.log(`[API] Bulk upserting ${upsertData.length} miners...`);
      const { error } = await getSupabase().from('miners').upsert(upsertData).select('id');
      if (error) {
        console.error('[API] Bulk upsert error:', error);
        throw error;
      }

      // Sync back to Google Sheets in background if count is small, or trigger a full push
      if (upsertData.length <= 50) {
        console.log(`[API] Syncing ${upsertData.length} miners to Google Sheets...`);
        for (const miner of upsertData) {
          await updateGoogleSheetRow('miners', miner).catch(e => console.error(`[API] Bulk sync error for ${miner.name}:`, e.message));
        }
      } else {
        console.log(`[API] Large bulk upload (${upsertData.length} miners). Skipping individual sheet updates. Please use 'Push to Google Sheets' for full sync.`);
      }
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

      // Sync back to Google Sheets in background if count is small
      if (upsertData.length <= 50) {
        console.log(`[API] Syncing ${upsertData.length} racks to Google Sheets...`);
        for (const rack of upsertData) {
          await updateGoogleSheetRow('racks', rack).catch(e => console.error(`[API] Bulk sync error for ${rack.name}:`, e.message));
        }
      }
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

    // Sync back to Google Sheets
    if (settingsData.blockRewards) {
      await updateGoogleSheetRow('rewards', settingsData.blockRewards);
    }
    if (settingsData.blockTimes) {
      await updateGoogleSheetRow('times', settingsData.blockTimes);
    }
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/push-sheets', async (req, res) => {
  const { type } = req.body;
  if (!type) return res.status(400).json({ error: "Type is required" });
  
  try {
    const supabase = getSupabase();
    let allData: any[] = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    console.log(`[API] Starting full push of ${type} to Google Sheets...`);

    while (hasMore) {
      const { data, error } = await supabase
        .from(type)
        .select('*')
        .range(from, to);

      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        if (data.length < 1000) {
          hasMore = false;
        } else {
          from += 1000;
          to += 1000;
        }
      } else {
        hasMore = false;
      }
    }

    if (allData.length === 0) {
      return res.json({ success: true, message: "No data to push" });
    }

    // For full push, it's better to overwrite or append in bulk
    // But since updateGoogleSheetRow handles row matching, we'll use it in a loop for now
    // but with a limit to avoid timeouts
    const limit = 200;
    const itemsToPush = allData.slice(0, limit);
    
    console.log(`[API] Pushing ${itemsToPush.length} items to Google Sheets...`);
    for (const item of itemsToPush) {
      // Normalize data for updateGoogleSheetRow
      const normalizedItem = { ...item };
      if (type === 'miners' && item.cell) normalizedItem.cells = item.cell;
      
      await updateGoogleSheetRow(type, normalizedItem);
    }

    res.json({ 
      success: true, 
      processed: itemsToPush.length, 
      total: allData.length,
      message: allData.length > limit ? `Pushed first ${limit} items. Please push again for more.` : "Full push complete"
    });
  } catch (err: any) {
    console.error(`[API] Full push to Google Sheets failed:`, err.message);
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
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.warn('[WARN] GOOGLE_SERVICE_ACCOUNT_JSON is not set. Google Sheets sync will not work.');
    } else {
      try {
        JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        console.log('[INFO] GOOGLE_SERVICE_ACCOUNT_JSON is set and valid JSON.');
      } catch (e) {
        console.error('[ERROR] GOOGLE_SERVICE_ACCOUNT_JSON is set but NOT valid JSON.');
      }
    }
  });
}

startServer();
