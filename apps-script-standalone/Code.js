// Source of truth for RSVP web app script:
// https://script.google.com/home/projects/1wYQ8NpI4CClVNYY93dWstn6_6XBFciyowpxzAqFl-OVV6_pxOsIGvdom/edit

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
      sheet.getRange(i + 1, 27).setValue(data.dietaryNotes || ''); // Col AA = dietary notes (all)
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
      sheet.getRange(i + 1, 27).setValue(data.dietaryNotes || ''); // Col AA
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
