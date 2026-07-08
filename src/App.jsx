import './global.css'
import * as image from './images';
import { funkyImages } from './images/funky';
import { useState, useRef, useCallback, useEffect } from 'react';

import { Polaroid } from './Polaroid'
import { PhotoPile } from './PhotoPile'
import { RsvpForm } from './RsvpForm'
import { PlaceModal } from './PlaceModal'
import { VenueMapModal } from './VenueMapModal'
import { ScrollNav } from './ScrollNav'
import { Squiggle } from './Squiggle'
import { OutfitPile } from './OutfitPile'

const TODO_PLACES = {
  do: [
    { name: 'Architectural Boat Tour', tag: 'activity', tip: 'See the skyline from the river', label: '⭐️ Architectural Boat Tour' },
    { name: 'Art Institute of Chicago', tag: 'museum', tip: 'World-class art collection', label: '⭐️ Art Institute Chicago' },
    { name: 'Chicago Cultural Center', tag: 'museum', tip: 'Historic landmark with art exhibits', label: 'Chicago Cultural Center' },
    { name: 'Garfield Park Conservatory', tag: 'park', tip: 'Free indoor botanical garden', label: '⭐️ Garfield Park Conservatory' },
    { name: 'Lakefront Trail', tag: 'park', tip: 'Scenic 18-mile path along Lake Michigan', label: 'Lakefront Trail' },
    { name: 'Osaka Garden at Jackson Park', tag: 'park', tip: 'Beautiful Japanese garden in the city', label: 'Osaka Garden' },
    { name: 'Peggy Notebaert Nature Museum', tag: 'museum', tip: 'Interactive exhibits and daily 2pm butterfly release', label: 'Peggy Notebaert Nature Museum' },
  ],
  eat: [
    { name: 'Akahoshi Ramen', tag: 'dinner', tip: 'Rich Japanese ramen', label: 'Akahoshi Ramen' },
    { name: 'Bang Bang Pie & Biscuits', tag: 'brunch', tip: 'Savory pies, biscuits & coffee with a stellar patio', label: '⭐️ Bang Bang Pie & Biscuits' },
    { name: 'Cozy Corner Restaurant', tag: 'brunch', tip: 'Southern comfort food', label: '⭐️ Cozy Corner' },
    // { name: "Dove's Luncheonette", tag: 'brunch', tip: 'Charming Tex-Mex diner vibes', label: "Dove's Luncheonette" },
    { name: 'Girl & The Goat', tag: 'all day', tip: 'Bold, world-famous, inventive plates', label: '⭐️ Girl & The Goat' },
    { name: 'Gretel', tag: 'all day', tip: 'Modern & casual European fare', label: 'Gretel' },
    { name: 'Loaf Lounge', tag: 'brunch', tip: 'Fresh bread, deli, killer egg sandwiches', label: 'Loaf Lounge' },
    { name: 'Lula Cafe', tag: 'all day', tip: 'Funky, inventive, farm-to-table', label: 'Lula Cafe' },
  ],
  drink: [
    { name: 'Easy Does It Bar', tag: 'drinks', tip: 'Laid-back neighborhood bar', label: '⭐️ Easy Does It' },
    { name: 'Lazybird Chicago', tag: 'drinks', tip: 'Speakeasy-style cocktails', label: 'Lazybird' },
    { name: 'The Leavitt Street Inn & Tavern', tag: 'drinks & eats', tip: 'Cozy neighborhood bar with solid food', label: 'Leavitt Street Inn' },
    { name: 'Little Victories Coffee', tag: 'drinks', tip: 'Cozy coffee & natural wine', label: 'Little Victories' },
    { name: 'Pilot Project Brewing', tag: 'drinks', tip: 'Local craft beer taproom', label: 'Pilot Project' },
    { name: 'Truce Chicago', tag: 'drinks & eats', tip: 'Specialty coffee & pastries', label: 'Truce' },
    { name: 'Welcome Back Lounge', tag: 'drinks & eats', tip: 'Retro cocktail lounge with great bites', label: 'Welcome Back Lounge' },
  ],
};

function App() {
  const [tooltip, setTooltip] = useState({ visible: false, text: '', tag: '', x: 0, y: 0 });
  const [activePlace, setActivePlace] = useState(null);
  const [activeTab, setActiveTab] = useState('do');
  const [venueMapOpen, setVenueMapOpen] = useState(false);

  const outfitImages = funkyImages;
  const desktopPageCount = Math.floor(outfitImages.length / 6);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const tooltipRef = useRef(null);
  const [outfitIndex, setOutfitIndex] = useState(0);
  const positionTip = useCallback((el, x, y) => {
    const pad = 8;
    const offset = 20;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = x - w / 2;
    let top = y + offset;
    if (left < pad) left = pad;
    if (left + w > window.innerWidth - pad) left = window.innerWidth - pad - w;
    if (top + h > window.innerHeight - pad) top = y - offset - h;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }, []);

  const handleMouseEnter = useCallback((e) => {
    const tip = e.currentTarget.dataset.tip;
    const tag = e.currentTarget.dataset.tag;
    if (!tip) return;
    setTooltip({ visible: true, text: tip, tag });
    if (tooltipRef.current) positionTip(tooltipRef.current, e.clientX, e.clientY);
  }, [positionTip]);

  const handleMouseMove = useCallback((e) => {
    if (tooltipRef.current) positionTip(tooltipRef.current, e.clientX, e.clientY);
  }, [positionTip]);

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  // Hide tooltip on scroll so it doesn't get stuck
  useEffect(() => {
    const hide = () => setTooltip(t => t.visible ? { ...t, visible: false } : t);
    window.addEventListener('scroll', hide, { passive: true });
    return () => window.removeEventListener('scroll', hide);
  }, []);

  const navigateOutfitPage = (dir) => setOutfitIndex(i => {
    const page = Math.floor(i / 6);
    const next = Math.max(0, Math.min(page + dir, desktopPageCount - 1));
    return next * 6;
  });

  const tipProps = (tag, tip) => isMobile ? {} : ({
    'data-tag': tag,
    'data-tip': tip,
    onMouseEnter: handleMouseEnter,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  });

  const placeButton = (name, tag, tip) => ({
    ...tipProps(tag, tip),
    onClick: (e) => { e.preventDefault(); setTooltip(t => ({ ...t, visible: false })); setActivePlace(name); },
  });

  // Hero arc config — adjust to reposition curved text
  // x1/x2: horizontal endpoints, baseY: where arcs start/end
  // peakY: top of curve (lower = taller arch), midX: horizontal center
  const arcs = {
    line1: { x1: 40, x2: 760, baseY: 380, peakY: 30, midX: 400 },
    line2: { x1: 120, x2: 680, baseY: 380, peakY: 130, midX: 400 },
  };

  return (
    <div className='min-h-screen'>
      <ScrollNav />
      {/* Hero */}
      <section
        className='relative h-screen flex md:pt-10! md:items-start justify-center overflow-hidden bg-black pl-0! md:pl-0!'
      >
        
        <img src={image.sparklers} alt='' className='absolute inset-0 w-full h-full object-cover object-center opacity-30 pointer-events-none' />
        <div className='relative z-10 flex items-center justify-center flex-col'>
          <svg viewBox='0 0 800 450' className='ml-5 w-[115vw] md:w-[95vw] max-w-[700px] md:max-w-[800px] mb-40 md:mb-0' style={{ fontFamily: 'var(--font-sanremo-caps)' }}>
            <defs>
              <path id='topArc' d={`M ${arcs.line1.x1},${arcs.line1.baseY} Q ${arcs.line1.midX},${arcs.line1.peakY} ${arcs.line1.x2},${arcs.line1.baseY}`} fill='none' />
              <path id='line2Arc' d={`M ${arcs.line2.x1},${arcs.line2.baseY} Q ${arcs.line2.midX},${arcs.line2.peakY} ${arcs.line2.x2},${arcs.line2.baseY}`} fill='none' />
            </defs>
            <text className='hero-title-1' textAnchor='middle' dy='-15' fill='white' fontSize='72' letterSpacing='4'>
              <textPath href='#topArc' startOffset='50%'>
                <tspan>Cody </tspan>
                <tspan fontSize='40'>and</tspan>
                <tspan> Emily</tspan>
              </textPath>
            </text>
            <text className='hero-title-2' textAnchor='middle' fill='#ff6969' fontSize='42' letterSpacing='5'>
              <textPath href='#line2Arc' startOffset='50%'>are getting married</textPath>
            </text>
          </svg>

        </div>
        <div className='confetti-container'>
          {Array.from({ length: 20 }, (_, i) => <div key={i} className='confetti-piece' />)}
        </div>
        <img src={image.overlay2} alt='' className='hero-overlay-img absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 w-[120vw] md:w-auto max-h-300 max-w-none pointer-events-none -ml-6! md:-ml-12! z-2' />
        <div className='absolute inset-0 bg-text opacity-50 z-3'></div>

         {/* <a
            href='#rsvp'
            onClick={(e) => { e.preventDefault(); document.getElementById('rsvp')?.scrollIntoView({ behavior: 'smooth' }); }}
            className='hero-rsvp-note group block no-underline rounded-xl bg-white/15 md:bg-black/30 ml-5! md:ml-10! absolute z-50 bottom-auto top-20 md:bottom-50  md:top-auto transition-all duration-200 md:hover:bg-black/40 
          
            p-6!'
          >
            <h2 className='hero-note text-white/80! tracking-wider text-xl! md:text-[22px]! text-center mb-0! transition-transform duration-200 md:group-hover:scale-[1.04]'>
              rsvp by <span className='text-white'>June 20<sup className='text-base'>th</sup></span>
              <Squiggle height={12} className='w-full text-white/80 mt-1' />
              <span className='text-sm md:text-sm text-white'>pretty please</span>
            </h2>
          </a> */}

        <div className='hero-arrow absolute bottom-5 md:bottom-20 left-1/2 -translate-x-1/2 z-10'>
          <svg
            className='w-12 h-12 md:w-18 md:h-18 animate-bounce stroke-2 md:stroke-2.5 stroke-white'
            viewBox='0 0 24 24'
            fill='none'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M12 5v14M19 12l-7 7-7-7' />
          </svg>
        </div>
      </section>

      {/* The Details */}
      <section id='details' className='block theme-blue'>
        <div className='block-inner'>
          {/* Mobile: sprawled polaroid stack */}
          <div className='md:hidden! polaroid-stack'>
            <Polaroid photo={image.usny} className='polaroid-stack-item polaroid-stack-1' />
            {/* <Polaroid photo={image.emilyparis} className='polaroid-stack-item polaroid-stack-2' />
            <Polaroid photo={image.codycafe} className='polaroid-stack-item polaroid-stack-3' /> */}
          </div>
          {/* Desktop: three overlapping polaroids */}
          <div className='hidden md:flex justify-center polaroid-spread'>
            <Polaroid photo={image.usny} className='polaroid-spread-1' />
            <Polaroid photo={image.emilyparis} className='polaroid-spread-2' />
            <Polaroid photo={image.codycafe} className='polaroid-spread-3' />
          </div>
          <div className='text-center mt-10 max-w-3xl mx-auto pl-2 md:pl-0'>
            <h1 className='pb-5'>let's do this thing!</h1>
            <p>
              Please join us in <b>Chicago</b> on <b>Saturday August 8th, 2026</b> to celebrate our marriage beneath an excessive number of disco balls (yes, really) and the ungovernable influence of actually really good espresso martinis.
            </p>
            <p>
              We've got a snazzy menu and a groovy playlist coming together, plus plenty of tips for things to do and places to stay while you're here.</p>

              <p>Get ready for one heck of a weekend - hope to see you there!
            </p>
          </div>
        </div>
      </section>

      {/* Wedding Day */}
      <section id='schedule' className='block theme-cream wedding-day'>
        <div className='block-inner'>
          <div className='text-center mb-10 pl-2 md:pl-0'>
            <h1>when we party</h1>
            <p>
              We got you covered for the whole event in one place. Limited lot <a className='button px-3! py-1! -my-0.5! leading-5 md:leading-8 mx-0!' href='#' onClick={(e) => { e.preventDefault(); setVenueMapOpen(true); }}>parking</a> is available next door with additional street parking just outside, and signs will guide you where you need to go.</p>
            <div className='flex flex-col items-center md:flex-row md:justify-center md:gap-0 md:flex-wrap'>
                <p className="m-0!">Please join us at the <a className='button px-3! py-1! leading-5 md:leading-8 mx-1! -my-0.5!' href='#' {...placeButton('Greenhouse Loft', '', '2545 W Diversey Ave, Chicago, IL 60647')}>Greenhouse Loft</a>
                anytime after 3:30pm 💕</p>
              </div>
{/* <p className='p-3 text-[14px]! opacity-50 max-w-80! bg-primary/10 rounded-xl mt-5!'>Yes, things have been slightly tweaked since you got that invitation, but rest assured, it's all pretty much the same!</p> */}

          </div>
          <div className='timeline max-w-xl mx-auto'>
            <div className='timeline-item'>
              <span className='timeline-time'>4:00<span className='ish'>ish</span></span>
              <div>
                <span className='timeline-event'>Ceremony</span>
                <span className='timeline-detail'>Short and sweet</span>
              </div>
            </div>
            <div className='timeline-item'>
              <span className='timeline-time'>4:30</span>
              <div>
                <span className='timeline-event'>Cocktail Hour</span>
                <span className='timeline-detail'>Bites and drinks</span>
              </div>
            </div>
            <div className='timeline-item'>
              <span className='timeline-time'>6:00</span>
              <div>
                <span className='timeline-event'>Dinner</span>
                <span className='timeline-detail'>With a late night snack</span>
              </div>
            </div>
            <div className='timeline-item'>
              <span className='timeline-time'>7:00</span>
              <div>
                <span className='timeline-event'>Party</span>
                <span className='timeline-detail'>Till midnight 🕺✨</span>
              </div>
            </div>
          </div>
          {/* <img src={image.wine} alt='' className='wedding-day-img' /> */}
        </div>
      </section>

      {/* Outfit Inspiration */}
      <section id='outfit' className='block theme-cream overflow-x-clip md:pl-8! overflow-y-visible!'>
        <div className='block-inner text-center relative'>

          {/* Desktop: scattered collage — all 6 swap per page */}
          <div className='hidden md:block'>
            <div key={`l1-${outfitIndex}`} className='funky-img funky-left-1 outfit-img-anim'><img src={outfitImages[outfitIndex % outfitImages.length]} alt='' /></div>
            <div key={`l2-${outfitIndex}`} className='funky-img funky-left-2 outfit-img-anim'><img src={outfitImages[(outfitIndex + 1) % outfitImages.length]} alt='' /></div>
            <div key={`l3-${outfitIndex}`} className='funky-img funky-left-3 outfit-img-anim'><img src={outfitImages[(outfitIndex + 2) % outfitImages.length]} alt='' /></div>
            <div key={`r1-${outfitIndex}`} className='funky-img funky-right-1 outfit-img-anim'><img src={outfitImages[(outfitIndex + 3) % outfitImages.length]} alt='' /></div>
            <div key={`r2-${outfitIndex}`} className='funky-img funky-right-2 outfit-img-anim'><img src={outfitImages[(outfitIndex + 4) % outfitImages.length]} alt='' /></div>
            <div key={`r3-${outfitIndex}`} className='funky-img funky-right-3 outfit-img-anim'><img src={outfitImages[(outfitIndex + 5) % outfitImages.length]} alt='' /></div>
          </div>

          {/* Text card */}
          <div className='relative z-10 max-w-lg mx-auto bg-blue rounded-2xl px-8 py-10 pb-20'>
            <h1 className='text-white!'>what to wear</h1>
            <p>
            Bring the <b>color</b>. Bring the <b>prints</b>. Bring the outfit you've been waiting for an excuse to wear!</p>
             <p>Vintage treasures, bold colors, modern statements, maximalist masterpieces... it's all fair game. If it sparks joy, it's probably perfect.</p>
              <p>
                Just make sure you can comfortably eat, drink, and dance in it. We definitely have plans for all three.
              </p>
              <p>
                The ceremony and cocktail hour will be shaded outdoors before the evening moves inside. Expect a warm Chicago summer day <span className='font-bold text-[#4a8ab5]'>↓65°</span> <span className='font-bold text-[#d54444]'>82°F↑</span> and bring a layer if you tend to run cold.
            </p>
          </div>

          {/* Mobile: draggable print stack */}
          <div className='md:hidden -mt-15 z-20 relative'>
            <OutfitPile images={outfitImages} />
          </div>

          {/* Desktop arrows — 1 group of 6 at a time, no repeats */}
          <div className='outfit-arrows hidden md:flex'>
            <button className='outfit-arrow' onClick={() => navigateOutfitPage(-1)} aria-label='Previous' disabled={outfitIndex === 0}>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className='w-5 h-5'><path d='M15 18l-6-6 6-6'/></svg>
            </button>
            <span className='outfit-counter'>{Math.floor(outfitIndex / 6) + 1} / {desktopPageCount}</span>
            <button className='outfit-arrow' onClick={() => navigateOutfitPage(1)} aria-label='Next' disabled={Math.floor(outfitIndex / 6) >= desktopPageCount - 1}>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className='w-5 h-5'><path d='M9 18l6-6-6-6'/></svg>
            </button>
          </div>

        </div>
      </section>

      {/* Accommodations */}
      <section id='stay' className='block theme-pink'>
        <div className='block-inner text-center pl-2 md:pl-0'>
          <h1>where to stay</h1>
          <p>
            We've got a hitched code for <a href='https://booking.thehoxton.com/en-us/availability?_gl=1*1c1cf6w*_gcl_au*MTg2ODA4OTA0OS4xNzc1OTMwNTMyLjE5NzE0MjQ3MzUuMTc3NTkzMDU4OS4xNzc1OTMwNTg5*_ga*MjQ2Njc2ODA3LjE3NzU5MzA1MzI.*_ga_F7XM2Q5ZRS*czE3NzU5MzA1MzIkbzEkZzEkdDE3NzU5MzA1OTAkajIkbDAkaDc3MDE4MzY3OQ..&checkin=2026-08-07&checkout=2026-08-09&hotelCode=hoxton.chicago-chicago&modifySearch=false&rateCode=HITCHED826&rooms%5B0%5D.adults=2&rooms%5B0%5D.children=0&rooms-total=1'>10% off at the Hoxton Hotel</a> as well as a few other local suggestions. We recommend booking early, as hotels in the area tend to fill up quickly in August. If you have any questions or need help finding accommodations, please don't hesitate to reach out!
          </p>
          <div className='flex flex-col md:flex-row gap-6 md:gap-10 justify-center mt-8'>
            <div className='flex-1'>
              <h2>Hoxton Hotel</h2>
              <p className='sub'>$395 per night</p>
              <p>
                1816 N Clark St, Chicago, IL 60614
                <br />
                (312) 787-5040
              </p>
              <a target="_blank" href='https://booking.thehoxton.com/en-us/availability?_gl=1*1c1cf6w*_gcl_au*MTg2ODA4OTA0OS4xNzc1OTMwNTMyLjE5NzE0MjQ3MzUuMTc3NTkzMDU4OS4xNzc1OTMwNTg5*_ga*MjQ2Njc2ODA3LjE3NzU5MzA1MzI.*_ga_F7XM2Q5ZRS*czE3NzU5MzA1MzIkbzEkZzEkdDE3NzU5MzA1OTAkajIkbDAkaDc3MDE4MzY3OQ..&checkin=2026-08-07&checkout=2026-08-09&hotelCode=hoxton.chicago-chicago&modifySearch=false&rateCode=HITCHED826&rooms%5B0%5D.adults=2&rooms%5B0%5D.children=0&rooms-total=1' className='button'>Book Here</a>
            </div>
            <div className='flex-1'>
              <h2>AirBnb</h2>
              <p className='sub'>$150+ per night</p>
              <p>
                Great for groups, extra room to spread out, and a more local Chicago experience
              </p>
              <a target="_blank" href='https://www.airbnb.com/s/Chicago--IL-60614/homes?place_id=ChIJdac44t_SD4gRL9bi_zU8js8&refinement_paths%5B%5D=%2Fhomes&checkin=2026-08-07&checkout=2026-08-09&date_picker_type=calendar&adults=2&guests=2&search_type=filter_change&query=Chicago%2C%20IL%2060614&flexible_trip_lengths%5B%5D=one_week&monthly_start_date=2026-07-01&monthly_length=3&monthly_end_date=2026-10-01&search_mode=regular_search&price_filter_input_type=2&price_filter_num_nights=2&channel=EXPLORE&ne_lat=41.95343166932318&ne_lng=-87.64677800134609&sw_lat=41.891333087528324&sw_lng=-87.72329628523414&zoom=13.878752450280736&zoom_level=13&search_by_map=true&price_max=600&selected_filter_order%5B%5D=price_max%3A600&update_selected_filters=true' className='button'>Book Here</a>
            </div>
            <div className='flex-1'>
              <h2>More hotels</h2>
              <p className='sub'>$250+ per night</p>
              <p>
               Prefer a traditional hotel stay? Browse additional options nearby
              </p>
              <a target="_blank" href='https://www.booking.com/searchresults.html?label=gen173nr-1FCAEoggI46AdIM1gEaLsBiAEBmAEJuAEHyAEM2AEB6AEB-AECiAIBqAIEuAKWjZCMBs&aid=304142&ss=Bucktown&ssne=Bucktown&ssne_untouched=Bucktown&lang=en-us&src=searchresults&dest_id=11114&dest_type=district&checkin=2026-08-07&checkout=2026-08-09&group_adults=2&no_rooms=1&group_children=0&chal_t=1776450816100&force_referer=https%3A%2F%2Ffayolle.com%2F&nflt=price%3DUSD-min-400-1' className='button'>Book Here</a>
            </div>

          </div>
        </div>
      </section>

      {/* Things to Do */}
      <section id='todo' className='block theme-cream to-do'>
        <div className='block-inner text-center pl-2 md:pl-0'>
          <h1 className=''>what to do</h1>
          <p>
            Want to make a weekend of it? Chicago has no shortage of things to do, and we're happy to give recommendations.
          </p>

          {/* Mobile: tappable tabs */}
          <div className='md:hidden mt-8'>
            <div className='todo-tabs'>
              <button className={`todo-tab ${activeTab === 'do' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('do')}>Do</button>
              <button className={`todo-tab ${activeTab === 'eat' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('eat')}>Eat</button>
              <button className={`todo-tab ${activeTab === 'drink' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('drink')}>Drink</button>
            </div>
            <div className='todo-tab-content'>
              {activeTab === 'do' && <div className='tab'>{TODO_PLACES.do.map(p => (
                <a key={p.name} className='button' href='#' {...placeButton(p.name, p.tag, p.tip)}>{p.label}</a>
              ))}</div>}
              {activeTab === 'eat' && <div className='tab'>{TODO_PLACES.eat.map(p => (
                <a key={p.name} className='button' href='#' {...placeButton(p.name, p.tag, p.tip)}>{p.label}</a>
              ))}</div>}
              {activeTab === 'drink' && <div className='tab'>{TODO_PLACES.drink.map(p => (
                <a key={p.name} className='button' href='#' {...placeButton(p.name, p.tag, p.tip)}>{p.label}</a>
              ))}</div>}
            </div>
          </div>

          {/* Desktop: three columns */}
          <div className='hidden md:flex gap-4 justify-between mt-8'>
            <div className='tab'><h2>Do</h2>{TODO_PLACES.do.map(p => (
              <a key={p.name} className='button' href='#' {...placeButton(p.name, p.tag, p.tip)}>{p.label}</a>
            ))}</div>
            <div className='tab'><h2>Eat</h2>{TODO_PLACES.eat.map(p => (
              <a key={p.name} className='button' href='#' {...placeButton(p.name, p.tag, p.tip)}>{p.label}</a>
            ))}</div>
            <div className='tab'><h2>Drink</h2>{TODO_PLACES.drink.map(p => (
              <a key={p.name} className='button' href='#' {...placeButton(p.name, p.tag, p.tip)}>{p.label}</a>
            ))}</div>
          </div>
        </div>
      </section>

      {/* RSVP */}
      <section id='rsvp' className='theme-blue pl-6! md:pl-22! px-6! md:px-10! pt-[7vh]! md:pt-[15vh] pb-16 max-h-300 h-full min-h-screen'>
        <div className='block-inner w-full'>
          <div className='form-container relative max-w-2xl mx-auto w-full'>
            <RsvpForm onOpenPlace={setActivePlace} />
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section id='story' className='block theme-cream'>
        <div className='block-inner block-split'>
          <div className='block-media md:w-2/5!'>
            <div className='strip-pile'>
              <img
                src={image.strip1}
                alt='Photo strip of us'
                className='photo-strip strip-1'
              />
              <img
                src={image.strip2}
                alt='Photo strip of us'
                className='photo-strip strip-2'
              />
            </div>
          </div>
          <div className='block-copy text-left pl-5 md:p-0 md:w-3/5!'>
            <h1 className='md:pl-2'>our story</h1>
            <p>
              In this modern age of love, one often finds themselves woefully lost in the world of dating apps. While many of these stories end in disaster, Cody and Emily are proof that people can actually find love online.
</p>
            <p>
              It all started in November of 2024 when a few cheeky frog puns quickly leapt into late-night conversations, trading playlists, and countless home-cooked meals. They were inseparable. Ten days later, they threw caution to the wind and exchanged “I love you”s.
</p>
            {/* <p>
With Christmas right around the corner, Cody did the only reasonable thing imaginable - he invited the girl he met just two weeks prior to drive six hours to Michigan and spend the holiday with his family. The two lovebirds knew it was a bit insane, but to them, it just made sense. To no one's surprise, Emily quickly won over the Fayolle family with her deft cooking abilities and charm.
</p> */}
            <p>
Their love felt effortless and only grew from there. Much of 2025 was spent in each other's company. Attending concerts, traveling to new places, petting cats, cozy gaming, and even tattooing each other - all with the biggest grins on their faces.
</p>
            <p>
It was only a matter of time before Cody popped the question. Almost exactly one year after they met, the two took a trip to France for a family wedding. You know, were Paris is? The city of love?! Cody seized the moment along a romantic, lantern-lit path to drop to one knee.
</p>
            <p>
Emily and Cody could not be more thrilled to officially tie the knot this August in Chicago. Come ready to dance, eat, and celebrate these two lovely dummies.
            </p>
          </div>
        </div>
      </section>

      {/* Registry */}
      <section id='registry' className='block theme-red'>
        <div className='block-inner block-split'>
          <div className='block-copy text-center md:text-left pl-2 md:pl-0 pr-4'>
            <h1>adventure awaits</h1>
            <p>We've skipped the registry - our home (and hearts) are already full. This party is about celebrating with the people we love most.</p>
            <p className='max-w-60! md:max-w-80! md:ml-0!'>Having you here means <b>everything</b> to us!</p>
            <Squiggle height={12} className='w-1/3 my-4 mx-auto md:mx-0 text-white/40' />
              <p>
              As our own gift to each other, we'll be setting off on an extended honeymoon.
              </p>
              <p>
                For anyone who just can't help themselves, you're welcome to cast a vote with a contribution toward our trip. Whichever spot gets the most love will be our destination. 💕
            </p>
            <a target="_blank" rel="noopener noreferrer" href='https://www.zola.com/registry/emilyandcodyaugust8' className='button m-0! px-4!'>Contribute to Our Honeymoon</a>
          </div>
          <div className='block-media'>
            {/* Mobile: swipeable card stack */}
            <div className='md:hidden w-full'>
              <PhotoPile photos={[image.italy1, image.japan1, image.italy2, image.japan2]} />
            </div>
            {/* Desktop: tossed disposable camera prints */}
            <div className='hidden md:block'>
              <div className='print-pile'>
                <div className='print print-1'>
                  <img src={image.italy1} alt='Italy' />
                </div>
                <div className='print print-2'>
                  <img src={image.japan1} alt='Japan' />
                </div>
                <div className='print print-3'>
                  <img src={image.italy2} alt='Italy' />
                </div>
                <div className='print print-4'>
                  <img src={image.japan2} alt='Japan' />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>





      {tooltip.visible && (
        <div
          ref={tooltipRef}
          className={`tip tip-${tooltip.tag.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`}
        >
          {tooltip.tag && <span className='tip-tag'>{tooltip.tag}</span>}
          <span className='tip-desc'>{tooltip.text}</span>
        </div>
      )}

      {venueMapOpen && (
        <VenueMapModal onClose={() => setVenueMapOpen(false)} />
      )}

      {activePlace && (
        <PlaceModal place={activePlace} onClose={() => setActivePlace(null)} />
      )}
    </div>
  );
}

export default App
