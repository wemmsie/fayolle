#!/usr/bin/env node
/**
 * Fetches all place data from Google Places API and bakes it into
 * a static JSON file + downloaded photo images.
 *
 * Run: node scripts/fetch-places.js
 * Requires: GOOGLE_MAPS_API_KEY in .env or environment
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_JSON = resolve(ROOT, 'src/places-data.json');
const PHOTO_DIR = resolve(ROOT, 'public/place-photos');

// Load .env manually (no extra dependency)
try {
  const envFile = readFileSync(resolve(ROOT, '.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch (_) {}

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY not set');
  process.exit(1);
}

const FIELD_MASK = [
  'places.displayName',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.photos',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.reservable',
].join(',');

// Every place that can open a PlaceModal
const PLACES = [
  'Greenhouse Loft',
  'Lakefront Trail',
  'Architectural Boat Tour',
  'Garfield Park Conservatory',
  'Art Institute of Chicago',
  'Chicago Cultural Center',
  'Peggy Notebaert Nature Museum',
  'Osaka Garden at Jackson Park',
  'Cozy Corner Restaurant',
  'Bang Bang Pie & Biscuits',
  'Loaf Lounge',
  'Lula Cafe',
  'Girl & The Goat',
  'Akahoshi Ramen',
  "Dove's Luncheonette",
  'Gretel',
  'Little Victories Coffee',
  'Truce Chicago',
  'Lazybird Chicago',
  'Pilot Project Brewing',
  'Easy Does It Bar',
  'Welcome Back Lounge',
  'The Leavitt Street Inn & Tavern',
];

async function fetchPlace(name) {
  const textQuery = name + ', Chicago';
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
      'Referer': 'https://fayolle.com/',
    },
    body: JSON.stringify({ textQuery, pageSize: 1 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error for "${name}": ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.places?.[0] || null;
}

async function downloadPhoto(photoName, slug) {
  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=600&key=${API_KEY}`;
  const res = await fetch(url, { redirect: 'follow', headers: { 'Referer': 'https://fayolle.com/' } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = (res.headers.get('content-type') || '').includes('png') ? 'png' : 'jpg';
  const filename = `${slug}.${ext}`;
  writeFileSync(resolve(PHOTO_DIR, filename), buf);
  return `/place-photos/${filename}`;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  mkdirSync(PHOTO_DIR, { recursive: true });

  const results = {};
  for (const name of PLACES) {
    process.stdout.write(`Fetching "${name}"...`);
    try {
      const p = await fetchPlace(name);
      if (!p) {
        console.log(' NOT FOUND');
        continue;
      }

      const slug = slugify(name);
      let photoPath = null;
      if (p.photos?.length > 0) {
        photoPath = await downloadPhoto(p.photos[0].name, slug);
      }

      results[name] = {
        displayName: p.displayName?.text || name,
        formattedAddress: p.formattedAddress || '',
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? null,
        photoUrl: photoPath,
        websiteURI: p.websiteUri || null,
        googleMapsURI: p.googleMapsUri || null,
        reservable: p.reservable ?? false,
      };
      console.log(' OK');
    } catch (e) {
      console.log(` ERROR: ${e.message}`);
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
  }

  writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${Object.keys(results).length} places to ${OUT_JSON}`);
  console.log(`Photos saved to ${PHOTO_DIR}`);
}

main().catch(e => { console.error(e); process.exit(1); });
