import './global.css'
import * as image from './images'
import { Helmet } from 'react-helmet-async';

import { Polaroid } from './Polaroid'
import { PhotoPile } from './PhotoPile'
import { RsvpForm } from './RsvpForm'

function App() {

  return (
    <>
      <Helmet>
        <title>Mawwiage | Cody + Emily</title>
        <meta name='description' content='Join us in celebrating the wedding of Emily and Cody. RSVP and find all the details for our special day.' />
        <meta property='og:type' content='website' />
        <meta property='og:title' content='Cody + Emily 4ever' />
        <meta
          property='og:description'
          content='Join us in celebrating the wedding of Emily and Cody. RSVP and find all the details for our special day.'
        />
        <meta property='og:image' content='/og-image.jpg' />
        <meta property='og:image:width' content='1200' />
        <meta property='og:image:height' content='630' />
        <meta name='twitter:card' content='summary_large_image' />
        <meta name='twitter:title' content='Cody + Emily 4ever' />
        <meta
          name='twitter:description'
          content='Join us in celebrating the wedding of Emily and Cody. RSVP and find all the details for our special day.'
        />
        <meta name='twitter:image' content='/og-image.jpg' />
      </Helmet>
      <div className='min-h-screen'>
        <hero
          id='hero'
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
        </hero>

        <section className='py-20 md:hidden'>
          <PhotoPile photos={[image.usny, image.emilyparis, image.codycafe]} />
        </section>

        <section className='hidden md:flex flex-wrap gap-10 justify-center mx-auto w-full py-20'>
          <Polaroid photo={image.emilyparis} className='rotate-1' />
          <Polaroid photo={image.usny} className='rotate-1' />
          <Polaroid photo={image.codycafe} className='-rotate-2' />
        </section>

        {/* Block 2: Some Text */}
        <section className='max mt-15'>
          <div className='max-w-4xl mx-auto text-center bg-white rounded-xl px-8 md:p-20 pb-15 pt-25 relative'>
            <img src={image.discoBlue} alt='Dancing!' className='disco' />
            <h1>You wanna dance?</h1>
            <p>
              Good. Because we're getting married, and you <i>know</i> we've got good taste in music.
            </p>
            <p>
              {' '}
              Come on up to Chicago on August 8th, 2026 to celebrate with us beneath an excessive number of disco balls (yes, really) and the
              ungovernable influence of actually really good espresso martinis.
            </p>
          </div>
        </section>

        {/* Block 3: Submit Form */}
        <section className='max'>
          <div className='form-container relative'>
            <img src={image.cheersBlue} alt='Cheers!' className='cheers' />
            <RsvpForm />
          </div>
        </section>
      </div>
    </>
  );
}

export default App
