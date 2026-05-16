import './global.css'
import * as image from './images'
import { AddressForm } from './AddressForm';

function AddressPage() {
  return (
    <div className='min-h-dvh bg-red-light'>
      <section className='my-0 pt-20! pb-0! md:py-24! px-0! md:pl-10!'>
        <div className='form-container relative address-form max-w-2xl mx-auto w-full'>
          <img src={image.letter} alt='Love Letter' className='letter' />
          <AddressForm />
        </div>
      </section>
    </div>
  );
}

export default AddressPage
