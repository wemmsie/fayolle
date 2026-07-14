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
  const wrap = btn.closest('.rsvp-flow-form') || btn.parentElement;
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

// Guests sheet — full RSVP details (meals, kids, dietary, welcome event)
const GUESTS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1Fg_lQNt-CxaRj89w_3RcXAO7ip-qHJnVIk0sCWqpKMs/gviz/tq?tqx=out:csv&sheet=Guests';

// Parse the Guests sheet to find a specific guest's full RSVP data.
// Two-pass: prefer primary (colC) match over plus-one (colE) match so that
// duplicate-row households always return the row with the full kid data.
// Col layout: A=welcome event, B=RSVP, C=primary name, D=primary meal,
// E=plus-one name, F=plus-one meal, I=email, O=total count,
// T=kid count, U–W=kid names 1–3, X–Z=kid meals 1–3, AA=dietary, AB=food notes, AE=message
function splitCsvRows(csv) {
  // Proper CSV row splitter — respects newlines inside quoted fields
  const rows = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') { inQuotes = !inQuotes; cur += ch; }
    else if (ch === '\n' && !inQuotes) { rows.push(cur); cur = ''; }
    else { cur += ch; }
  }
  if (cur.trim()) rows.push(cur);
  return rows;
}
function parseGuestRsvpRow(csv, guestName) {
  const rows = splitCsvRows(csv.trim());
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[''`]/g, '').trim();
  const target = norm(guestName);
  const extract = (cols, isPlusOne) => ({
    welcomeEvent: cols[0] ?? '',
    meal:        isPlusOne ? (cols[5] ?? '') : (cols[3] ?? ''),
    plusOneName: isPlusOne ? (cols[2] ?? '') : (cols[4] ?? ''),
    plusOneMeal: isPlusOne ? (cols[3] ?? '') : (cols[5] ?? ''),
    kidCount:    parseInt(cols[19] ?? '0') || 0,
    kidName1: cols[20] ?? '', kidName2: cols[21] ?? '', kidName3: cols[22] ?? '',
    kidMeal1: cols[23] ?? '', kidMeal2: cols[24] ?? '', kidMeal3: cols[25] ?? '',
    dietaryNotes: cols[26] ?? '',
    foodNotes:    cols[27] ?? '',
    message:      cols[30] ?? '',
  });
  let plusOneRow = null;
  for (const row of rows) {
    const cols = (row.match(/"([^"]*)"/g) ?? []).map(c => c.replace(/"/g, '').trim());
    if (cols.length < 3) continue;
    const colC = norm(cols[2] ?? '');
    const colE = norm(cols[4] ?? '');
    if (colC === target) return extract(cols, false);
    if (colE === target && !plusOneRow) plusOneRow = extract(cols, true);
  }
  return plusOneRow || false;
}

// Parse CSV rows into guest objects (handles quoted fields)
// Clean Guests: Col D (index 3) = party invite flag (TRUE/FALSE)
// Clean Guests: Col F (index 5) = dinner invite flag (TRUE/FALSE)
// Clean Guests: Col E (index 4) = kids allowed flag (TRUE/FALSE)
function parseGuestCSV(csv) {
  const rows = csv.trim().split('\n');
  const guests = [];
  for (const row of rows) {
    const cols = row.match(/"([^"]*)"/g);
    if (!cols || cols.length < 2) continue;
    const name = cols[0].replace(/"/g, '').trim();
    const partner = cols[1].replace(/"/g, '').trim();
    const rsvp = cols[2] ? cols[2].replace(/"/g, '').trim().toLowerCase() : '';
    const partyInviteFlag = cols[3] ? cols[3].replace(/"/g, '').trim().toUpperCase() === 'TRUE' : false;
    const kidsAllowedFlag = cols[4] ? cols[4].replace(/"/g, '').trim().toUpperCase() === 'TRUE' : false;
    const dinnerInviteFlag = cols[5] ? cols[5].replace(/"/g, '').trim().toUpperCase() === 'TRUE' : false;
    if (!name) continue;
    guests.push({ name, partner: partner || null, rsvp: rsvp || null, partyInviteFlag, dinnerInviteFlag, kidsAllowedFlag });
  }
  return guests;
}

// Build lookup maps from guest data
function buildGuestMaps(guestData) {
  const names = [];
  const partnerMap = new Map(); // name (lowercase) -> partner name
  const rsvpMap = new Map(); // name (lowercase) -> 'yes' | 'no' | null
  const partyInviteMap = new Map(); // name (lowercase) -> boolean
  const dinnerInviteMap = new Map(); // name (lowercase) -> boolean
  const kidsAllowedMap = new Map(); // name (lowercase) -> boolean

  for (const { name, partner, rsvp, partyInviteFlag, dinnerInviteFlag, kidsAllowedFlag } of guestData) {
    names.push(name);
    if (rsvp) rsvpMap.set(name.toLowerCase(), rsvp);
    partyInviteMap.set(name.toLowerCase(), !!partyInviteFlag);
    dinnerInviteMap.set(name.toLowerCase(), !!dinnerInviteFlag);
    kidsAllowedMap.set(name.toLowerCase(), !!kidsAllowedFlag);
    if (partner) {
      partnerMap.set(name.toLowerCase(), partner);
      // Add partner as a guest too (so they can RSVP from either side)
      if (!guestData.some(g => g.name.toLowerCase() === partner.toLowerCase())) {
        names.push(partner);
      }
      partnerMap.set(partner.toLowerCase(), name);
      // Partner inherits the same RSVP status and household flags
      if (rsvp) rsvpMap.set(partner.toLowerCase(), rsvp);
      partyInviteMap.set(partner.toLowerCase(), !!partyInviteFlag);
      dinnerInviteMap.set(partner.toLowerCase(), !!dinnerInviteFlag);
      kidsAllowedMap.set(partner.toLowerCase(), !!kidsAllowedFlag);
    }
  }
  // Dedupe names
  const uniqueNames = [...new Set(names)];
  return { names: uniqueNames, partnerMap, rsvpMap, partyInviteMap, dinnerInviteMap, kidsAllowedMap };
}

const meals = [
  { value: 'shortrib', title: '🍷 Braised Short Rib', shortTitle: 'Short Rib', tag: 'GF', color: 'meal-red', desc: 'Mashed potatoes, asparagus, crispy leeks, rich red wine demi-glaze' },
  { value: 'chicken', title: '🍋 Lemon Rosemary Chicken', shortTitle: 'Chicken', color: 'meal-yellow', desc: 'Roasted garlic potatoes, seasonal vegetables, pan jus' },
  { value: 'gnocchi', title: '🍠 Sweet Potato Gnocchi', shortTitle: 'Gnocchi', tag: 'VEG', color: 'meal-green', desc: 'Roasted seasonal veg, charred cauliflower, baby kale, brown butter sauce, crispy sage' },
  { value: 'other', title: '✨ Other', shortTitle: 'Other', color: 'meal-blue', desc: "Skipping the meal or have specific needs — we'll follow up on the next step" },
];

// Toggle to false to test the real RSVP flow in dev
const SKIP_RSVP_GATES = false;
const DEV_MODE = import.meta.env.DEV && SKIP_RSVP_GATES;

// Toggle to false to disable the password gate entirely
const REQUIRE_PASSWORD = false;

// ← ONE PLACE to tune all RSVP transition speeds.
// Changing this value automatically updates every fade/slide animation
// via the --rsvp-anim CSS custom property.
const RSVP_ANIM_MS = 200;
document.documentElement.style.setProperty('--rsvp-anim', `${RSVP_ANIM_MS}ms`);

// Wraps children with the existing animate-in / animate-out keyframes,
// keeping content mounted during the exit animation so it slides up smoothly
// instead of snapping out of view.
function AnimatedReveal({ show, className = '', durationMs = 220, children }) {
  const [render, setRender] = useState({ mounted: !!show, animating: false });
  const timerRef = useRef(null);
  useEffect(() => {
    if (show) {
      clearTimeout(timerRef.current);
      setRender({ mounted: true, animating: false });
    } else {
      setRender(prev => {
        if (!prev.mounted || prev.animating) return prev;
        return { mounted: true, animating: true };
      });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setRender({ mounted: false, animating: false });
      }, durationMs);
    }
    return () => clearTimeout(timerRef.current);
  }, [show, durationMs]);
  if (!render.mounted) return null;
  return (
    <div className={`${render.animating ? 'animate-out' : 'animate-in'} ${className}`}>
      {children}
    </div>
  );
}

export function RsvpForm({ onOpenPlace }) {
  // Guest data loaded from Google Sheet (with fallback to static CSV)
  const [guestList, setGuestList] = useState([]);
  const [partnerMap, setPartnerMap] = useState(new Map());
  const [rsvpMap, setRsvpMap] = useState(new Map());
  const [partyInviteMap, setPartyInviteMap] = useState(new Map());
  const [dinnerInviteMap, setDinnerInviteMap] = useState(new Map());
  const [kidsAllowedMap, setKidsAllowedMap] = useState(new Map());
  const [guestDataLoaded, setGuestDataLoaded] = useState(false);

  // Fetch guest data from Google Sheet on mount
  useEffect(() => {
    fetch(SHEET_CSV_URL)
      .then(res => res.text())
      .then(csv => {
        const guestData = parseGuestCSV(csv);
        if (guestData.length > 0) {
          const { names, partnerMap: pMap, rsvpMap: rMap, partyInviteMap: piMap, dinnerInviteMap: diMap, kidsAllowedMap: kaMap } = buildGuestMaps(guestData);
          setGuestList(names);
          setPartnerMap(pMap);
          setRsvpMap(rMap);
          setPartyInviteMap(piMap);
          setDinnerInviteMap(diMap);
          setKidsAllowedMap(kaMap);
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
  const [partyInviteAvailable, setPartyInviteAvailable] = useState(false); // from Clean Guests Col D
  const [dinnerInviteAvailable, setDinnerInviteAvailable] = useState(false); // from Clean Guests Col F
  const [kidsAllowed, setKidsAllowed] = useState(false); // from Col S
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showNotOnList, setShowNotOnList] = useState(false);
  const [isGateFadingOut, setIsGateFadingOut] = useState(false);
  const [gateView, setGateView] = useState('form'); // 'form' | 'suggestions' | 'notfound'
  const [alreadyRsvpd, setAlreadyRsvpd] = useState(null); // 'yes' | 'no' | null
  const [editingRsvp, setEditingRsvp] = useState(false); // user chose to edit existing RSVP
  const [showRsvpDetailsModal, setShowRsvpDetailsModal] = useState(false);
  const [savedRsvpData, setSavedRsvpData] = useState(null); // null=pending, false=not found, object=loaded
  const [copiedAddr, setCopiedAddr] = useState(null); // key of last-copied address, clears after 2s
  const [step, setStep] = useState(0); // wizard step: 0=attendance, 1=email, 2=kids, 3=meals, 4=dietary, 5=details, 6=review
  const [maxStep, setMaxStep] = useState(0); // highest step ever reached
  const [isStepFadingOut, setIsStepFadingOut] = useState(false);
  const [isLeavingForm, setIsLeavingForm] = useState(false);
  const [gateShouldFadeIn, setGateShouldFadeIn] = useState(false);

  const handleNotMe = () => {
    setIsLeavingForm(true);
    setTimeout(() => {
      setIsVerified(false);
      setVerifiedName('');
      setNameInput('');
      setPairedPartner(null);
      setPlusOneName('');
      setAttending('');
      setAlreadyRsvpd(null);
      setSavedRsvpData(null);
      setEditingRsvp(false);
      setPartyInviteAvailable(false);
      setDinnerInviteAvailable(false);
      setKidsAllowed(false);
      setStep(0);
      setMaxStep(0);
      setIsLeavingForm(false);
      setGateView('form');
      setNameSuggestions([]);
      setShowNotOnList(false);
      setFormData(prev => ({ ...prev, name: '', plusOne: '', mealChoices: {}, kidsAttending: '', kidCount: 0, kidNames: [], kidMeals: {}, welcomeEvent: '' }));
      setGateShouldFadeIn(true);
      setTimeout(() => setGateShouldFadeIn(false), RSVP_ANIM_MS + 50);
    }, RSVP_ANIM_MS);
  };

  const goToStep = (n) => {
    // Skip the kids step (2) when going forward if kids aren't allowed
    let target = n;
    if (n === 2 && !kidsAllowed) target = 3;
    setIsStepFadingOut(true);
    scrollToRsvp();
    setTimeout(() => {
      setStep(target);
      setMaxStep(prev => Math.max(prev, target));
      setIsStepFadingOut(false);
    }, RSVP_ANIM_MS);
  };

  const [formData, setFormData] = useState({
    name: DEV_MODE ? 'Dev User' : '',
    email: '',
    plusOne: '',
    dietaryDetails: '',
    mealChoices: {},
    kidsAttending: '',  // 'yes' | 'no' | ''
    kidCount: 0,
    kidNames: [],       // array of strings, max 3
    kidMeals: {},       // { 0: 'shortrib'|'chicken'|'gnocchi'|'other'|'', ... }
    welcomeEvent: '',   // dinner invite flow: 'both'|'party'|'no'; party-only flow: 'party'|'no'
    message: '',
    otherMealResponses: {}, // { [memberIndex]: 'skip' | 'special' } — for guests who chose 'other'
    otherSpecialRequests: {}, // { [memberIndex]: string } — the actual special request text
    hasDietary: '',     // 'yes' | 'no' | '' — answer to the dietary-restrictions radio
  });
  // Render state for the dietary-note textarea — supports an exit animation
  const [dietaryNoteRender, setDietaryNoteRender] = useState({ mounted: false, animating: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);
  const [isWelcomeEventModalOpen, setIsWelcomeEventModalOpen] = useState(false);
  const [showFullNameInGreeting, setShowFullNameInGreeting] = useState(true);

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
  const [fieldState, setFieldState] = useState({});

  const prevValues = useRef({});
  const animationTimers = useRef({});
  const formTopRef = useRef(null);
  const greetingNameRef = useRef(null);
  const gateContentRef = useRef(null);
  const gateFormRef = useRef(null);
  const gateSuggestionsRef = useRef(null);
  const gateNotFoundRef = useRef(null);

  // Fuzzy search configuration — rebuilds when guestList updates
  const fuse = useRef(null);
  useEffect(() => {
    fuse.current = new Fuse(guestList, {
      threshold: 0.25,
      distance: 50,
    });
  }, [guestList]);

  const GREETING_FULL_NAME_MAX_CHARS = 18;

  // Check if greeting name wraps to multiple lines.
  // IMPORTANT: we must measure the *full* name in the DOM, not whatever is
  // currently rendered. Otherwise once state flips to `false` (first-name only),
  // a later run (e.g. after fonts load) would measure the short string, see no
  // wrap, and incorrectly flip back to `true` — stranding the user with a
  // multi-line full name.
  const checkNameWrap = () => {
    const trimmed = verifiedName.trim();
    if (!trimmed) return;

    if (trimmed.length > GREETING_FULL_NAME_MAX_CHARS) {
      setShowFullNameInGreeting(false);
      return;
    }

    // Force the full name into the DOM so the measurement below reflects
    // whether the full name would actually wrap at the current width.
    setShowFullNameInGreeting(true);

    // Two rAFs: first lets React commit the state update, second lets the
    // browser perform layout before we measure.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = greetingNameRef.current;
        if (!el) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects());
        const uniqueLineTops = new Set(rects.map((r) => Math.round(r.top)));
        const isWrapped = uniqueLineTops.size > 1;
        range.detach?.();
        if (isWrapped) setShowFullNameInGreeting(false);
      });
    });
  };

  useEffect(() => {
    checkNameWrap();
    window.addEventListener('resize', checkNameWrap);
    document.fonts?.ready?.then(checkNameWrap);
    // Re-check after fonts have had a chance to swap in and trigger reflow.
    const t = setTimeout(checkNameWrap, 250);
    return () => {
      window.removeEventListener('resize', checkNameWrap);
      clearTimeout(t);
    };
  }, [verifiedName]);

  // Animate gate content height when switching between form / suggestions / not-found views
  const prevSuggestionsLengthRef = useRef(0);
  const prevShowNotOnListRef = useRef(false);

  const animateGateHeight = (getTargetRef) => {
    const wrap = gateContentRef.current;
    if (wrap) wrap.style.height = `${wrap.offsetHeight}px`;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const target = getTargetRef();
      if (wrap && target) wrap.style.height = `${target.scrollHeight}px`;
    }));
    setTimeout(() => { if (wrap) wrap.style.height = ''; }, 430);
  };

  useEffect(() => {
    const prevLen = prevSuggestionsLengthRef.current;
    prevSuggestionsLengthRef.current = nameSuggestions.length;
    if (nameSuggestions.length > 0 && prevLen === 0) {
      setGateView('suggestions');
      animateGateHeight(() => gateSuggestionsRef.current);
    }
  }, [nameSuggestions]);

  useEffect(() => {
    const prev = prevShowNotOnListRef.current;
    prevShowNotOnListRef.current = showNotOnList;
    if (showNotOnList && !prev) {
      setGateView('notfound');
      animateGateHeight(() => gateNotFoundRef.current);
    } else if (!showNotOnList && prev) {
      setGateView('form');
      animateGateHeight(() => gateFormRef.current);
    }
  }, [showNotOnList]);

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
    const resolvedRsvp = existingRsvp === 'pend' ? null : existingRsvp;
    setAlreadyRsvpd(resolvedRsvp);
    if (resolvedRsvp) {
      setSavedRsvpData(null);
      fetch(`${GUESTS_SHEET_CSV_URL}&cb=${Date.now()}`)
        .then(res => res.text())
        .then(csv => {
          const parsed = parseGuestRsvpRow(csv, name);
          console.group(`[RSVP] Guest data for "${name}"`);
          console.log('Raw result:', parsed);
          if (parsed) {
            console.log('Meal:', parsed.meal, '| Plus-one meal:', parsed.plusOneMeal);
            console.log('Kid count:', parsed.kidCount, '| Names:', [parsed.kidName1, parsed.kidName2, parsed.kidName3].filter(Boolean));
            console.log('Kid meals:', [parsed.kidMeal1, parsed.kidMeal2, parsed.kidMeal3].filter(Boolean));
            console.log('Dietary:', parsed.dietaryNotes, '| Food notes:', parsed.foodNotes);
          }
          console.groupEnd();
          setSavedRsvpData(parsed);
        })
        .catch(() => setSavedRsvpData(false));
    }
    setPartyInviteAvailable(partyInviteMap.get(name.toLowerCase()) || false);
    setDinnerInviteAvailable(dinnerInviteMap.get(name.toLowerCase()) || false);
    setKidsAllowed(kidsAllowedMap.get(name.toLowerCase()) || false);
    setEditingRsvp(false);
    setNameSuggestions([]);
    setShowNotOnList(false);
    setIsGateFadingOut(true);
    setTimeout(() => {
      setIsVerified(true);
      setIsGateFadingOut(false);
    }, Math.round(RSVP_ANIM_MS * 0.75));
  };

  const handleSuggestionsBack = () => {
    setGateView('form');
    animateGateHeight(() => gateFormRef.current);
    setTimeout(() => {
      setNameSuggestions([]);
      setNameInput('');
      setShowNotOnList(false);
    }, 430);
  };

  const handleNameCheck = (e) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();

    // Normalize for matching: lowercase, strip accents/diacritics, strip apostrophes
    // e.g. "Sébastien" / "Sebastien" / "O'Brien" / "Obrien" all match each other
    const norm = (s) => s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[''`]/g, '');
    const normalizedInput = norm(trimmedName);

    // Check for exact full name match (accent/apostrophe-insensitive)
    const exactMatch = guestList.find((guest) => norm(guest) === normalizedInput);

    if (exactMatch) {
      verifyGuest(exactMatch);
      return;
    }

    // Check for exact first name match only — no partial/prefix matching
    const firstNameMatches = guestList.filter(guest => {
      const firstName = guest.split(' ')[0];
      return norm(firstName) === normalizedInput;
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
  const fieldToDataKey = {};

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

  // Calculate total party size
  const getPartySize = () => {
    if (attending === 'none' || attending === 'no') return 0;
    if (pairedPartner && attending === 'both') return 2;
    if (!pairedPartner && formData.plusOne === 'yes') return 2;
    return 1;
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasWelcomeInvite = partyInviteAvailable || dinnerInviteAvailable;

  const getWelcomeEventSheetValue = () => {
    if (!hasWelcomeInvite) return '';
    if (dinnerInviteAvailable) {
      if (formData.welcomeEvent === 'both') return 'Dinner';
      if (formData.welcomeEvent === 'party') return 'Party';
      return '';
    }
    if (partyInviteAvailable && formData.welcomeEvent === 'party') return 'Party';
    return '';
  };

  const getWelcomeEventEmailLabel = () => {
    if (!hasWelcomeInvite) return 'N/A (not invited)';
    if (dinnerInviteAvailable) {
      if (formData.welcomeEvent === 'both') return 'Dinner + Party';
      if (formData.welcomeEvent === 'party') return 'Party only';
      if (formData.welcomeEvent === 'no') return 'Declined both dinner and party';
      return 'No response';
    }
    if (partyInviteAvailable) {
      if (formData.welcomeEvent === 'party') return 'Party only';
      if (formData.welcomeEvent === 'no') return 'Declined party';
      return 'No response';
    }
    return 'N/A (not invited)';
  };

  const getWelcomeCardStateClasses = () => {
    if (formData.welcomeEvent === 'both') {
      return { dinner: 'welcome-pop-soft', party: 'welcome-pop-soft', divider: 'welcome-divider-pop' };
    }
    if (formData.welcomeEvent === 'party') {
      return { dinner: 'welcome-subtle', party: 'welcome-pop', divider: 'welcome-divider-dim' };
    }
    if (formData.welcomeEvent === 'no') {
      return { dinner: 'welcome-muted', party: 'welcome-muted', divider: 'welcome-divider-dim' };
    }
    return { dinner: 'welcome-neutral', party: 'welcome-neutral', divider: 'welcome-divider-neutral' };
  };

  // Whether the attendance question has been answered
  const attendanceAnswered = attending !== '';
  // Whether guest is declining entirely
  const isDeclining = attending === 'none' || attending === 'no';
  // Party is "complete" when we know the final headcount (and they're coming)
  const partyComplete = attendanceAnswered && !isDeclining && (pairedPartner ? true : formData.plusOne !== '' || attending === 'yes');
  // Whether kid meals must be filled in (kids step says yes and at least one kid)
  const kidsEating = kidsAllowed && formData.kidsAttending === 'yes' && formData.kidCount > 0;
  const mealsStepComplete = getPartySize() > 0
    && Array.from({ length: getPartySize() }, (_, i) => formData.mealChoices[i]).every(Boolean)
    && (!kidsEating
      || Array.from({ length: formData.kidCount }, (_, i) => formData.kidMeals[i]).every(Boolean));

  // Kids step: complete when kidsAttending answered and (if yes) each kid has a name
  const kidsStepDone = formData.kidsAttending === 'no'
    || (formData.kidCount > 0
      && Array.from({ length: formData.kidCount }, (_, i) => ((formData.kidNames || [])[i] || '').trim()).every(Boolean));

  // Indices of party + kid members who selected the "Other" meal option.
  // Member indices are: 0..partySize-1 = adults, partySize..partySize+kidCount-1 = kids.
  const otherMemberIndices = (() => {
    const indices = [];
    const partySize = getPartySize();
    for (let i = 0; i < partySize; i++) {
      if (formData.mealChoices[i] === 'other') indices.push(i);
    }
    if (kidsAllowed && formData.kidsAttending === 'yes' && formData.kidCount > 0) {
      for (let i = 0; i < formData.kidCount; i++) {
        if (formData.kidMeals[i] === 'other') indices.push(partySize + i);
      }
    }
    return indices;
  })();
  const hasOtherMeal = otherMemberIndices.length > 0;
  const allOtherResponded = otherMemberIndices.every(i => !!formData.otherMealResponses[i]);
  const anyOtherSpecial = otherMemberIndices.some(i => formData.otherMealResponses[i] === 'special');
  // Total members (adults + kids if attending)
  const totalMembers = getPartySize() + (kidsAllowed && formData.kidsAttending === 'yes' && formData.kidCount > 0 ? formData.kidCount : 0);
  const hasNonOtherMembers = totalMembers - otherMemberIndices.length > 0;
  // Everyone in the party is "Other → Not eating" (nobody actually eating)
  const everyoneNotEating = hasOtherMeal
    && !hasNonOtherMembers
    && otherMemberIndices.every(i => formData.otherMealResponses[i] === 'skip');
  // Whether every Other → Special guest has typed a (non-empty) request
  const allSpecialRequestsFilled = otherMemberIndices
    .filter(i => formData.otherMealResponses[i] === 'special')
    .every(i => (formData.otherSpecialRequests[i] || '').trim() !== '');
  // Whether the dietary-note textarea should currently be visible (logical state)
  const dietaryNoteShouldShow = formData.hasDietary === 'yes' && !everyoneNotEating;

  // Drive mount + exit animation for the dietary-note textarea
  useEffect(() => {
    if (dietaryNoteShouldShow) {
      clearTimeout(animationTimers.current.dietaryNote);
      setDietaryNoteRender({ mounted: true, animating: false });
    } else if (dietaryNoteRender.mounted && !dietaryNoteRender.animating) {
      setDietaryNoteRender({ mounted: true, animating: true });
      animationTimers.current.dietaryNote = setTimeout(() => {
        setDietaryNoteRender({ mounted: false, animating: false });
      }, 220);
    }
  }, [dietaryNoteShouldShow]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wizard steps definition (dynamic based on kidsAllowed)
  // Absolute step numbers: 1=Email, 2=Kids(optional), 3=Meals, 4=Dietary, 5=Details, 6=Review
  const stepDefs = [
    { num: 1, label: 'Email' },
    ...(kidsAllowed ? [{ num: 2, label: 'Kids' }] : []),
    { num: 3, label: 'Dinner' },
    { num: 4, label: 'Dietary' },
    { num: 5, label: 'Details' },
    { num: 6, label: 'Review' },
  ];

  // Whether each step's data is fully filled (keyed by absolute step number)
  const stepComplete = {
    1: isValidEmail(formData.email),
    2: formData.kidsAttending !== '' && kidsStepDone,
    3: mealsStepComplete,
    4: (
      // All "Other" meal selections must have a follow-up response
      allOtherResponded
      // Each Other → Special needs a non-empty request typed in
      && allSpecialRequestsFilled
      && (
        everyoneNotEating
        // Otherwise the yes/no radio must be answered (and notes filled if 'yes')
        || formData.hasDietary === 'no'
        || (formData.hasDietary === 'yes' && formData.dietaryDetails.trim() !== '')
      )
    ),
    5: !hasWelcomeInvite || formData.welcomeEvent !== '', // required if invited to dinner/party
    6: false, // review is never "done" until submitted
  };

  const stepZeroContinueReady = formData.plusOne === 'no'
    || (formData.plusOne === 'yes' && plusOneName.trim() !== '');

  const verifiedFirstName = verifiedName.trim().split(/\s+/)[0] || verifiedName;

  // Kid data handlers
  const handleKidCountChange = (delta) => {
    setFormData(prev => {
      const newCount = Math.max(0, Math.min(3, (prev.kidCount || 0) + delta));
      const kidNames = Array.from({ length: newCount }, (_, i) => (prev.kidNames || [])[i] || '');
      const kidMeals = Object.fromEntries(Object.entries(prev.kidMeals || {}).filter(([i]) => +i < newCount));
      return { ...prev, kidCount: newCount, kidNames, kidMeals };
    });
  };

  const handleKidNameChange = (i, value) => {
    setFormData(prev => {
      const kidNames = [...(prev.kidNames || [])];
      kidNames[i] = value;
      return { ...prev, kidNames };
    });
  };

  const handleKidMealChange = (i, value) => {
    setFormData(prev => {
      const newChoice = prev.kidMeals[i] === value ? '' : value;
      const memberIndex = getPartySize() + i;
      const newOther = { ...prev.otherMealResponses };
      const newSpecial = { ...prev.otherSpecialRequests };
      if (newChoice !== 'other') {
        delete newOther[memberIndex];
        delete newSpecial[memberIndex];
      }
      return {
        ...prev,
        kidMeals: { ...prev.kidMeals, [i]: newChoice },
        otherMealResponses: newOther,
        otherSpecialRequests: newSpecial,
      };
    });
  };

  const getGuestLabel = (index) => {
    const partySize = getPartySize();
    if (index >= partySize) {
      const kidIndex = index - partySize;
      return (formData.kidNames || [])[kidIndex] || `Kid ${kidIndex + 1}`;
    }
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

  const handleMealChange = (guestIndex, value) => {
    setFormData(prev => {
      const newChoice = prev.mealChoices[guestIndex] === value ? '' : value;
      // If this guest is no longer 'other', drop their otherMealResponses entry
      const newOther = { ...prev.otherMealResponses };
      const newSpecial = { ...prev.otherSpecialRequests };
      if (newChoice !== 'other') {
        delete newOther[guestIndex];
        delete newSpecial[guestIndex];
      }
      return {
        ...prev,
        mealChoices: { ...prev.mealChoices, [guestIndex]: newChoice },
        otherMealResponses: newOther,
        otherSpecialRequests: newSpecial,
      };
    });
    if (invalidFields.includes(`meal_${guestIndex}`)) {
      setInvalidFields(prev => prev.filter(f => f !== `meal_${guestIndex}`));
    }
  };

  const setOtherMealResponse = (memberIndex, value) => {
    setFormData(prev => ({
      ...prev,
      otherMealResponses: { ...prev.otherMealResponses, [memberIndex]: value },
    }));
  };

  const setOtherSpecialRequest = (memberIndex, value) => {
    setFormData(prev => ({
      ...prev,
      otherSpecialRequests: { ...prev.otherSpecialRequests, [memberIndex]: value },
    }));
  };

  // Fire-and-forget update to Google Sheet via Apps Script
  const updateGoogleSheet = (payload) => {
    // Apps Script editor (standalone, source of truth):
    // https://script.google.com/home/projects/1wYQ8NpI4CClVNYY93dWstn6_6XBFciyowpxzAqFl-OVV6_pxOsIGvdom/edit
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
        welcome_party: 'Declined',
        welcome_event: 'Declined',
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
            welcomeEvent: '',
            email: formData.email || '',
            totalGuestCount: 0,
            kidCount: 0,
            kidName1: '', kidName2: '', kidName3: '', kidMeal1: '', kidMeal2: '', kidMeal3: '',
            dietaryNotes: '',
            foodNotes: '',
            message: formData.message || '',
          });
          setIsFadingOut(true);
          setTimeout(() => {
            setIsDeclined(true);
            scrollToRsvp();
            setIsFadingOut(false);
          }, RSVP_ANIM_MS);
        })
        .catch(() => alert('Oops! Something went wrong. Please try again.'))
        .finally(() => setIsSubmitting(false));
      return;
    }

    // Validate radio buttons (these will flash if not selected)
    const invalid = [];
    if (!pairedPartner && !formData.plusOne) invalid.push('plusOne');
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
      has_dietary: formData.dietaryDetails.trim() ? 'yes' : 'no',
      dietary_count: 'N/A',
      dietary_details: formData.dietaryDetails || 'None',
      meal_choices: Array.from({ length: getPartySize() }, (_, i) => {
        const choice = meals.find(m => m.value === formData.mealChoices[i]);
        const base = choice ? choice.title : 'none selected';
        const note = formData.mealChoices[i] === 'other'
          ? (formData.otherMealResponses[i] === 'skip' ? ' — won\'t be eating'
              : formData.otherMealResponses[i] === 'special'
                ? ` — special request: ${(formData.otherSpecialRequests[i] || '').trim() || 'unspecified'}`
                : '')
          : '';
        return getGuestLabel(i) + ': ' + base + note;
      }).join('\n'),
      kids: kidsAllowed && formData.kidsAttending === 'yes' && formData.kidCount > 0
        ? Array.from({ length: formData.kidCount }, (_, i) => {
            const kidName = (formData.kidNames || [])[i] || `Kid ${i + 1}`;
            const mealVal = formData.kidMeals[i];
            const mealLabel = meals.find(m => m.value === mealVal)?.title || 'N/A';
            const dietaryIndex = getPartySize() + i;
            const note = mealVal === 'other'
              ? (formData.otherMealResponses[dietaryIndex] === 'skip' ? ' — won\'t be eating'
                  : formData.otherMealResponses[dietaryIndex] === 'special'
                    ? ` — special request: ${(formData.otherSpecialRequests[dietaryIndex] || '').trim() || 'unspecified'}`
                    : '')
              : '';
            return `${kidName}: ${mealLabel}${note}`;
          }).join('\n')
        : 'N/A',
      welcome_party: getWelcomeEventEmailLabel(),
      welcome_event: getWelcomeEventEmailLabel(),
      message: formData.message,
    };

    emailjs
      .send(serviceId, templateId, templateParams, publicKey)
      .then((response) => {
        console.log('SUCCESS!', response.status, response.text);

        const guestMeal = meals.find(m => m.value === formData.mealChoices[0]);
        const plusOneMeal = getPartySize() > 1 ? meals.find(m => m.value === formData.mealChoices[1]) : null;
        const hasKids = kidsAllowed && formData.kidsAttending === 'yes' && formData.kidCount > 0;
        const kidMealLabel = (val) => val === 'other' ? 'Other' : meals.find(m => m.value === val)?.shortTitle || '';

        // Compose dietaryNotes: prefix per-guest "Other" special requests / not-eating notes,
        // then append the free-form "anything else" textarea content.
        const specialRequestLines = [];
        const partySize = getPartySize();
        for (let i = 0; i < partySize; i++) {
          if (formData.mealChoices[i] !== 'other') continue;
          const fullLabel = getGuestLabel(i) || '';
          const firstName = (fullLabel.trim().split(/\s+/)[0]) || fullLabel || `Guest ${i + 1}`;
          const response = formData.otherMealResponses[i];
          if (response === 'skip') {
            specialRequestLines.push(`${firstName}: not eating`);
          } else if (response === 'special') {
            const text = (formData.otherSpecialRequests[i] || '').trim();
            specialRequestLines.push(`${firstName}: ${text || 'special request (unspecified)'}`);
          }
        }
        if (hasKids) {
          for (let i = 0; i < formData.kidCount; i++) {
            if (formData.kidMeals[i] !== 'other') continue;
            const dietaryIndex = partySize + i;
            const rawName = (formData.kidNames || [])[i] || '';
            const firstName = rawName ? (rawName.split(/\s+/)[0] || rawName) : `Kid ${i + 1}`;
            const response = formData.otherMealResponses[dietaryIndex];
            if (response === 'skip') {
              specialRequestLines.push(`${firstName}: not eating`);
            } else if (response === 'special') {
              const text = (formData.otherSpecialRequests[dietaryIndex] || '').trim();
              specialRequestLines.push(`${firstName}: ${text || 'special request (unspecified)'}`);
            }
          }
        }
        const composedDietaryNotes = specialRequestLines.join('\n');
        const composedFoodNotes = (formData.dietaryDetails || '').trim();

        updateGoogleSheet({
          name: formData.name,
          rsvp: 'Yes',
          meal: guestMeal ? guestMeal.shortTitle : '',
          plusOneName: getPlusOneName(),
          plusOneRsvp: getPartySize() > 1 ? 'Yes' : '',
          plusOneMeal: plusOneMeal ? plusOneMeal.shortTitle : '',
          welcomeEvent: getWelcomeEventSheetValue(),
          email: formData.email || '',
          totalGuestCount: getPartySize() + (hasKids ? formData.kidCount : 0),
          kidCount: hasKids ? formData.kidCount : 0,
          kidName1: hasKids ? ((formData.kidNames || [])[0] || '') : '',
          kidName2: hasKids ? ((formData.kidNames || [])[1] || '') : '',
          kidName3: hasKids ? ((formData.kidNames || [])[2] || '') : '',
          kidMeal1: hasKids ? kidMealLabel(formData.kidMeals[0]) : '',
          kidMeal2: hasKids ? kidMealLabel(formData.kidMeals[1]) : '',
          kidMeal3: hasKids ? kidMealLabel(formData.kidMeals[2]) : '',
          dietaryNotes: composedDietaryNotes,
          foodNotes: composedFoodNotes,
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
            dietaryDetails: '',
            mealChoices: {},
            kidsAttending: '',
            kidCount: 0,
            kidNames: [],
            kidMeals: {},
            welcomeEvent: '',
            message: '',
            otherMealResponses: {},
            otherSpecialRequests: {},
            hasDietary: '',
          }));
          // Reset form selections (keep name/partner for "Update my RSVP")
          setPlusOneName('');
          setAttending('');
          setStep(0);
        }, RSVP_ANIM_MS);
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
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Clear free-form notes when user explicitly says "no dietary needs"
      if (name === 'hasDietary' && value === 'no') {
        next.dietaryDetails = '';
      }
      return next;
    });
    // Clear validation error when field is filled
    if (invalidFields.includes(name)) {
      setInvalidFields(invalidFields.filter((field) => field !== name));
    }
  };

  const handleCopyAddr = (text, key) => {
    const done = () => {
      setCopiedAddr(key);
      setTimeout(() => setCopiedAddr(prev => prev === key ? null : prev), 2200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove(); done();
    }
  };

  return (
    <>
      <div ref={formTopRef} />
      {showRsvpDetailsModal && (
        <div
          className='modal-backdrop'
          onClick={(e) => { if (e.target === e.currentTarget) setShowRsvpDetailsModal(false); }}
        >
          <div className='modal-content'>
            <button className='modal-close' onClick={() => setShowRsvpDetailsModal(false)} aria-label='Close'>&times;</button>
            <div className='modal-body pb-0!'>
              <h2 className='modal-name text-center! mb-1! font-sanremo-caps! text-xl! tracking-wide!'>Your RSVP</h2>
              <p className='text-center text-text-light mb-4!'>Here's what we have on file for you.</p>
              <div className='rsvp-summary'>
                <div className='rsvp-summary-row'>
                  <span className='rsvp-summary-label'>RSVP</span>
                  <span className='rsvp-summary-value'>
                    {alreadyRsvpd === 'yes'
                      ? <span className='text-green-600 font-medium'>✓ Attending</span>
                      : <span className='text-red font-medium'>✗ Not attending</span>}
                  </span>
                </div>
                {/* Meals + kids — loaded from Guests sheet */}
                {alreadyRsvpd === 'yes' && savedRsvpData === null && (
                  <div className='rsvp-summary-row rsvp-summary-divide'>
                    <span className='rsvp-summary-label'>Guests</span>
                    <span className='rsvp-summary-value text-text-light text-xs! italic'>Loading…</span>
                  </div>
                )}
                {alreadyRsvpd === 'yes' && savedRsvpData && (() => {
                  const findMeal = (s) => meals.find(m =>
                    m.shortTitle.toLowerCase() === (s || '').toLowerCase() ||
                    m.value.toLowerCase() === (s || '').toLowerCase()
                  );
                  const guestFirst = verifiedName.trim().split(/\s+/)[0];
                  const guestMeal = findMeal(savedRsvpData.meal);
                  const plusFirst = (savedRsvpData.plusOneName || '').trim().split(/\s+/)[0];
                  const plusMeal = findMeal(savedRsvpData.plusOneMeal);
                  const effectiveKidCount = savedRsvpData.kidCount
                    || [savedRsvpData.kidName1, savedRsvpData.kidName2, savedRsvpData.kidName3].filter(Boolean).length;
                  const kids = [
                    { name: savedRsvpData.kidName1, meal: savedRsvpData.kidMeal1 },
                    { name: savedRsvpData.kidName2, meal: savedRsvpData.kidMeal2 },
                    { name: savedRsvpData.kidName3, meal: savedRsvpData.kidMeal3 },
                  ].slice(0, effectiveKidCount).filter(k => k.name);
                  return (
                    <>
                      {guestMeal && (
                        <div className='rsvp-summary-row rsvp-summary-divide'>
                          <span className='rsvp-summary-label'>Guests</span>
                          <span className='rsvp-summary-value flex items-center gap-2 flex-wrap'>
                            <span>{guestFirst}</span>
                            <span className={`summary-meal-chip ${guestMeal.color}`}>{guestMeal.shortTitle}</span>
                          </span>
                        </div>
                      )}
                      {plusFirst && plusMeal && (
                        <div className='rsvp-summary-row'>
                          <span className='rsvp-summary-label'></span>
                          <span className='rsvp-summary-value flex items-center gap-2 flex-wrap'>
                            <span>{plusFirst}</span>
                            <span className={`summary-meal-chip ${plusMeal.color}`}>{plusMeal.shortTitle}</span>
                          </span>
                        </div>
                      )}
                      {kids.map((kid, i) => {
                        const kidFirst = kid.name.trim().split(/\s+/)[0] || kid.name;
                        const kidMeal = findMeal(kid.meal);
                        return (
                          <div key={i} className={`rsvp-summary-row${i === 0 ? ' rsvp-summary-divide' : ''}`}>
                            <span className='rsvp-summary-label'>{i === 0 ? 'Kids' : ''}</span>
                            <span className='rsvp-summary-value flex items-center gap-2 flex-wrap'>
                              <span>{kidFirst}</span>
                              {kidMeal && <span className={`summary-meal-chip ${kidMeal.color}`}>{kidMeal.shortTitle}</span>}
                            </span>
                          </div>
                        );
                      })}
                      {(savedRsvpData.dietaryNotes || savedRsvpData.foodNotes) && (
                        <div className='rsvp-summary-row rsvp-summary-divide'>
                          <span className='rsvp-summary-label'>⚠️</span>
                          <span className='rsvp-summary-value text-red/80! text-sm!'>
                            {[savedRsvpData.dietaryNotes, savedRsvpData.foodNotes].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
                {(dinnerInviteAvailable || partyInviteAvailable) && alreadyRsvpd === 'yes' && (
                  <div className='rsvp-summary-row rsvp-summary-divide'>
                    <span className='rsvp-summary-label'>Fri Aug 7</span>
                    <span className='rsvp-summary-value flex flex-col gap-1.5 items-start cursor-pointer group' onClick={() => handleCopyAddr('1932 W Division St, Chicago, IL 60622', 'perch')}>
                      <span className='flex flex-wrap md:flex-nowrap gap-0 relative items-start'>
                        {dinnerInviteAvailable && (
                          <span className='text-white bg-primary font-sanremo-caps rotate-1 px-2 text-sm! py-0.5! tracking-wide inline-block'>
                            Dinner · 5-7:30 PM
                          </span>
                        )}
                        {dinnerInviteAvailable && partyInviteAvailable && (
                          <span className='welcome-divider font-sanremo-caps text-[30px]! leading-none w-0 h-0 relative! mr-2 bottom-3! inline-block translate-none! left-auto!'>&amp;</span>
                        )}
                        {partyInviteAvailable && (
                          <span className='text-white bg-red px-2 text-sm! py-0.5! font-sanremo-caps -rotate-1 tracking-wide inline-block'>
                            Party · 7:30-10 PM
                          </span>
                        )}
                      </span>
                      <div
                        className='address relative'
                      >
                        {copiedAddr === 'perch' && <span className='copy-tooltip'>address copied!</span>}
                        <div className='pin'>📍</div>
                        <div>The Perch · 1932 W Division St, Chicago</div>
                      </div>
                    </span>
                  </div>
                )}
                <div className='rsvp-summary-row rsvp-summary-divide'>
                    <span className='rsvp-summary-label'>Sat Aug 8</span>
                    <span className='rsvp-summary-value flex flex-col gap-1 items-start cursor-pointer group' onClick={() => handleCopyAddr('2545 W Diversey Ave, Chicago, IL 60618', 'greenhouse')}>
                        <span className='text-white bg-blue-dark px-2 text-sm! py-0.5! font-sanremo-caps rotate-1 tracking-wider'>
                          Wedding · 4-11 PM
                      </span>
                      <div
                        className='address'
                      >
                        {copiedAddr === 'greenhouse' && <span className='copy-tooltip'>address copied!</span>}
                        <div className='pin'>📍</div>
                        <div>Greenhouse Loft · 2545 W Diversey Ave, Chicago</div>
                      </div>
                    </span>
                  </div>
              </div>
            </div>
            <div className='flex flex-col sm:flex-row items-center justify-center gap-3 px-8 py-6'>
              <button
                type='button'
                className='pill w-full sm:w-auto justify-center border-primary/20! text-primary/50! hover:bg-transparent! hover:text-primary! hover:border-primary/30!'
                style={{background: 'color-mix(in srgb, var(--color-primary) 4%, transparent)'}}
                onClick={() => setShowRsvpDetailsModal(false)}
              >
                Looks good ✓
              </button>
              <button
                type='button'
                className='pill w-full sm:w-auto justify-center border-red/30! text-red! hover:bg-red! hover:text-white! hover:border-red!'
                style={{background: 'color-mix(in srgb, var(--color-red) 6%, transparent)'}}
                onClick={() => {
                  setShowRsvpDetailsModal(false);
                  setEditingRsvp(true);
                  if (savedRsvpData) {
                    const findMeal = (s) => meals.find(m =>
                      m.shortTitle.toLowerCase() === (s || '').toLowerCase() ||
                      m.value.toLowerCase() === (s || '').toLowerCase()
                    );
                    // Preload adult meal choices (index 0 = guest, index 1 = plus-one)
                    const mealChoices = {};
                    const guestMeal = findMeal(savedRsvpData.meal);
                    if (guestMeal) mealChoices[0] = guestMeal.value;
                    if (savedRsvpData.plusOneName) {
                      const plusMeal = findMeal(savedRsvpData.plusOneMeal);
                      if (plusMeal) mealChoices[1] = plusMeal.value;
                    }
                    // Preload kids
                    const ekc = savedRsvpData.kidCount
                      || [savedRsvpData.kidName1, savedRsvpData.kidName2, savedRsvpData.kidName3].filter(Boolean).length;
                    const kidNames = ekc > 0
                      ? [savedRsvpData.kidName1, savedRsvpData.kidName2, savedRsvpData.kidName3].slice(0, ekc).map(n => n || '')
                      : undefined;
                    const kidMeals = {};
                    if (ekc > 0) {
                      [savedRsvpData.kidMeal1, savedRsvpData.kidMeal2, savedRsvpData.kidMeal3]
                        .slice(0, ekc)
                        .forEach((shortTitle, i) => {
                          const m = meals.find(x => x.shortTitle.toLowerCase() === (shortTitle || '').toLowerCase());
                          if (m) kidMeals[i] = m.value;
                        });
                    }
                    setFormData(prev => ({
                      ...prev,
                      mealChoices,
                      ...(ekc > 0 ? { kidCount: ekc, kidNames, kidMeals } : {}),
                    }));
                  }
                }}
              >
                Change Something
              </button>
            </div>
          </div>
        </div>
      )}
      {isSubmitted ? (
        <div className='rsvp-panel relative'>
          <h1 className='text-center text-5xl!'>heck yeah!</h1>
          <p className='mb-2!'>We're so excited to celebrate with you 🎉</p>
          <p>If you have any questions, drop us a line at{' '}
            <a href='mailto:wedding@fayolle.com' className='text-red! transition-all hover:underline'>
              wedding@fayolle.com
            </a></p>
          <button
            type='button'
            className='step-continue-btn step-continue-ready'
            onClick={() => { setIsSubmitted(false); setStep(0); setMaxStep(0); setPlusOneName(''); setAttending(''); setAlreadyRsvpd(null); setEditingRsvp(true); setFormData(prev => ({ ...prev, plusOne: '', dietaryDetails: '', mealChoices: {}, kidsAttending: '', kidCount: 0, kidNames: [], kidMeals: {}, welcomeEvent: '', message: '', otherMealResponses: {}, otherSpecialRequests: {}, hasDietary: '' })); requestAnimationFrame(() => scrollToRsvp('instant')); }}
          >
            Change RSVP
          </button>
          <p className='mt-8!'>Need to change something?</p>
        </div>
      ) : isDeclined ? (
        <div className='rsvp-panel'>
          <h1 className='text-center text-5xl!'>we'll miss you!</h1>
          <h2 className='mb-4!'>thanks for letting us know</h2>
          <p className='mb-6!'>If anything changes, you can always come back!</p>
          <button
            type='button'
            className='step-continue-btn step-continue-ready'
            onClick={() => { setIsDeclined(false); setStep(0); setMaxStep(0); setPlusOneName(''); setAttending(''); setAlreadyRsvpd(null); setEditingRsvp(true); setFormData(prev => ({ ...prev, plusOne: '', dietaryDetails: '', mealChoices: {}, kidsAttending: '', kidCount: 0, kidNames: [], kidMeals: {}, welcomeEvent: '', message: '', otherMealResponses: {}, otherSpecialRequests: {}, hasDietary: '' })); requestAnimationFrame(() => scrollToRsvp('instant')); }}
          >
            Change RSVP
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
        <div className={`rsvp-panel${isGateFadingOut ? ' fade-out' : ''}${gateShouldFadeIn ? ' step-panel' : ''}`}>
          <h1 className='mb-10 mx-auto'>time to rsvp!</h1>

          {/* Height-animated wrapper — all three panels live here simultaneously */}
          <div
            ref={gateContentRef}
            style={{ position: 'relative', overflow: 'visible', transition: 'height 0.42s cubic-bezier(0.4,0,0.2,1)' }}
          >
            {/* Form panel — active when gateView === 'form' */}
            <div
              ref={gateFormRef}
              style={{
                opacity: gateView === 'form' ? 1 : 0,
                pointerEvents: gateView === 'form' ? 'auto' : 'none',
                transition: 'opacity 0.15s ease',
                position: gateView !== 'form' ? 'absolute' : 'relative',
                top: 0, left: 0, right: 0,
                paddingBottom: '2.75rem',
              }}
            >
              <p className='text-base! mb-6'>First things first...</p>
              <form id='name-check-form' onSubmit={handleNameCheck} className='rsvp-inner-form'>
                <div className='mb-0'>
                  <input
                    type='text'
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onClick={() => requestAnimationFrame(() => scrollToRsvp())}
                    placeholder="What's your first or full name?"
                    autocomplete="name"
                    required
                  />
                </div>
              </form>
              <div className='step-actions justify-center'>
                <button
                  type='submit'
                  form='name-check-form'
                  className={`step-continue-btn -bottom-10! ${nameInput.trim() ? 'step-continue-ready' : ''}`}
                  disabled={!nameInput.trim()}
                >
                  Check list
                </button>
              </div>
            </div>

            {/* Suggestions panel — active when gateView === 'suggestions' */}
            <div
              ref={gateSuggestionsRef}
              style={{
                opacity: gateView === 'suggestions' ? 1 : 0,
                pointerEvents: gateView === 'suggestions' ? 'auto' : 'none',
                transition: 'opacity 0.15s ease',
                position: gateView !== 'suggestions' ? 'absolute' : 'relative',
                top: 0, left: 0, right: 0,
              }}
            >
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
                onClick={handleSuggestionsBack}
              >
                <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
                None of these
              </button>
            </div>

            {/* Not-found panel — active when gateView === 'notfound' */}
            <div
              ref={gateNotFoundRef}
              style={{
                opacity: gateView === 'notfound' ? 1 : 0,
                pointerEvents: gateView === 'notfound' ? 'auto' : 'none',
                transition: 'opacity 0.15s ease',
                position: gateView !== 'notfound' ? 'absolute' : 'relative',
                top: 0, left: 0, right: 0,
              }}
            >
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
            </div>
          </div>
        </div>
      ) : alreadyRsvpd && !editingRsvp ? (
        <div className={isLeavingForm ? 'step-fade-out' : 'step-panel'}>
          <button
            type='button'
            className='not-me-button group'
            onClick={handleNotMe}
          >
            <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
            Not {verifiedName}?
          </button>
          <div className='rsvp-panel'>
            <h1 className='text-center mb-4!'>
              {alreadyRsvpd === 'yes' ? 'you\'re all set!' : 'we got your note'}
            </h1>
            <p className='mb-3! mt-8! tracking-wide!'>👋 Hi, <span className='font-sanremo-caps! text-red!'>{verifiedName}</span></p>
            <p className='mb-6!'>
              {alreadyRsvpd === 'yes'
                ? `Looks like you've already RSVP'd - see you soon!`
                : `We have you down as not attending. We'll miss you!`}
            </p>
            <button
              type='button'
              className='step-continue-btn step-continue-ready mb-3!'
              onClick={() => setShowRsvpDetailsModal(true)}
            >
              View RSVP
            </button>
          </div>
        </div>
      ) : (
        <div className={isLeavingForm ? 'step-fade-out' : undefined}>
          {step <= 1 ? (
            <button
              type='button'
              className='not-me-button group'
              onClick={handleNotMe}
            >
              <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
              Not {verifiedName}?
            </button>
          ) : (() => {
            const prevDef = [...stepDefs].reverse().find((s) => s.num < step);
            const prevNum = prevDef ? prevDef.num : 0;
            const prevLabel = prevDef ? prevDef.label.toLowerCase() : 'start';
            return (
              <button
                type='button'
                className='not-me-button group'
                onClick={() => goToStep(prevNum)}
              >
                <svg className='inline w-4 h-4 mr-1 -mt-0.5 transition-transform group-hover:-translate-x-1' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round'><path d='M19 12H5M12 19l-7-7 7-7'/></svg>
                Back to <b key={prevLabel} className='back-label-swap'>{prevLabel}</b>
              </button>
            );
          })()}
          <form onSubmit={handleSubmit} className={`rsvp-flow-form ${isFadingOut ? 'fade-out' : ''}`}>

          {/* ═══ STEP 0: Greeting + Attendance ═══ */}
          {step === 0 && (
            <div className={isStepFadingOut ? 'step-fade-out' : 'step-panel'}>
          <h1 className='font-sanremo-caps! text-center pt-10 text-xl! md:mb-6 mx-auto text-primary!'>hey</h1>
          <h1 ref={greetingNameRef} className='text-center text-4xl! md:text-5xl! pt-0! mb-2! md:mb-6! mx-auto lowercase leading-15! md:leading-10! text-red!'>{showFullNameInGreeting ? verifiedName : verifiedFirstName}!</h1>
          {pairedPartner && (
            <h1 className='font-sanremo-caps! text-center text-xl! mx-auto text-primary!'>and {pairedPartner.split(' ')[0]}</h1>
          )}

          <svg viewBox='-2 -2 204 16' className='w-3/4 mx-auto mt-5 md:mt-10 mb-3' preserveAspectRatio='none' overflow='visible'>
            <path d='M0 6 Q8.3 0 16.7 6 T33.3 6 T50 6 T66.7 6 T83.3 6 T100 6 T116.7 6 T133.3 6 T150 6 T166.7 6 T183.3 6 T200 6' fill='none' stroke='var(--color-blue)' strokeWidth='3' strokeLinecap='round' />
          </svg>

          {pairedPartner ? (
            <div className='mb-6 max-inner text-center'>
              <h1 className='text-primary! step-title pb-2'>Can you make it?</h1>
              <div className='flex flex-col md:flex-row items-center gap-2 mt-3 justify-center'>
                <span
                  className={`attendance-pill ${attending === 'both' ? 'attendance-pill-selected' : ''}`}
                  onClick={() => { setAttending('both'); setFormData(prev => ({ ...prev, plusOne: 'yes' })); }}
                >
                  We'll be there!
                </span>
                <span
                  className={`attendance-pill ${attending === 'solo' ? 'attendance-pill-selected' : ''}`}
                  onClick={() => { setAttending('solo'); setFormData(prev => ({ ...prev, plusOne: 'no' })); }}
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
            <>
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
            </div>
            <div className='step-actions justify-center'>
              <button type='submit' className='step-continue-btn step-continue-ready' disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send RSVP'}
              </button>
            </div>
            </>
          )}

          {/* Paired: continue after attendance is chosen */}
          {pairedPartner && !isDeclining && (
            <div className='step-actions justify-center'>
              <button
                type='button'
                className={`step-continue-btn ${(attending === 'both' || attending === 'solo') ? 'step-continue-ready' : ''}`}
                disabled={!(attending === 'both' || attending === 'solo')}
                onClick={() => goToStep(1)}
              >
                Continue
              </button>
            </div>
          )}

          {/* Non-paired: plus one on step 0 */}
          {attending === 'yes' && !pairedPartner && (
            <>
            <div className='animate-in max-inner mt-6'>
              <div className='mb-6 flex flex-col items-center'>
                <label className='w-full text-center mb-3'>Plus one?</label>
                <div className='flex justify-center gap-3'>
                  <span
                    className={`attendance-pill ${formData.plusOne === 'yes' ? 'attendance-pill-selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, plusOne: 'yes' }))}
                  >
                    Plus One
                  </span>
                  <span
                    className={`attendance-pill ${formData.plusOne === 'no' ? 'attendance-pill-selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, plusOne: 'no' }))}
                  >
                    Just me
                  </span>
                </div>
              </div>
              {formData.plusOne === 'yes' && (
                <div className='mb-6 animate-in overflow-visible!'>
                  <input
                    type='text'
                    value={plusOneName}
                    onChange={(e) => setPlusOneName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && stepZeroContinueReady) {
                        e.preventDefault();
                        goToStep(1);
                      }
                    }}
                    placeholder="What's their name?"
                    autocomplete="name"
                  />
                </div>
              )}
            </div>
            <div className='step-actions justify-center'>
              <button
                type='button'
                className={`mb-1 step-continue-btn mt-4 ${stepZeroContinueReady ? 'step-continue-ready' : ''}`}
                disabled={!stepZeroContinueReady}
                onClick={() => goToStep(1)}
              >
                Continue
              </button>
            </div>
            </>
          )}
            </div>
          )}

          {/* ═══ STEP NAV (visible on steps 1+) ═══ */}
          {step >= 1 && (
            <div className='step-nav-row step-panel'>
              <div className='step-nav'>
                {stepDefs.map((s, displayIdx) => {
                  const displayNum = displayIdx + 1;
                  const isDone = step > s.num && stepComplete[s.num];
                  const isAhead = s.num > step && s.num <= maxStep && stepComplete[s.num];
                  const isVisited = s.num <= maxStep && step !== s.num;
                  return (
                  <button
                    key={s.num}
                    type='button'
                    className={`step-nav-item ${
                      step === s.num ? 'step-nav-active' :
                      isDone ? 'step-nav-done' :
                      isAhead ? 'step-nav-ahead' :
                      isVisited ? 'step-nav-done' : ''
                    }`}
                    onClick={() => { if (s.num <= maxStep) goToStep(s.num); }}
                    disabled={s.num > maxStep}
                  >
                    <span className='step-nav-circle'>
                      {(isDone || isAhead) ? (
                        <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' className='w-3 h-3'><path d='M20 6L9 17l-5-5'/></svg>
                      ) : displayNum}
                    </span>
                    <span className='step-nav-label'>{s.label}</span>
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ STEP 1: Email ═══ */}
          {step === 1 && (
            <div className={`${isStepFadingOut ? 'step-fade-out' : 'step-panel'} text-center`}>
              <h1 className='text-primary! step-title text-center pb-2'>We'll need your email</h1>
              <p className='text-center mb-6 text-sm! md:text-lg!'>To keep track of your RSVP and follow up on possible questions!</p>
              <div className='mb-8 max-inner'>
                <input
                  type='email'
                  id='email'
                  name='email'
                  value={formData.email}
                  onChange={handleChange}
                  onClick={() => requestAnimationFrame(() => scrollToRsvp())}
                  onKeyDown={(e) => { if (e.key === 'Enter' && isValidEmail(formData.email)) { e.preventDefault(); goToStep(2); } }}
                  required
                  placeholder='your.email@example.com'
                  autoFocus
                />
              </div>
              <div className='step-actions'>
  
                <button type='button' className={`step-continue-btn ${isValidEmail(formData.email) ? 'step-continue-ready' : ''}`} disabled={!isValidEmail(formData.email)} onClick={() => goToStep(2)}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: Meal Selection ═══ */}
          {/* ═══ STEP 2: Kids ═══ */}
          {step === 2 && (
            <div className={isStepFadingOut ? 'step-fade-out' : 'step-panel'}>
              <h1 className='text-primary! step-title text-center pb-2'>Kids coming along?</h1>

              <div className='mb-6 max-inner'>
                <div className='radio-group mt-3 md:pt-3 flex justify-center'>
                  <label className='radio-label'>
                    <input type='radio' name='kidsAttending' value='yes' checked={formData.kidsAttending === 'yes'} onChange={handleChange} />
                    Yes!
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='kidsAttending' value='no' checked={formData.kidsAttending === 'no'} onChange={handleChange} />
                    Not this time
                  </label>
                </div>
              </div>

              <AnimatedReveal show={formData.kidsAttending === 'yes'} className='max-inner'>
                {/* Kid count stepper */}
                <div className='mb-6'>
                  <label className='text-center'>How many?</label>
                  <div className='flex items-center justify-center gap-4 mt-3'>
                    <button
                      type='button'
                      className={`cursor-pointer w-9 h-9 rounded-full border-2 border-primary text-primary text-xl font-bold flex items-center justify-center hover:bg-primary hover:text-white transition-colors ${formData.kidCount <= 0 ? 'opacity-30' : ''}`}
                      onClick={() => handleKidCountChange(-1)}
                    >−</button>
                    <span className='text-2xl font-bold text-primary w-6 text-center'>{formData.kidCount}</span>
                    <button
                      type='button'
                      className={`cursor-pointer w-9 h-9 rounded-full border-2 border-primary text-primary text-xl font-bold flex items-center justify-center hover:bg-primary hover:text-white transition-colors ${formData.kidCount >= 3 ? 'opacity-30' : ''}`}
                      onClick={() => handleKidCountChange(1)}
                    >+</button>
                  </div>
                </div>

                {/* Per-kid name */}
                <AnimatedReveal show={formData.kidCount > 0}>
                  <div className='guest-meals mb-4'>
                    <label className='text-center mb-3'>What are their names?</label>
                    {Array.from({ length: formData.kidCount }, (_, i) => (
                      <div key={i} className='guest-meal-row md:flex-row items-center'>
                        <input
                          type='text'
                          value={(formData.kidNames || [])[i] || ''}
                          onChange={(e) => handleKidNameChange(i, e.target.value)}
                          placeholder={`Name`}
                          className='text-base! md:text-base! flex-1 min-w-0 py-2!'
                        />
                      </div>
                    ))}
                  </div>
                </AnimatedReveal>
              </AnimatedReveal>

              <div className='step-actions'>
                <button
                  type='button'
                  className={`step-continue-btn ${stepComplete[2] ? 'step-continue-ready' : ''}`}
                  disabled={!stepComplete[2]}
                  onClick={() => goToStep(3)}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: Meals ═══ */}
          {step === 3 && (
            <div className={isStepFadingOut ? 'step-fade-out' : 'step-panel'}>
              <h1 className='text-primary! step-title text-center pb-2'>Meal selection</h1>

              <div className='mb-6 max-inner'>
                <div className='menu-compact'>
                  {meals.filter(m => m.value !== 'other').map((meal) => {
                    const isPicked = Object.values(formData.mealChoices).includes(meal.value)
                      || (kidsEating && Object.values(formData.kidMeals).includes(meal.value));
                    return (
                    <div key={meal.value} className={`menu-compact-item ${meal.color} ${isPicked ? 'menu-compact-item-selected' : ''}`}>
                      <span className='menu-compact-title'>{meal.title}{meal.tag && <span className='menu-compact-tag'>{meal.tag}</span>}</span>
                      <span className='menu-compact-desc'>{meal.desc}</span>
                    </div>
                    );
                  })}
                </div>

                <div className='guest-meals mt-6'>
                  {Array.from({ length: getPartySize() }, (_, i) => {
                    const fullLabel = getGuestLabel(i);
                    const firstName = (fullLabel.trim().split(/\s+/)[0]) || fullLabel;
                    return (
                    <div key={i} className={`guest-meal-row ${invalidFields.includes(`meal_${i}`) ? 'flash-invalid-meal' : ''}`}>
                      <span className='guest-name text-center md:text-left mb-1 md:mb-0'>{firstName}</span>
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
                    );
                  })}

                  {/* Kid meal pickers — shown when kids are tagging along */}
                  {kidsEating && Array.from({ length: formData.kidCount }, (_, i) => {
                    const rawName = ((formData.kidNames || [])[i] || '').trim();
                    const kidFirstName = rawName ? (rawName.split(/\s+/)[0] || rawName) : `Kid ${i + 1}`;
                    return (
                      <div key={`kid-${i}`} className='guest-meal-row'>
                        <span className='guest-name text-center md:text-left mb-1 md:mb-0'>{kidFirstName}</span>
                        <div className='meal-options'>
                          {meals.map((meal) => (
                            <span
                              key={meal.value}
                              className={`meal-pill ${meal.color} ${formData.kidMeals[i] === meal.value ? 'meal-pill-selected' : ''}`}
                              onClick={() => handleKidMealChange(i, meal.value)}
                            >
                              {meal.shortTitle}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className='step-actions'>
                <button type='button' className={`step-continue-btn ${mealsStepComplete ? 'step-continue-ready' : ''}`} disabled={!mealsStepComplete} onClick={() => goToStep(4)}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: Dietary Restrictions ═══ */}
          {step === 4 && (
            <div className={isStepFadingOut ? 'step-fade-out' : 'step-panel'}>
              <h1 className='text-primary! step-title text-center pb-2'>Dietary restrictions</h1>
              {/* "Other" meal callout — appears when one or more guests picked Other */}
              {hasOtherMeal && (
                <div className='mb-6 max-inner'>
                  <div className='guest-meals pt-4'>
                    {/* <p className='pt-2 text-center'>Let's plan this out:</p> */}
                    {otherMemberIndices.map((i) => {
                      const firstName = (getGuestLabel(i).trim().split(/\s+/)[0]) || getGuestLabel(i);
                      const response = formData.otherMealResponses[i] || '';
                      return (
                        <div key={`other-${i}`}>
                          <div className='guest-meal-row'>
                            <span className='guest-name text-center md:text-left'>{firstName}</span>
                            <div className='meal-options'>
                              <span
                                className={`meal-pill ${response === 'special' ? 'meal-pill-selected' : ''}`}
                                onClick={() => setOtherMealResponse(i, 'special')}
                              >
                                Special request
                              </span>
                              <span
                                className={`meal-pill ${response === 'skip' ? 'meal-pill-selected' : ''}`}
                                onClick={() => setOtherMealResponse(i, 'skip')}
                              >
                                Not eating
                              </span>
                            </div>
                          </div>
                          <AnimatedReveal show={response === 'special'} className='mt-2 mb-3'>
                            <input
                              type='text'
                              value={formData.otherSpecialRequests[i] || ''}
                              onChange={(e) => setOtherSpecialRequest(i, e.target.value)}
                              placeholder={i === 0 ? 'How can we accomodate you?' : `How can we accomodate ${firstName}?`}
                              className='text-base! py-2!'
                            />
                          </AnimatedReveal>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subtle back-link in case Other was a misclick
                  <div className='bg-primary/10 rounded-xl justify-center items-center flex flex-col p-3 mt-4 mb-4'>
                    <p className='text-base! mb-2! text-center'>
                    Need to change something?
                    </p>
                    <button
                      type='button'
                      className='meal-pill text-white! bg-primary/80! hover:bg-primary!'
                      onClick={() => goToStep(3)}
                    >
                      Back to meals
                    </button>
                  </div>
 */}

              {/* Yes/No radio — always present and selectable. Hidden when nobody is eating. */}
              {!everyoneNotEating && (
                <div className='mb-6 max-inner'>
                  <label className='text-center pb-2'>
                    {hasOtherMeal
                      ? 'Any additional allergies or dietary restrictions?'
                      : 'Any allergies or dietary restrictions to share?'}
                  </label>
                  <div className='radio-group mt-3 flex justify-center flex-col md:flex-row'>
                    <label className='radio-label'>
                      <input type='radio' name='hasDietary' value='no' checked={formData.hasDietary === 'no'} onChange={handleChange} />
                      Nope, all good
                    </label>
                    <label className='radio-label'>
                      <input type='radio' name='hasDietary' value='yes' checked={formData.hasDietary === 'yes'} onChange={handleChange} />
                      Yes, I'll share details
                    </label>
                  </div>
                </div>
              )}

              

              {/* Free-form note — animates in/out */}
              {dietaryNoteRender.mounted && (
                <div className={dietaryNoteRender.animating ? 'animate-out max-inner' : 'animate-in max-inner'}>
                  <div className='mb-6'>
                    <label className='text-center pb-2'></label>
                    <textarea
                      id='dietaryDetails'
                      name='dietaryDetails'
                      value={formData.dietaryDetails}
                      onChange={handleChange}
                      required={anyOtherSpecial || formData.hasDietary === 'yes'}
                      rows='3'
                      placeholder={'e.g. Mike has a nut allergy'}
                    />
                  </div>
                </div>
              )}



              <div className='step-actions'>
                <button type='button' className={`step-continue-btn ${stepComplete[4] ? 'step-continue-ready' : ''}`} disabled={!stepComplete[4]} onClick={() => goToStep(5)}>
                  Continue
                </button>
              </div>
            </div>
          )}
      
          {/* ═══ STEP 5: Last Details ═══ */}
          {step === 5 && (
            <div className={isStepFadingOut ? 'step-fade-out' : 'step-panel'}>
              <h1 className='text-primary! step-title text-center pb-2'>Last details</h1>

              <div className='mb-6 max-inner'>
                {dinnerInviteAvailable && (
                <>
                {(() => {
                  const welcomeCardState = getWelcomeCardStateClasses();
                  return (
                    <>
                <label className='text-center pb-2'>If you're able to make it, we'd love it if you joined us on <span className='text-blue-dark inline-block font-sanremo-caps tracking-wider'>Friday, August 7<sup>th</sup></span> at <span className='location-pill font-sanremo-caps tracking-wider' onClick={() => onOpenPlace?.('The Perch Kitchen and Tap')}>The Perch</span> for dinner and a welcome party.</label>
                <div className='welcome-mini-schedule' aria-label='Welcome event schedule'>
                  <div className={`welcome-mini-item welcome-dinner ${welcomeCardState.dinner}`}>
                    <span className='welcome-mini-name'>Dinner</span>
                    <span className='welcome-mini-time'>5:00 - 7:30 PM</span>
                  </div>
                  <div className={`welcome-divider ${welcomeCardState.divider}`}>&</div>
                  <div className={`welcome-mini-item welcome-party ${welcomeCardState.party}`}>
                    <span className='welcome-mini-name'>Party</span>
                    <span className='welcome-mini-time'>7:30 - 10:00 PM</span>
                  </div>
                </div>
                <div className='radio-group flex-col md:flex-col mt-5!'>
                  <label className='radio-label'>
                    <input type='radio' name='welcomeEvent' value='both' checked={formData.welcomeEvent === 'both'} onChange={handleChange} />
                    {(getPartySize() + ((kidsAllowed && formData.kidsAttending === 'yes') ? formData.kidCount : 0)) > 1 ? "We'll be there!" : "I'll be there!"}
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='welcomeEvent' value='party' checked={formData.welcomeEvent === 'party'} onChange={handleChange} />
                    Just the party
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='welcomeEvent' value='no' checked={formData.welcomeEvent === 'no'} onChange={handleChange} />
                    Can't make it to either
                  </label>
                </div>
                    </>
                  );
                })()}
                </>
                )}
                {!dinnerInviteAvailable && partyInviteAvailable && (
                <>
                {(() => {
                  const welcomeCardState = getWelcomeCardStateClasses();
                  return (
                    <>
                <label className='text-center pb-2'>If you're able to make it, we'd love it if you joined us on <span className='text-blue-dark inline-block font-sanremo-caps tracking-wider'>Friday, August 7th</span> at <span className='location-pill font-sanremo-caps tracking-wider' onClick={() => onOpenPlace?.('The Perch Kitchen and Tap')}>The Perch</span> for a welcome party.</label>
                <div className='welcome-mini-schedule w-full flex justify-center' aria-label='Welcome event schedule'>
                  <div className={`welcome-mini-item welcome-party max-w-100 ${welcomeCardState.party}`}>
                    <span className='welcome-mini-name'>Party</span>
                    <span className='welcome-mini-time'>7:30 - 10:00 PM</span>
                  </div>
                </div>
                <div className='radio-group flex-col justify-center md:flex-row mt-5!'>
                  <label className='radio-label'>
                    <input type='radio' name='welcomeEvent' value='party' checked={formData.welcomeEvent === 'party'} onChange={handleChange} />
                    {(getPartySize() + ((kidsAllowed && formData.kidsAttending === 'yes') ? formData.kidCount : 0)) > 1 ? "Count us in!" : "Count me in!"}
                  </label>
                  <label className='radio-label'>
                    <input type='radio' name='welcomeEvent' value='no' checked={formData.welcomeEvent === 'no'} onChange={handleChange} />
                    {(getPartySize() + ((kidsAllowed && formData.kidsAttending === 'yes') ? formData.kidCount : 0)) > 1 ? "We'll skip this one" : "I'll skip this one"}
                  </label>
                </div>
                    </>
                  );
                })()}
                </>
                )}
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

              <div className='step-actions'>
                <button type='button' className={`step-continue-btn ${stepComplete[5] ? 'step-continue-ready' : ''}`} disabled={!stepComplete[5]} onClick={() => goToStep(6)}>
                  Review
                </button>
              </div>
            </div>
          )}

          {/* ═══ STEP 6: Summary / Review ═══ */}
          {step === 6 && (
            <div className={isStepFadingOut ? 'step-fade-out' : 'step-panel'}>
              <h1 className='text-primary! step-title text-center pb-4'>Review your rsvp</h1>

              <div className='rsvp-summary max-inner'>
                <div className='rsvp-summary-row'>
                  <span className='rsvp-summary-label'>Name</span>
                  <span className='rsvp-summary-value'>{verifiedName}{pairedPartner && attending === 'both' ? ` + ${pairedPartner}` : ''}</span>
                </div>
                <div className='rsvp-summary-row rsvp-summary-divide'>
                  <span className='rsvp-summary-label'>Email</span>
                  <span className='rsvp-summary-value'>{formData.email}</span>
                </div>
                {Array.from({ length: getPartySize() }, (_, i) => {
                  const choice = meals.find(m => m.value === formData.mealChoices[i]);
                  const guestName = getGuestLabel(i);
                  const guestFirstName = guestName.trim().split(/\s+/)[0] || guestName;
                  const otherNote = formData.mealChoices[i] === 'other'
                    ? (formData.otherMealResponses[i] === 'skip' ? ' (not eating)' : formData.otherMealResponses[i] === 'special' ? ' (special)' : '')
                    : '';
                  return (
                    <div key={i} className={`rsvp-summary-row${i === 0 ? ' rsvp-summary-divide' : ''}`}>
                      <span className='rsvp-summary-label'>{i === 0 ? 'Meal' : ''}</span>
                      <span className='rsvp-summary-value flex items-center gap-2 flex-wrap'>
                        <span>{guestFirstName}</span>
                        <span className='relative'>
                          {choice ? (
                            <span className={`summary-meal-chip ${choice.color}`}>{choice.shortTitle}{otherNote}</span>
                          ) : (
                            <span className='summary-meal-chip meal-blue'>Other</span>
                          )}
                        </span>
                      </span>
                    </div>
                  );
                })}

                {kidsAllowed && formData.kidsAttending === 'yes' && formData.kidCount > 0 && (
                  Array.from({ length: formData.kidCount }, (_, i) => {
                    const kidName = (formData.kidNames || [])[i] || `Kid ${i + 1}`;
                    const kidFirstName = kidName.trim().split(/\s+/)[0] || kidName;
                    const kidMealVal = formData.kidMeals[i];
                    const kidMealChoice = meals.find(m => m.value === kidMealVal);
                    const dietaryIndex = getPartySize() + i;
                    const otherNote = kidMealVal === 'other'
                      ? (formData.otherMealResponses[dietaryIndex] === 'skip' ? ' (not eating)' : formData.otherMealResponses[dietaryIndex] === 'special' ? ' (special)' : '')
                      : '';
                    return (
                      <div key={`kid-${i}`} className='rsvp-summary-row'>
                        <span className='rsvp-summary-label'>{i === 0 ? 'Kids' : ''}</span>
                        <span className='rsvp-summary-value flex items-center gap-2 flex-wrap'>
                          <span>{kidFirstName}</span>
                          <span className='relative'>
                            {kidMealChoice ? (
                              <span className={`summary-meal-chip ${kidMealChoice.color}`}>{kidMealChoice.shortTitle}{otherNote}</span>
                            ) : (
                              <span className='summary-meal-chip meal-blue'>Other</span>
                            )}
                          </span>
                        </span>
                      </div>
                    );
                  })
                )}
                {formData.dietaryDetails && (
                  <div className='rsvp-summary-row'>
                    <span className='rsvp-summary-label'>⚠️</span>
                    <span className='rsvp-summary-value text-red/80!'>{formData.dietaryDetails}</span>
                  </div>
                )}
                {hasWelcomeInvite && formData.welcomeEvent && (
                  <div className='rsvp-summary-row rsvp-summary-divide'>
                    <span className='rsvp-summary-label'>Party</span>
                    <span className='rsvp-summary-value'>
                      {formData.welcomeEvent === 'both'
                        ? 'Dinner + party 🎉'
                        : formData.welcomeEvent === 'party'
                          ? (dinnerInviteAvailable ? 'Just the party 🎉' : 'Yes 🎉')
                          : 'Declined'}
                    </span>
                  </div>
                )}
                {formData.message && formData.message.trim() && (
                  <div className='rsvp-summary-row rsvp-summary-divide'>
                    <span className='rsvp-summary-label'>Note</span>
                    <span className='rsvp-summary-value'>{formData.message}</span>
                  </div>
                )}
              </div>

              <p className='text-center mt-5! mb-4 text-base!'>Everything look good?</p>

              <div className='step-actions step-actions-sparkle justify-center'>
                <button type='submit' className='step-continue-btn step-continue-ready step-submit-btn' disabled={isSubmitting} onMouseEnter={spawnSparkles}>
                  {isSubmitting ? "SENDING..." : "OH YEAH!"}
                </button>
              </div>
            </div>
          )}

        </form>
        </div>
      )}
    </>
  );
}
