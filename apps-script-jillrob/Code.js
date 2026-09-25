// Jill & Rob seating chart — standalone Apps Script web app.
//
// Set SPREADSHEET_ID to her sheet's ID, deploy as a web app
// (Execute as: Me, Who has access: Anyone), then paste the deployment
// URL into VITE_JILLROB_SCRIPT_URL in .env.
//
// Guests sheet columns:
//   A = Reply ("Yes" / "No" / blank)
//   B = Guest (primary name)
//   C = Plus One (partner name)
//   D = Table (auto-written by writeSeating: e.g. "Table 3" or "Head Table")

var SPREADSHEET_ID     = '11V-bS9Ya2-6uHfZOuY7zpycRQLObuSoLrUURJxpwJZw';
var GUEST_SHEET_NAME   = 'Guests';   // update if her tab is named differently
var SEATING_SHEET_NAME = 'Seating';  // auto-created if missing

function doPost(e) { return handleRequest(e); }
function doGet(e)  { return handleRequest(e); }

function handleRequest(e) {
  var data;
  if (e && e.postData) {
    data = JSON.parse(e.postData.contents);
  } else if (e && e.parameter && e.parameter.data) {
    data = JSON.parse(e.parameter.data);
  } else {
    return jsonOut({ status: 'error', message: 'No data' });
  }

  if (data.action === 'readSeating')  return readSeating();
  if (data.action === 'writeSeating') return writeSeating(data);
  return jsonOut({ status: 'error', message: 'Unknown action' });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Seat ID → human-readable table label written to Col D.
// Seat IDs look like "T3b-5" or "H-2"; the prefix identifies the table.
function tableLabelForSeat(seatId) {
  var prefix = (seatId || '').toString().split('-')[0];
  if (prefix === 'H') return 'Head Table';
  var m = prefix.match(/^T(\d+)/);
  return m ? 'Table ' + parseInt(m[1], 10) : '';
}

// ─── Read ──────────────────────────────────────────────────────────────────
function readSeating() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var guestSheet = ss.getSheetByName(GUEST_SHEET_NAME);

  var guests = [];
  var households = [];

  if (guestSheet) {
    var rows = guestSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var reply   = (rows[i][0] || '').toString().trim().toLowerCase();
      var primary = (rows[i][1] || '').toString().trim();
      var partner = (rows[i][2] || '').toString().trim();
      if (reply !== 'yes') continue;
      if (primary) guests.push(primary);
      if (partner) guests.push(partner);
      if (primary) {
        var h = { primary: primary };
        if (partner) h.partner = partner;
        households.push(h);
      }
    }
  }

  var assignments = {};
  var seatingSheet = ss.getSheetByName(SEATING_SHEET_NAME);
  if (seatingSheet) {
    var srows = seatingSheet.getDataRange().getValues();
    for (var j = 1; j < srows.length; j++) {
      var seatId    = (srows[j][0] || '').toString().trim();
      var guestName = (srows[j][1] || '').toString().trim();
      if (seatId && guestName) assignments[seatId] = guestName;
    }
  }

  return jsonOut({
    status: 'ok',
    guests: guests,
    households: households,
    assignments: assignments,
  });
}

// ─── Write ─────────────────────────────────────────────────────────────────
function writeSeating(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var assignments = data.assignments || {};

  // guest name (lowercase) → table label
  var guestTableMap = {};
  for (var seatId in assignments) {
    if (!Object.prototype.hasOwnProperty.call(assignments, seatId)) continue;
    var name = (assignments[seatId] || '').toString().trim();
    if (!name) continue;
    guestTableMap[name.toLowerCase()] = tableLabelForSeat(seatId);
  }

  // Rebuild the Seating tab from scratch
  var seatingSheet = ss.getSheetByName(SEATING_SHEET_NAME);
  if (!seatingSheet) {
    seatingSheet = ss.insertSheet(SEATING_SHEET_NAME);
  } else {
    seatingSheet.clearContents();
  }
  seatingSheet.getRange(1, 1, 1, 3).setValues([['Seat ID', 'Guest Name', 'Table']]);

  var seatRows = [];
  for (var sid in assignments) {
    if (Object.prototype.hasOwnProperty.call(assignments, sid) && assignments[sid]) {
      seatRows.push([sid, assignments[sid], tableLabelForSeat(sid)]);
    }
  }
  seatRows.sort(function(a, b) {
    return a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: 'base' });
  });
  if (seatRows.length) {
    seatingSheet.getRange(2, 1, seatRows.length, 3).setValues(seatRows);
  }

  // Update Col D of the Guests sheet with each household's table label.
  // Uses primary's seat if placed, otherwise falls back to partner's.
  var guestSheet = ss.getSheetByName(GUEST_SHEET_NAME);
  if (guestSheet) {
    var grows = guestSheet.getDataRange().getValues();
    for (var i = 1; i < grows.length; i++) {
      var primary = (grows[i][1] || '').toString().trim();
      var partner = (grows[i][2] || '').toString().trim();
      if (!primary && !partner) continue;
      var primaryTable = primary ? (guestTableMap[primary.toLowerCase()] || '') : '';
      var partnerTable = partner ? (guestTableMap[partner.toLowerCase()] || '') : '';
      guestSheet.getRange(i + 1, 4).setValue(primaryTable || partnerTable || '');
    }
  }

  return jsonOut({ status: 'ok', written: seatRows.length });
}
