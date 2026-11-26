import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Node-only adapter; Pages Functions read this file through the ASSETS binding.
export async function readManualConcertText(): Promise<string> {
  try {
    return await readFile(path.join(process.cwd(), 'public', 'concerts.txt'), 'utf8');
  } catch (error) {
    console.error('Failed to load concerts.txt:', error);
    return '';
  }
}
