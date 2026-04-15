import { useEffect, useRef, useState } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Google Maps bootstrap loader — sets up google.maps.importLibrary (runs once)
((g) => {
  var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary",
    q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {});
  var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams,
    u = () => h || (h = new Promise(async (f, n) => {
      await (a = m.createElement("script"));
      e.set("libraries", [...r] + "");
      for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
      e.set("callback", c + ".maps." + q);
      a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
      d[q] = f; a.onerror = () => h = n(Error(p + " could not load."));
      a.nonce = m.querySelector("script[nonce]")?.nonce || "";
      m.head.append(a);
    }));
  d[l] ? console.warn(p + " only loads once. Ignoring:", g)
    : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
})({ key: API_KEY, v: "weekly" });

// Cache persists across modal open/close for the entire session
const placeCache = new Map();

export function PlaceModal({ place, onClose }) {
  const backdropRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Return cached result immediately if available
    if (placeCache.has(place)) {
      setData(placeCache.get(place));
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { Place } = await google.maps.importLibrary('places');
        const { places } = await Place.searchByText({
          textQuery: place + ', Chicago',
          fields: ['displayName', 'formattedAddress', 'rating', 'userRatingCount',
                   'photos', 'websiteURI', 'googleMapsURI'],
          maxResultCount: 1,
        });
        if (cancelled) return;
        const p = places?.[0];
        if (!p) { setError('Place not found'); setLoading(false); return; }
        // reservable isn't supported in searchByText — fetch it separately
        try { await p.fetchFields({ fields: ['reservable'] }); } catch (_) {}
        placeCache.set(place, p);
        setData(p);
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [place]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const photoUrl = data?.photos?.[0]
    ? data.photos[0].getURI({ maxHeight: 600 })
    : null;

  const stars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  };

  const mapsLink = data?.googleMapsURI
    || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place + ', Chicago')}`;

  return (
    <div className='modal-backdrop' ref={backdropRef} onClick={handleBackdropClick}>
      <div className='modal-content'>
        <button className='modal-close' onClick={onClose} aria-label='Close'>&times;</button>

        {loading && <div className='modal-loading'>Loading…</div>}
        {error && <div className='modal-error'>{error}</div>}

        {data && (
          <>
            {photoUrl ? (
              <img className='modal-photo' src={photoUrl} alt={data.displayName || place} />
            ) : (
              <div className='modal-photo-placeholder'>
                <span>📍</span>
              </div>
            )}
            <div className='modal-body'>
              <h2 className='modal-name'>{data.displayName || place}</h2>
              {data.rating != null && (
                <div className='modal-rating'>
                  <span className='modal-stars'>{stars(data.rating)}</span>
                  <span className='modal-rating-num'>{data.rating}</span>
                  {data.userRatingCount != null && (
                    <span className='modal-review-count'>({data.userRatingCount.toLocaleString()})</span>
                  )}
                </div>
              )}
              {data.formattedAddress && (
                <p className='modal-address'>{data.formattedAddress}</p>
              )}
            </div>
            <a className='modal-directions' href={mapsLink} target='_blank' rel='noopener noreferrer'>
              Open in Google Maps &rarr;
            </a>
            {data.reservable && data.websiteURI && (
              <a className='modal-directions modal-reserve' href={data.websiteURI} target='_blank' rel='noopener noreferrer'>
                Reserve a Table &rarr;
              </a>
            )}
            {data.websiteURI && (
              <a className='modal-directions' href={data.websiteURI} target='_blank' rel='noopener noreferrer'>
                Visit Website &rarr;
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
