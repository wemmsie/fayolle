import { useState, useEffect, useRef } from 'react';

const sections = [
    { id: 'details', emoji: '💃', label: 'Hi there!' },
    { id: 'schedule', emoji: '⏰', label: 'Schedule' },
    { id: 'outfit', emoji: '🦩', label: 'Dresscode' },
    { id: 'stay', emoji: '🏨', label: 'Accomodations' },
    { id: 'todo', emoji: '🗺', label: 'To Do' },
    { id: 'rsvp', emoji: '💌', label: 'RSVP' },
    { id: 'story', emoji: '💕', label: 'Our Story' },
    { id: 'registry', emoji: '🎁', label: "Honeymoon" },
];

export function ScrollNav() {
  const [active, setActive] = useState('');
  const [pastHero, setPastHero] = useState(false);
  // If the page was loaded directly at #rsvp, start hidden to avoid a flash
  // before the IntersectionObserver fires.
  const [rsvpInView, setRsvpInView] = useState(
    typeof window !== 'undefined' && window.location.hash === '#rsvp'
  );
  const isSmooth = useRef(false);

  useEffect(() => {
    const rsvpEl = document.getElementById('rsvp');
    if (!rsvpEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // No isSmooth guard here — rsvp visibility is always authoritative
        setRsvpInView(entry.isIntersecting);
      },
      { threshold: 0.3 }
    );
    observer.observe(rsvpEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setPastHero(window.scrollY > window.innerHeight * 0.5);

      const offsets = sections.map(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: Infinity };
        return { id, top: Math.abs(el.getBoundingClientRect().top + el.offsetHeight / 2 - window.innerHeight / 2) };
      });
      const closest = offsets.reduce((a, b) => (a.top < b.top ? a : b));
      setActive(closest.id);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    if (id === 'rsvp') {
      setRsvpInView(true); // hide nav immediately, don't wait for observer
    } else {
      isSmooth.current = true;
      setTimeout(() => { isSmooth.current = false; }, 1000);
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`scroll-nav ${pastHero ? 'scroll-nav-visible' : ''} ${rsvpInView ? 'scroll-nav-hidden' : ''}`}>
      {sections.map(({ id, emoji, label }) => (
        <button
          key={id}
          className={`scroll-nav-item ${active === id ? 'scroll-nav-active' : ''}`}
          onClick={() => scrollTo(id)}
          aria-label={label}
        >
          <span className='scroll-nav-emoji'>{emoji}</span>
          <span className='scroll-nav-label'>{label}</span>
        </button>
      ))}
    </nav>
  );
}
