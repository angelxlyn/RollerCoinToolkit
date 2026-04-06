import { Miner, GlobalSettings } from '../types';

export async function fetchMiners(): Promise<Miner[]> {
  const response = await fetch(`${window.location.origin}/api/miners?t=${Date.now()}`);
  if (!response.ok) throw new Error('Failed to fetch miners');
  return response.json();
}

export async function saveMiner(miner: Miner): Promise<any> {
  const response = await fetch(`${window.location.origin}/api/miners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(miner),
  });
  if (!response.ok) throw new Error('Failed to save miner');
  return response.json();
}

export async function deleteMiner(id: string): Promise<void> {
  const response = await fetch(`${window.location.origin}/api/miners/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete miner');
}

export async function bulkUploadMiners(file: File): Promise<{ processed: number, errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${window.location.origin}/api/miners/bulk`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to bulk upload miners');
  return response.json();
}

export async function deleteRack(id: string): Promise<void> {
  const response = await fetch(`${window.location.origin}/api/racks/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete rack');
}

export async function bulkUploadRacks(file: File): Promise<{ processed: number, errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${window.location.origin}/api/racks/bulk`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to bulk upload racks');
  return response.json();
}

export async function deleteSet(id: string): Promise<void> {
  const response = await fetch(`${window.location.origin}/api/sets/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete set');
}

export async function uploadImage(base64: string, fileName: string): Promise<string> {
  const response = await fetch(`${window.location.origin}/api/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64, fileName }),
  });
  if (!response.ok) throw new Error('Failed to upload image');
  const { url } = await response.json();
  return url;
}

export async function fetchSettings(): Promise<GlobalSettings> {
  const response = await fetch(`${window.location.origin}/api/settings`);
  if (!response.ok) throw new Error('Failed to fetch settings');
  return response.json();
}

export async function saveSettings(settings: GlobalSettings): Promise<void> {
  const response = await fetch(`${window.location.origin}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) throw new Error('Failed to save settings');
}
