import './global.css'
import * as image from './images'
import { AddressForm } from './AddressForm'
import { Helmet } from 'react-helmet-async';

function AddressPage() {
  return (
    <>
      <Helmet>
        <title>Send Your Address | Emily & Cody</title>
        <meta property='og:title' content='Send Us Your Address!' />
        <meta property='og:description' content='Help us send you something special 🩵' />
        <meta property='og:image' content='/letter.png' />
        <meta name='description' content='Help us send you something special 🩵' />
      </Helmet>
      <div className='min-h-screen bg-pink'>
        <section className='max my-10'>
          <div className='form-container relative address-form'>
            <img src={image.letter} alt='Love Letter' className='letter' />
            <AddressForm />
          </div>
        </section>
      </div>
    </>
  );
}

export default AddressPage
