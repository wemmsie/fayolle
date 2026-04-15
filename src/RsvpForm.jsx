import { useState, useEffect, useRef } from 'react'
import emailjs from '@emailjs/browser'
import Fuse from 'fuse.js';
import guestListRaw from './guests.csv?raw';

// Guest list - loaded from guests.csv
const guestList = guestListRaw.split('\n').filter((name) => name.trim() !== '');

const meals = [
  { value: 'shortrib', title: '🍷 Braised Short Rib', shortTitle: 'Short Rib', tag: 'GF', desc: 'Mashed potatoes, asparagus, crispy leeks and a rich red wine demi-glaze' },
  { value: 'chicken', title: '🍋 Lemon Rosemary Chicken', shortTitle: 'Chicken', desc: 'Roasted garlic potatoes, charred seasonal vegetables, pan jus' },
  { value: 'gnocchi', title: '🍠 Sweet Potato Gnocchi', shortTitle: 'Gnocchi', tag: 'VEG', desc: 'Roasted seasonal vegetables, charred cauliflower, wilted baby kale, brown butter sauce, crispy sage' },
];

// Toggle to false to test the real RSVP flow in dev
const SKIP_RSVP_GATES = false;
const DEV_MODE = import.meta.env.DEV && SKIP_RSVP_GATES;

// Toggle to false to disable the password gate entirely
const REQUIRE_PASSWORD = false;

export function RsvpForm() {
  // Password gate state
  const [isUnlocked, setIsUnlocked] = useState(DEV_MODE || !REQUIRE_PASSWORD);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Name verification state
  const [isVerified, setIsVerified] = useState(DEV_MODE);
  const [nameInput, setNameInput] = useState('');
  const [verifiedName, setVerifiedName] = useState(DEV_MODE ? 'Dev User' : '');
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNotOnList, setShowNotOnList] = useState(false);

  const [formData, setFormData] = useState({
    name: DEV_MODE ? 'Dev User' : '',
    email: '',
    plusOne: '',
    hasDietary: '',
    dietaryCount: '',
    dietaryDetails: '',
    mealChoices: {},
    welcomeParty: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);

  // Track visibility and animation state for conditional fields
  const [fieldState, setFieldState] = useState({
    dietaryFields: { visible: false, animating: false },
  });

  const prevValues = useRef({ hasDietary: '' });
  const animationTimers = useRef({});
  const menuDisplayRef = useRef(null);
  const menuTitleRef = useRef(null);

  // Fuzzy search configuration
  const fuse = useRef(
    new Fuse(guestList, {
      threshold: 0.4, // 0 = exact match, 1 = match anything
      distance: 100,
    }),
  );

  // Handle name verification
  const handlePasswordCheck = (e) => {
    e.preventDefault();
    if (passwordInput.trim().toLowerCase() === import.meta.env.VITE_RSVP_PASSWORD.toLowerCase()) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

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
    dietaryFields: 'hasDietary',
  };

  // Generic handler for conditional field visibility
  const handleFieldVisibility = (fieldName, condition, onClear, expandValues = ['yes']) => {
    const dataKey = fieldToDataKey[fieldName];
    const prev = prevValues.current[dataKey];
    const isExpanding = expandValues.includes(condition);
    const wasExpanded = expandValues.includes(prev);

    if (isExpanding && !wasExpanded) {
      clearTimeout(animationTimers.current[fieldName]);
      setFieldState((s) => ({ ...s, [fieldName]: { visible: true, animating: false } }));
    } else if (!isExpanding && wasExpanded) {
      setFieldState((s) => ({ ...s, [fieldName]: { ...s[fieldName], animating: true } }));
      animationTimers.current[fieldName] = setTimeout(() => {
        setFieldState((s) => ({ ...s, [fieldName]: { visible: false, animating: false } }));
        onClear();
      }, 500);
    }
  };

  useEffect(() => {
    handleFieldVisibility('dietaryFields', formData.hasDietary, () => setFormData((prev) => ({ ...prev, dietaryCount: '', dietaryDetails: '' })), ['yes', 'help']);
    prevValues.current.hasDietary = formData.hasDietary;
  }, [formData.hasDietary]);

  // Calculate total party size
  const getPartySize = () => {
    let size = 1; // The person filling out the form
    if (formData.plusOne === 'yes') size += 1;
    return size;
  };

  const partyComplete = formData.plusOne !== '';

  useEffect(() => {
    const display = menuDisplayRef.current;
    const title = menuTitleRef.current;
    if (!display || !title) return;

    const resize = () => {
      const h = display.offsetHeight;
      let lo = 8, hi = 200;
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        title.style.fontSize = mid + 'px';
        if (title.scrollWidth > h) hi = mid;
        else lo = mid;
      }
      title.style.fontSize = lo + 'px';
    };

    const observer = new ResizeObserver(resize);
    observer.observe(display);
    return () => observer.disconnect();
  }, [partyComplete]);

  const getGuestLabel = (index) => {
    if (index === 0) return verifiedName;
    return 'Your plus one';
  };

  const handleMealChange = (guestIndex, value) => {
    setFormData(prev => ({
      ...prev,
      mealChoices: { ...prev.mealChoices, [guestIndex]: value }
    }));
    if (invalidFields.includes(`meal_${guestIndex}`)) {
      setInvalidFields(prev => prev.filter(f => f !== `meal_${guestIndex}`));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate radio buttons (these will flash if not selected)
    const invalid = [];
    if (!formData.plusOne) invalid.push('plusOne');
    if (!formData.hasDietary && formData.plusOne !== '') invalid.push('hasDietary');
    const partySize = getPartySize();
    for (let i = 0; i < partySize; i++) {
      if (!formData.mealChoices[i]) invalid.push(`meal_${i}`);
    }

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
      party_size: getPartySize(),
      has_dietary: formData.hasDietary === 'help' ? 'Needs alternative meal' : formData.hasDietary,
      dietary_count: formData.dietaryCount || 'N/A',
      dietary_details: formData.dietaryDetails || 'None',
      meal_choices: Array.from({ length: getPartySize() }, (_, i) => {
        const choice = meals.find(m => m.value === formData.mealChoices[i]);
        return getGuestLabel(i) + ': ' + (choice ? choice.title : 'N/A');
      }).join('\n'),
      welcome_party: formData.welcomeParty || 'No response',
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
            hasDietary: '',
            dietaryCount: '',
            dietaryDetails: '',
            mealChoices: {},
            welcomeParty: '',
            message: '',
          });
          setFieldState({
            dietaryFields: { visible: false, animating: false },
          });
          prevValues.current = { hasDietary: '' };
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
          <h1 className='text-center text-5xl!'>heck yeah!</h1>
          <p className='mb-4'>We're so excited to celebrate with you.</p>
          <p>
            If you have any questions or need to change or adjust your RSVP, no hard feelings. Just shoot us an email at{' '}
            <a href='mailto:wedding@fayolle.com' className='text-primary transition-all hover:underline'>
              wedding@fayolle.com
            </a>
          </p>
        </div>
      ) : !isUnlocked ? (
        <div className='text-center pt-20 py-10 bg-white rounded-lg px-8 md:p-20'>
          <h1 className='mb-10 mx-auto'>time to rsvp!</h1>
          <p className='text-base! mb-6'>Enter the password from your invitation to get started.</p>

          <form onSubmit={handlePasswordCheck}>
            <div className='mb-6'>
              <input
                type='text'
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                placeholder='Enter password'
                required
                autoFocus
                autoComplete='off'
              />
            </div>
            <button type='submit'>Let's go</button>
          </form>

          {passwordError && (
            <div className='mt-6'>
              <p className='text-base! text-red'>
                That's not quite right. Check your invitation and try again!
              </p>
            </div>
          )}
        </div>
      ) : !isVerified ? (
        <div className='text-center pt-20 py-10 bg-white rounded-lg px-8 md:p-20'>
          <h1 className='mb-10 mx-auto'>time to rsvp!</h1>

          {nameSuggestions.length > 0 ? (
            <>
              <p className='text-base! mb-6'>Did you mean one of these?</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                {nameSuggestions.map((suggestion, index) => (
                  <button key={index} type='button' className='suggestion-button' onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
              <button
                type='button'
                className='mt-6 text-sm! bg-gray-200! text-gray-600! hover:bg-gray-300! rounded-full! px-5! py-2! border-none! cursor-pointer transition-colors group'
                onClick={() => { setNameSuggestions([]); setNameInput(''); setShowNotOnList(false); }}
              >
                <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
                None of these
              </button>
            </>
          ) : showNotOnList ? (
            <>
              <p className='mb-2' style={{ color: '#ef4444' }}>
                Hmm, we couldn't find that name on our guest list.
              </p>
              <p className='text-base! mb-6'>
                Double-check the spelling or reach out to us at{' '}
                <a href='mailto:wedding@fayolle.com' className='text-primary transition-all hover:underline'>
                  wedding@fayolle.com
                </a>
              </p>
              <button
                type='button'
                className='mt-2 text-sm! bg-gray-200! text-gray-600! hover:bg-gray-300! rounded-full! px-5! py-2! border-none! cursor-pointer transition-colors group'
                onClick={() => { setShowNotOnList(false); setNameInput(''); }}
              >
                <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
                Try again
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      ) : (
        <>
          <button
            type='button'
            className='absolute -top-10 left-1/2 -translate-x-1/2 z-10 text-xs! px-4! py-1.5! rounded-full! bg-white/70! backdrop-blur-sm border-none! cursor-pointer opacity-60 hover:opacity-100 transition-all whitespace-nowrap group'
            onClick={() => { setIsVerified(false); setVerifiedName(''); setNameInput(''); setFormData(prev => ({ ...prev, name: '' })); }}
          >
            <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
            Not {verifiedName.split(' ')[0]}?
          </button>
          <form onSubmit={handleSubmit} className={isFadingOut ? 'fade-out' : ''}>
          {/* <h1 className='text-center text-3xl! pt-15'>👋</h1> */}
          <h1 className='font-sanremo-caps! text-center pt-10 text-xl! md:mb-6 mx-auto  text-primary!'>hey</h1>
          <h1 className='text-center text-4xl! md:text-5xl! mb-8! md:mb-15! mx-auto lowercase leading-12! md:leading-10!'>{verifiedName}!</h1>
          <h1 className='font-sanremo-caps! text-center text-lg! pb-10 mx-auto text-primary! tracking-wider'>Let's get you RSVP'd</h1>
          {/* <svg viewBox='0 0 200 20' className='w-full mx-auto my-6' preserveAspectRatio='none'>
            <path d='M0 10 Q25 0 50 10 T100 10 T150 10 T200 10' fill='none' stroke='var(--color-blue)' strokeWidth='2.5' strokeLinecap='round' />
          </svg> */}

          <div className='mb-6 max-inner'>
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

          <div className='mb-6 max-inner'>
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



          {partyComplete && (
            <div className='mb-8 animate-in max-inner'>
              <div className='menu'>
                <div className='the-menu'>
                  <h2 className='menu-title' ref={menuTitleRef}>the menu</h2>
                </div>
                <div className='menu-display' ref={menuDisplayRef}>
                  {meals.map((meal) => (
                    <div key={meal.value} className='menu-item-card flex-1'>
                      <span className='menu-item-title-row flex'>
                        <span className='menu-item-title'>{meal.title}</span>
                        {meal.tag && <><span className='menu-item-dots flex-1 text-ellipsis' /><span className='menu-item-tag'>{meal.tag}</span></>}
                      </span>
                      <span className='menu-item-desc'>{meal.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className='guest-meals max-inner'>
                {Array.from({ length: getPartySize() }, (_, i) => (
                  <div key={i} className={`guest-meal-row ${invalidFields.includes(`meal_${i}`) ? 'flash-invalid-meal' : ''}`}>
                    <span className='guest-name'>{getGuestLabel(i)}</span>
                    <div className='meal-options'>
                      {meals.map((meal) => (
                        <span
                          key={meal.value}
                          className={`meal-pill ${formData.mealChoices[i] === meal.value ? 'meal-pill-selected' : ''}`}
                          onClick={() => handleMealChange(i, meal.value)}
                        >
                          {meal.shortTitle}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {partyComplete && (
            <div className='mb-6 animate-in max-inner'>
              <label>Anything we should know about food?</label>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}
                className={invalidFields.includes('hasDietary') ? 'flash-invalid' : ''}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                  <input type='radio' name='hasDietary' value='no' checked={formData.hasDietary === 'no'} onChange={handleChange} />
                  Nope, the menu looks great!
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                  <input type='radio' name='hasDietary' value='yes' checked={formData.hasDietary === 'yes'} onChange={handleChange} />
                  Yes, there are some dietary restrictions
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                  <input type='radio' name='hasDietary' value='help' checked={formData.hasDietary === 'help'} onChange={handleChange} />
                  None of these options work - help us out!
                </label>
              </div>
            </div>
          )}

          {fieldState.dietaryFields.visible && (['yes', 'help'].includes(formData.hasDietary) || fieldState.dietaryFields.animating) && (
            <div className={fieldState.dietaryFields.animating ? 'animate-out max-inner' : 'animate-in max-inner'}>
              {getPartySize() > 1 && formData.hasDietary === 'yes' && (
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
                  placeholder={formData.hasDietary === 'help'
                    ? 'Tell us what you need and we\'ll make sure you\'re taken care of!'
                    : 'Vegetarian, gluten free, nut allergy? Let us know!'}
                />
              </div>
            </div>
          )}

          {formData.hasDietary !== '' && (
            <div className='mb-6 animate-in max-inner'>
              <label>We're hosting a casual welcome party the night before - no pressure, but would you like to join?</label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                  <input type='radio' name='welcomeParty' value='yes' checked={formData.welcomeParty === 'yes'} onChange={handleChange} />
                  Count me in!
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'normal' }}>
                  <input type='radio' name='welcomeParty' value='no' checked={formData.welcomeParty === 'no'} onChange={handleChange} />
                  I'll skip this one
                </label>
              </div>
            </div>
          )}

          <div className='mb-6 max-inner'>
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
        </>
      )}
    </>
  );
}
