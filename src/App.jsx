import './global.css'
import * as image from './images';
import { useState, useRef, useCallback } from 'react';

import { Polaroid } from './Polaroid'
import { PhotoPile } from './PhotoPile'
import { RsvpForm } from './RsvpForm'
import { PlaceModal } from './PlaceModal'
import { ScrollNav } from './ScrollNav'

function App() {
  const [tooltip, setTooltip] = useState({ visible: false, text: '', tag: '', x: 0, y: 0 });
  const [activePlace, setActivePlace] = useState(null);
  const [activeTab, setActiveTab] = useState('do');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const funkyDesktop = [image.funky2, image.funky3, image.funky5, image.funky6, image.funky7, image.funky8];
  const funkyGalleryOnly = [
    image.funky10, image.funky11, image.funky12, image.funky13, image.funky14,
    image.funky15, image.funky16, image.funky17, image.funky18,
  ];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const funkyPhotos = isMobile ? [...funkyDesktop, ...funkyGalleryOnly] : funkyGalleryOnly;
  const tooltipRef = useRef(null);

  const handleMouseEnter = useCallback((e) => {
    const tip = e.currentTarget.dataset.tip;
    const tag = e.currentTarget.dataset.tag;
    if (!tip) return;
    setTooltip({ visible: true, text: tip, tag });
    if (tooltipRef.current) {
      tooltipRef.current.style.left = e.clientX + 'px';
      tooltipRef.current.style.top = e.clientY + 'px';
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (tooltipRef.current) {
      tooltipRef.current.style.left = e.clientX + 'px';
      tooltipRef.current.style.top = e.clientY + 'px';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  const tipProps = (tag, tip) => ({
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
        className='relative h-screen flex items-center justify-center overflow-hidden bg-black pl-0! md:pl-0!'
      >
        <img src={image.sparklers} alt='' className='absolute inset-0 w-full h-full object-cover object-center opacity-30 pointer-events-none' />
        <div className='relative z-10 flex items-center justify-center'>
          <svg viewBox='0 0 800 450' className='ml-3 w-[115vw] md:w-[95vw] max-w-[700px] md:max-w-[800px] mb-40 md:mb-0' style={{ fontFamily: 'var(--font-sanremo-caps)' }}>
            <defs>
              <path id='topArc' d={`M ${arcs.line1.x1},${arcs.line1.baseY} Q ${arcs.line1.midX},${arcs.line1.peakY} ${arcs.line1.x2},${arcs.line1.baseY}`} fill='none' />
              <path id='line2Arc' d={`M ${arcs.line2.x1},${arcs.line2.baseY} Q ${arcs.line2.midX},${arcs.line2.peakY} ${arcs.line2.x2},${arcs.line2.baseY}`} fill='none' />
            </defs>
            <text textAnchor='middle' dy='-15' fill='white' fontSize='72' letterSpacing='4'>
              <textPath href='#topArc' startOffset='50%'>
                <tspan>Cody </tspan>
                <tspan fontSize='40'>and</tspan>
                <tspan> Emily</tspan>
              </textPath>
            </text>
            <text textAnchor='middle' fill='#ff6969' fontSize='42' letterSpacing='5'>
              <textPath href='#line2Arc' startOffset='50%'>are getting married</textPath>
            </text>
          </svg>
        </div>
        <img src={image.overlay2} alt='' className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/3 max-h-300 w-auto pointer-events-none -ml-8!' />
        <div className='absolute inset-0 bg-text opacity-50'></div>
        <div className='absolute bottom-1/4 md:bottom-20 left-1/2 -translate-x-1/2 z-10'>
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
          {/* Mobile: swipeable card stack */}
          <div className='md:hidden'>
            <PhotoPile photos={[image.usny, image.emilyparis, image.codycafe]} />
          </div>
          {/* Desktop: three overlapping polaroids */}
          <div className='hidden md:flex justify-center polaroid-spread'>
            <Polaroid photo={image.usny} className='polaroid-spread-1' />
            <Polaroid photo={image.emilyparis} className='polaroid-spread-2' />
            <Polaroid photo={image.codycafe} className='polaroid-spread-3' />
          </div>
          <div className='text-center mt-10 max-w-2xl mx-auto pl-2 md:pl-0'>
            <h1>let's do this thing</h1>
            <p>
              We heard that getting married was the perfect opportunity to throw a big party with all of our favorite people...
            </p>
            <p>
              So please do us the honor of joining us in <b>Chicago</b> on <b>August 8th, 2026</b> to celebrate with us beneath an excessive number of disco balls (yes, really) and the ungovernable influence of actually really good espresso martinis.
            </p>
            <p>
              We've got tips for hotels, things to do, and of course a killer playlist in the works, so get ready for a weekend to remember.</p>
                          <br/>
              <p>We hope to see you there!
            </p>
          </div>
        </div>
      </section>

      {/* Wedding Day */}
      <section id='schedule' className='block theme-cream wedding-day'>
        <div className='block-inner'>
          <div className='text-center mb-10 pl-2 md:pl-0'>
            <h1>times at which we party</h1>
            <p>
              We got you covered for the whole event in one place. Parking is available on-site and signs will guide you where you need to go.</p>
              <div className='flex flex-col items-center md:flex-row md:justify-center md:gap-0 md:flex-wrap'>
                <p className="m-0!">Please join us at the</p>
                <a className='button px-3! py-1! leading-5 md:leading-8' href='#' {...placeButton('Greenhouse Loft', '', '2545 W Diversey Ave, Chicago, IL 60647')}>Greenhouse Loft</a>
                <p className="m-0!">anytime after 3 PM!</p>
              </div>


          </div>
          <div className='timeline max-w-xl mx-auto'>
            <div className='timeline-item'>
              <span className='timeline-time'>4:00</span>
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
              <span className='timeline-time'>5:30</span>
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
      <section id='outfit' className='block theme-cream overflow-x-clip pl-8! overflow-y-visible!'>
        <div className='block-inner text-center relative'>
          {/* Scattered collage — left side */}
          <div className='funky-img funky-left-1' onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}><img src={image.funky2} alt='' /></div>
          <div className='funky-img funky-left-2' onClick={() => { setGalleryIndex(2); setGalleryOpen(true); }}><img src={image.funky5} alt='' /></div>
          <div className='funky-img funky-left-3' onClick={() => { setGalleryIndex(5); setGalleryOpen(true); }}><img src={image.funky8} alt='' /></div>

          {/* Scattered collage — right side */}
          <div className='funky-img funky-right-1' onClick={() => { setGalleryIndex(1); setGalleryOpen(true); }}><img src={image.funky3} alt='' /></div>
          <div className='funky-img funky-right-2' onClick={() => { setGalleryIndex(3); setGalleryOpen(true); }}><img src={image.funky6} alt='' /></div>
          <div className='funky-img funky-right-3' onClick={() => { setGalleryIndex(4); setGalleryOpen(true); }}><img src={image.funky7} alt='' /></div>

          <div className='relative z-10 max-w-lg mx-auto bg-blue rounded-2xl px-8 py-10'>
            <h1 className='text-white!'>what to wear</h1>
            <p>
              Think <b>funky cocktail</b> - Harry Styles at a garden party meets your coolest aunt at a disco. Bold colors, wild prints, and shoes you can actually dance in.
            </p>
            <p>
              Most importantly, be comfortable. The ceremony and cocktail hour are shaded outdoors, then the evening moves inside. So dress for a warm Chicago summer day (<span className='font-bold text-[#4a8ab5]'>↓65°</span> <span className='font-bold text-[#d54444]'>82°F↑</span>) and bring a layer if you run cold!
            </p>
            <button className='button mt-4' onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}>See More Inspo</button>
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
              <h2>Leavitt Street Inn</h2>
              <p className='sub'>$306 per night</p>
              <p>
                2345 N Leavitt St, Chicago, IL 60647
                <br />
                (773) 799-8093
              </p>
              <a target="_blank" href='https://via.eviivo.com/TheLeavittStreetInn60647?noofrooms=1&startDate=2026-08-07&endDate=2026-08-09&pce=&adults1=2&children1=0' className='button'>Book Here</a>
            </div>
            <div className='flex-1'>
              <h2>More Hotels</h2>
              <p className='sub'>$250+ per night</p>
              <p>
                More options in the neighborhood at filterable price ranges
              </p>
              <a target="_blank" href='https://www.booking.com/searchresults.html?ss=Bucktown&ssne=Bucktown&ssne_untouched=Bucktown&label=gen173nr-1FCAEoggI46AdIM1gEaLsBiAEBmAEJuAEHyAEM2AEB6AEB-AECiAIBqAIEuAKWjZCMBs&aid=304142&lang=en-us&sb=1&src_elem=sb&src=searchresults&dest_id=11114&dest_type=district&checkin=2026-08-07&checkout=2026-08-09&group_adults=2&no_rooms=1&group_children=0' className='button'>Book Here</a>
            </div>

          </div>
        </div>
      </section>

      {/* Things to Do */}
      <section id='todo' className='block theme-cream to-do'>
        <div className='block-inner text-center pl-2 md:pl-0'>
          <h1 className=''>things to do</h1>
          <p>
            Want to make a weekend of it? Chicago has no shortage of things to do, and we're happy to give recommendations! Check out our list for a few of our favorite places around the city.
          </p>

          {(() => {
            const places = {
              do: [
                { name: 'Lakefront Trail', tag: 'park', tip: 'Scenic 18-mile path along Lake Michigan', label: 'Lakefront Trail' },
                { name: 'Architectural Boat Tour', tag: 'activity', tip: 'See the skyline from the river', label: 'Architectural Boat Tour' },
                { name: 'Garfield Park Conservatory', tag: 'park', tip: 'Free indoor botanical garden', label: 'Garfield Park Conservatory' },
                { name: 'Art Institute of Chicago', tag: 'museum', tip: 'World-class art collection', label: 'Art Institute Chicago' },
                { name: 'Chicago Cultural Center', tag: 'museum', tip: 'Historic landmark with art exhibits', label: 'Chicago Cultural Center' },
                { name: 'Peggy Notebaert Nature Museum', tag: 'museum', tip: 'Interactive exhibits and daily 2pm butterfly release', label: 'Peggy Notebaert Nature Museum' },
                { name: 'Osaka Garden at Jackson Park', tag: 'park', tip: 'Beautiful Japanese garden in the city', label: 'Osaka Garden' },
              ],
              eat: [
                { name: 'Cozy Corner Restaurant', tag: 'brunch', tip: 'Southern comfort food', label: 'Cozy Corner' },
                { name: 'Bang Bang Pie & Biscuits', tag: 'brunch', tip: 'Savory pies, biscuits & coffee', label: 'Bang Bang Pie & Biscuits' },
                { name: 'Loaf Lounge', tag: 'brunch', tip: 'Fresh bread, deli, killer egg sandwiches', label: 'Loaf Lounge' },
                { name: 'Lula Cafe', tag: 'all day', tip: 'Funky, inventive, farm-to-table', label: 'Lula Cafe' },
                { name: 'Girl & The Goat', tag: 'all day', tip: 'Bold, world-famous, inventive plates', label: 'Girl & The Goat' },
                { name: 'Akahoshi Ramen', tag: 'dinner', tip: 'Rich Japanese ramen', label: 'Akahoshi Ramen' },
                { name: "Dove's Luncheonette", tag: 'brunch', tip: 'Charming Tex-Mex diner vibes', label: "Dove's Luncheonette" },
                { name: 'Gretel', tag: 'all day', tip: 'Modern & casual European fare', label: 'Gretel' },
              ],
              drink: [
                { name: 'Little Victories Coffee', tag: 'drink', tip: 'Cozy coffee & natural wine', label: 'Little Victories' },
                { name: 'Truce Chicago', tag: 'drink', tip: 'Specialty coffee & pastries', label: 'Truce' },
                { name: 'Lazybird Chicago', tag: 'drink', tip: 'Speakeasy-style cocktails', label: 'Lazybird' },
                { name: 'Pilot Project Brewing', tag: 'drink', tip: 'Local craft beer taproom', label: 'Pilot Project' },
                { name: 'Easy Does It Bar', tag: 'drink', tip: 'Laid-back neighborhood bar', label: 'Easy Does It' },
                { name: 'Welcome Back Lounge', tag: 'drink', tip: 'Retro cocktail lounge', label: 'Welcome Back Lounge' },
              ],
            };
            const PlaceList = ({ items }) => items.map(p => (
              <a key={p.name} className='button' href='#' {...placeButton(p.name, p.tag, p.tip)}>{p.label}</a>
            ));
            return (<>
              {/* Mobile: tappable tabs */}
              <div className='md:hidden mt-8'>
                <div className='todo-tabs'>
                  <button className={`todo-tab ${activeTab === 'do' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('do')}>Do</button>
                  <button className={`todo-tab ${activeTab === 'eat' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('eat')}>Eat</button>
                  <button className={`todo-tab ${activeTab === 'drink' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('drink')}>Drink</button>
                </div>
                <div className='todo-tab-content'>
                  {activeTab === 'do' && <div className='tab'><PlaceList items={places.do} /></div>}
                  {activeTab === 'eat' && <div className='tab'><PlaceList items={places.eat} /></div>}
                  {activeTab === 'drink' && <div className='tab'><PlaceList items={places.drink} /></div>}
                </div>
              </div>

              {/* Desktop: three columns */}
              <div className='hidden md:flex gap-4 justify-between mt-8'>
                <div className='tab'><h2>Do</h2><PlaceList items={places.do} /></div>
                <div className='tab'><h2>Eat</h2><PlaceList items={places.eat} /></div>
                <div className='tab'><h2>Drink</h2><PlaceList items={places.drink} /></div>
              </div>
            </>);
          })()}
        </div>
      </section>

      {/* RSVP */}
      <section id='rsvp' className='block theme-blue pl-6! md:pl-22!'>
        <div className='block-inner'>
          <div className='form-container relative max-w-2xl mx-auto'>
            <RsvpForm />
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
              It all started in November of 2025 when a few cheeky frog puns quickly leapt into late-night conversations, trading playlists, and countless home-cooked meals. They were inseparable. Ten days later, they threw caution to the wind and exchanged “I love you”s.
</p>
            {/* <p>
With Christmas right around the corner, Cody did the only reasonable thing imaginable - he invited the girl he met just two weeks prior to drive six hours to Michigan and spend the holiday with his family. To his luck, she graciously accepted. The two lovebirds knew it was a bit insane, but to them, it just made sense. To no one's surprise, Emily quickly won over the Fayolle family with her deft cooking abilities and charm.
</p> */}
            <p>
Their love felt effortless and only grew from there. Much of 2025 was spent in each other's company. Attending concerts, traveling to new places, petting cats, cozy gaming, and even tattooing each other - all with the biggest grins on their faces.
</p>
            <p>
It was only a matter of time before Cody popped the question. In early November 2025, the two took a trip to France for a family wedding in France. You know, where Paris is. I mean come on, Paris? The city of love? Cody seized the moment, finding a romantic, lantern-lit path to drop to one knee.
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
          <div className='block-copy text-center md:text-left pl-2 md:pl-0'>
            <h1>adventure awaits</h1>
            <p>
              Your presence is the real gift - seriously, there's no obligation or expectation.</p>
              <p>For anyone who absolutely insists on doing more, we’re opening up the vote on our honeymoon destination. The location with the most support wins!
            </p>
            <a target="_blank" rel="noopener noreferrer" href='https://www.zola.com/registry/emilyandcodyaugust8' className='button'>Contribute to Our Honeymoon</a>
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
          className={`tip tip-${tooltip.tag}`}
        >
          <span className='tip-tag'>{tooltip.tag}</span>
          <span className='tip-desc'>{tooltip.text}</span>
        </div>
      )}

      {activePlace && (
        <PlaceModal place={activePlace} onClose={() => setActivePlace(null)} />
      )}

      {galleryOpen && (
        <div className='gallery-backdrop' onClick={() => setGalleryOpen(false)}>
          <div className='gallery-modal' onClick={e => e.stopPropagation()}
            onTouchStart={e => { e.currentTarget.dataset.touchX = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - Number(e.currentTarget.dataset.touchX);
              if (dx < -50) setGalleryIndex(i => (i + 1) % funkyPhotos.length);
              if (dx > 50) setGalleryIndex(i => (i - 1 + funkyPhotos.length) % funkyPhotos.length);
            }}
          >
            <button className='gallery-close' onClick={() => setGalleryOpen(false)}>
              <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='w-5 h-5'><path d='M18 6L6 18M6 6l12 12'/></svg>
            </button>
            <div className='gallery-img-wrap'>
              <img src={funkyPhotos[galleryIndex]} alt='' />
            </div>
            <div className='gallery-nav'>
              <button
                className='gallery-arrow'
                onClick={() => setGalleryIndex(i => (i - 1 + funkyPhotos.length) % funkyPhotos.length)}
              ><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className='w-6 h-6'><path d='M15 18l-6-6 6-6'/></svg></button>
              <span className='gallery-count'>{galleryIndex + 1} / {funkyPhotos.length}</span>
              <button
                className='gallery-arrow'
                onClick={() => setGalleryIndex(i => (i + 1) % funkyPhotos.length)}
              ><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className='w-6 h-6'><path d='M9 18l6-6-6-6'/></svg></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
