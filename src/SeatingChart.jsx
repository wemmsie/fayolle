import { useState, useEffect, useRef, Fragment } from 'react';
import './seating.css';

// ─── Config ───────────────────────────────────────────────────────────────────
// Set VITE_SEATING_PASSWORD in your .env to change the admin password.
const SEATING_PASSWORD = import.meta.env.VITE_SEATING_PASSWORD || 'buns';
const AUTH_KEY = 'fayolle_seating_auth';

// ─── Layout ───────────────────────────────────────────────────────────────────
// Main room: 6 connected banquet tables, each made of 2–3 eight-top sections (3|2|2|2|2|3)
const MAIN_COLUMNS = [
  { label: 'Table 2', tables: ['T01', 'T02', 'T03'] },
  { label: 'Table 3', tables: ['T04', 'T05'] },
  { label: 'Table 4', tables: ['T06', 'T07'] },
  { label: 'Table 5', tables: ['T08', 'T09'] },
  { label: 'Table 6', tables: ['T10', 'T11'] },
  { label: 'Table 7', tables: ['T12', 'T13', 'T14'] },
];

// Head table section (faces the main grid, at the front of the room)
const HEAD_TABLES = [
  { id: 'HL', label: 'Head Left', seats: 8 },
  { id: 'HC', label: '♥ Bride & Groom', seats: 2 },
  { id: 'HR', label: 'Head Right', seats: 8 },
];

// Total seats: 14 × 8 + 8 + 2 + 8 = 130
const TOTAL_SEATS = 14 * 8 + 8 + 2 + 8;

// ─── Meal helpers ─────────────────────────────────────────────────────────────
function normalizeMeal(raw) {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === 'chicken') return 'chicken';
  if (s === 'gnocchi') return 'gnocchi';
  if (s === 'shortrib' || s.includes('rib')) return 'rib';
  if (s === 'other') return 'other';
  return null; // no meal / unknown
}
const MEAL_EMOJI  = { chicken: '🐓', gnocchi: '🥬', rib: '🍖', other: '✨' };
const MEAL_LABEL  = { chicken: 'Chicken', gnocchi: 'Gnocchi', rib: 'Short Rib', other: 'Other' };
const MEAL_KEYS   = ['chicken', 'gnocchi', 'rib', 'other'];

// Sub-table groupings for the meal cheat sheet
const CHEAT_SHEET_GROUPS = [
  { groupLabel: 'Table 2', rows: [
    { id: 'T01', label: '1' }, { id: 'T02', label: '2' }, { id: 'T03', label: '3' },
  ]},
  { groupLabel: 'Table 3', rows: [
    { id: 'T04', label: '4' }, { id: 'T05', label: '5' },
  ]},
  { groupLabel: 'Table 4', rows: [
    { id: 'T06', label: '6' }, { id: 'T07', label: '7' },
  ]},
  { groupLabel: 'Table 5', rows: [
    { id: 'T08', label: '8' }, { id: 'T09', label: '9' },
  ]},
  { groupLabel: 'Table 6', rows: [
    { id: 'T10', label: '10' }, { id: 'T11', label: '11' },
  ]},
  { groupLabel: 'Table 7', rows: [
    { id: 'T12', label: '12' }, { id: 'T13', label: '13' }, { id: 'T14', label: '14' },
  ]},
  { groupLabel: 'Table 1 (Head)', rows: [
    { id: 'HL', label: 'Head Left' }, { id: 'HC', label: '♥ Couple' }, { id: 'HR', label: 'Head Right' },
  ]},
];

// ─── Seat ID helpers ──────────────────────────────────────────────────────────
function topSeatIds(tableId) {
  return [1, 2, 3, 4].map(n => `${tableId}-${n}`);
}
function bottomSeatIds(tableId) {
  return [5, 6, 7, 8].map(n => `${tableId}-${n}`);
}
// For rotated banquet columns: seats 1–4 face left, 5–8 face right
function leftSeatIds(tableId) { return [1, 2, 3, 4].map(n => `${tableId}-${n}`); }
function rightSeatIds(tableId) { return [5, 6, 7, 8].map(n => `${tableId}-${n}`); }
function allSeatIds(tableId, count = 8) {
  return Array.from({ length: count }, (_, i) => `${tableId}-${i + 1}`);
}

function tableLabel(tableId) {
  // T01 → Table 1, T10 → Table 10
  const num = parseInt(tableId.replace('T', ''), 10);
  return `Table ${num}`;
}

// Name to show inside a small circle
function shortName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  return first.length > 7 ? first.slice(0, 6) + '…' : first;
}

// ─── Seat component ───────────────────────────────────────────────────────────
function Seat({ seatId, assignments, selectedGuest, onSeatClick, orphanedNames, onHover, getHlClass, drag, mealInfo, size = 44 }) {
  const name = assignments[seatId] || null;
  const occupied      = !!name;
  const isBeingMoved  = occupied && name === selectedGuest;
  const isDragging    = drag?.draggingSeat === seatId;
  const isDragOver    = drag?.dragOverSeat === seatId;
  const isDropTarget  = !occupied && (!!selectedGuest || !!drag?.draggingSeat || !!drag?.draggingGuest);
  const isOrphaned    = !!name && !!orphanedNames?.has(name);
  const hlClass       = getHlClass ? getHlClass(name) : '';
  const mealKey       = (mealInfo?.showMeals && name) ? normalizeMeal(mealInfo.meals?.[name] || '') : null;

  let stateClass;
  if (isDragging)        stateClass = 'sc-seat--dragging';
  else if (isDragOver)   stateClass = 'sc-seat--drag-over';
  else if (isBeingMoved) stateClass = 'sc-seat--moving';
  else if (occupied)     stateClass = 'sc-seat--occupied';
  else if (isDropTarget) stateClass = 'sc-seat--drop-target';
  else                   stateClass = 'sc-seat--empty';

  return (
    <div
      draggable={occupied && !drag?.locked}
      onClick={() => !drag?.draggingSeat && onSeatClick(seatId)}
      onMouseEnter={() => name && !drag?.draggingSeat && onHover?.(name)}
      onMouseLeave={() => onHover?.(null)}
      onDragStart={occupied ? e => drag?.onSeatDragStart?.(seatId, e) : undefined}
      onDragOver={e => drag?.onSeatDragOver?.(seatId, e)}
      onDragLeave={() => drag?.onSeatDragLeave?.(seatId)}
      onDrop={() => drag?.onSeatDrop?.(seatId)}
      onDragEnd={() => drag?.onSeatDragEnd?.()}
      className={`sc-seat ${stateClass}${hlClass ? ` ${hlClass}` : ''}`}
      style={{ width: size, height: size, fontSize: size > 46 ? 9 : 8 }}
    >
      {name ? shortName(name) : ''}
      {/* {name && <span className="sc-seat__tooltip">{name}</span>} */}
      {isOrphaned && <span className="sc-seat__warning">⚠️</span>}
      {mealKey && <span className="sc-seat__meal">{MEAL_EMOJI[mealKey]}</span>}
    </div>
  );
}

// ─── Table dimensions ────────────────────────────────────────────────────────
const SEAT_SIZE = 44;
const SEAT_GAP = 4;
const TABLE_WIDTH = SEAT_SIZE * 4 + SEAT_GAP * 3; // used by head tables (horizontal)
const TABLE_BAR_W = 30;                            // width of the vertical bar in banquet columns
const SECTION_H = SEAT_SIZE * 4 + SEAT_GAP * 3;   // height of one 4-seat section = 188px
const INTER_GAP = 6;                               // gap between sub-table sections in a column

function EightTopTable({ tableId, label, assignments, selectedGuest, onSeatClick, orphanedNames, onHover, getHlClass, drag, mealInfo }) {
  const isTableDragging = drag?.draggingTable === tableId;
  const isTableDragOver = drag?.dragOverTable === tableId;
  return (
    <div className="sc-eight-top">
      <div className="sc-eight-top__row">
        {topSeatIds(tableId).map(id => (
          <Seat key={id} seatId={id} assignments={assignments} selectedGuest={selectedGuest} onSeatClick={onSeatClick} orphanedNames={orphanedNames} onHover={onHover} getHlClass={getHlClass} drag={drag} mealInfo={mealInfo} />
        ))}
      </div>
      <div
        draggable
        onDragStart={e => drag?.onTableDragStart?.(tableId, e)}
        onDragOver={e => drag?.onTableDragOver?.(tableId, e)}
        onDragLeave={() => drag?.onTableDragLeave?.(tableId)}
        onDrop={() => drag?.onTableDrop?.(tableId)}
        onDragEnd={() => drag?.onTableDragEnd?.()}
        className={['sc-eight-top__bar', isTableDragging ? 'sc-bar--dragging' : '', isTableDragOver ? 'sc-bar--drag-over' : ''].filter(Boolean).join(' ')}
        style={{ width: TABLE_WIDTH }}
      >
        {label}
      </div>
      <div className="sc-eight-top__row">
        {bottomSeatIds(tableId).map(id => (
          <Seat key={id} seatId={id} assignments={assignments} selectedGuest={selectedGuest} onSeatClick={onSeatClick} orphanedNames={orphanedNames} onHover={onHover} getHlClass={getHlClass} drag={drag} mealInfo={mealInfo} />
        ))}
      </div>
    </div>
  );
}

// ─── Rotated banquet column (1–3 connected 8-tops, seats left & right) ────────
function BanquetColumn({ tableIds, label, assignments, selectedGuest, onSeatClick, orphanedNames, onHover, getHlClass, drag, mealInfo }) {
  const n = tableIds.length;
  return (
    <div className="sc-banquet">
      <div className="sc-banquet__label">{label}</div>
      <div className="sc-banquet__body">
        {/* Left seats */}
        <div className="sc-banquet__side">
          {tableIds.map((tableId, ti) => (
            <div key={tableId} className="sc-banquet__section">
              {ti > 0 && <div className="sc-banquet__gap" />}
              <div className="sc-banquet__seats">
                {leftSeatIds(tableId).map(id => (
                  <Seat key={id} seatId={id} assignments={assignments} selectedGuest={selectedGuest} onSeatClick={onSeatClick} orphanedNames={orphanedNames} onHover={onHover} getHlClass={getHlClass} drag={drag} mealInfo={mealInfo} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Table bar — one continuous bar with subtle section dividers */}
        <div className="sc-bar-col">
          {tableIds.map((tableId, ti) => (
            <div key={tableId} className="sc-banquet__section">
              {ti > 0 && <div className="sc-bar-connector" />}
              <div
                draggable
                onDragStart={e => drag?.onTableDragStart?.(tableId, e)}
                onDragOver={e => drag?.onTableDragOver?.(tableId, e)}
                onDragLeave={() => drag?.onTableDragLeave?.(tableId)}
                onDrop={() => drag?.onTableDrop?.(tableId)}
                onDragEnd={() => drag?.onTableDragEnd?.()}
                className={[
                  'sc-bar-section',
                  n === 1 ? 'sc-bar-section--solo'
                  : ti === 0 ? 'sc-bar-section--top'
                  : ti === n - 1 ? 'sc-bar-section--bottom'
                  : 'sc-bar-section--middle',
                  drag?.draggingTable === tableId ? 'sc-bar--dragging' : '',
                  drag?.dragOverTable === tableId ? 'sc-bar--drag-over' : '',
                ].filter(Boolean).join(' ')}
                style={{ height: SECTION_H }}
              >
                <span className="sc-bar-section__label">{tableLabel(tableId)}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Right seats */}
        <div className="sc-banquet__side">
          {tableIds.map((tableId, ti) => (
            <div key={tableId} className="sc-banquet__section">
              {ti > 0 && <div className="sc-banquet__gap" />}
              <div className="sc-banquet__seats">
                {rightSeatIds(tableId).map(id => (
                  <Seat key={id} seatId={id} assignments={assignments} selectedGuest={selectedGuest} onSeatClick={onSeatClick} orphanedNames={orphanedNames} onHover={onHover} getHlClass={getHlClass} drag={drag} mealInfo={mealInfo} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 2-top table (Bride & Groom) ─────────────────────────────────────────────
function TwoTopTable({ tableId, label, assignments, selectedGuest, onSeatClick, orphanedNames, onHover, getHlClass, drag, mealInfo }) {
  return (
    <div className="sc-two-top">
        <div className="sc-two-top__spacer"></div>
        <div className="sc-two-top__bar">{label}</div>
        <div className="sc-two-top__row">
            {allSeatIds(tableId, 2).map(id => (
            <Seat key={id} seatId={id} assignments={assignments} selectedGuest={selectedGuest} onSeatClick={onSeatClick} orphanedNames={orphanedNames} onHover={onHover} getHlClass={getHlClass} drag={drag} mealInfo={mealInfo} size={52} />
            ))}
        </div>
    </div>
  );
}

// ─── Meal cheat sheet ─────────────────────────────────────────────────────────
function MealCheatSheet({ assignments, meals }) {
  // Count meals per sub-table prefix (T01, T02, …, HL, HC, HR)
  const counts = {};
  for (const [seatId, name] of Object.entries(assignments)) {
    if (!name) continue;
    const tableId = seatId.split('-')[0];
    const key = normalizeMeal(meals[name] || '') || 'other';
    if (!counts[tableId]) counts[tableId] = { chicken: 0, gnocchi: 0, rib: 0, other: 0 };
    counts[tableId][key]++;
  }

  // Pre-compute group and grand totals
  const groupData = CHEAT_SHEET_GROUPS.map(({ groupLabel, rows }) => {
    const grp = { chicken: 0, gnocchi: 0, rib: 0, other: 0 };
    const dataRows = rows.map(({ id, label }) => {
      const c = counts[id] || { chicken: 0, gnocchi: 0, rib: 0, other: 0 };
      MEAL_KEYS.forEach(k => { grp[k] += c[k]; });
      return { id, label, c };
    });
    return { groupLabel, dataRows, grp };
  });
  const grand = { chicken: 0, gnocchi: 0, rib: 0, other: 0 };
  groupData.forEach(({ grp }) => MEAL_KEYS.forEach(k => { grand[k] += grp[k]; }));
  const grandTotal = MEAL_KEYS.reduce((s, k) => s + grand[k], 0);

  return (
    <div className="sc-cheatsheet">
      <table className="sc-cheatsheet__table">
        <thead>
          <tr className="sc-cheatsheet__head-row">
            <th className="sc-cheatsheet__th sc-cheatsheet__th--label">Sub-table</th>
            {MEAL_KEYS.map(k => (
              <th key={k} className="sc-cheatsheet__th">{MEAL_EMOJI[k]} {MEAL_LABEL[k]}</th>
            ))}
            <th className="sc-cheatsheet__th sc-cheatsheet__th--total">Total</th>
          </tr>
        </thead>
        <tbody>
          {groupData.map(({ groupLabel, dataRows, grp }) => {
            const grpTotal = MEAL_KEYS.reduce((s, k) => s + grp[k], 0);
            return (
              <Fragment key={groupLabel}>
                <tr className="sc-cheatsheet__group-header">
                  <td colSpan={MEAL_KEYS.length + 2}>{groupLabel}</td>
                </tr>
                {dataRows.map(({ id, label, c }) => {
                  const rowTotal = MEAL_KEYS.reduce((s, k) => s + c[k], 0);
                  return (
                    <tr key={id} className="sc-cheatsheet__row">
                      <td className="sc-cheatsheet__td sc-cheatsheet__td--label">{label}</td>
                      {MEAL_KEYS.map(k => (
                        <td key={k} className="sc-cheatsheet__td">{c[k] > 0 ? c[k] : <span className="sc-cheatsheet__zero">—</span>}</td>
                      ))}
                      <td className="sc-cheatsheet__td sc-cheatsheet__td--total">{rowTotal > 0 ? rowTotal : <span className="sc-cheatsheet__zero">—</span>}</td>
                    </tr>
                  );
                })}
                <tr className="sc-cheatsheet__subtotal">
                  <td className="sc-cheatsheet__td sc-cheatsheet__td--label">Subtotal</td>
                  {MEAL_KEYS.map(k => (
                    <td key={k} className="sc-cheatsheet__td">{grp[k] > 0 ? grp[k] : <span className="sc-cheatsheet__zero">—</span>}</td>
                  ))}
                  <td className="sc-cheatsheet__td sc-cheatsheet__td--total">{grpTotal > 0 ? grpTotal : <span className="sc-cheatsheet__zero">—</span>}</td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="sc-cheatsheet__grand-total">
            <td className="sc-cheatsheet__td sc-cheatsheet__td--label">Grand Total</td>
            {MEAL_KEYS.map(k => (
              <td key={k} className="sc-cheatsheet__td">{grand[k] > 0 ? grand[k] : <span className="sc-cheatsheet__zero">—</span>}</td>
            ))}
            <td className="sc-cheatsheet__td sc-cheatsheet__td--total">{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Unlock modal (inline password prompt for edit access) ─────────────────────
function UnlockModal({ onAuth, onClose }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(e) {
    e.preventDefault();
    if (val === SEATING_PASSWORD) {
      onAuth();
    } else {
      setErr(true);
      setVal('');
      inputRef.current?.focus();
    }
  }

  return (
    <div className="sc-unlock-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} className="sc-unlock-modal">
        <div className="sc-unlock-modal__icon">🔓</div>
        <div className="sc-unlock-modal__title">Unlock Editing</div>
        <input
          ref={inputRef}
          type="password"
          value={val}
          onChange={e => { setVal(e.target.value); setErr(false); }}
          placeholder="Password"
          className={`sc-gate__input${err ? ' sc-gate__input--error' : ''}`}
        />
        {err && <p className="sc-gate__error">Incorrect password.</p>}
        <div className="sc-unlock-modal__actions">
          <button type="button" onClick={onClose} className="sc-unlock-modal__cancel">Cancel</button>
          <button type="submit" className="sc-unlock-modal__submit">Unlock</button>
        </div>
      </form>
    </div>
  );
}

// ─── Password gate ────────────────────────────────────────────────────────────
function PasswordGate({ onAuth }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (val === SEATING_PASSWORD) {
      localStorage.setItem(AUTH_KEY, '1');
      onAuth();
    } else {
      setErr(true);
      setVal('');
    }
  }

  return (
    <div className="sc-gate">
      <form onSubmit={submit} className="sc-gate__form">
        <div className="sc-gate__icon">🪑</div>
        <h1 className="sc-gate__title">Seating Chart</h1>
        <p className="sc-gate__sub">Admin access only</p>
        <input
          type="password" value={val} autoFocus
          onChange={e => { setVal(e.target.value); setErr(false); }}
          placeholder="Password"
          className={`sc-gate__input${err ? ' sc-gate__input--error' : ''}`}
        />
        {err && <p className="sc-gate__error">Incorrect password.</p>}
        <button type="submit" className="sc-gate__submit">Enter</button>
      </form>
    </div>
  );
}

// ─── Main seating app ─────────────────────────────────────────────────────────
function SeatingApp() {
  const [locked, setLocked] = useState(() => localStorage.getItem(AUTH_KEY) !== '1');
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [guests, setGuests] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [meals, setMeals] = useState({}); // name → meal value
  const [showMeals, setShowMeals] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [history, setHistory] = useState([]); // undo stack of past assignments snapshots
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [search, setSearch] = useState('');
  const [households, setHouseholds] = useState([]); // [{primary, partner?, kids?}]
  const [hoveredGuest, setHoveredGuest] = useState(null);
  const guestItemRefs = useRef({});

  // ── Drag state (seat-level + table-section-level + guest-list-level) ──────────
  const [draggingSeat, setDraggingSeat] = useState(null);
  const [dragOverSeat, setDragOverSeat] = useState(null);
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOverTable, setDragOverTable] = useState(null);
  const [draggingGuest, setDraggingGuest] = useState(null); // name being dragged from guest list
  // Refs for synchronous reads during dragover (state is async)
  const draggingSeatRef  = useRef(null);
  const draggingTableRef = useRef(null);
  const dragOverSeatRef  = useRef(null);
  const dragOverTableRef = useRef(null);
  const draggingGuestRef = useRef(null);

  // ── Last name helper ──────────────────────────────────────────────────────────────
  function lastName(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase();
  }

  // ── Partner map + sorted household list (derived from households state) ───────────
  const partnerOf = {};
  for (const h of households) {
    if (h.primary && h.partner) {
      partnerOf[h.primary.toLowerCase()] = h.partner;
      partnerOf[h.partner.toLowerCase()] = h.primary;
    }
  }

  // Push current assignments onto the undo stack before a mutation
  function pushHistory(current) {
    setHistory(prev => [...prev.slice(-49), current]);
  }

  // ── Drag helpers ──────────────────────────────────────────────────────────────
  function clearDragState() {
    draggingSeatRef.current  = null; setDraggingSeat(null);
    draggingTableRef.current = null; setDraggingTable(null);
    dragOverSeatRef.current  = null; setDragOverSeat(null);
    dragOverTableRef.current = null; setDragOverTable(null);
    draggingGuestRef.current = null; setDraggingGuest(null);
  }

  // Seat drag
  function handleSeatDragStart(seatId, e) {
    if (locked) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    draggingSeatRef.current = seatId;
    setDraggingSeat(seatId);
  }
  function handleSeatDragOver(seatId, e) {
    if (draggingTableRef.current) return; // table drag in progress
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSeatRef.current !== seatId) {
      dragOverSeatRef.current = seatId;
      setDragOverSeat(seatId);
    }
  }
  function handleSeatDragLeave(seatId) {
    if (dragOverSeatRef.current === seatId) {
      dragOverSeatRef.current = null;
      setDragOverSeat(null);
    }
  }
  function handleSeatDrop(targetSeatId) {
    // Guest-list drag: place/swap the dragged guest into this seat
    if (draggingGuestRef.current) {
      const guestName = draggingGuestRef.current;
      pushHistory(assignments);
      setAssignments(prev => {
        const next = { ...prev };
        // Find guest's current seat (if already seated)
        let sourceSeatId = null;
        for (const [sid, g] of Object.entries(next)) {
          if (g === guestName) { sourceSeatId = sid; break; }
        }
        const targetGuest = next[targetSeatId] || null;
        if (sourceSeatId) delete next[sourceSeatId];
        // If both had seats, swap; otherwise displace target to unassigned
        if (targetGuest && sourceSeatId) next[sourceSeatId] = targetGuest;
        next[targetSeatId] = guestName;
        return next;
      });
      setSelectedGuest(null);
      clearDragState();
      return;
    }
    // Seat-to-seat drag
    const src = draggingSeatRef.current;
    if (!src || src === targetSeatId) { clearDragState(); return; }
    pushHistory(assignments);
    setAssignments(prev => {
      const next = { ...prev };
      const draggedGuest = next[src] || null;
      const targetGuest  = next[targetSeatId] || null;
      if (draggedGuest) next[targetSeatId] = draggedGuest; else delete next[targetSeatId];
      if (targetGuest)  next[src]          = targetGuest;  else delete next[src];
      return next;
    });
    setSelectedGuest(null);
    clearDragState();
  }
  function handleSeatDragEnd() { clearDragState(); }

  // Guest-list drag (drag a name from the panel onto any seat)
  function handleGuestListDragStart(name, e) {
    if (locked) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    draggingGuestRef.current = name;
    setDraggingGuest(name);
    // Build a circle drag image matching the seated seat style
    const el = document.createElement('div');
    el.textContent = shortName(name);
    Object.assign(el.style, {
      width: '44px', height: '44px', borderRadius: '50%',
      background: 'var(--color-primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '8px', fontWeight: '600', fontFamily: 'system-ui, sans-serif',
      position: 'fixed', top: '-100px', left: '-100px', pointerEvents: 'none',
    });
    document.body.appendChild(el);
    e.dataTransfer.setDragImage(el, 22, 22);
    requestAnimationFrame(() => document.body.removeChild(el));
  }
  function handleGuestListDragEnd() { clearDragState(); }

  // Table-section drag (swaps all 8 seat assignments between two sections)
  function handleTableDragStart(tableId, e) {
    if (locked) { e.preventDefault(); return; }
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    draggingTableRef.current = tableId;
    setDraggingTable(tableId);
  }
  function handleTableDragOver(tableId, e) {
    if (draggingSeatRef.current) return; // seat drag in progress
    if (draggingTableRef.current === tableId) return; // same table, skip
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTableRef.current !== tableId) {
      dragOverTableRef.current = tableId;
      setDragOverTable(tableId);
    }
  }
  function handleTableDragLeave(tableId) {
    if (dragOverTableRef.current === tableId) {
      dragOverTableRef.current = null;
      setDragOverTable(null);
    }
  }
  function handleTableDrop(targetTableId) {
    const src = draggingTableRef.current;
    if (!src || src === targetTableId) { clearDragState(); return; }
    pushHistory(assignments);
    setAssignments(prev => {
      const next = { ...prev };
      for (let n = 1; n <= 8; n++) {
        const srcId = `${src}-${n}`;
        const tgtId = `${targetTableId}-${n}`;
        const srcGuest = next[srcId] || null;
        const tgtGuest = next[tgtId] || null;
        if (srcGuest) next[tgtId] = srcGuest; else delete next[tgtId];
        if (tgtGuest) next[srcId] = tgtGuest; else delete next[srcId];
      }
      return next;
    });
    clearDragState();
  }
  function handleTableDragEnd() { clearDragState(); }

  const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

  // ── Load guest list + existing assignments from Apps Script ──────────────────
  useEffect(() => {
    if (!scriptUrl) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    const payload = JSON.stringify({ action: 'readSeating' });
    fetch(`${scriptUrl}?data=${encodeURIComponent(payload)}`)
      .then(r => r.json())
      .then(data => {
        if (data.guests) setGuests([...data.guests].sort((a, b) => a.localeCompare(b)));
        if (data.assignments) setAssignments(data.assignments);
        if (data.households) setHouseholds(data.households);
        if (data.meals) setMeals(data.meals);
        setLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoading(false);
      });
  }, [scriptUrl]);

  // ── Lock / unlock ─────────────────────────────────────────────────────────────
  function handleUnlock() {
    localStorage.setItem(AUTH_KEY, '1');
    setLocked(false);
    setShowUnlockModal(false);
  }
  function handleLock() {
    localStorage.removeItem(AUTH_KEY);
    setLocked(true);
    setSelectedGuest(null);
  }

  // ── Seat click handler ────────────────────────────────────────────────────────
  function handleSeatClick(seatId) {
    if (locked) return;
    const occupant = assignments[seatId];

    if (selectedGuest) {
      if (occupant === selectedGuest) {
        // (2) Clicking the selected guest's own seat again → deselect only, don't remove
        setSelectedGuest(null);
      } else if (occupant) {
        // (1) Clicking a seat occupied by someone else → swap:
        //     place selectedGuest there, pick up the displaced person
        pushHistory(assignments);
        setAssignments(prev => {
          const next = { ...prev };
          // Vacate selectedGuest's current seat if they were seated
          for (const [sid, g] of Object.entries(next)) {
            if (g === selectedGuest) { delete next[sid]; break; }
          }
          next[seatId] = selectedGuest;
          return next;
        });
        setSelectedGuest(occupant); // pick up the displaced guest
      } else {
        // Empty seat → place selectedGuest here
        pushHistory(assignments);
        setAssignments(prev => {
          const next = { ...prev };
          for (const [sid, g] of Object.entries(next)) {
            if (g === selectedGuest) { delete next[sid]; break; }
          }
          next[seatId] = selectedGuest;
          return next;
        });
        setSelectedGuest(null);
      }
    } else {
      if (occupant) {
        // No active selection — pick up whoever is sitting here
        setSelectedGuest(occupant);
      }
      // Empty seat, no selection → do nothing
    }
  }

  // ── Guest pool click ─────────────────────────────────────────────────────────
  function handleGuestClick(name) {
    if (locked) return;
    setSelectedGuest(prev => (prev === name ? null : name));
  }

  // ── Unassign a guest ──────────────────────────────────────────────────────────
  function unassignGuest(name) {
    if (locked) return;
    pushHistory(assignments);
    setAssignments(prev => {
      const next = { ...prev };
      for (const [sid, g] of Object.entries(next)) {
        if (g === name) { delete next[sid]; break; }
      }
      return next;
    });
    if (selectedGuest === name) setSelectedGuest(null);
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      // Ignore when typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Delete / Backspace → remove selected guest from their seat
      if (locked) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedGuest) {
        const isSeated = Object.values(assignments).includes(selectedGuest);
        if (isSeated) {
          e.preventDefault();
          unassignGuest(selectedGuest);
          setSelectedGuest(null);
        }
        return;
      }

      // Ctrl+Z / Cmd+Z → undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        setHistory(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          setAssignments(last);
          setSelectedGuest(null);
          return prev.slice(0, -1);
        });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedGuest, assignments]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll guest list to the selected guest when a seat/name is clicked ───
  useEffect(() => {
    if (!selectedGuest) return;
    const el = guestItemRefs.current[selectedGuest];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save to Google Sheet ──────────────────────────────────────────────────────
  async function handleSave() {
    if (!scriptUrl || saveStatus === 'saving') return;
    setSaveStatus('saving');
    const payload = JSON.stringify({ action: 'writeSeating', assignments });
    try {
      const res = await fetch(`${scriptUrl}?data=${encodeURIComponent(payload)}`);
      const data = await res.json();
      setSaveStatus(data.status === 'ok' ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
    setTimeout(() => setSaveStatus('idle'), 3500);
  }

  // ── CSV export ────────────────────────────────────────────────────────────────
  function handleExportCSV() {
    const SEAT_TABLE_MAP = {
      T01: '02', T02: '02', T03: '02',
      T04: '03', T05: '03',
      T06: '04', T07: '04',
      T08: '05', T09: '05',
      T10: '06', T11: '06',
      T12: '07', T13: '07', T14: '07',
      HL: '01', HC: '01', HR: '01',
    };
    function tableForSeat(seatId) {
      return SEAT_TABLE_MAP[seatId.split('-')[0]] || '';
    }
    function splitName(fullName) {
      const parts = (fullName || '').trim().split(/\s+/);
      return { first: parts[0] || '', last: parts.slice(1).join(' ') };
    }

    const allRows = Object.entries(assignments)
      .filter(([, name]) => name)
      .map(([seatId, name]) => {
        const { first, last } = splitName(name);
        return { seatId, name, first: first.toLowerCase(), last: last.replace(/-(?!\s)/g, '- '), num: tableForSeat(seatId) };
      });

    // HC-1 (Cody) and HC-2 (Emily) always first; rest sorted by last name
    const headCouple = allRows.filter(r => r.seatId === 'HC-1' || r.seatId === 'HC-2')
      .sort((a, b) => a.seatId.localeCompare(b.seatId, undefined, { numeric: true }));
    const rest = allRows
      .filter(r => r.seatId !== 'HC-1' && r.seatId !== 'HC-2')
      .sort((a, b) => a.last.toLowerCase().localeCompare(b.last.toLowerCase()));
    const rows = [...headCouple, ...rest];

    const escape = v => `"${(v || '').replace(/"/g, '""')}"`;
    const lines = [
      ['Key', 'Temp', 'First', 'Last', 'Num'].map(escape).join(','),
      ...rows.map(r => [r.seatId, r.name, r.first, r.last, r.num].map(escape).join(',')),
    ];
    // Prepend UTF-8 BOM so Adobe Illustrator reads accents and special characters correctly
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seating-assignments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Derived data ──────────────────────────────────────────────────────────────
  const assignedNames = new Set(Object.values(assignments));
  const assignedCount = assignedNames.size;
  const unassignedCount = guests.filter(g => !assignedNames.has(g)).length;
  // Names in seats that no longer appear in the guest list (RSVP cancelled, removed, etc.)
  const guestSet = new Set(guests);
  const orphanedNames = new Set(
    Object.values(assignments).filter(name => name && !guestSet.has(name))
  );

  // Unassigned households first, then alphabetical by primary last name
  const members = h => [h.primary, h.partner, ...(h.kids || [])].filter(Boolean);
  const sortedHouseholds = [...households].sort((a, b) => {
    const aAllSeated = members(a).length > 0 && members(a).every(n => assignedNames.has(n));
    const bAllSeated = members(b).length > 0 && members(b).every(n => assignedNames.has(n));
    if (aAllSeated !== bAllSeated) return aAllSeated ? 1 : -1;
    return lastName(a.primary || '').localeCompare(lastName(b.primary || ''));
  });

  // ── Hover highlight helpers ───────────────────────────────────────────────────
  const highlightName  = hoveredGuest || selectedGuest || null;
  const hovLow         = highlightName ? highlightName.toLowerCase() : null;
  const hovLast        = highlightName ? lastName(highlightName) : null;
  const hovPartnerName = hovLow ? partnerOf[hovLow] : null;
  const hovPartnerLow  = hovPartnerName ? hovPartnerName.toLowerCase() : null;

  // Highlight class for guest list items
  function getHlClass(name) {
    if (!highlightName || !name) return '';
    const nl = name.toLowerCase();
    if (nl === hovLow) return 'sc-guest--hl-self';
    if (hovPartnerLow && nl === hovPartnerLow) return 'sc-guest--hl-partner';
    if (hovLast && lastName(name) === hovLast) return 'sc-guest--hl-lastname';
    return '';
  }

  // Highlight class for seat circles (same logic, different CSS class names)
  function getSeatHlClass(name) {
    if (!highlightName || !name) return '';
    const nl = name.toLowerCase();
    if (nl === hovLow) return 'sc-seat--hl-self';
    if (hovPartnerLow && nl === hovPartnerLow) return 'sc-seat--hl-partner';
    if (hovLast && lastName(name) === hovLast) return 'sc-seat--hl-lastname';
    return '';
  }

  // Reusable guest item renderer (flat search + grouped household views)
  function renderGuestItem(name, roleClass = '') {
    const isSeated = assignedNames.has(name);
    const isSelected = name === selectedGuest;
    const seatId = isSeated
      ? Object.entries(assignments).find(([, g]) => g === name)?.[0]
      : null;
    const stateClass = isSelected ? 'sc-guest--selected'
      : isSeated ? 'sc-guest--seated'
      : 'sc-guest--unassigned';
    const hlClass = getHlClass(name);
    return (
      <div
        key={name}
        ref={el => { guestItemRefs.current[name] = el; }}
        draggable={!locked}
        onClick={() => handleGuestClick(name)}
        onMouseEnter={() => setHoveredGuest(name)}
        onMouseLeave={() => setHoveredGuest(null)}
        onDragStart={e => drag.onGuestListDragStart(name, e)}
        onDragEnd={() => drag.onGuestListDragEnd()}
        className={`sc-guest ${stateClass} ${roleClass} ${hlClass}`.trim()}
      >
        <span className="sc-guest__name">{name}</span>
        <div className="sc-guest__meta">
          {seatId && <span className="sc-guest__seat-id">{seatId}</span>}
          {isSeated && (
            <span
              onClick={e => { e.stopPropagation(); unassignGuest(name); }}
              title="Remove from seat"
              className="sc-guest__remove"
            >
              ✕
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Drag prop bundle ──────────────────────────────────────────────────────────
  const drag = {
    locked,
    draggingSeat, dragOverSeat, draggingTable, dragOverTable, draggingGuest,
    onSeatDragStart:      handleSeatDragStart,
    onSeatDragOver:       handleSeatDragOver,
    onSeatDragLeave:      handleSeatDragLeave,
    onSeatDrop:           handleSeatDrop,
    onSeatDragEnd:        handleSeatDragEnd,
    onTableDragStart:     handleTableDragStart,
    onTableDragOver:      handleTableDragOver,
    onTableDragLeave:     handleTableDragLeave,
    onTableDrop:          handleTableDrop,
    onTableDragEnd:       handleTableDragEnd,
    onGuestListDragStart: handleGuestListDragStart,
    onGuestListDragEnd:   handleGuestListDragEnd,
  };

  // ── Meal info bundle ──────────────────────────────────────────────────────────
  const mealInfo = { meals, showMeals };

  const filteredGuests = search.trim()
    ? guests.filter(g => g.toLowerCase().includes(search.toLowerCase()))
    : guests;

  // ── Loading / error states ────────────────────────────────────────────────────
  if (loading) {
    return <div className="sc-loading">Loading seating data…</div>;
  }

  if (loadError) {
    return (
      <div className="sc-error">
        <div>
          <div className="sc-error__icon">⚠️</div>
          <p><strong>Could not load data.</strong></p>
          <p>Make sure <code>VITE_GOOGLE_SCRIPT_URL</code> is set and the Apps Script is deployed.</p>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
    <div className="sc-app">

      {/* ── Left: Guest Pool ─────────────────────────────────────────────────── */}
      <div className="sc-panel">
        {/* Header */}
        <div className="sc-panel__header">
          <div className="sc-panel__title">Guest List</div>
          <div className="sc-panel__stats">
            {assignedCount} seated · {unassignedCount} remaining · {TOTAL_SEATS} total seats
          </div>
          <input
            type="text" placeholder="Search guests…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="sc-panel__search"
          />
        </div>

        {/* Guest items — grouped by household when not searching, flat when searching */}
        <div className="sc-panel__list">
          {search.trim() ? (
            filteredGuests.length === 0
              ? <div className="sc-panel__empty">No guests found.</div>
              : filteredGuests.map(name => renderGuestItem(name))
          ) : sortedHouseholds.length > 0 ? (
            sortedHouseholds.map((h, hi) => (
                  <div key={hi} className="sc-household">
                    {h.primary && renderGuestItem(h.primary)}
                    {h.partner && renderGuestItem(h.partner, 'sc-guest--partner')}
                    {h.kids?.map(k => renderGuestItem(k, 'sc-guest--kid'))}
                  </div>
                ))
          ) : (
            guests.length === 0
              ? <div className="sc-panel__empty">Loading guests…</div>
              : guests.map(name => renderGuestItem(name))
          )}
        </div>

        {/* Footer: selected indicator + save */}
        <div className="sc-panel__footer">
          {!locked && selectedGuest && (
            <div className="sc-placing-badge">
              <span>Placing: <strong>{selectedGuest}</strong></span>
              <span
                onClick={() => setSelectedGuest(null)}
                className="sc-placing-badge__dismiss"
                title="Deselect"
              >
                ✕
              </span>
            </div>
          )}
          {locked ? (
            <button onClick={() => setShowUnlockModal(true)} className="sc-btn-lock sc-btn-lock--locked">
              🔒 Unlock Editing
            </button>
          ) : (
            <button onClick={handleLock} className="sc-btn-lock sc-btn-lock--unlocked">
              🔓 Lock Seats
            </button>
          )}
          {!locked && (
            <>
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className={[
                  'sc-btn-save',
                  saveStatus === 'saving' ? 'sc-btn-save--saving'
                  : saveStatus === 'saved' ? 'sc-btn-save--saved'
                  : saveStatus === 'error' ? 'sc-btn-save--error'
                  : '',
                ].join(' ').trim()}
              >
                {saveStatus === 'saving' ? 'Saving…'
                  : saveStatus === 'saved' ? '✓ Saved!'
                  : saveStatus === 'error' ? '✕ Error — try again'
                  : 'Save Chart'}
              </button>
              <button onClick={handleExportCSV} className="sc-btn-export">
                ↓ Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Right: Chart ─────────────────────────────────────────────────────── */}
      <div className="sc-chart">
        <div className="sc-main-grid">
          {/* Table 1 — outer left (3 sections) */}
          <BanquetColumn
            tableIds={MAIN_COLUMNS[0].tables}
            label={MAIN_COLUMNS[0].label}
            assignments={assignments}
            selectedGuest={selectedGuest}
            onSeatClick={handleSeatClick}
            orphanedNames={orphanedNames}
            onHover={setHoveredGuest}
            getHlClass={getSeatHlClass}
            drag={drag}
            mealInfo={mealInfo}
          />

          {/* Middle zone: Tables 2–5 on top, head tables nested below */}
          <div className="sc-middle">
            <div className="sc-middle__tables">
              {MAIN_COLUMNS.slice(1, 5).map(({ label, tables }) => (
                <BanquetColumn
                  key={label}
                  tableIds={tables}
                  label={label}
                  assignments={assignments}
                  selectedGuest={selectedGuest}
                  onSeatClick={handleSeatClick}
                  orphanedNames={orphanedNames}
                  onHover={setHoveredGuest}
                  getHlClass={getSeatHlClass}
                  drag={drag}
                  mealInfo={mealInfo}
                />
              ))}
            </div>
            <div className="sc-middle__head">
              <div className="sc-middle__divider" />
              <div className="sc-section-label">Table 1</div>
              <div className="sc-middle__head-row">
                {HEAD_TABLES.map(({ id, label, seats }) =>
                  seats === 2
                    ? <TwoTopTable key={id} tableId={id} label={label} assignments={assignments} selectedGuest={selectedGuest} onSeatClick={handleSeatClick} orphanedNames={orphanedNames} onHover={setHoveredGuest} getHlClass={getSeatHlClass} drag={drag} mealInfo={mealInfo} />
                    : <EightTopTable key={id} tableId={id} label={label} assignments={assignments} selectedGuest={selectedGuest} onSeatClick={handleSeatClick} orphanedNames={orphanedNames} onHover={setHoveredGuest} getHlClass={getSeatHlClass} drag={drag} mealInfo={mealInfo} />
                )}
              </div>
            </div>
          </div>

          {/* Table 7 — outer right (3 sections) */}
          <BanquetColumn
            tableIds={MAIN_COLUMNS[5].tables}
            label={MAIN_COLUMNS[5].label}
            assignments={assignments}
            selectedGuest={selectedGuest}
            onSeatClick={handleSeatClick}
            orphanedNames={orphanedNames}
            onHover={setHoveredGuest}
            getHlClass={getSeatHlClass}
            drag={drag}
            mealInfo={mealInfo}
          />
        </div>

        <div className="sc-legend">
          {[
            { cls: 'sc-seat--empty',       label: 'Empty' },
            { cls: 'sc-seat--drop-target', label: 'Drop here' },
            { cls: 'sc-seat--occupied',    label: 'Seated' },
            { cls: 'sc-seat--moving',      label: 'Moving' },
          ].map(({ cls, label }) => (
            <div key={label} className="sc-legend__item">
              <div className={`sc-legend__swatch sc-seat ${cls}`} style={{ width: 16, height: 16 }} />
              <span>{label}</span>
            </div>
          ))}
          <button
            onClick={() => setShowMeals(v => !v)}
            className={`sc-btn-toggle${showMeals ? ' sc-btn-toggle--active' : ''}`}
            title="Toggle meal indicators on seats"
          >
            {showMeals ? '🍗 Hide Meals' : '🍗 Show Meals'}
          </button>
          <button
            onClick={() => setShowCheatSheet(v => !v)}
            className={`sc-btn-toggle${showCheatSheet ? ' sc-btn-toggle--active' : ''}`}
            title="Toggle meal count cheat sheet"
          >
            {showCheatSheet ? '📋 Hide Sheet' : '📋 Meal Sheet'}
          </button>
          <div className="sc-legend__tip">
            Click a guest to select · click a seat to place · click occupied seat to swap · click selected guest's seat to deselect · Delete/Backspace removes from seat · Ctrl+Z undo
          </div>
        </div>
        {showCheatSheet && (
          <MealCheatSheet assignments={assignments} meals={meals} />
        )}
      </div>
    </div>
    {showUnlockModal && (
      <UnlockModal onAuth={handleUnlock} onClose={() => setShowUnlockModal(false)} />
    )}
    </Fragment>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function SeatingChart() {
  return <SeatingApp />;
}
