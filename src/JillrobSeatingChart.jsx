import { useState, useEffect, useRef } from 'react';
import './jillrob.css';

// ─── Layout ───────────────────────────────────────────────────────────────────
const HEAD_TABLE_ID = 'H'; // one long head table, 8 seats total

const MIDDLE_COLUMNS = [
  { label: 'Table 1', tables: ['T1a', 'T1b', 'T1c'] },
  { label: 'Table 2', tables: ['T2a', 'T2b', 'T2c', 'T2d'] },
  { label: 'Table 3', tables: ['T3a', 'T3b', 'T3c', 'T3d'] },
  { label: 'Table 4', tables: ['T4a', 'T4b', 'T4c'] },
];

const BACK_COLUMNS = [
  { label: 'Table 5', tables: ['T5a', 'T5b', 'T5c'] },
  { label: 'Table 6', tables: ['T6a', 'T6b', 'T6c'] },
  { label: 'Table 7', tables: ['T7a', 'T7b', 'T7c'] },
  { label: 'Table 8', tables: ['T8a', 'T8b', 'T8c'] },
];

const ALL_COLUMNS = [...MIDDLE_COLUMNS, ...BACK_COLUMNS];
const TOTAL_SEATS = 8 + ALL_COLUMNS.reduce((s, c) => s + c.tables.length * 8, 0);

// ─── Dimensions (kept in sync with jillrob.css) ──────────────────────────────
const SEAT_SIZE   = 44;
const SEAT_GAP    = 4;
const TABLE_WIDTH = SEAT_SIZE * 4 + SEAT_GAP * 3;
const SECTION_H   = SEAT_SIZE * 4 + SEAT_GAP * 3;

// ─── Seat ID helpers ─────────────────────────────────────────────────────────
const headLeftSeatIds  = () => [1, 2, 3, 4].map(n => `${HEAD_TABLE_ID}-${n}`);
const headRightSeatIds = () => [5, 6, 7, 8].map(n => `${HEAD_TABLE_ID}-${n}`);
const leftSeatIds      = (t) => [1, 2, 3, 4].map(n => `${t}-${n}`);
const rightSeatIds     = (t) => [5, 6, 7, 8].map(n => `${t}-${n}`);

function shortName(name) {
  if (!name) return '';
  const first = name.trim().split(/\s+/)[0];
  return first.length > 7 ? first.slice(0, 6) + '…' : first;
}
function lastName(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

// ─── Seat ────────────────────────────────────────────────────────────────────
function Seat({ seatId, assignments, selectedGuest, onSeatClick, orphanedNames, onHover, getHlClass, drag, size = SEAT_SIZE }) {
  const name         = assignments[seatId] || null;
  const occupied     = !!name;
  const isBeingMoved = occupied && name === selectedGuest;
  const isDragging   = drag?.draggingSeat === seatId;
  const isDragOver   = drag?.dragOverSeat === seatId;
  const isDropTarget = !occupied && (!!selectedGuest || !!drag?.draggingSeat || !!drag?.draggingGuest);
  const isOrphaned   = !!name && !!orphanedNames?.has(name);
  const hlClass      = getHlClass ? getHlClass(name) : '';

  let stateClass;
  if (isDragging)        stateClass = 'jr-seat--dragging';
  else if (isDragOver)   stateClass = 'jr-seat--drag-over';
  else if (isBeingMoved) stateClass = 'jr-seat--moving';
  else if (occupied)     stateClass = 'jr-seat--occupied';
  else if (isDropTarget) stateClass = 'jr-seat--drop-target';
  else                   stateClass = 'jr-seat--empty';

  return (
    <div
      draggable={occupied}
      onClick={() => !drag?.draggingSeat && onSeatClick(seatId)}
      onMouseEnter={() => name && !drag?.draggingSeat && onHover?.(name)}
      onMouseLeave={() => onHover?.(null)}
      onDragStart={occupied ? e => drag?.onSeatDragStart?.(seatId, e) : undefined}
      onDragOver={e => drag?.onSeatDragOver?.(seatId, e)}
      onDragLeave={() => drag?.onSeatDragLeave?.(seatId)}
      onDrop={() => drag?.onSeatDrop?.(seatId)}
      onDragEnd={() => drag?.onSeatDragEnd?.()}
      className={`jr-seat ${stateClass}${hlClass ? ` ${hlClass}` : ''}`}
      style={{ width: size, height: size }}
    >
      {name ? shortName(name) : ''}
      {isOrphaned && <span className="jr-seat__warning">⚠️</span>}
    </div>
  );
}

// ─── Head table (two 4-seat halves joined into one long table) ───────────────
function HeadTable(props) {
  return (
    <div className="jr-head-top">
      <div className="jr-head-top__row">
        <div className="jr-head-top__seats">
          {headLeftSeatIds().map(id => <Seat key={id} seatId={id} {...props} />)}
        </div>
        <div className="jr-head-top__seat-gap" />
        <div className="jr-head-top__seats">
          {headRightSeatIds().map(id => <Seat key={id} seatId={id} {...props} />)}
        </div>
      </div>
      <div className="jr-head-top__bar-row">
        <div className="jr-head-top__bar jr-head-top__bar--left"  style={{ width: TABLE_WIDTH }} />
        <div className="jr-head-top__bar-connector" />
        <div className="jr-head-top__bar jr-head-top__bar--right" style={{ width: TABLE_WIDTH }} />
      </div>
    </div>
  );
}

// ─── Vertical banquet column ─────────────────────────────────────────────────
function BanquetColumn({ tables, label, drag, ...seatProps }) {
  const n = tables.length;
  return (
    <div className="jr-banquet">
      <div className="jr-banquet__label">{label}</div>
      <div className="jr-banquet__body">
        <div className="jr-banquet__side">
          {tables.map((tid, ti) => (
            <div key={tid} className="jr-banquet__section">
              {ti > 0 && <div className="jr-banquet__gap" />}
              <div className="jr-banquet__seats">
                {leftSeatIds(tid).map(id => <Seat key={id} seatId={id} drag={drag} {...seatProps} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="jr-bar-col">
          {tables.map((tid, ti) => (
            <div key={tid} className="jr-banquet__section">
              {ti > 0 && <div className="jr-bar-connector" />}
              <div
                draggable
                onDragStart={e => drag?.onTableDragStart?.(tid, e)}
                onDragOver={e => drag?.onTableDragOver?.(tid, e)}
                onDragLeave={() => drag?.onTableDragLeave?.(tid)}
                onDrop={() => drag?.onTableDrop?.(tid)}
                onDragEnd={() => drag?.onTableDragEnd?.()}
                className={[
                  'jr-bar-section',
                  n === 1 ? 'jr-bar-section--solo'
                    : ti === 0 ? 'jr-bar-section--top'
                    : ti === n - 1 ? 'jr-bar-section--bottom'
                    : 'jr-bar-section--middle',
                  drag?.draggingTable === tid ? 'jr-bar--dragging' : '',
                  drag?.dragOverTable === tid ? 'jr-bar--drag-over' : '',
                ].filter(Boolean).join(' ')}
                style={{ height: SECTION_H }}
              />
            </div>
          ))}
        </div>
        <div className="jr-banquet__side">
          {tables.map((tid, ti) => (
            <div key={tid} className="jr-banquet__section">
              {ti > 0 && <div className="jr-banquet__gap" />}
              <div className="jr-banquet__seats">
                {rightSeatIds(tid).map(id => <Seat key={id} seatId={id} drag={drag} {...seatProps} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main app ────────────────────────────────────────────────────────────────
function JillrobApp() {
  const [guests, setGuests]               = useState([]);
  const [households, setHouseholds]       = useState([]);
  const [assignments, setAssignments]     = useState({});
  const [history, setHistory]             = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [hoveredGuest, setHoveredGuest]   = useState(null);
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [saveStatus, setSaveStatus]       = useState('idle');
  const guestItemRefs = useRef({});

  const [draggingSeat, setDraggingSeat]   = useState(null);
  const [dragOverSeat, setDragOverSeat]   = useState(null);
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOverTable, setDragOverTable] = useState(null);
  const [draggingGuest, setDraggingGuest] = useState(null);
  const draggingSeatRef  = useRef(null);
  const draggingTableRef = useRef(null);
  const dragOverSeatRef  = useRef(null);
  const dragOverTableRef = useRef(null);
  const draggingGuestRef = useRef(null);

  const scriptUrl = import.meta.env.VITE_JILLROB_SCRIPT_URL;

  useEffect(() => {
    if (!scriptUrl) { setLoadError(true); setLoading(false); return; }
    const payload = JSON.stringify({ action: 'readSeating' });
    fetch(`${scriptUrl}?data=${encodeURIComponent(payload)}`)
      .then(r => r.json())
      .then(data => {
        if (data.guests)      setGuests([...data.guests].sort((a, b) => a.localeCompare(b)));
        if (data.assignments) setAssignments(data.assignments);
        if (data.households)  setHouseholds(data.households);
        setLoading(false);
      })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, [scriptUrl]);

  const partnerOf = {};
  for (const h of households) {
    if (h.primary && h.partner) {
      partnerOf[h.primary.toLowerCase()] = h.partner;
      partnerOf[h.partner.toLowerCase()] = h.primary;
    }
  }

  function pushHistory(current) {
    setHistory(prev => [...prev.slice(-49), current]);
  }

  // ── Drag helpers ────────────────────────────────────────────────────────────
  function clearDragState() {
    draggingSeatRef.current  = null; setDraggingSeat(null);
    draggingTableRef.current = null; setDraggingTable(null);
    dragOverSeatRef.current  = null; setDragOverSeat(null);
    dragOverTableRef.current = null; setDragOverTable(null);
    draggingGuestRef.current = null; setDraggingGuest(null);
  }
  function handleSeatDragStart(seatId, e) {
    e.dataTransfer.effectAllowed = 'move';
    draggingSeatRef.current = seatId;
    setDraggingSeat(seatId);
  }
  function handleSeatDragOver(seatId, e) {
    if (draggingTableRef.current) return;
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
    if (draggingGuestRef.current) {
      const guestName = draggingGuestRef.current;
      pushHistory(assignments);
      setAssignments(prev => {
        const next = { ...prev };
        let sourceSeatId = null;
        for (const [sid, g] of Object.entries(next)) {
          if (g === guestName) { sourceSeatId = sid; break; }
        }
        const targetGuest = next[targetSeatId] || null;
        if (sourceSeatId) delete next[sourceSeatId];
        if (targetGuest && sourceSeatId) next[sourceSeatId] = targetGuest;
        next[targetSeatId] = guestName;
        return next;
      });
      setSelectedGuest(null);
      clearDragState();
      return;
    }
    const src = draggingSeatRef.current;
    if (!src || src === targetSeatId) { clearDragState(); return; }
    pushHistory(assignments);
    setAssignments(prev => {
      const next = { ...prev };
      const dragged = next[src] || null;
      const target  = next[targetSeatId] || null;
      if (dragged) next[targetSeatId] = dragged; else delete next[targetSeatId];
      if (target)  next[src]          = target;  else delete next[src];
      return next;
    });
    setSelectedGuest(null);
    clearDragState();
  }
  function handleSeatDragEnd() { clearDragState(); }

  function handleGuestListDragStart(name, e) {
    e.dataTransfer.effectAllowed = 'move';
    draggingGuestRef.current = name;
    setDraggingGuest(name);
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

  function handleTableDragStart(tid, e) {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    draggingTableRef.current = tid;
    setDraggingTable(tid);
  }
  function handleTableDragOver(tid, e) {
    if (draggingSeatRef.current) return;
    if (draggingTableRef.current === tid) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTableRef.current !== tid) {
      dragOverTableRef.current = tid;
      setDragOverTable(tid);
    }
  }
  function handleTableDragLeave(tid) {
    if (dragOverTableRef.current === tid) {
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

  // ── Seat / guest click ─────────────────────────────────────────────────────
  function handleSeatClick(seatId) {
    const occupant = assignments[seatId];
    if (selectedGuest) {
      if (occupant === selectedGuest) {
        setSelectedGuest(null);
      } else if (occupant) {
        pushHistory(assignments);
        setAssignments(prev => {
          const next = { ...prev };
          for (const [sid, g] of Object.entries(next)) {
            if (g === selectedGuest) { delete next[sid]; break; }
          }
          next[seatId] = selectedGuest;
          return next;
        });
        setSelectedGuest(occupant);
      } else {
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
    } else if (occupant) {
      setSelectedGuest(occupant);
    }
  }
  function handleGuestClick(name) {
    setSelectedGuest(prev => (prev === name ? null : name));
  }
  function unassignGuest(name) {
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

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedGuest) {
        if (Object.values(assignments).includes(selectedGuest)) {
          e.preventDefault();
          unassignGuest(selectedGuest);
          setSelectedGuest(null);
        }
        return;
      }
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

  useEffect(() => {
    if (!selectedGuest) return;
    const el = guestItemRefs.current[selectedGuest];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedGuest]);

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

  // ── Derived data ───────────────────────────────────────────────────────────
  const assignedNames   = new Set(Object.values(assignments));
  const assignedCount   = assignedNames.size;
  const unassignedCount = guests.filter(g => !assignedNames.has(g)).length;
  const guestSet        = new Set(guests);
  const orphanedNames   = new Set(Object.values(assignments).filter(n => n && !guestSet.has(n)));

  const members = h => [h.primary, h.partner].filter(Boolean);
  const sortedHouseholds = [...households].sort((a, b) => {
    const aAllSeated = members(a).length > 0 && members(a).every(n => assignedNames.has(n));
    const bAllSeated = members(b).length > 0 && members(b).every(n => assignedNames.has(n));
    if (aAllSeated !== bAllSeated) return aAllSeated ? 1 : -1;
    return lastName(a.primary || '').localeCompare(lastName(b.primary || ''));
  });

  const highlightName  = hoveredGuest || selectedGuest || null;
  const hovLow         = highlightName ? highlightName.toLowerCase() : null;
  const hovLast        = highlightName ? lastName(highlightName) : null;
  const hovPartnerName = hovLow ? partnerOf[hovLow] : null;
  const hovPartnerLow  = hovPartnerName ? hovPartnerName.toLowerCase() : null;

  function getHlClass(name) {
    if (!highlightName || !name) return '';
    const nl = name.toLowerCase();
    if (nl === hovLow) return 'jr-guest--hl-self';
    if (hovPartnerLow && nl === hovPartnerLow) return 'jr-guest--hl-partner';
    if (hovLast && lastName(name) === hovLast) return 'jr-guest--hl-lastname';
    return '';
  }
  function getSeatHlClass(name) {
    if (!highlightName || !name) return '';
    const nl = name.toLowerCase();
    if (nl === hovLow) return 'jr-seat--hl-self';
    if (hovPartnerLow && nl === hovPartnerLow) return 'jr-seat--hl-partner';
    if (hovLast && lastName(name) === hovLast) return 'jr-seat--hl-lastname';
    return '';
  }

  function renderGuestItem(name, roleClass = '') {
    const isSeated   = assignedNames.has(name);
    const isSelected = name === selectedGuest;
    const seatId     = isSeated
      ? Object.entries(assignments).find(([, g]) => g === name)?.[0]
      : null;
    const stateClass = isSelected ? 'jr-guest--selected'
      : isSeated ? 'jr-guest--seated'
      : 'jr-guest--unassigned';
    const hlClass = getHlClass(name);
    return (
      <div
        key={name}
        ref={el => { guestItemRefs.current[name] = el; }}
        draggable
        onClick={() => handleGuestClick(name)}
        onMouseEnter={() => setHoveredGuest(name)}
        onMouseLeave={() => setHoveredGuest(null)}
        onDragStart={e => handleGuestListDragStart(name, e)}
        onDragEnd={() => handleGuestListDragEnd()}
        className={`jr-guest ${stateClass} ${roleClass} ${hlClass}`.trim()}
      >
        <span className="jr-guest__name">{name}</span>
        <div className="jr-guest__meta">
          {seatId && <span className="jr-guest__seat-id">{seatId}</span>}
          {isSeated && (
            <span
              onClick={e => { e.stopPropagation(); unassignGuest(name); }}
              title="Remove from seat"
              className="jr-guest__remove"
            >✕</span>
          )}
        </div>
      </div>
    );
  }

  const drag = {
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

  const seatProps = {
    assignments, selectedGuest, orphanedNames,
    onSeatClick: handleSeatClick,
    onHover:     setHoveredGuest,
    getHlClass:  getSeatHlClass,
    drag,
  };

  const filteredGuests = search.trim()
    ? guests.filter(g => g.toLowerCase().includes(search.toLowerCase()))
    : guests;

  if (loading) {
    return <div className="jr-loading">Loading seating data…</div>;
  }
  if (loadError) {
    return (
      <div className="jr-error">
        <div>
          <div className="jr-error__icon">⚠️</div>
          <p><strong>Could not load data.</strong></p>
          <p>Set <code>VITE_JILLROB_SCRIPT_URL</code> in <code>.env</code> and deploy <code>apps-script-jillrob/Code.js</code>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jr-app">
      {/* ── Left: Guest list ─────────────────────────────────────────────── */}
      <div className="jr-panel">
        <div className="jr-panel__header">
          <div className="jr-panel__title">Guest List</div>
          <div className="jr-panel__stats">
            {assignedCount} seated · {unassignedCount} remaining · {TOTAL_SEATS} total seats
          </div>
          <input
            type="text"
            placeholder="Search guests…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="jr-panel__search"
          />
        </div>

        <div className="jr-panel__list">
          {search.trim() ? (
            filteredGuests.length === 0
              ? <div className="jr-panel__empty">No guests found.</div>
              : filteredGuests.map(name => renderGuestItem(name))
          ) : sortedHouseholds.length > 0 ? (
            sortedHouseholds.map((h, hi) => (
              <div key={hi} className="jr-household">
                {h.primary && renderGuestItem(h.primary)}
                {h.partner && renderGuestItem(h.partner, 'jr-guest--partner')}
              </div>
            ))
          ) : (
            guests.length === 0
              ? <div className="jr-panel__empty">No RSVPs yet.</div>
              : guests.map(name => renderGuestItem(name))
          )}
        </div>

        <div className="jr-panel__footer">
          {selectedGuest && (
            <div className="jr-placing-badge">
              <span>Placing: <strong>{selectedGuest}</strong></span>
              <span
                onClick={() => setSelectedGuest(null)}
                className="jr-placing-badge__dismiss"
                title="Deselect"
              >✕</span>
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className={[
              'jr-btn-save',
              saveStatus === 'saving' ? 'jr-btn-save--saving'
              : saveStatus === 'saved' ? 'jr-btn-save--saved'
              : saveStatus === 'error' ? 'jr-btn-save--error'
              : '',
            ].join(' ').trim()}
          >
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'saved' ? '✓ Saved!'
              : saveStatus === 'error' ? '✕ Error — try again'
              : 'Save Chart'}
          </button>
        </div>
      </div>

      {/* ── Right: Chart ─────────────────────────────────────────────────── */}
      <div className="jr-chart">
        <div className="jr-head-group">
          <div className="jr-head-group__label">Head Table</div>
          <div className="jr-head-row">
            <HeadTable {...seatProps} />
          </div>
        </div>

        <div className="jr-columns">
          {MIDDLE_COLUMNS.map(col => (
            <BanquetColumn key={col.label} label={col.label} tables={col.tables} {...seatProps} />
          ))}
        </div>

        <div className="jr-columns jr-columns--back">
          {BACK_COLUMNS.map(col => (
            <BanquetColumn key={col.label} label={col.label} tables={col.tables} {...seatProps} />
          ))}
        </div>

        <div className="jr-legend">
          {[
            { cls: 'jr-seat--empty',       label: 'Empty' },
            { cls: 'jr-seat--drop-target', label: 'Drop here' },
            { cls: 'jr-seat--occupied',    label: 'Seated' },
            { cls: 'jr-seat--moving',      label: 'Moving' },
          ].map(({ cls, label }) => (
            <div key={label} className="jr-legend__item">
              <div className={`jr-legend__swatch jr-seat ${cls}`} style={{ width: 16, height: 16 }} />
              <span>{label}</span>
            </div>
          ))}
          <div className="jr-legend__tip">
            Click a guest to select · click a seat to place · click occupied seat to swap · Delete removes from seat · Ctrl+Z undo
          </div>
        </div>
      </div>
    </div>
  );
}

export function JillrobSeatingChart() {
  return <JillrobApp />;
}
