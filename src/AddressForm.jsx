import { useState } from 'react'
import emailjs from '@emailjs/browser'

// US States list for autocomplete
const US_STATES = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' }
]

const COUNTRIES = ['United States', 'United Kingdom', 'France', 'Canada']

export function AddressForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    preferred: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [invalidFields, setInvalidFields] = useState([])
  const [stateSuggestions, setStateSuggestions] = useState([])
  const [showStateSuggestions, setShowStateSuggestions] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    
    setIsSubmitting(true)

    // EmailJS configuration
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_ADDRESS_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    const templateParams = {
      to_email: 'emily@thisjones.com',
      first_name: formData.firstName,
      last_name: formData.lastName,
      from_email: formData.email,
      preferred: formData.preferred,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      country: formData.country,
    }

    emailjs.send(serviceId, templateId, templateParams, publicKey)
      .then((response) => {
        console.log('SUCCESS!', response.status, response.text)
        setIsFadingOut(true)
        
        setTimeout(() => {
          setIsSubmitted(true)
          setIsFadingOut(false)
          setFormData({
            firstName: '',
            lastName: '',
            email: '',
            preferred: '',
            address: '',
            city: '',
            state: '',
            zip: '',
            country: '',
          })
        }, 400)
      })
      .catch((error) => {
        console.error('FAILED...', error)
        alert('Oops! Something went wrong. Please try again.')
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Clear validation error when field is filled
    if (invalidFields.includes(name)) {
      setInvalidFields(invalidFields.filter(field => field !== name))
    }

    // Handle state autocomplete
    if (name === 'state') {
      if (value.length > 0) {
        const filtered = US_STATES.filter(state => 
          state.name.toLowerCase().startsWith(value.toLowerCase()) ||
          state.code.toLowerCase().startsWith(value.toLowerCase())
        )
        setStateSuggestions(filtered)
        setShowStateSuggestions(true)
      } else {
        setStateSuggestions([])
        setShowStateSuggestions(false)
      }
    }
  }

  const handleStateSuggestionClick = (stateCode) => {
    setFormData({ ...formData, state: stateCode })
    setShowStateSuggestions(false)
    setStateSuggestions([])
  }

  return (
    <>
      {isSubmitted ? (
        <div className='text-center pt-20 py-10 bg-white rounded-lg px-8 md:p-20'>
          <h1 className='mb-10 max-w-70 mx-auto'>Thanks!</h1>
          <p className='mb-4'>We've got your address - something blue is on the way. 🩵</p>
          <p>
            If you need to update your address, just shoot us an email at{' '}
            <a href='mailto:wedding@fayolle.com' className='text-primary transition-all hover:underline'>
              wedding@fayolle.com
            </a>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={isFadingOut ? 'fade-out' : ''}>
          <h1 className='text-center mb-10 pt-15 max-w-70 mx-auto'>Send us your address!</h1>
          <p className='text-base!'>We've got something special to mail you</p>

          <div className='mb-10'>
        <label htmlFor='preferred'>How would you like your mail to be addressed?</label>
            <input 
                type='text' 
                id='preferred' 
                name='preferred' 
                value={formData.preferred} 
                onChange={handleChange} 
                required 
                placeholder='Eg. The Smith Family' 
                />
        </div>
        <div className='sub-form'>
            <div className='mb-6 flex gap-4 flex-wrap'>
                <div className='md:flex-1 w-full md:w-auto'>
                    <input 
                    type='text' 
                    id='firstName' 
                    name='firstName' 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    required 
                    placeholder='First name' 
                    />
                </div>
                <div className='md:flex-1 w-full md:w-auto'>
                    <input 
                    type='text' 
                    id='lastName' 
                    name='lastName' 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    required 
                    placeholder='Last name' 
                    />
                </div>
            </div>
            <div className='mb-6'>
                <input
                type='email'
                id='email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                required
                placeholder='your.email@example.com'
                />
            </div>
          </div>
          <label htmlFor='address'>And where should we send it?</label>

          <div className='sub-form'>
          <div className='mb-6'>
            <input 
              type='text' 
              id='address' 
              name='address' 
              value={formData.address} 
              onChange={handleChange} 
              required 
              placeholder='Street address' 
            />
          </div>

          <div className='mb-6 flex gap-4 flex-wrap'>
            <div className='md:flex-1 w-full md:w-auto relative'>
              <input 
                type='text' 
                id='city' 
                name='city' 
                value={formData.city} 
                onChange={handleChange} 
                required 
                placeholder='City' 
              />
            </div>

            <div className='md:flex-1 w-full md:w-auto relative'>
              <input 
                type='text' 
                id='state' 
                name='state' 
                value={formData.state} 
                onChange={handleChange} 
                onBlur={() => setTimeout(() => setShowStateSuggestions(false), 200)}
                onFocus={() => formData.state && setShowStateSuggestions(true)}
                required 
                placeholder='State' 
                autoComplete='off'
              />
              {showStateSuggestions && stateSuggestions.length > 0 && (
                <div className='state-suggestions'>
                  {stateSuggestions.slice(0, 5).map((state, index) => (
                    <div
                      key={index}
                      className='state-suggestion-item'
                      onClick={() => handleStateSuggestionClick(state.code)}
                    >
                      {state.code}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className='md:flex-1 w-full md:w-auto relative'>
                <input 
                type='text' 
                id='zip' 
                name='zip' 
                value={formData.zip} 
                onChange={handleChange} 
                required 
                placeholder='Postal Code' 
                />
            </div>
          </div>

          <div className='mb-6'>
            <label htmlFor='country'>Country</label>
            <select
              id='country'
              name='country'
              value={formData.country}
              onChange={handleChange}
              required
              className='w-full pb-4 pt-3 border-b-2 border-primary/20 transition-all font-routed tracking-wider text-base md:text-lg text-center bg-white cursor-pointer'
            >
              <option value=''>Select a country</option>
              {COUNTRIES.map((country, index) => (
                <option key={index} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          </div>

          <button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Address 📬'}
          </button>
        </form>
      )}
    </>
  )
}
