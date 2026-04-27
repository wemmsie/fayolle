import { useEffect, useRef } from 'react';

const PARKING = {
  name: 'Greenhouse Loft Parking',
  address: '2757 N Maplewood Ave, Chicago, IL',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=2757+N+Maplewood+Ave+Chicago+IL',
};

// Walking directions embed — no API key needed
const MAP_EMBED_URL =
  'https://maps.google.com/maps?saddr=2757+N+Maplewood+Ave,+Chicago,+IL&daddr=2545+W+Diversey+Ave,+Chicago,+IL+60647&dirflg=w&z=18&output=embed';

const DIRECTIONS_URL =
  'https://www.google.com/maps/dir/2757+N+Maplewood+Ave,+Chicago,+IL+60647/Greenhouse+Loft,+2545+W+Diversey+Ave,+Chicago,+IL+60647/@41.9318778,-87.692429,18.72z/data=!3m1!5s0x880fd262bf753123:0x2f1256c785bf108c!4m14!4m13!1m5!1m1!1s0x880fd28696fb708d:0xf6b1bc90d1c9c672!2m2!1d-87.691215!2d41.932025!1m5!1m1!1s0x880fd286af24ba35:0xaf3364d8884012b1!2m2!1d-87.6921749!2d41.9319165!3e2?entry=ttu&g_ep=EgoyMDI2MDQyMi4wIKXMDSoASAFQAw%3D%3D';

export function VenueMapModal({ onClose }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
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

  return (
    <div className='modal-backdrop' ref={backdropRef} onClick={handleBackdropClick}>
      <div className='modal-content venue-map-modal'>
        <button className='modal-close' onClick={onClose} aria-label='Close'>&times;</button>

        <div className='venue-map-iframe-wrap'>
          <iframe
            className='venue-map-iframe'
            src={MAP_EMBED_URL}
            title='Walking directions to venue'
            loading='lazy'
            referrerPolicy='no-referrer-when-downgrade'
            allowFullScreen
          />
        </div>

        <div className='modal-body'>
          <h2 className='modal-name pb-2'>Parking</h2>
          <a
            className='venue-map-card'
            href={PARKING.mapsUrl}
            target='_blank'
            rel='noopener noreferrer'
          >
            <span className='venue-map-icon'>🅿️</span>
            <div>
              <span className='venue-map-card-name'>{PARKING.name}</span>
              <span className='venue-map-card-addr'>{PARKING.address}</span>
            </div>
          </a>
        </div>

        <a className='modal-directions' href={DIRECTIONS_URL} target='_blank' rel='noopener noreferrer'>
          Open Walking Directions in Google Maps &rarr;
        </a>
      </div>
    </div>
  );
}
