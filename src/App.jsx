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
  const tooltipRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const tip = e.currentTarget.dataset.tip;
    const tag = e.currentTarget.dataset.tag;
    if (!tip) return;
    setTooltip({ visible: true, text: tip, tag, x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  const tipProps = (tag, tip) => ({
    'data-tag': tag,
    'data-tip': tip,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  });

  const placeButton = (name, tag, tip) => ({
    ...tipProps(tag, tip),
    onClick: (e) => { e.preventDefault(); setActivePlace(name); },
  });

  return (
    <div className='min-h-screen'>
      <ScrollNav />
      {/* Hero */}
      <section
        className='relative h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center overflow-x-hidden'
        style={{ backgroundImage: `url(${image.sparklers})` }}
      >
        <div className='relative z-10 flex items-center justify-center'>
          <img src={image.bothmarried} alt="We're Getting Married" className='max-h-[70vh] w-[110%] md:w-full max-w-none mb-40 md:mb-0' />
        </div>
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
          <div className='text-center mt-10 max-w-2xl mx-auto'>
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
          <div className='text-center mb-10'>
            <h1>times at which we party</h1>
            <p>
              We got you covered for the whole event in one place. Parking is available on-site and signs will guide you where you need to go.</p>
              <p>Meet us at the<a className='button px-3! py-1!' href='#' {...placeButton('Greenhouse Loft', 'address', '2545 W Diversey Ave, Chicago, IL 60647')}>Greenhouse Loft</a></p>


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
                <span className='timeline-detail'>Till midnight</span>
              </div>
            </div>
          </div>
          <img src={image.wine} alt='' className='wedding-day-img' />
        </div>
      </section>

      {/* Accommodations */}
      <section id='stay' className='block theme-pink'>
        <div className='block-inner text-center'>
          <h1>where to stay</h1>
          <p>
            We've got a hitched code for <a href='https://booking.thehoxton.com/en-us/availability?_gl=1*1c1cf6w*_gcl_au*MTg2ODA4OTA0OS4xNzc1OTMwNTMyLjE5NzE0MjQ3MzUuMTc3NTkzMDU4OS4xNzc1OTMwNTg5*_ga*MjQ2Njc2ODA3LjE3NzU5MzA1MzI.*_ga_F7XM2Q5ZRS*czE3NzU5MzA1MzIkbzEkZzEkdDE3NzU5MzA1OTAkajIkbDAkaDc3MDE4MzY3OQ..&checkin=2026-08-07&checkout=2026-08-09&hotelCode=hoxton.chicago-chicago&modifySearch=false&rateCode=HITCHED826&rooms%5B0%5D.adults=2&rooms%5B0%5D.children=0&rooms-total=1'>10% off at the Hoxton Hotel</a> and more local suggestions. We recommend booking early, as hotels in the area tend to fill up quickly in August. If you have any questions or need help finding accommodations, please don't hesitate to reach out!
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
              <a target="_blank" href='https://www.booking.com/searchresults.html?label=gen173nr-1FCAEoggI46AdIM1gEaLsBiAEBmAEJuAEHyAEM2AEB6AEB-AECiAIBqAIEuAKWjZCMBs&aid=304142&ss=Chicago+IL+60614&checkin_year=2026&checkin_month=8&checkin_monthday=7&checkout_year=2026&checkout_month=8&checkout_monthday=9&group_adults=2&no_rooms=1&group_children=0&chal_t=1776205212898&force_referer=http%3A%2F%2Flocalhost%3A5173%2F&nflt=price%3DUSD-min-400-1' className='button'>Book Here</a>
            </div>

          </div>
        </div>
      </section>

      {/* Things to Do */}
      <section id='todo' className='block theme-cream to-do'>
        <div className='block-inner text-center'>
          <h1>things to do</h1>
          <p>
            Want to make a weekend of it? Chicago has no shortage of things to do, and we're happy to give recommendations! Check out our list for some of our favorite spots around the city, and feel free to reach out if you want any more ideas.
          </p>

          {/* Mobile: tappable tabs */}
          <div className='md:hidden mt-8'>
            <div className='todo-tabs'>
              <button className={`todo-tab ${activeTab === 'do' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('do')}>Do</button>
              <button className={`todo-tab ${activeTab === 'eat' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('eat')}>Eat</button>
              <button className={`todo-tab ${activeTab === 'drink' ? 'todo-tab-active' : ''}`} onClick={() => setActiveTab('drink')}>Drink</button>
            </div>
            <div className='todo-tab-content'>
              {activeTab === 'do' && (
                <div className='tab'>
                  <a className='button' href='#' {...placeButton('Lakefront Trail', 'park', 'Scenic 18-mile path along Lake Michigan')}>Lakefront Trail</a>
                  <a className='button' href='#' {...placeButton('Architectural Boat Tour', 'activity', 'See the skyline from the river')}>Architectural Boat Tour</a>
                  <a className='button' href='#' {...placeButton('Garfield Park Conservatory', 'park', 'Free indoor botanical garden')}>Garfield Park Conservatory</a>
                  <a className='button' href='#' {...placeButton('Art Institute of Chicago', 'museum', 'World-class art collection')}>Art Institute Chicago</a>
                  <a className='button' href='#' {...placeButton('Chicago Cultural Center', 'museum', 'Historic landmark with art exhibits')}>Chicago Cultural Center</a>
                  <a className='button' href='#' {...placeButton('Peggy Notebaert Nature Museum', 'museum', 'Interactive exhibits and daily 2pm butterfly release')}>Peggy Notebaert Nature Museum</a>
                  <a className='button' href='#' {...placeButton('Japanese Garden at Jackson Park', 'park', 'Beautiful Japanese garden in the city')}>Japanese Garden</a>
                </div>
              )}
              {activeTab === 'eat' && (
                <div className='tab'>
                  <a className='button' href='#' {...placeButton('Cozy Corner Restaurant', 'brunch', 'Southern comfort food')}>Cozy Corner</a>
                  <a className='button' href='#' {...placeButton('Bang Bang Pie & Biscuits', 'brunch', 'Savory pies, biscuits & coffee')}>Bang Bang Pie & Biscuits</a>
                  <a className='button' href='#' {...placeButton('Loaf Lounge', 'brunch', 'Fresh bread, deli, killer egg sandwiches')}>Loaf Lounge</a>
                  <a className='button' href='#' {...placeButton('Lula Cafe', 'all day', 'Funky, inventive, farm-to-table')}>Lula Cafe</a>
                  <a className='button' href='#' {...placeButton('Girl & The Goat', 'all day', 'Bold, world-famous, inventive plates')}>Girl & The Goat</a>
                  <a className='button' href='#' {...placeButton('Akahoshi Ramen', 'dinner', 'Rich Japanese ramen')}>Akahoshi Ramen</a>
                  <a className='button' href='#' {...placeButton("Dove's Luncheonette", 'brunch', 'Charming Tex-Mex diner vibes')}>Dove's Luncheonette</a>
                  <a className='button' href='#' {...placeButton('Gretel', 'all day', 'Modern & casual European fare')}>Gretel</a>
                </div>
              )}
              {activeTab === 'drink' && (
                <div className='tab'>
                  <a className='button' href='#' {...placeButton('Little Victories Coffee', 'drink', 'Cozy coffee & natural wine')}>Little Victories</a>
                  <a className='button' href='#' {...placeButton('Truce Chicago', 'drink', 'Specialty coffee & pastries')}>Truce</a>
                  <a className='button' href='#' {...placeButton('Lazybird Chicago', 'drink', 'Speakeasy-style cocktails')}>Lazybird</a>
                  <a className='button' href='#' {...placeButton('Pilot Project Brewing', 'drink', 'Local craft beer taproom')}>Pilot Project</a>
                  <a className='button' href='#' {...placeButton('Easy Does It Bar', 'drink', 'Laid-back neighborhood bar')}>Easy Does It</a>
                  <a className='button' href='#' {...placeButton('Welcome Back Lounge', 'drink', 'Retro cocktail lounge')}>Welcome Back Lounge</a>
                </div>
              )}
            </div>
          </div>

          {/* Desktop: three columns */}
          <div className='hidden md:flex gap-4 justify-between mt-8'>
            <div className='tab'>
              <h2>Do</h2>
              <a className='button' href='#' {...placeButton('Lakefront Trail', 'park', 'Scenic 18-mile path along Lake Michigan')}>Lakefront Trail</a>
              <a className='button' href='#' {...placeButton('Architectural Boat Tour', 'activity', 'See the skyline from the river')}>Architectural Boat Tour</a>
              <a className='button' href='#' {...placeButton('Garfield Park Conservatory', 'park', 'Free indoor botanical garden')}>Garfield Park Conservatory</a>
              <a className='button' href='#' {...placeButton('Art Institute of Chicago', 'museum', 'World-class art collection')}>Art Institute Chicago</a>
              <a className='button' href='#' {...placeButton('Chicago Cultural Center', 'museum', 'Historic landmark with art exhibits')}>Chicago Cultural Center</a>
              <a className='button' href='#' {...placeButton('Peggy Notebaert Nature Museum', 'museum', 'Interactive exhibits and daily 2pm butterfly release')}>Peggy Notebaert Nature Museum</a>
              <a className='button' href='#' {...placeButton('Japanese Garden at Jackson Park', 'park', 'Beautiful Japanese garden in the city')}>Japanese Garden</a>
            </div>
            <div className='tab'>
              <h2>Eat</h2>
              <a className='button' href='#' {...placeButton('Cozy Corner Restaurant', 'brunch', 'Southern comfort food')}>Cozy Corner</a>
              <a className='button' href='#' {...placeButton('Bang Bang Pie & Biscuits', 'brunch', 'Savory pies, biscuits & coffee')}>Bang Bang Pie & Biscuits</a>
              <a className='button' href='#' {...placeButton('Loaf Lounge', 'brunch', 'Fresh bread, deli, killer egg sandwiches')}>Loaf Lounge</a>
              <a className='button' href='#' {...placeButton('Lula Cafe', 'all day', 'Funky, inventive, farm-to-table')}>Lula Cafe</a>
              <a className='button' href='#' {...placeButton('Girl & The Goat', 'all day', 'Bold, world-famous, inventive plates')}>Girl & The Goat</a>
              <a className='button' href='#' {...placeButton('Akahoshi Ramen', 'dinner', 'Rich Japanese ramen')}>Akahoshi Ramen</a>
              <a className='button' href='#' {...placeButton("Dove's Luncheonette", 'brunch', 'Charming Tex-Mex diner vibes')}>Dove's Luncheonette</a>
              <a className='button' href='#' {...placeButton('Gretel', 'all day', 'Modern & casual European fare')}>Gretel</a>
            </div>
            <div className='tab'>
              <h2>Drink</h2>
              <a className='button' href='#' {...placeButton('Little Victories Coffee', 'drink', 'Cozy coffee & natural wine')}>Little Victories</a>
              <a className='button' href='#' {...placeButton('Truce Chicago', 'drink', 'Specialty coffee & pastries')}>Truce</a>
              <a className='button' href='#' {...placeButton('Lazybird Chicago', 'drink', 'Speakeasy-style cocktails')}>Lazybird</a>
              <a className='button' href='#' {...placeButton('Pilot Project Brewing', 'drink', 'Local craft beer taproom')}>Pilot Project</a>
              <a className='button' href='#' {...placeButton('Easy Does It Bar', 'drink', 'Laid-back neighborhood bar')}>Easy Does It</a>
              <a className='button' href='#' {...placeButton('Welcome Back Lounge', 'drink', 'Retro cocktail lounge')}>Welcome Back Lounge</a>
            </div>
          </div>
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
          <div className='block-copy text-center md:text-left md:w-3/5!'>
            <h1>our story</h1>
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
          <div className='block-copy text-center md:text-left'>
            <h1>registry</h1>
            <p>
              Your presence is the real gift - but for anyone who insists on doing more, we’re letting friends vote on our honeymoon destination. The location with the most support wins!
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
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <span className='tip-tag'>{tooltip.tag}</span>
          <span className='tip-desc'>{tooltip.text}</span>
        </div>
      )}

      {activePlace && (
        <PlaceModal place={activePlace} onClose={() => setActivePlace(null)} />
      )}
    </div>
  );
}

export default App
