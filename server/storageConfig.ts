/**
 * Storage configuration manager
 * 
 * Persists storage mode and Google Sheets credentials to a JSON file
 * in the data directory (Docker volume mount point).
 */
import fs from 'fs/promises';
import path from 'path';
import type { StorageConfig } from '../shared/appTypes';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const DEFAULT_CONFIG: StorageConfig = {
  mode: 'file',
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadConfig(): Promise<StorageConfig> {
  try {
    await ensureDataDir();
    const text = await fs.readFile(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(text) };
  } catch (e: any) {
    if (e.code === 'ENOENT') return { ...DEFAULT_CONFIG };
    console.warn('Failed to read config:', e);
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: StorageConfig): Promise<boolean> {
  try {
    await ensureDataDir();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.warn('Failed to write config:', e);
    return false;
  }
}
