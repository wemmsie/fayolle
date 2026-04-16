import { useEffect, useRef } from 'react';
import placesData from './places-data.json';

export function PlaceModal({ place, onClose }) {
  const backdropRef = useRef(null);
  const data = placesData[place] || null;

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

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  const photoUrl = data?.photoUrl || null;

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

        {!data && <div className='modal-error'>Place not found</div>}

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
