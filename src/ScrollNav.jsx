import { useState, useEffect, useRef } from 'react';

const sections = [
    { id: 'details', emoji: '💃', label: 'Details' },
    { id: 'schedule', emoji: '⏰', label: 'Schedule' },
    { id: 'outfit', emoji: '🦩', label: 'Outfit' },
    { id: 'stay', emoji: '🏨', label: 'Stay' },
    { id: 'todo', emoji: '🗺', label: 'To Do' },
    { id: 'rsvp', emoji: '💌', label: 'RSVP' },
    { id: 'story', emoji: '💕', label: 'Story' },
    { id: 'registry', emoji: '🎁', label: "Vote" },
];

export function ScrollNav() {
  const [active, setActive] = useState('');
  const [pastHero, setPastHero] = useState(false);
  const [rsvpInView, setRsvpInView] = useState(false);
  const isSmooth = useRef(false);

  useEffect(() => {
    const rsvpEl = document.getElementById('rsvp');
    if (!rsvpEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!isSmooth.current) {
          setRsvpInView(entry.isIntersecting);
        }
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
    isSmooth.current = true;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    // Keep nav visible during smooth scroll, then let IntersectionObserver take over
    setTimeout(() => { isSmooth.current = false; }, 1000);
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
