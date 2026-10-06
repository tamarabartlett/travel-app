import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadTripData, saveTripData } from './_lib/db';
import { applyCors, handleOptions } from './_lib/session';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method === 'GET') {
    const data = await loadTripData();
    res.status(200).json(
      data ?? {
        trips: [],
        updatedAt: null,
      },
    );
    return;
  }

  if (req.method === 'PUT') {
    const body = req.body as { trips?: unknown } | undefined;
    if (!Array.isArray(body?.trips)) {
      res.status(400).json({ error: 'Expected a trips array.' });
      return;
    }

    await saveTripData({
      trips: body.trips,
      updatedAt: new Date().toISOString(),
    });
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
