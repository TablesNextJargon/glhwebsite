import { getAllConcerts } from '../../lib/concerts';
import { readManualConcertText } from '../../lib/manual-concert-file';

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    return res.status(200).json(await getAllConcerts(await readManualConcertText()));
  } catch (error) {
    console.error('Unexpected error in gigs API:', error);
    return res.status(200).json([{
      date: 'Service temporarily unavailable', venue: 'Unable to load concert data',
      city: 'Please try again later', link: '', source: 'error',
    }]);
  }
}
