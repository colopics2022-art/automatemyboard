function buildMartelArmsFolders() {
  var ROOT_FOLDER_ID = '1B_celNz21S7V9kBtDOf1GEbi-85sB9XS';
  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  Logger.log('Root: ' + root.getName());

  // Helper: get or create a subfolder
  function mkDir(parent, name) {
    var iter = parent.getFoldersByName(name);
    if (iter.hasNext()) {
      Logger.log('exists: ' + name);
      return iter.next();
    }
    Logger.log('create: ' + name);
    Utilities.sleep(150);
    return parent.createFolder(name);
  }

  // Section names use ASCII dash only (no em dash)
  var S01 = '01 - Governing Documents';
  var S02 = '02 - Board Only';
  var S03 = '03 - Financials';
  var S04 = '04 - Meetings';
  var S05 = '05 - Units';
  var S06 = '06 - Maintenance';
  var S07 = '07 - Communications';

  // _Admin
  Logger.log('--- _Admin ---');
  mkDir(root, '_Admin');

  // 01 Governing Documents
  Logger.log('--- ' + S01 + ' ---');
  var s01 = mkDir(root, S01);
  mkDir(s01, 'Declaration of Condominium');
  mkDir(s01, 'Bylaws');
  mkDir(s01, 'Rules and Regulations');
  mkDir(s01, 'Amendments');
  mkDir(s01, 'Articles of Incorporation');

  // 02 Board Only
  Logger.log('--- ' + S02 + ' ---');
  var s02 = mkDir(root, S02);
  mkDir(s02, 'Attorney-Client Communications');
  mkDir(s02, 'Personnel and Contracts');
  mkDir(s02, 'Insurance Policies');
  mkDir(s02, 'Litigation');
  mkDir(s02, 'Executive Session Minutes');

  // 03 Financials
  Logger.log('--- ' + S03 + ' ---');
  var s03 = mkDir(root, S03);
  var finSubs = ['Invoices', 'Bank Statements', 'Budget', 'Audits and Reviews', 'Reserve Fund'];
  var y2025 = mkDir(s03, '2025');
  var y2026 = mkDir(s03, '2026');
  for (var i = 0; i < finSubs.length; i++) {
    mkDir(y2025, finSubs[i]);
    mkDir(y2026, finSubs[i]);
  }

  // 04 Meetings
  Logger.log('--- ' + S04 + ' ---');
  var s04 = mkDir(root, S04);
  var meetSubs = ['Agendas', 'Minutes', 'Proxies', 'Notices'];
  var m2025 = mkDir(s04, '2025');
  var m2026 = mkDir(s04, '2026');
  for (var i = 0; i < meetSubs.length; i++) {
    mkDir(m2025, meetSubs[i]);
    mkDir(m2026, meetSubs[i]);
  }

  // 05 Units: A1-A6, B7-B12, C13-C18, D19-D24, G39-G44
  Logger.log('--- ' + S05 + ' ---');
  var s05 = mkDir(root, S05);
  var unitSubs = ['Lease and Ownership Docs', 'Violations', 'Requests and Work Orders', 'Correspondence'];
  var buildings = [['A',1,6],['B',7,12],['C',13,18],['D',19,24],['G',39,44]];
  for (var b = 0; b < buildings.length; b++) {
    var letter = buildings[b][0];
    var start  = buildings[b][1];
    var end    = buildings[b][2];
    Logger.log('Building ' + letter);
    for (var u = start; u <= end; u++) {
      var unitFolder = mkDir(s05, letter + u);
      for (var sf = 0; sf < unitSubs.length; sf++) {
        mkDir(unitFolder, unitSubs[sf]);
      }
    }
  }

  // 06 Maintenance
  Logger.log('--- ' + S06 + ' ---');
  var s06 = mkDir(root, S06);
  var vendors = mkDir(s06, 'Vendors');
  mkDir(vendors, 'Contracts');
  mkDir(vendors, 'Certificates of Insurance');
  mkDir(s06, 'Work Orders');
  var insp = mkDir(s06, 'Inspections');
  mkDir(insp, 'Structural');
  mkDir(insp, 'Fire and Life Safety');
  mkDir(insp, 'SIRS - Structural Integrity Reserve Study');
  mkDir(s06, 'Common Areas');

  // 07 Communications
  Logger.log('--- ' + S07 + ' ---');
  var s07 = mkDir(root, S07);
  mkDir(s07, 'Board Announcements');
  mkDir(s07, 'Owner Correspondence');
  mkDir(s07, 'Notices - Florida Statutory');
  mkDir(s07, 'Newsletters');

  Logger.log('=== Complete! ===');
  Logger.log('https://drive.google.com/drive/folders/' + ROOT_FOLDER_ID);
}
