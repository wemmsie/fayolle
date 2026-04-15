const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const FIELD_MASK = 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.websiteUri,places.googleMapsUri,places.reservable';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { textQuery } = req.body || {};
  if (!textQuery || typeof textQuery !== 'string') {
    return res.status(400).json({ error: 'textQuery is required' });
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
        'Referer': 'https://fayolle.com/',
      },
      body: JSON.stringify({ textQuery, pageSize: 1 }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch place data' });
  }
}
