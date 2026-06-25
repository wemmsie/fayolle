// Source of truth for RSVP web app script:
// https://script.google.com/home/projects/1wYQ8NpI4CClVNYY93dWstn6_6XBFciyowpxzAqFl-OVV6_pxOsIGvdom/edit
// Google Sheets Share File:
// https://docs.google.com/spreadsheets/d/1Fg_lQNt-CxaRj89w_3RcXAO7ip-qHJnVIk0sCWqpKMs/edit?usp=sharing
function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var data;
  if (e.postData) {
    data = JSON.parse(e.postData.contents);
  } else if (e.parameter && e.parameter.data) {
    data = JSON.parse(e.parameter.data);
  } else {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No data' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Route seating actions before RSVP logic
  if (data.action === 'readSeating') return readSeatingData();
  if (data.action === 'writeSeating') return writeSeatingData(data);

  var ss = SpreadsheetApp.openById('1Fg_lQNt-CxaRj89w_3RcXAO7ip-qHJnVIk0sCWqpKMs');
  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  var sheet = ss.getSheetByName('Guests');
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', sheets: sheets }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var rows = sheet.getDataRange().getValues();
  var lookup = data.name.toLowerCase().trim();
  var debug = { lookup: lookup, totalRows: rows.length, sheets: sheets, sampledColC: [], sampledColE: [] };

  function getWelcomeEventValue(payload) {
    var raw = (payload.welcomeEvent || '').toString().trim();
    if (raw === 'Party' || raw === 'Dinner') return raw;
    var legacy = (payload.welcomeParty || '').toString().toLowerCase().trim();
    if (legacy === 'true' || legacy === 'yes') return 'Party';
    return '';
  }

  var welcomeEventValue = getWelcomeEventValue(data);
  var shouldWriteWelcomeEvent = data.rsvp === 'Yes' && !!welcomeEventValue;

  for (var i = 1; i < rows.length && i < 5; i++) {
    debug.sampledColC.push((rows[i][2] || '').toString());
    debug.sampledColE.push((rows[i][4] || '').toString());
  }

  var found = false;
  for (var i = 1; i < rows.length; i++) {
    var colC = (rows[i][2] || '').toString().toLowerCase().trim();
    var colE = (rows[i][4] || '').toString().toLowerCase().trim();

    if (colC === lookup) {
      sheet.getRange(i + 1, 1).setValue(shouldWriteWelcomeEvent ? welcomeEventValue : ''); // Col A = Party | Dinner
      sheet.getRange(i + 1, 2).setValue(data.rsvp);            // Col B = RSVP
      sheet.getRange(i + 1, 4).setValue(data.meal);            // Col D = guest meal
      sheet.getRange(i + 1, 5).setValue(data.plusOneName);     // Col E = plus one name
      sheet.getRange(i + 1, 6).setValue(data.plusOneMeal);     // Col F = plus one meal
      sheet.getRange(i + 1, 9).setValue(data.email);           // Col I = email
      sheet.getRange(i + 1, 15).setValue(data.totalGuestCount || 0); // Col O = total guest count
      sheet.getRange(i + 1, 20).setValue(data.kidCount || 0); // Col T = kid count
      sheet.getRange(i + 1, 21).setValue(data.kidName1 || ''); // Col U = kid name 1
      sheet.getRange(i + 1, 22).setValue(data.kidName2 || ''); // Col V = kid name 2
      sheet.getRange(i + 1, 23).setValue(data.kidName3 || ''); // Col W = kid name 3
      sheet.getRange(i + 1, 24).setValue(data.kidMeal1 || ''); // Col X = kid meal 1
      sheet.getRange(i + 1, 25).setValue(data.kidMeal2 || ''); // Col Y = kid meal 2
      sheet.getRange(i + 1, 26).setValue(data.kidMeal3 || ''); // Col Z = kid meal 3
      sheet.getRange(i + 1, 27).setValue(data.dietaryNotes || ''); // Col AA = Dietary (Other-only: not eating / special requests)
      sheet.getRange(i + 1, 28).setValue(data.foodNotes || '');    // Col AB = Food Notes (free-form allergies / dietary)
      sheet.getRange(i + 1, 31).setValue(data.message || ''); // Col AE = message
      found = true;
      debug.matchedRow = i + 1;
      debug.matchedCol = 'C';
      break;
    }

    if (colE === lookup) {
      sheet.getRange(i + 1, 1).setValue(shouldWriteWelcomeEvent ? welcomeEventValue : ''); // Col A = Party | Dinner
      sheet.getRange(i + 1, 2).setValue(data.rsvp);
      sheet.getRange(i + 1, 4).setValue(data.plusOneMeal);
      sheet.getRange(i + 1, 6).setValue(data.meal);
      sheet.getRange(i + 1, 9).setValue(data.email);           // Col I = email
      sheet.getRange(i + 1, 15).setValue(data.totalGuestCount || 0); // Col O = total guest count
      sheet.getRange(i + 1, 20).setValue(data.kidCount || 0); // Col T
      sheet.getRange(i + 1, 21).setValue(data.kidName1 || ''); // Col U
      sheet.getRange(i + 1, 22).setValue(data.kidName2 || ''); // Col V
      sheet.getRange(i + 1, 23).setValue(data.kidName3 || ''); // Col W
      sheet.getRange(i + 1, 24).setValue(data.kidMeal1 || ''); // Col X
      sheet.getRange(i + 1, 25).setValue(data.kidMeal2 || ''); // Col Y
      sheet.getRange(i + 1, 26).setValue(data.kidMeal3 || ''); // Col Z
      sheet.getRange(i + 1, 27).setValue(data.dietaryNotes || ''); // Col AA = Dietary (Other-only)
      sheet.getRange(i + 1, 28).setValue(data.foodNotes || '');    // Col AB = Food Notes
      sheet.getRange(i + 1, 31).setValue(data.message || ''); // Col AE
      found = true;
      debug.matchedRow = i + 1;
      debug.matchedCol = 'E';
      break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: found ? 'ok' : 'not_found', debug: debug }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Seating: read ────────────────────────────────────────────────────────────
// Returns all RSVP'd-Yes guest names (cols C, E, U, V, W) + existing seat assignments.
function readSeatingData() {
  var ss = SpreadsheetApp.openById('1Fg_lQNt-CxaRj89w_3RcXAO7ip-qHJnVIk0sCWqpKMs');

  // Collect RSVP'd Yes + Pending guests from Guests sheet
  var guestSheet = ss.getSheetByName('Guests');
  var guests = [];
  var households = [];
  var rsvpValuesSeen = {};
  if (guestSheet) {
    var gRows = guestSheet.getDataRange().getValues();
    for (var i = 1; i < gRows.length; i++) {
      var rsvp = (gRows[i][1] || '').toString().trim().toLowerCase(); // Col B
      rsvpValuesSeen[rsvp] = (rsvpValuesSeen[rsvp] || 0) + 1;
      if (rsvp !== 'yes' && rsvp !== 'pend') continue;
      var colC = (gRows[i][2]  || '').toString().trim(); // primary guest
      var colE = (gRows[i][4]  || '').toString().trim(); // partner / plus-one
      var colU = (gRows[i][20] || '').toString().trim(); // kid 1
      var colV = (gRows[i][21] || '').toString().trim(); // kid 2
      var colW = (gRows[i][22] || '').toString().trim(); // kid 3
      if (colC) guests.push(colC);
      if (colE) guests.push(colE);
      if (colU) guests.push(colU);
      if (colV) guests.push(colV);
      if (colW) guests.push(colW);
      // Build household object for front-end grouping
      if (colC) {
        var h = { primary: colC };
        if (colE) h.partner = colE;
        var kids = [colU, colV, colW].filter(Boolean);
        if (kids.length) h.kids = kids;
        households.push(h);
      }
    }
  }

  // Read existing seat assignments from Seating sheet
  var assignments = {};
  var seatingSheet = ss.getSheetByName('Seating');
  if (seatingSheet) {
    var sRows = seatingSheet.getDataRange().getValues();
    for (var j = 1; j < sRows.length; j++) {
      var seatId    = (sRows[j][0] || '').toString().trim();
      var guestName = (sRows[j][1] || '').toString().trim();
      if (seatId && guestName) assignments[seatId] = guestName;
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', guests: guests, assignments: assignments, households: households, debug: { rsvpValuesSeen: rsvpValuesSeen } })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ─── Seating: write ───────────────────────────────────────────────────────────
// Replaces the entire Seating sheet with the provided seat → guest mapping,
// and writes the table label (Table 1–6 or Head) into Col J of the Guests sheet.
function writeSeatingData(data) {
  var ss = SpreadsheetApp.openById('1Fg_lQNt-CxaRj89w_3RcXAO7ip-qHJnVIk0sCWqpKMs');

  // ── Map seat prefix → table label ──────────────────────────────────────────
  var SEAT_TABLE_MAP = {
    'T01': 'Table 1', 'T02': 'Table 1', 'T03': 'Table 1',
    'T04': 'Table 2', 'T05': 'Table 2',
    'T06': 'Table 3', 'T07': 'Table 3',
    'T08': 'Table 4', 'T09': 'Table 4',
    'T10': 'Table 5', 'T11': 'Table 5',
    'T12': 'Table 6', 'T13': 'Table 6', 'T14': 'Table 6',
    'HL':  'Head',    'HC':  'Head',    'HR':  'Head',
  };

  function tableForSeat(seatId) {
    // seatId format: "T01-3" or "HL-2" → extract prefix before the dash
    var prefix = seatId.split('-')[0];
    return SEAT_TABLE_MAP[prefix] || '';
  }

  // ── Build guest → table label map from assignments ─────────────────────────
  var assignments = data.assignments || {};
  var guestTableMap = {}; // lowercase guest name → table label
  for (var seatId in assignments) {
    if (!Object.prototype.hasOwnProperty.call(assignments, seatId)) continue;
    var guestName = (assignments[seatId] || '').toString().trim();
    if (!guestName) continue;
    guestTableMap[guestName.toLowerCase()] = tableForSeat(seatId);
  }

  // ── Write Seating sheet (header + one row per assignment) ──────────────────
  var seatingSheet = ss.getSheetByName('Seating');
  if (!seatingSheet) {
    seatingSheet = ss.insertSheet('Seating');
  } else {
    seatingSheet.clearContents();
  }

  seatingSheet.getRange(1, 1).setValue('Seat ID');
  seatingSheet.getRange(1, 2).setValue('Guest Name');
  seatingSheet.getRange(1, 3).setValue('Table');

  var rowIndex = 2;
  for (var sid in assignments) {
    if (Object.prototype.hasOwnProperty.call(assignments, sid) && assignments[sid]) {
      seatingSheet.getRange(rowIndex, 1).setValue(sid);
      seatingSheet.getRange(rowIndex, 2).setValue(assignments[sid]);
      seatingSheet.getRange(rowIndex, 3).setValue(tableForSeat(sid));
      rowIndex++;
    }
  }

  // ── Update Col J (primary guest, Col C) and Col K (plus-one, Col E) ────────
  var guestSheet = ss.getSheetByName('Guests');
  if (guestSheet) {
    var gRows = guestSheet.getDataRange().getValues();
    for (var i = 1; i < gRows.length; i++) {
      var primaryName = (gRows[i][2] || '').toString().trim(); // Col C = primary guest
      var plusOneName = (gRows[i][4] || '').toString().trim(); // Col E = plus-one

      // Col J (col index 10) = primary guest's table assignment
      if (primaryName) {
        var primaryTable = guestTableMap.hasOwnProperty(primaryName.toLowerCase())
          ? guestTableMap[primaryName.toLowerCase()] : '';
        guestSheet.getRange(i + 1, 10).setValue(primaryTable);
      }

      // Col K (col index 11) = plus-one guest's table assignment
      if (plusOneName) {
        var plusOneTable = guestTableMap.hasOwnProperty(plusOneName.toLowerCase())
          ? guestTableMap[plusOneName.toLowerCase()] : '';
        guestSheet.getRange(i + 1, 11).setValue(plusOneTable);
      }
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', written: rowIndex - 2 })
  ).setMimeType(ContentService.MimeType.JSON);
}
