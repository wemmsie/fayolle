import { useEffect, useRef, useState } from 'react';

const FIELD_MASK = 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos,places.websiteUri,places.googleMapsUri,places.reservable';

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

    fetch('/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textQuery: place + ', Chicago' }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((body) => { throw new Error(body?.error?.message || r.status); });
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        const p = json.places?.[0];
        if (!p) { setError('Place not found'); setLoading(false); return; }
        placeCache.set(place, p);
        setData(p);
        setLoading(false);
      })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [place]);

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const photoUrl = data?.photos?.[0]
    ? `/api/place-photo?name=${encodeURIComponent(data.photos[0].name)}`
    : null;

  const stars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  };

  const mapsLink = data?.googleMapsUri
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
              <img className='modal-photo' src={photoUrl} alt={data.displayName?.text || place} />
            ) : (
              <div className='modal-photo-placeholder'>
                <span>📍</span>
              </div>
            )}
            <div className='modal-body'>
              <h2 className='modal-name'>{data.displayName?.text || place}</h2>
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
            {data.reservable && data.websiteUri && (
              <a className='modal-directions modal-reserve' href={data.websiteUri} target='_blank' rel='noopener noreferrer'>
                Reserve a Table &rarr;
              </a>
            )}
            {data.websiteUri && (
              <a className='modal-directions' href={data.websiteUri} target='_blank' rel='noopener noreferrer'>
                Visit Website &rarr;
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
