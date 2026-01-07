import { promises as fs } from 'fs';
import * as path from 'path';
import os from 'os';

interface CascadeConfig {
  selectedModel?: string;
}

function getConfigDir(): string {
  // Use a hidden folder in the user's home directory
  return path.join(os.homedir(), '.cascade-cli');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export async function readConfig(): Promise<CascadeConfig> {
  try {
    const filePath = getConfigPath();
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveConfig(config: CascadeConfig): Promise<void> {
  const dir = getConfigDir();
  await fs.mkdir(dir, { recursive: true });
  const filePath = getConfigPath();
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function getSelectedModel(): Promise<string | null> {
  const cfg = await readConfig();
  return cfg.selectedModel ?? null;
}

export async function setSelectedModel(model: string): Promise<void> {
  const cfg = await readConfig();
  cfg.selectedModel = model;
  await saveConfig(cfg);
}
