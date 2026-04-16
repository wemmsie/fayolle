function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Guests');
  var rows = sheet.getDataRange().getValues();
  var lookup = data.name.toLowerCase().trim();

  for (var i = 1; i < rows.length; i++) {
    var colC = (rows[i][2] || '').toString().toLowerCase().trim();
    var colE = (rows[i][4] || '').toString().toLowerCase().trim();

    if (colC === lookup) {
      sheet.getRange(i + 1, 2).setValue(data.rsvp);           // Col B = RSVP
      sheet.getRange(i + 1, 4).setValue(data.meal);           // Col D = guest meal
      sheet.getRange(i + 1, 5).setValue(data.plusOneName);    // Col E = plus one name
      sheet.getRange(i + 1, 6).setValue(data.plusOneMeal);    // Col F = plus one meal
      sheet.getRange(i + 1, 16).setValue(data.welcomeParty); // Col P = welcome party checkbox
      break;
    }

    if (colE === lookup) {
      sheet.getRange(i + 1, 2).setValue(data.rsvp);
      sheet.getRange(i + 1, 4).setValue(data.plusOneMeal);
      sheet.getRange(i + 1, 6).setValue(data.meal);
      sheet.getRange(i + 1, 16).setValue(data.welcomeParty); // Col P
      break;
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}