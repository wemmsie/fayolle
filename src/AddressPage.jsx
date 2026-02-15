import './global.css'
import * as image from './images'
import { AddressForm } from './AddressForm';

function AddressPage() {
  return (
    <div className='min-h-screen bg-pink'>
      <section className='max my-10'>
        <div className='form-container relative address-form'>
          <img src={image.letter} alt='Love Letter' className='letter' />
          <AddressForm />
        </div>
      </section>
    </div>
  );
}

export default AddressPage
