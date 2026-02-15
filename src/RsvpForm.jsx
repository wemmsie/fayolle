import { useState, useEffect, useRef } from 'react'
import emailjs from '@emailjs/browser'
import Fuse from 'fuse.js';
import guestListRaw from './guests.csv?raw';

// Guest list - loaded from guests.csv
const guestList = guestListRaw.split('\n').filter((name) => name.trim() !== '');

export function RsvpForm() {
  // Name verification state
  const [isVerified, setIsVerified] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNotOnList, setShowNotOnList] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    plusOne: '',
    bringingKids: '',
    kidCount: '',
    hasDietary: '',
    dietaryCount: '',
    dietaryDetails: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);

  // Track visibility and animation state for conditional fields
  const [fieldState, setFieldState] = useState({
    plusOneFields: { visible: false, animating: false },
    kidsField: { visible: false, animating: false },
    dietaryFields: { visible: false, animating: false },
  });

  const prevValues = useRef({ plusOne: '', bringingKids: '', hasDietary: '' });

  // Fuzzy search configuration
  const fuse = useRef(
    new Fuse(guestList, {
      threshold: 0.4, // 0 = exact match, 1 = match anything
      distance: 100,
    }),
  );

  // Handle name verification
  const handleNameCheck = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();

    // Check for exact match (case-insensitive)
    const exactMatch = guestList.find((guest) => guest.toLowerCase() === trimmedName.toLowerCase());

    if (exactMatch) {
      setVerifiedName(exactMatch);
      setFormData((prev) => ({ ...prev, name: exactMatch }));
      setIsVerified(true);
      setNameSuggestions([]);
      setShowNotOnList(false);
      return;
    }

    // Try fuzzy matching
    const results = fuse.current.search(trimmedName);

    if (results.length > 0) {
      // Show suggestions
      setNameSuggestions(results.slice(0, 3).map((r) => r.item));
      setShowNotOnList(false);
    } else {
      // No matches found
      setNameSuggestions([]);
      setShowNotOnList(true);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setVerifiedName(suggestion);
    setFormData((prev) => ({ ...prev, name: suggestion }));
    setIsVerified(true);
    setNameSuggestions([]);
    setShowNotOnList(false);
  };

  // Map field names to their corresponding form data keys
  const fieldToDataKey = {
    plusOneFields: 'plusOne',
    kidsField: 'bringingKids',
    dietaryFields: 'hasDietary',
  };

  // Generic handler for conditional field visibility
  const handleFieldVisibility = (fieldName, condition, onClear) => {
    const dataKey = fieldToDataKey[fieldName];
    const prev = prevValues.current[dataKey];

    if (condition === 'yes' && prev !== 'yes') {
      setFieldState((s) => ({ ...s, [fieldName]: { visible: true, animating: false } }));
    } else if (condition === 'no' && prev === 'yes') {
      setFieldState((s) => ({ ...s, [fieldName]: { ...s[fieldName], animating: true } }));
      setTimeout(() => {
        setFieldState((s) => ({ ...s, [fieldName]: { visible: false, animating: false } }));
        onClear();
      }, 500);
    }
  };

  useEffect(() => {
    handleFieldVisibility('plusOneFields', formData.plusOne, () => setFormData((prev) => ({ ...prev, bringingKids: '', kidCount: '' })));
    prevValues.current.plusOne = formData.plusOne;
  }, [formData.plusOne]);

  useEffect(() => {
    handleFieldVisibility('kidsField', formData.bringingKids, () => setFormData((prev) => ({ ...prev, kidCount: '' })));
    prevValues.current.bringingKids = formData.bringingKids;
  }, [formData.bringingKids]);

  useEffect(() => {
    handleFieldVisibility('dietaryFields', formData.hasDietary, () => setFormData((prev) => ({ ...prev, dietaryCount: '', dietaryDetails: '' })));
    prevValues.current.hasDietary = formData.hasDietary;
  }, [formData.hasDietary]);

  // Calculate total party size
  const getPartySize = () => {
    let size = 1; // The person filling out the form
    if (formData.plusOne === 'yes') size += 1;
    if (formData.bringingKids === 'yes' && formData.kidCount) {
      size += parseInt(formData.kidCount) || 0;
    }
    return size;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate radio buttons (these will flash if not selected)
    const invalid = [];
    if (!formData.plusOne) invalid.push('plusOne');
    if (formData.plusOne === 'yes' && !formData.bringingKids) invalid.push('bringingKids');
    if (!formData.hasDietary && formData.plusOne !== '') invalid.push('hasDietary');

    if (invalid.length > 0) {
      setInvalidFields(invalid);
      return;
    }

    setIsSubmitting(true);

    // EmailJS configuration
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    const templateParams = {
      to_email: 'emily@thisjones.com',
      from_name: formData.name,
      from_email: formData.email,
      plus_one: formData.plusOne,
      bringing_kids: formData.bringingKids,
      kid_count: formData.kidCount || 'N/A',
      party_size: getPartySize(),
      has_dietary: formData.hasDietary,
      dietary_count: formData.dietaryCount || 'N/A',
      dietary_details: formData.dietaryDetails || 'None',
      message: formData.message,
    };

    emailjs
      .send(serviceId, templateId, templateParams, publicKey)
      .then((response) => {
        console.log('SUCCESS!', response.status, response.text);

        setIsFadingOut(true);
        setTimeout(() => {
          setIsSubmitted(true);
          setIsFadingOut(false);
          // Reset form
          setFormData({
            name: '',
            email: '',
            plusOne: '',
            bringingKids: '',
            kidCount: '',
            hasDietary: '',
            dietaryCount: '',
            dietaryDetails: '',
            message: '',
          });
          setFieldState({
            plusOneFields: { visible: false, animating: false },
            kidsField: { visible: false, animating: false },
            dietaryFields: { visible: false, animating: false },
          });
          prevValues.current = { plusOne: '', bringingKids: '', hasDietary: '' };
          // Reset name verification
          setIsVerified(false);
          setNameInput('');
          setVerifiedName('');
          setNameSuggestions([]);
          setShowNotOnList(false);
        }, 400);
      })
      .catch((error) => {
        console.error('FAILED...', error);
        alert('Oops! Something went wrong. Please try again.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear validation error when field is filled
    if (invalidFields.includes(name)) {
      setInvalidFields(invalidFields.filter((field) => field !== name));
    }
  };

  return (
    <>
      {isSubmitted ? (
        <div className='text-center pt-20 py-10 bg-white rounded-lg px-8 md:p-20'>
          <h1 className='mb-10 max-w-70 mx-auto'>Heck yeah!</h1>
          <p className='mb-4'>We're so excited to celebrate with you.</p>
          <p>
            If you have any questions or need to change or adjust your RSVP, no hard feelings. Just shoot us an email at{' '}
            <a href='mailto:wedding@fayolle.com' className='text-primary transition-all hover:underline'>
              wedding@fayolle.com
            </a>
          </p>
        </div>
      ) : !isVerified ? (
        <div className='text-center pt-20 py-10 bg-white rounded-lg px-8 md:p-20'>
          <h1 className='mb-10 max-w-70 mx-auto'>Want to RSVP early?</h1>
          <p className='text-base! mb-6'>First things first...</p>

          <form onSubmit={handleNameCheck}>
            <div className='mb-6'>
              <input
                type='text'
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="What's your name?"
                required
                autoFocus
              />
            </div>
            <button type='submit'>Check guest list</button>
          </form>

          {nameSuggestions.length > 0 && (
            <div className='mt-8'>
              <p className='mb-4'>Did you mean one of these?</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {nameSuggestions.map((suggestion, index) => (
                  <button key={index} type='button' className='suggestion-button' onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showNotOnList && (
            <div className='mt-8'>
              <p className='mb-2' style={{ color: '#ef4444' }}>
                Hmm, we couldn't find that name on our guest list.
              </p>
              <p className='text-base!'>
                Double-check the spelling or reach out to us at{' '}
                <a href='mailto:wedding@fayolle.com' className='text-primary transition-all hover:underline'>
                  wedding@fayolle.com
                </a>
              </p>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={isFadingOut ? 'fade-out' : ''}>
          <h1 className='text-center mb-10 pt-15 max-w-70 mx-auto'>Hey {verifiedName}! 👋</h1>
          <p className='text-base!'>Let's get you RSVP'd</p>

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

          <div className='mb-6'>
            <label>Plus one?</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }} className={invalidFields.includes('plusOne') ? 'flash-invalid' : ''}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                <input type='radio' name='plusOne' value='yes' checked={formData.plusOne === 'yes'} onChange={handleChange} />
                Yes
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                <input type='radio' name='plusOne' value='no' checked={formData.plusOne === 'no'} onChange={handleChange} />
                No
              </label>
            </div>
          </div>

          {fieldState.plusOneFields.visible && (formData.plusOne === 'yes' || fieldState.plusOneFields.animating) && (
            <div className={fieldState.plusOneFields.animating ? 'animate-out' : 'animate-in'}>
              <div className='mb-6'>
                <label>Bringing the kids?</label>
                <div
                  style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}
                  className={invalidFields.includes('bringingKids') ? 'flash-invalid' : ''}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                    <input type='radio' name='bringingKids' value='yes' checked={formData.bringingKids === 'yes'} onChange={handleChange} />
                    Yes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                    <input type='radio' name='bringingKids' value='no' checked={formData.bringingKids === 'no'} onChange={handleChange} />
                    No
                  </label>
                </div>
              </div>

              {fieldState.kidsField.visible && (formData.bringingKids === 'yes' || fieldState.kidsField.animating) && (
                <div className={`mb-6 ${fieldState.kidsField.animating ? 'animate-out' : 'animate-in'}`}>
                  <label htmlFor='kidCount'>How many kids?</label>
                  <input
                    type='number'
                    id='kidCount'
                    name='kidCount'
                    value={formData.kidCount}
                    onChange={handleChange}
                    required
                    min='1'
                    max='10'
                    placeholder='Number of kids'
                  />
                </div>
              )}
            </div>
          )}

          {formData.plusOne !== '' && (
            <div className='mb-6 animate-in'>
              <label>{formData.plusOne === 'yes' ? 'Any dietary restrictions in your party?' : 'Do you have any dietary restrictions?'}</label>
              <div
                style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}
                className={invalidFields.includes('hasDietary') ? 'flash-invalid' : ''}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                  <input type='radio' name='hasDietary' value='yes' checked={formData.hasDietary === 'yes'} onChange={handleChange} />
                  Yes
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                  <input type='radio' name='hasDietary' value='no' checked={formData.hasDietary === 'no'} onChange={handleChange} />
                  No
                </label>
              </div>
            </div>
          )}

          {fieldState.dietaryFields.visible && (formData.hasDietary === 'yes' || fieldState.dietaryFields.animating) && (
            <div className={fieldState.dietaryFields.animating ? 'animate-out' : 'animate-in'}>
              {getPartySize() > 1 && (
                <div className='mb-6'>
                  <label htmlFor='dietaryCount'>How many people in your party have dietary restrictions?</label>
                  <input
                    type='number'
                    id='dietaryCount'
                    name='dietaryCount'
                    value={formData.dietaryCount}
                    onChange={handleChange}
                    required
                    min='1'
                    max={getPartySize()}
                    placeholder='Number of people with restrictions'
                  />
                </div>
              )}

              <div className='mb-6'>
                <textarea
                  id='dietaryDetails'
                  name='dietaryDetails'
                  value={formData.dietaryDetails}
                  onChange={handleChange}
                  required
                  rows='3'
                  placeholder='Vegetarian, gluten free, nut allergy? Let us know!'
                />
              </div>
            </div>
          )}

          <div className='mb-6'>
            <textarea
              id='message'
              name='message'
              value={formData.message}
              onChange={handleChange}
              rows='5'
              placeholder='Any special requests or messages for us?'
            />
          </div>

          <button type='submit' disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'OH YEEEAH 🎉'}
          </button>
        </form>
      )}
    </>
  );
}
