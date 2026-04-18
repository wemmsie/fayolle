import { useState, useEffect, useRef } from 'react'
import emailjs from '@emailjs/browser'
import Fuse from 'fuse.js';

// Scroll so the #rsvp section top aligns with the viewport top
function scrollToRsvp(behavior = 'smooth') {
  const el = document.getElementById('rsvp');
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior });
}

// Sparkle burst on submit-button hover — particles spawn behind, from the button edges
const SPARKLE_COLORS = ['#ff6969', '#f5b54f', '#BFD3DB', '#f5c8c7', '#bbbd59', 'white'];
function spawnSparkles(e) {
  // Skip on touch devices (no real hover)
  if (!window.matchMedia('(hover: hover)').matches) return;
  const btn = e.currentTarget;
  const wrap = btn.parentElement; // .step-buttons
  const br = btn.getBoundingClientRect();
  const wr = wrap.getBoundingClientRect();
  // button center relative to wrapper
  const cx = br.left - wr.left + br.width / 2;
  const cy = br.top - wr.top + br.height / 2;
  const hw = br.width / 2;
  const hh = br.height / 2;

  for (let i = 0; i < 18; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    // pick a random point along the button's perimeter
    const perim = 2 * (br.width + br.height);
    let p = Math.random() * perim;
    let ox, oy;
    if (p < br.width) {                     // top edge
      ox = -hw + p; oy = -hh;
    } else if ((p -= br.width) < br.height) { // right edge
      ox = hw; oy = -hh + p;
    } else if ((p -= br.height) < br.width) { // bottom edge
      ox = hw - p; oy = hh;
    } else {                                 // left edge
      p -= br.width; ox = -hw; oy = hh - p;
    }
    // burst outward from that edge point
    const angle = Math.atan2(oy, ox) + (Math.random() - 0.5) * 0.6;
    const dist = 35 + Math.random() * 50;
    s.style.setProperty('--sx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--sy', `${Math.sin(angle) * dist}px`);
    s.style.left = `${cx + ox}px`;
    s.style.top = `${cy + oy}px`;
    s.style.background = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
    s.style.animationDelay = `${Math.random() * 0.15}s`;
    const size = 5 + Math.random() * 5;
    s.style.width = `${size}px`;
    s.style.height = `${size}px`;
    wrap.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }
}

// Google Sheet published CSV URL for live guest+partner data
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Fg_lQNt-CxaRj89w_3RcXAO7ip-qHJnVIk0sCWqpKMs/gviz/tq?tqx=out:csv&sheet=Clean+Guests';

// Parse CSV rows into { name, partner, rsvp } objects (handles quoted fields)
function parseGuestCSV(csv) {
  const rows = csv.trim().split('\n');
  const guests = [];
  for (const row of rows) {
    const cols = row.match(/"([^"]*)"/g);
    if (!cols || cols.length < 2) continue;
    const name = cols[0].replace(/"/g, '').trim();
    const partner = cols[1].replace(/"/g, '').trim();
    const rsvp = cols[2] ? cols[2].replace(/"/g, '').trim().toLowerCase() : '';
    if (!name) continue;
    guests.push({ name, partner: partner || null, rsvp: rsvp || null });
  }
  return guests;
}

// Build lookup maps from guest data
function buildGuestMaps(guestData) {
  const names = [];
  const partnerMap = new Map(); // name (lowercase) -> partner name
  const rsvpMap = new Map(); // name (lowercase) -> 'yes' | 'no' | null

  for (const { name, partner, rsvp } of guestData) {
    names.push(name);
    if (rsvp) rsvpMap.set(name.toLowerCase(), rsvp);
    if (partner) {
      partnerMap.set(name.toLowerCase(), partner);
      // Add partner as a guest too (so they can RSVP from either side)
      if (!guestData.some(g => g.name.toLowerCase() === partner.toLowerCase())) {
        names.push(partner);
      }
      partnerMap.set(partner.toLowerCase(), name);
      // Partner inherits the same RSVP status
      if (rsvp) rsvpMap.set(partner.toLowerCase(), rsvp);
    }
  }
  // Dedupe names
  const uniqueNames = [...new Set(names)];
  return { names: uniqueNames, partnerMap, rsvpMap };
}

const meals = [
  { value: 'shortrib', title: '🍷 Braised Short Rib', shortTitle: 'Short Rib', tag: 'GF', color: 'meal-red', desc: 'Mashed potatoes, asparagus, crispy leeks and a rich red wine demi-glaze' },
  { value: 'chicken', title: '🍋 Lemon Rosemary Chicken', shortTitle: 'Chicken', color: 'meal-yellow', desc: 'Roasted garlic potatoes, charred seasonal vegetables, pan jus' },
  { value: 'gnocchi', title: '🍠 Sweet Potato Gnocchi', shortTitle: 'Gnocchi', tag: 'VEG', color: 'meal-orange', desc: 'Roasted seasonal vegetables, charred cauliflower, wilted baby kale, brown butter sauce, crispy sage' },
];

// Toggle to false to test the real RSVP flow in dev
const SKIP_RSVP_GATES = false;
const DEV_MODE = import.meta.env.DEV && SKIP_RSVP_GATES;

// Toggle to false to disable the password gate entirely
const REQUIRE_PASSWORD = false;

export function RsvpForm() {
  // Guest data loaded from Google Sheet (with fallback to static CSV)
  const [guestList, setGuestList] = useState([]);
  const [partnerMap, setPartnerMap] = useState(new Map());
  const [rsvpMap, setRsvpMap] = useState(new Map());
  const [guestDataLoaded, setGuestDataLoaded] = useState(false);

  // Fetch guest data from Google Sheet on mount
  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then(res => res.text())
      .then(csv => {
        const guestData = parseGuestCSV(csv);
        if (guestData.length > 0) {
          const { names, partnerMap: pMap, rsvpMap: rMap } = buildGuestMaps(guestData);
          setGuestList(names);
          setPartnerMap(pMap);
          setRsvpMap(rMap);
        }
        setGuestDataLoaded(true);
      })
      .catch(() => {
        // Fallback to static CSV (no partner data)
        setGuestDataLoaded(true);
      });
  }, []);

  // Password gate state
  const [isUnlocked, setIsUnlocked] = useState(DEV_MODE || !REQUIRE_PASSWORD);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Name verification state
  const [isVerified, setIsVerified] = useState(DEV_MODE);
  const [nameInput, setNameInput] = useState('');
  const [verifiedName, setVerifiedName] = useState(DEV_MODE ? 'Dev User' : '');
  const [pairedPartner, setPairedPartner] = useState(null); // auto-matched partner from sheet
  const [plusOneName, setPlusOneName] = useState(''); // manually entered plus-one name
  const [attending, setAttending] = useState(''); // paired: 'both'|'solo'|'none', unpaired: 'yes'|'no'
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNotOnList, setShowNotOnList] = useState(false);
  const [alreadyRsvpd, setAlreadyRsvpd] = useState(null); // 'yes' | 'no' | null
  const [editingRsvp, setEditingRsvp] = useState(false); // user chose to edit existing RSVP
  const [step, setStep] = useState(0); // wizard step: 0=attendance, 1=email, 2=meals, 3=details, 4=review

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
  const [dietaryMembers, setDietaryMembers] = useState([]); // indices of party members with dietary restrictions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);

  // Remove parent section padding when showing confirmation panels
  useEffect(() => {
    const section = document.getElementById('rsvp');
    if (!section) return;
    if (isSubmitted || isDeclined) {
      section.classList.add('!py-0');
    } else {
      section.classList.remove('!py-0');
    }
  }, [isSubmitted, isDeclined]);

  // Track visibility and animation state for conditional fields
  const [fieldState, setFieldState] = useState({
    dietaryFields: { visible: false, animating: false },
  });

  const prevValues = useRef({ hasDietary: '' });
  const animationTimers = useRef({});
  const formTopRef = useRef(null);

  // Fuzzy search configuration — rebuilds when guestList updates
  const fuse = useRef(null);
  useEffect(() => {
    fuse.current = new Fuse(guestList, {
      threshold: 0.25,
      distance: 50,
    });
  }, [guestList]);

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

  // Look up partner and set verified state
  const verifyGuest = (name) => {
    setVerifiedName(name);
    setFormData((prev) => ({ ...prev, name }));
    const partner = partnerMap.get(name.toLowerCase()) || null;
    setPairedPartner(partner);
    const existingRsvp = rsvpMap.get(name.toLowerCase()) || null;
    setAlreadyRsvpd(existingRsvp);
    setEditingRsvp(false);
    setIsVerified(true);
    setNameSuggestions([]);
    setShowNotOnList(false);
  };

  const handleNameCheck = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();

    // Check for exact full name match (case-insensitive)
    const exactMatch = guestList.find((guest) => guest.toLowerCase() === trimmedName.toLowerCase());

    if (exactMatch) {
      verifyGuest(exactMatch);
      return;
    }

    // Check for exact first name match only — no partial/prefix matching
    const input = trimmedName.toLowerCase();
    const firstNameMatches = guestList.filter(guest => {
      const firstName = guest.split(' ')[0].toLowerCase();
      return firstName === input;
    });

    if (firstNameMatches.length === 1) {
      verifyGuest(firstNameMatches[0]);
      return;
    }

    if (firstNameMatches.length > 1) {
      setNameSuggestions(firstNameMatches.slice(0, 5));
      setShowNotOnList(false);
      return;
    }

    // No exact match — show not found
    setNameSuggestions([]);
    setShowNotOnList(true);
  };

  const handleSuggestionClick = (suggestion) => {
    verifyGuest(suggestion);
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
    handleFieldVisibility('dietaryFields', formData.hasDietary, () => { setFormData((prev) => ({ ...prev, dietaryCount: '', dietaryDetails: '' })); setDietaryMembers([]); }, ['yes', 'help']);
    prevValues.current.hasDietary = formData.hasDietary;
  }, [formData.hasDietary]);

  // Calculate total party size
  const getPartySize = () => {
    if (attending === 'none' || attending === 'no') return 0;
    if (pairedPartner && attending === 'both') return 2;
    if (!pairedPartner && formData.plusOne === 'yes') return 2;
    return 1;
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Whether the attendance question has been answered
  const attendanceAnswered = attending !== '';
  // Whether guest is declining entirely
  const isDeclining = attending === 'none' || attending === 'no';
  // Party is "complete" when we know the final headcount (and they're coming)
  const partyComplete = attendanceAnswered && !isDeclining && (pairedPartner ? true : formData.plusOne !== '' || attending === 'yes');
  const allMealsSelected = getPartySize() > 0 && Array.from({ length: getPartySize() }, (_, i) => formData.mealChoices[i]).every(Boolean);

  const getGuestLabel = (index) => {
    if (index === 0) return verifiedName;
    if (pairedPartner) return pairedPartner;
    return plusOneName || 'Your plus one';
  };

  // The resolved plus-one name for email (partner name, manual name, or empty)
  const getPlusOneName = () => {
    if (pairedPartner && attending === 'both') return pairedPartner;
    if (!pairedPartner && formData.plusOne === 'yes') return plusOneName || 'Unnamed plus one';
    return '';
  };

  const toggleDietaryMember = (index) => {
    setDietaryMembers(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
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

  // Fire-and-forget update to Google Sheet via Apps Script
  const updateGoogleSheet = (payload) => {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) { console.warn('VITE_GOOGLE_SCRIPT_URL is not set'); return; }
    console.log('Updating Google Sheet:', payload);
    const url = `${scriptUrl}?data=${encodeURIComponent(JSON.stringify(payload))}`;
    fetch(url)
      .then((res) => res.text())
      .then((text) => console.log('Sheet update response:', text))
      .catch((err) => console.warn('Sheet update failed:', err));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Decline path — skip all validation, just send the decline
    if (isDeclining) {
      setIsSubmitting(true);
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      const declineParams = {
        to_email: 'emily@thisjones.com',
        from_name: formData.name,
        from_email: formData.email || 'N/A',
        plus_one: pairedPartner ? `${pairedPartner} (also declining)` : 'N/A',
        party_size: 0,
        has_dietary: 'N/A',
        dietary_count: 'N/A',
        dietary_details: 'N/A',
        meal_choices: 'DECLINED',
        welcome_party: 'N/A',
        message: formData.message || 'No message',
      };
      emailjs.send(serviceId, templateId, declineParams, publicKey)
        .then(() => {
          updateGoogleSheet({
            name: formData.name,
            rsvp: 'No',
            meal: '',
            plusOneName: pairedPartner || '',
            plusOneRsvp: pairedPartner ? 'No' : '',
            plusOneMeal: '',
            welcomeParty: false,
            email: formData.email || '',
            dietaryNames: '',
            dietaryNotes: '',
            message: formData.message || '',
          });
          setIsFadingOut(true);
          setTimeout(() => {
            setIsDeclined(true);
            scrollToRsvp();
            setIsFadingOut(false);
          }, 400);
        })
        .catch(() => alert('Oops! Something went wrong. Please try again.'))
        .finally(() => setIsSubmitting(false));
      return;
    }

    // Validate radio buttons (these will flash if not selected)
    const invalid = [];
    if (!pairedPartner && !formData.plusOne) invalid.push('plusOne');
    if (!formData.hasDietary && partyComplete) invalid.push('hasDietary');
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
      plus_one: getPlusOneName() || 'N/A',
      party_size: getPartySize(),
      has_dietary: formData.hasDietary === 'help' ? 'Needs alternative meal' : formData.hasDietary,
      dietary_count: dietaryMembers.length > 0
        ? dietaryMembers.map(i => getGuestLabel(i)).join(', ')
        : 'N/A',
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

        const guestMeal = meals.find(m => m.value === formData.mealChoices[0]);
        const plusOneMeal = getPartySize() > 1 ? meals.find(m => m.value === formData.mealChoices[1]) : null;
        updateGoogleSheet({
          name: formData.name,
          rsvp: 'Yes',
          meal: guestMeal ? guestMeal.shortTitle : '',
          plusOneName: getPlusOneName(),
          plusOneRsvp: getPartySize() > 1 ? 'Yes' : '',
          plusOneMeal: plusOneMeal ? plusOneMeal.shortTitle : '',
          welcomeParty: formData.welcomeParty === 'yes',
          email: formData.email || '',
          dietaryNames: dietaryMembers.length > 0
            ? dietaryMembers.map(i => getGuestLabel(i)).join(', ')
            : '',
          dietaryNotes: formData.dietaryDetails || '',
          message: formData.message || '',
        });

        setIsFadingOut(true);
        setTimeout(() => {
          setIsSubmitted(true);
          scrollToRsvp();
          setIsFadingOut(false);
          // Reset form
          setFormData(prev => ({
            name: prev.name,
            email: prev.email,
            plusOne: '',
            hasDietary: '',
            dietaryCount: '',
            dietaryDetails: '',
            mealChoices: {},
            welcomeParty: '',
            message: '',
          }));
          setFieldState({
            dietaryFields: { visible: false, animating: false },
          });
          prevValues.current = { hasDietary: '' };
          // Reset form selections (keep name/partner for "Update my RSVP")
          setPlusOneName('');
          setAttending('');
          setDietaryMembers([]);
          setStep(0);
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
      <div ref={formTopRef} />
      {isSubmitted ? (
        <div className='rsvp-panel'>
          <h1 className='text-center text-5xl!'>heck yeah!</h1>
          <h2 className='mb-10!'>We're so excited to celebrate with you 🎉</h2>
          {/* <p className='mb-6!'>Need to make changes?</p> */}
          <button
            type='button'
            className='step-continue-btn step-continue-ready'
            onClick={() => { setIsSubmitted(false); setStep(0); setPlusOneName(''); setAttending(''); setAlreadyRsvpd(null); setEditingRsvp(true); setFormData(prev => ({ ...prev, plusOne: '', hasDietary: '', dietaryCount: '', dietaryDetails: '', mealChoices: {}, welcomeParty: '', message: '' })); setDietaryMembers([]); setFieldState({ dietaryFields: { visible: false, animating: false } }); prevValues.current = { hasDietary: '' }; requestAnimationFrame(() => scrollToRsvp('instant')); }}
          >
            Change my RSVP
          </button>
          <p className='mt-6!'>
            For anything else, drop us a line at{' '}
            <a href='mailto:wedding@fayolle.com' className='text-primary transition-all hover:underline'>
              wedding@fayolle.com
            </a>
          </p>
        </div>
      ) : isDeclined ? (
        <div className='rsvp-panel'>
          <h1 className='text-center text-5xl!'>we'll miss you!</h1>
          <h2 className='mb-4!'>thanks for letting us know</h2>
          <p className='mb-6!'>If anything changes, you can always come back!</p>
          <button
            type='button'
            className='step-continue-btn step-continue-ready'
            onClick={() => { setIsDeclined(false); setStep(0); setPlusOneName(''); setAttending(''); setAlreadyRsvpd(null); setEditingRsvp(true); setFormData(prev => ({ ...prev, plusOne: '', hasDietary: '', dietaryCount: '', dietaryDetails: '', mealChoices: {}, welcomeParty: '', message: '' })); setDietaryMembers([]); setFieldState({ dietaryFields: { visible: false, animating: false } }); prevValues.current = { hasDietary: '' }; requestAnimationFrame(() => scrollToRsvp('instant')); }}
          >
            Update my RSVP
          </button>
          <p className='mt-6!'>
            Have questions? Reach out at{' '}
            <a href='mailto:wedding@fayolle.com' className='text-primary transition-all hover:underline'>
              wedding@fayolle.com
            </a>
          </p>
        </div>
      ) : !isUnlocked ? (
        <div className='rsvp-panel'>
          <h1 className='mb-10 mx-auto'>time to rsvp!</h1>
          <p className='text-base! mb-6'>Enter the password from your invitation to get started.</p>

          <form onSubmit={handlePasswordCheck} className='rsvp-inner-form'>
            <div className='mb-6'>
              <input
                type='text'
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                onClick={() => requestAnimationFrame(() => scrollToRsvp())}
                placeholder='Enter password'
                required
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
        <div className='rsvp-panel'>
          <h1 className='mb-10 mx-auto'>time to rsvp!</h1>

          {nameSuggestions.length > 0 ? (
            <>
              <p className='text-base! mb-6'>Did you mean one of these?</p>
              <div className='flex flex-col items-center gap-2'>
                {nameSuggestions.map((suggestion, index) => (
                  <button key={index} type='button' className='suggestion-button' onClick={() => handleSuggestionClick(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
              <button
                type='button'
                className='back-button mt-6 group'
                onClick={() => { setNameSuggestions([]); setNameInput(''); setShowNotOnList(false); }}
              >
                <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
                None of these
              </button>
            </>
          ) : showNotOnList ? (
            <>
              <p className='mb-2 text-red'>
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
                className='back-button mt-2 group'
                onClick={() => { setShowNotOnList(false); setNameInput(''); }}
              >
                <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
                Try again
              </button>
            </>
          ) : (
            <>
              <p className='text-base! mb-6'>First things first...</p>
              <form onSubmit={handleNameCheck} className='rsvp-inner-form'>
                <div className='mb-6'>
                  <input
                    type='text'
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onClick={() => requestAnimationFrame(() => scrollToRsvp())}
                    placeholder="What's your name?"
                    required
                  />
                </div>
                <button type='submit'>Check guest list</button>
              </form>
            </>
          )}
        </div>
      ) : alreadyRsvpd && !editingRsvp ? (
        <>
          <button
            type='button'
            className='not-me-button group'
            onClick={() => { setIsVerified(false); setVerifiedName(''); setNameInput(''); setPairedPartner(null); setPlusOneName(''); setAttending(''); setAlreadyRsvpd(null); setEditingRsvp(false); setStep(0); setFormData(prev => ({ ...prev, name: '', plusOne: '', mealChoices: {} })); }}
          >
            <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
            Not {verifiedName.split(' ')[0]}?
          </button>
          <div className='rsvp-panel'>
            <h1 className='text-center mb-4!'>
              {alreadyRsvpd === 'yes' ? 'you\'re all set!' : 'we got your note'}
            </h1>
            <p className='leading-10! mb-6!'>
              {alreadyRsvpd === 'yes'
                ? `Looks like you've already RSVP'd - see you soon!`
                : `We have you down as not attending. We'll miss you!`}
            </p>
            {/* <p className='text-base! mb-6!'>
              Need to make changes?
            </p> */}
            <button
              type='button'
              className='step-continue-btn step-continue-ready'
              onClick={() => setEditingRsvp(true)}
            >
              Change my RSVP
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type='button'
            className='not-me-button group'
            onClick={() => { setIsVerified(false); setVerifiedName(''); setNameInput(''); setPairedPartner(null); setPlusOneName(''); setAttending(''); setAlreadyRsvpd(null); setEditingRsvp(false); setStep(0); setFormData(prev => ({ ...prev, name: '', plusOne: '', mealChoices: {} })); }}
          >
            <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
            Not {verifiedName.split(' ')[0]}?
          </button>
          <form onSubmit={handleSubmit} className={isFadingOut ? 'fade-out' : ''}>

          {/* ═══ STEP 0: Greeting + Attendance ═══ */}
          {step === 0 && (
            <>
          <h1 className='font-sanremo-caps! text-center pt-10 text-xl! md:mb-6 mx-auto text-primary!'>hey</h1>
          <h1 className='text-center text-3xl! md:text-5xl! pt-0! mb-2! md:mb-10! mx-auto lowercase leading-12! md:leading-10! text-red!'>{verifiedName}!</h1>
          {pairedPartner && (
            <h1 className='font-sanremo-caps! text-center text-xl! mx-auto text-primary!'>and {pairedPartner.split(' ')[0]}</h1>
          )}

          <svg viewBox='-2 -2 204 16' className='w-3/4 mx-auto mt-10 mb-8' preserveAspectRatio='none' overflow='visible'>
            <path d='M0 6 Q8.3 0 16.7 6 T33.3 6 T50 6 T66.7 6 T83.3 6 T100 6 T116.7 6 T133.3 6 T150 6 T166.7 6 T183.3 6 T200 6' fill='none' stroke='var(--color-blue)' strokeWidth='3' strokeLinecap='round' />
          </svg>

          {pairedPartner ? (
            <div className='mb-6 max-inner text-center'>
              <h1 className=' text-primary! text-2xl! md:text-3xl! pb-2'>Can you make it?</h1>
              <div className='flex flex-col md:flex-row items-center gap-2 mt-3'>
                <span
                  className={`attendance-pill ${attending === 'both' ? 'attendance-pill-selected' : ''}`}
                  onClick={() => { setAttending('both'); setFormData(prev => ({ ...prev, plusOne: 'yes' })); setStep(1); requestAnimationFrame(() => scrollToRsvp()); }}
                >
                  We'll both be there!
                </span>
                <span
                  className={`attendance-pill ${attending === 'solo' ? 'attendance-pill-selected' : ''}`}
                  onClick={() => { setAttending('solo'); setFormData(prev => ({ ...prev, plusOne: 'no' })); setStep(1); requestAnimationFrame(() => scrollToRsvp()); }}
                >
                  Just me this time
                </span>
                <span
                  className={`attendance-pill attendance-pill-decline ${attending === 'none' ? 'attendance-pill-selected' : ''}`}
                  onClick={() => setAttending('none')}
                >
                  We can't make it
                </span>
              </div>
            </div>
          ) : (
            <div className='mb-6 max-inner text-center'>
              <h1 className=' text-primary! text-3xl! pb-2'>Can you make it?</h1>
              <div className='flex justify-center gap-3 mt-3'>
                <span
                  className={`attendance-pill ${attending === 'yes' ? 'attendance-pill-selected' : ''}`}
                  onClick={() => setAttending('yes')}
                >
                  Yes!
                </span>
                <span
                  className={`attendance-pill attendance-pill-decline ${attending === 'no' ? 'attendance-pill-selected' : ''}`}
                  onClick={() => setAttending('no')}
                >
                  I can't make it
                </span>
              </div>
            </div>
          )}

          {/* Decline path */}
          {isDeclining && (
              <div className='animate-in max-inner'>
                <div className='mb-6'>
                  <p>That's okay! We appreciate you letting us know, and we hope to celebrate with you another time. 💕</p>
              </div>
              <div className='mb-6'>
                <textarea
                  id='message'
                  name='message'
                  value={formData.message}
                  onChange={handleChange}
                  rows='2'
                  placeholder='Any parting words? (optional)'
                />
              </div>
              <button type='submit' disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send RSVP'}
              </button>
            </div>
          )}

          {/* Non-paired: plus one on step 0 */}
          {attending === 'yes' && !pairedPartner && (
            <div className='animate-in max-inner mt-6'>
              <div className='mb-6'>
                <label>Plus one?</label>
                <div className={`radio-group ${invalidFields.includes('plusOne') ? 'flash-invalid' : ''}`}>
                  <label className='radio-label'>
                    <input type='radio' name='plusOne' value='yes' checked={formData.plusOne === 'yes'} onChange={handleChange} />
                    Yes
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='plusOne' value='no' checked={formData.plusOne === 'no'} onChange={handleChange} />
                    No
                  </label>
                </div>
              </div>
              {formData.plusOne === 'yes' && (
                <div className='mb-6 animate-in overflow-visible!'>
                  <input
                    type='text'
                    value={plusOneName}
                    onChange={(e) => setPlusOneName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setStep(1); requestAnimationFrame(() => scrollToRsvp()); } }}
                    placeholder="What's their name?"
                  />
                </div>
              )}
              {formData.plusOne !== '' && (
                <button type='button' className='mb-1 step-continue-btn step-continue-ready mt-4' onClick={() => { setStep(1); requestAnimationFrame(() => scrollToRsvp()); }}>
                  Continue
                </button>
              )}
            </div>
          )}
            </>
          )}

          {/* ═══ STEP NAV (visible steps 1-4) ═══ */}
          {step >= 1 && (
            <div className='step-nav-row'>
              <button type='button' className='step-back-inline group' onClick={() => { setStep(step - 1); requestAnimationFrame(() => scrollToRsvp()); }}>
                <svg className='inline w-3.5 h-3.5 mr-1 -mt-px transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
                {step === 1 ? 'Start' : step === 2 ? 'Email' : step === 3 ? 'Meals' : step === 4 ? 'Dietary' : 'Details'}
              </button>
              <div className='step-nav'>
                {[
                  { label: 'Email', num: 1 },
                  { label: 'Meals', num: 2 },
                  { label: 'Dietary', num: 3 },
                  { label: 'Details', num: 4 },
                  { label: 'Review', num: 5 },
                ].map((s) => (
                  <button
                    key={s.num}
                    type='button'
                    className={`step-nav-item ${step === s.num ? 'step-nav-active' : ''} ${step > s.num ? 'step-nav-done' : ''}`}
                    onClick={() => { if (s.num < step) { setStep(s.num); requestAnimationFrame(() => scrollToRsvp()); } }}
                    disabled={s.num > step}
                  >
                    <span className='step-nav-circle'>
                      {step > s.num ? (
                        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className='w-3 h-3'><path d='M20 6L9 17l-5-5'/></svg>
                      ) : s.num}
                    </span>
                    <span className='step-nav-label'>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ STEP 1: Email ═══ */}
          {step === 1 && (
            <div className='step-panel text-center'>
              <h1 className='text-primary! text-2xl! md:text-3xl! text-center pb-2'>We'll need your email</h1>
              <p className='text-center mb-6 text-sm! md:text-lg!'>To keep track of your RSVP and follow up on possible questions!</p>
              <div className='mb-8 max-inner'>
                <input
                  type='email'
                  id='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  onClick={() => requestAnimationFrame(() => scrollToRsvp())}
                  onKeyDown={(e) => { if (e.key === 'Enter' && isValidEmail(formData.email)) { e.preventDefault(); setStep(2); requestAnimationFrame(() => scrollToRsvp()); } }}
                  required
                  placeholder='your.email@example.com'
                  autoFocus
                />
              </div>
              <div className='step-buttons'>
  
                <button type='button' className={`step-continue-btn ${isValidEmail(formData.email) ? 'step-continue-ready' : ''}`} disabled={!isValidEmail(formData.email)} onClick={() => { setStep(2); requestAnimationFrame(() => scrollToRsvp()); }}>
                  Continue to Meal Selection
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Meal Selection ═══ */}
          {step === 2 && (
            <div className='step-panel'>
              <h1 className='text-primary! text-2xl! md:text-3xl! text-center pb-2'>Meal selection</h1>

              <div className='mb-6 max-inner'>
                <div className='menu-compact'>
                  {meals.map((meal) => (
                    <div key={meal.value} className={`menu-compact-item ${meal.color}`}>
                      <span className='menu-compact-title'>{meal.title}{meal.tag && <span className='menu-compact-tag'>{meal.tag}</span>}</span>
                      <span className='menu-compact-desc'>{meal.desc}</span>
                    </div>
                  ))}
                </div>

                <div className='guest-meals mt-6'>
                  {Array.from({ length: getPartySize() }, (_, i) => (
                    <div key={i} className={`guest-meal-row ${invalidFields.includes(`meal_${i}`) ? 'flash-invalid-meal' : ''}`}>
                      <span className='guest-name'>{getGuestLabel(i)}</span>
                      <div className='meal-options'>
                        {meals.map((meal) => (
                          <span
                            key={meal.value}
                            className={`meal-pill ${meal.color} ${formData.mealChoices[i] === meal.value ? 'meal-pill-selected' : ''}`}
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

              <div className='step-buttons'>
                <button type='button' className={`step-continue-btn ${allMealsSelected ? 'step-continue-ready' : ''}`} disabled={!allMealsSelected} onClick={() => { setStep(3); requestAnimationFrame(() => scrollToRsvp()); }}>
                  Continue to Dietary
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Dietary Restrictions ═══ */}
          {step === 3 && (
            <div className='step-panel'>
              <h1 className='text-primary! text-2xl! md:text-3xl! text-center pb-2'>Dietary restrictions</h1>

              <div className='mb-6 max-inner'>
                <label className='text-center'>Anything we should know about food?</label>
                <div className={`radio-group-col ${invalidFields.includes('hasDietary') ? 'flash-invalid' : ''}`}>
                  <label className='radio-label'>
                    <input type='radio' name='hasDietary' value='no' checked={formData.hasDietary === 'no'} onChange={handleChange} />
                    Nope, the menu looks great!
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='hasDietary' value='yes' checked={formData.hasDietary === 'yes'} onChange={handleChange} />
                    Yes, there are some dietary restrictions
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='hasDietary' value='help' checked={formData.hasDietary === 'help'} onChange={handleChange} />
                    None of these options work - help us out!
                  </label>
                </div>
              </div>

              {fieldState.dietaryFields.visible && (['yes', 'help'].includes(formData.hasDietary) || fieldState.dietaryFields.animating) && (
                <div className={fieldState.dietaryFields.animating ? 'animate-out max-inner' : 'animate-in max-inner'}>
                  {getPartySize() > 1 && formData.hasDietary === 'yes' && (
                    <div className='mb-6'>
                      <label>Who has dietary restrictions?</label>
                      <div className='meal-options mt-2'>
                        {Array.from({ length: getPartySize() }, (_, i) => (
                          <span
                            key={i}
                            className={`meal-pill ${dietaryMembers.includes(i) ? 'meal-pill-selected' : ''}`}
                            onClick={() => toggleDietaryMember(i)}
                          >
                            {getGuestLabel(i)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className='mb-6'>
                    <textarea
                      id='dietaryDetails'
                      name='dietaryDetails'
                      value={formData.dietaryDetails}
                      onChange={handleChange}
                      required
                      rows='2'
                      placeholder={formData.hasDietary === 'help'
                        ? 'Tell us what you need and we\'ll make sure you\'re taken care of!'
                        : 'Vegetarian, gluten free, nut allergy? Let us know!'}
                    />
                  </div>
                </div>
              )}

              <div className='step-buttons'>
                <button type='button' className={`step-continue-btn ${formData.hasDietary !== '' ? 'step-continue-ready' : ''}`} disabled={formData.hasDietary === ''} onClick={() => { setStep(4); requestAnimationFrame(() => scrollToRsvp()); }}>
                  Continue to Last Details
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Last Details ═══ */}
          {step === 4 && (
            <div className='step-panel'>
              <h1 className='text-primary! text-2xl! md:text-3xl! text-center pb-2'>Last details</h1>

              <div className='mb-6 max-inner'>
                <label>We're hosting a casual welcome party the night before - no pressure, but would you like to join?</label>
                <div className='radio-group flex-col md:flex-row mt-5!'>
                  <label className='radio-label'>
                    <input type='radio' name='welcomeParty' value='yes' checked={formData.welcomeParty === 'yes'} onChange={handleChange} />
                    Count me in!
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='welcomeParty' value='no' checked={formData.welcomeParty === 'no'} onChange={handleChange} />
                    I'll skip this one
                  </label>
                </div>
              </div>

              <div className='mb-6 max-inner'>
                <textarea
                  id='message'
                  name='message'
                  value={formData.message}
                  onChange={handleChange}
                  rows='2'
                  placeholder='Any special requests or messages for us?'
                />
              </div>

              <div className='step-buttons'>
                <button type='button' className='step-continue-btn step-continue-ready' onClick={() => { setStep(5); requestAnimationFrame(() => scrollToRsvp()); }}>
                  Continue to Review
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: Summary / Review ═══ */}
          {step === 5 && (
            <div className='step-panel'>
              <h1 className='text-primary! text-2xl! md:text-3xl! text-center pb-4'>Review your rsvp</h1>

              <div className='rsvp-summary max-inner'>
                <div className='rsvp-summary-row'>
                  <span className='rsvp-summary-label'>Name</span>
                  <span className='rsvp-summary-value'>{verifiedName}{pairedPartner && attending === 'both' ? ` & ${pairedPartner}` : ''}</span>
                </div>
                <div className='rsvp-summary-row'>
                  <span className='rsvp-summary-label'>Email</span>
                  <span className='rsvp-summary-value'>{formData.email}</span>
                </div>
                {Array.from({ length: getPartySize() }, (_, i) => {
                  const choice = meals.find(m => m.value === formData.mealChoices[i]);
                  return (
                    <div key={i} className='rsvp-summary-row'>
                      <span className='rsvp-summary-label'>{i === 0 ? 'Meal' : ''}</span>
                      <span className='rsvp-summary-value flex items-center gap-2 flex-wrap'>
                        <span>{getGuestLabel(i)}</span>
                        {choice && (
                          <span className='relative'>
                            <span className={`summary-meal-chip ${choice.color}`}>{choice.shortTitle}</span>
                            {dietaryMembers.includes(i) && <span className='rsvp-summary-dietary' title='Has dietary needs'>⚠️</span>}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
                {formData.hasDietary !== 'no' && formData.dietaryDetails && (
                  <div className='rsvp-summary-row'>
                    <span className='rsvp-summary-label'>Dietary</span>
                    <span className='rsvp-summary-value'>{formData.dietaryDetails}</span>
                  </div>
                )}
                {formData.welcomeParty && (
                  <div className='rsvp-summary-row'>
                    <span className='rsvp-summary-label'>Party</span>
                    <span className='rsvp-summary-value'>{formData.welcomeParty === 'yes' ? 'Count me in!' : 'Skipping this one'}</span>
                  </div>
                )}
              </div>

              <p className='text-center mt-5! mb-4 text-sm!'>Does everything look good?</p>

              <div className='step-buttons justify-center'>
                <button type='submit' className='step-continue-btn step-continue-ready step-submit-btn' disabled={isSubmitting} onMouseEnter={spawnSparkles}>
                  {isSubmitting ? 'SENDING...' : 'OH YEAH!'}
                </button>
              </div>
            </div>
          )}

        </form>
        </>
      )}
    </>
  );
}
