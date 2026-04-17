import { Router, Request, Response } from 'express';
import { UNSPLASH_ACCESS_KEY } from '../config/env';

const router = Router();

const UNSPLASH_BASE = 'https://api.unsplash.com';

function mapPhoto(photo: any) {
  return {
    id: photo.id,
    regular: photo.urls?.regular,
    small: photo.urls?.small,
    downloadLocation: photo.links?.download_location,
    photographerName: photo.user?.name,
    photographerUrl: photo.user?.links?.html,
  };
}

router.get('/photos/random', async (req: Request, res: Response) => {
  const count = req.query.count;
  const params = new URLSearchParams({
    orientation: 'landscape',
    topics: 'nature',
    ...(count ? { count: String(count) } : {}),
  });

  const response = await fetch(`${UNSPLASH_BASE}/photos/random?${params}`, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });

  if (!response.ok) {
    res.status(response.status).json({ error: 'Unsplash request failed' });
    return;
  }

  const data = await response.json();
  res.json(Array.isArray(data) ? data.map(mapPhoto) : mapPhoto(data));
});

router.get('/photos/download', async (req: Request, res: Response) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).json({ error: 'url query param required' });
    return;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });

  res.status(response.status).end();
});

export default router;
