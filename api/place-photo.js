const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export default async function handler(req, res) {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'name parameter is required' });
  }

  // Validate the name looks like a Places photo resource
  if (!name.startsWith('places/') || !name.includes('/photos/')) {
    return res.status(400).json({ error: 'Invalid photo name' });
  }

  try {
    const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=600&key=${API_KEY}`;
    const response = await fetch(url, { redirect: 'follow', headers: { 'Referer': 'https://fayolle.com/' } });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Photo not found' });
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

    const buffer = await response.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch photo' });
  }
}
