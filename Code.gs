/**
 * TASK TRACKER — Google Sheets + Apps Script
 * ------------------------------------------------------------
 * Paste this whole file into Extensions > Apps Script of a blank
 * Google Sheet, save, then run setup() once (authorize when asked).
 *
 * Only manual input: Task_Input (or the "Add Task" form).
 * Everything else (Task Data, Dashboard, Weekly/Monthly/Yearly reports)
 * is formula driven.
 */

// ===================== CONFIG =====================
const N = {
  DASH: 'Dashboard', INPUT: 'Task_Input', DATA: 'Task_Data',
  WEEK: 'Weekly_Report', MONTH: 'Monthly_Report', YEAR: 'Yearly_Report',
  SET: 'Settings', LOG: 'Activity_Log'
};
const D = "'" + N.DATA + "'!";
const ST = "'" + N.SET + "'!";
const INP = "'" + N.INPUT + "'!";

const DEFAULT_TEAMS = [
  ['KAM', ['Taibur', 'Shawon']], ['Database', ['Shajib', 'Tahima']],
  ['Backend', ['Priya']], ['Frontend', ['Hasan']], ['Android', ['Shihab']],
  ['DevOps', ['Mehadi', 'Mayeen']], ['QA', ['Kashpia']]
];
const STATUSES = ['Pending', 'In Progress', 'Completed', 'Cancelled', 'On Hold'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const PENDING_EXCLUDED = ['Completed', 'Cancelled'];   // the dashboard's PENDING TASKS table lists every task EXCEPT these statuses
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

const INPUT_HEADERS = ['Task ID', 'Task Date', 'Task', 'Team', 'Assigned To', 'Priority', 'Status',
  'Start Date', 'Due Date', 'Completion Date', 'Notes', 'Created At'];
const C = { ID: 1, DATE: 2, TASK: 3, TEAM: 4, MEMBER: 5, PRIO: 6, STATUS: 7, START: 8, DUE: 9, DONE: 10, NOTES: 11, CREATED: 12 };
const MAX_ROWS = 2000;
const STYLE_TICK = 'Ticked list', STYLE_NATIVE = 'Native checkboxes';   // Settings!O6: how the Team / Assigned To dropdowns work
const OPT_COL = 23, OPT_COLS = 30;               // Settings!W:AZ - per-row Assigned To choices used by the native checkbox dropdown
const TICK = '\u2713 ';                         // shown in front of items that are already selected

// Settings layout: A=Teams, C:D=Team/Member, F=Status, H=Priority, J=Months, L=Years, N:O=options, Q=Days
const NAVY = '#1f3a5f', LIGHT = '#eaf0f8', GREY = '#f3f3f3';
const STATUS_COLORS = { 'Completed': '#b7e1cd', 'In Progress': '#c9daf8', 'Pending': '#fff2cc', 'On Hold': '#e6d7f0',
  'Cancelled': '#d9d9d9', 'Overdue': '#f4c7c3', 'Due Today': '#fce5cd', 'Upcoming': '#d9ead3' };
const PRIORITY_COLORS = { 'Critical': '#ea9999', 'High': '#f9cb9c', 'Medium': '#ffe599', 'Low': '#b6d7a8' };

// ===================== MENU =====================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Task Tracker')
    .addItem('➕ Add Task (form)', 'showTaskForm')
    .addSeparator()
    .addItem('Refresh team & member dropdowns', 'refreshAllMemberValidations')
    .addItem('Load sample data', 'loadSampleData')
    .addItem('Rebuild reports & dashboard', 'setup')
    .addToUi();
}

// ===================== SETUP =====================
function setup() {
  resetMemo_();
  const ss = SpreadsheetApp.getActive();
  const fresh = {};
  Object.keys(N).forEach(function (k) {
    let sh = ss.getSheetByName(N[k]);
    fresh[k] = !sh;
    if (!sh) sh = ss.insertSheet(N[k]);
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);

  if (fresh.SET) buildSettings_(ss.getSheetByName(N.SET)); else upgradeSettings_(ss.getSheetByName(N.SET));
  resetMemo_();
  if (settings_().style === 'native') buildMemberOptions_(); else if (!fresh.SET) clearMemberOptions_();
  if (fresh.INPUT) buildInput_(ss.getSheetByName(N.INPUT));
  if (fresh.LOG) buildLog_(ss.getSheetByName(N.LOG));
  applyInputDateRules_(ss.getSheetByName(N.INPUT));
  buildData_(ss.getSheetByName(N.DATA));
  buildMonthly_(ss.getSheetByName(N.MONTH));
  buildYearly_(ss.getSheetByName(N.YEAR));
  buildWeekly_(ss.getSheetByName(N.WEEK));
  buildDashboard_(ss.getSheetByName(N.DASH));

  // sheet order + colors
  const order = [N.DASH, N.INPUT, N.DATA, N.WEEK, N.MONTH, N.YEAR, N.SET, N.LOG];
  const tabs = ['#1f3a5f', '#34a853', '#9aa0a6', '#4285f4', '#4285f4', '#4285f4', '#fbbc04', '#9aa0a6'];
  order.forEach(function (name, i) {
    const sh = ss.getSheetByName(name);
    ss.setActiveSheet(sh);
    ss.moveActiveSheet(i + 1);
    sh.setTabColor(tabs[i]);
  });
  ss.setActiveSheet(ss.getSheetByName(N.DASH));
  SpreadsheetApp.flush();
  ss.toast('Task Tracker is ready. Start in Task_Input or Task Tracker > Add Task.', 'Done', 8);
}

// ---------- Settings ----------
function buildSettings_(sh) {
  sh.clear();
  sh.getRange('A1').setValue('Teams');
  sh.getRange('C1:D1').setValues([['Team', 'Member']]);
  sh.getRange('F1').setValue('Status');
  sh.getRange('H1').setValue('Priority');
  sh.getRange('J1').setValue('Months');
  sh.getRange('L1').setValue('Years');
  sh.getRange('N1:O1').setValues([['Setting', 'Value']]);
  sh.getRange('Q1').setValue('Days');

  const teams = DEFAULT_TEAMS.map(function (t) { return [t[0]]; });
  sh.getRange(2, 1, teams.length, 1).setValues(teams);
  const map = [];
  DEFAULT_TEAMS.forEach(function (t) { t[1].forEach(function (m) { map.push([t[0], m]); }); });
  sh.getRange(2, 3, map.length, 2).setValues(map);
  sh.getRange(2, 6, STATUSES.length, 1).setValues(STATUSES.map(function (s) { return [s]; }));
  sh.getRange(2, 8, PRIORITIES.length, 1).setValues(PRIORITIES.map(function (s) { return [s]; }));
  sh.getRange(2, 10, 12, 1).setValues(MONTHS.map(function (s) { return [s]; }));
  const y0 = new Date().getFullYear() - 2, years = [];
  for (let i = 0; i < 12; i++) years.push([y0 + i]);
  sh.getRange(2, 12, 12, 1).setValues(years);
  sh.getRange(2, 17, 7, 1).setValues(DAYS.map(function (s) { return [s]; }));
  sh.getRange('N2:O6').setValues([['Week starts on', 'Sunday'], ['Week start # (auto)', ''], ['Off day 1', 'None'], ['Off day 2', 'None'], ['Dropdown style', STYLE_TICK]]);
  sh.getRange('O3').setFormula('=MATCH(O2,Q2:Q8,0)');
  sh.getRange('O2').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(sh.getRange('Q2:Q8'), true).build());
  ['O4', 'O5'].forEach(function (a) { sh.getRange(a).setDataValidation(offDayRule_()); });
  sh.getRange('O6').setDataValidation(styleRule_());

  ['A1', 'C1:D1', 'F1', 'H1', 'J1', 'L1', 'N1:O1', 'Q1'].forEach(function (a) {
    sh.getRange(a).setBackground(NAVY).setFontColor('#fff').setFontWeight('bold');
  });
  sh.getRange('A2:A30').setBackground(LIGHT);
  sh.getRange('C2:D100').setBackground(LIGHT);
  sh.getRange('F2:F12').setBackground(LIGHT);
  sh.getRange('H2:H12').setBackground(LIGHT);
  ['O2', 'O4', 'O5', 'O6'].forEach(function (a) { sh.getRange(a).setBackground('#fff2cc'); });
  sh.setColumnWidths(1, 17, 110);
  sh.setColumnWidth(14, 230);
  sh.setColumnWidths(2, 1, 20); sh.setColumnWidth(5, 20); sh.setColumnWidth(7, 20);
  sh.setColumnWidth(9, 20); sh.setColumnWidth(11, 20); sh.setColumnWidth(13, 20); sh.setColumnWidth(16, 20);
  sh.getRange('N7').setValue('Off days: leave both on None when every day is a working day. Pick a day to block tasks and dates on it.')
    .setFontStyle('italic').setFontColor('#666');
  sh.getRange('N8').setValue(STYLE_NOTE).setFontStyle('italic').setFontColor('#666');
  sh.getRange('A32').setValue('To add a team: add it in column A (and its members in C:D). To add a member: add a row in C:D. Nothing else needs changing.')
    .setFontStyle('italic').setFontColor('#666');
  sh.setFrozenRows(1);
}

const STYLE_NOTE = 'Dropdown style: "Ticked list" = ticks shown in the list (set by the script). "Native checkboxes" = Google\'s own multi-select ' +
  'checkboxes, switched on by hand once in Task_Input (Data > Data validation > Dropdown from a range > Chip > Allow multiple selections): ' +
  'Team D2:D2000 uses =Settings!$A$2:$A$30 ; Assigned To E2:E2000 uses =Settings!W2:AZ2 (no $ signs, so each row reads its own list of members).';

/**
 * Native checkbox mode only. Settings!W:AZ, row r, holds the members of the teams chosen in Task_Input row r (one member per
 * cell, across). The Assigned To dropdown rule points at "=Settings!W2:AZ2" without $ signs, so every row reads its own list
 * and the checkboxes show only the members of that row's teams.
 * These are plain VALUES written by the script, not formulas: thousands of formulas made the spreadsheet recalculate for
 * so long that setup() timed out. Only rows that have a team are written.
 */
function memberOptionsMatrix_(teamTexts) {
  return teamTexts.map(function (t) {
    const row = membersForTeams_(splitList_(t)).slice(0, OPT_COLS);
    while (row.length < OPT_COLS) row.push('');
    return row;
  });
}

/** Writes the member choices for consecutive Task_Input rows starting at r1 (teamTexts[i] is the Team text of row r1+i). */
function writeMemberOptions_(r1, teamTexts) {
  if (!teamTexts.length) return;
  sheet_(N.SET).getRange(r1, OPT_COL, teamTexts.length, OPT_COLS).setValues(memberOptionsMatrix_(teamTexts));
}

/** Rebuilds all rows from the Team cells in Task_Input. */
function buildMemberOptions_() {
  const set = sheet_(N.SET), inp = sheet_(N.INPUT);
  if ((set.getMaxRows() || 0) < MAX_ROWS) set.insertRowsAfter(set.getMaxRows(), MAX_ROWS - set.getMaxRows());
  if ((set.getMaxColumns() || 99) < OPT_COL + OPT_COLS - 1) set.insertColumnsAfter(set.getMaxColumns(), OPT_COL + OPT_COLS - 1 - set.getMaxColumns());
  set.getRange(1, OPT_COL, MAX_ROWS, OPT_COLS).clearContent();
  set.getRange(1, OPT_COL).setValue('Assigned To choices for each Task_Input row (automatic - do not edit)')
    .setFontColor('#9aa0a6').setFontStyle('italic');
  const last = inp.getLastRow();
  if (last >= 2) writeMemberOptions_(2, inp.getRange(2, C.TEAM, last - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); }));
}

/** The ticked-list style does not need the per-row choices. */
function clearMemberOptions_() {
  sheet_(N.SET).getRange(1, OPT_COL, MAX_ROWS, OPT_COLS).clearContent();
}

/** Native mode: refresh the member choices of rows r1..r2 from their Team cells (one read, one write). */
function syncMemberOptions_(sh, r1, r2) {
  if (r2 < r1) return;
  writeMemberOptions_(r1, sh.getRange(r1, C.TEAM, r2 - r1 + 1, 1).getValues().map(function (r) { return String(r[0]).trim(); }));
}

function styleRule_() {
  return SpreadsheetApp.newDataValidation().requireValueInList([STYLE_TICK, STYLE_NATIVE], true).setAllowInvalid(false).build();
}

/** Dropdown for the two off-day cells: None or any weekday. */
function offDayRule_() {
  return SpreadsheetApp.newDataValidation().requireValueInList(['None'].concat(DAYS), true).setAllowInvalid(false).build();
}

/**
 * Settings sheets created by earlier versions have no off-day cells (O4:O5) and start the week on Saturday.
 * Add them without touching teams, members or anything else the user entered.
 */
function upgradeSettings_(sh) {
  const v = sh.getRange('N2:O5').getValues();
  const start = String(v[0][1]).trim(), off1 = String(v[2][1]).trim(), off2 = String(v[3][1]).trim();
  sh.getRange('N2:N5').setValues([['Week starts on'], ['Week start # (auto)'], ['Off day 1'], ['Off day 2']]);
  if (!start || start === 'Saturday') sh.getRange('O2').setValue('Sunday');
  sh.getRange('O3').setFormula('=MATCH(O2,Q2:Q8,0)');
  const oldDefault = off1 === 'Friday' && off2 === 'Saturday';          // the default of the previous version
  if (!off1 && !off2 || oldDefault) sh.getRange('O4:O5').setValues([['None'], ['None']]);
  sh.getRange('O2').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(sh.getRange('Q2:Q8'), true).build());
  ['O4', 'O5'].forEach(function (a1) { sh.getRange(a1).setDataValidation(offDayRule_()); });
  ['O2', 'O4', 'O5'].forEach(function (a1) { sh.getRange(a1).setBackground('#fff2cc'); });
  sh.getRange('N7').setValue('Off days: leave both on None when every day is a working day. Pick a day to block tasks and dates on it.')
    .setFontStyle('italic').setFontColor('#666');
  // dropdown style (added later): keep an existing choice, default to the ticked list
  sh.getRange('N6').setValue('Dropdown style');
  if (!String(sh.getRange('O6').getValue()).trim()) sh.getRange('O6').setValue(STYLE_TICK);
  sh.getRange('O6').setDataValidation(styleRule_()).setBackground('#fff2cc');
  sh.getRange('N8').setValue(STYLE_NOTE).setFontStyle('italic').setFontColor('#666');
}

// ---------- Task Input ----------
function buildInput_(sh) {
  if (sh.getMaxRows() < MAX_ROWS) sh.insertRowsAfter(sh.getMaxRows(), MAX_ROWS - sh.getMaxRows());
  const set = sheet_(N.SET);
  sh.getRange(1, 1, 1, INPUT_HEADERS.length).setValues([INPUT_HEADERS])
    .setBackground(NAVY).setFontColor('#fff').setFontWeight('bold').setVerticalAlignment('middle');
  sh.setRowHeight(1, 32);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);
  [90, 95, 300, 150, 190, 85, 100, 95, 95, 110, 260, 140].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

  const rows = MAX_ROWS - 1;
  sh.getRange(2, C.ID, rows).setBackground(GREY).setFontColor('#666');
  sh.getRange(2, C.DONE, rows).setBackground(GREY).setFontColor('#666');
  sh.getRange(2, C.CREATED, rows).setBackground(GREY).setFontColor('#666');
  ['B', 'H', 'I', 'J'].forEach(function (c) { sh.getRange(c + '2:' + c + MAX_ROWS).setNumberFormat('dd-mmm-yy'); });
  sh.getRange('L2:L' + MAX_ROWS).setNumberFormat('dd-mmm-yy hh:mm');
  sh.getRange('C2:C' + MAX_ROWS).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.getRange('K2:K' + MAX_ROWS).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  sh.getRange('F2:F' + MAX_ROWS).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(set.getRange('H2:H12'), true).setAllowInvalid(false).build());
  sh.getRange('G2:G' + MAX_ROWS).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(set.getRange('F2:F12'), true).setAllowInvalid(false).build());
  // multi-select columns: dropdown + toggle handled by onEdit, so invalid (comma lists) must be allowed
  sh.getRange('D2:D' + MAX_ROWS).setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(set.getRange('A2:A30'), true).setAllowInvalid(true).build());

  applyInputDateRules_(sh);
  sh.getRange('A1').setNote('Automatic (T-0001...)');
  sh.getRange('D1').setNote('MULTI-SELECT: pick a team to add it (it gets a tick in the list); pick a ticked team to remove it.');
  sh.getRange('E1').setNote('DEPENDENT MULTI-SELECT: lists only members of the selected teams. Selected members are ticked. Pick a member to add, pick a ticked member to remove.');
  sh.getRange('J1').setNote('Automatic: set when Status becomes Completed.');

  const rules = [];
  addTextRules_(rules, sh.getRange('G2:G' + MAX_ROWS), STATUS_COLORS);
  addTextRules_(rules, sh.getRange('F2:F' + MAX_ROWS), PRIORITY_COLORS);
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($I2<>"",$I2<TODAY(),$G2<>"Completed",$G2<>"Cancelled")')
    .setBackground('#f4c7c3').setFontColor('#a50e0e').setRanges([sh.getRange('I2:I' + MAX_ROWS)]).build());
  sh.setConditionalFormatRules(rules);
}

/**
 * Task Date, Start Date and Due Date use Google's "valid date" rule, which gives every cell a calendar picker
 * (double-click the cell). A picker cannot grey out Fridays/Saturdays, so off days are rejected right after the pick
 * by rejectOffDayDates_ / processRows_. Re-applied on every setup().
 */
function applyInputDateRules_(sh) {
  const rule = function (help) {
    return SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).setHelpText(help).build();
  };
  sh.getRange('B2:B' + MAX_ROWS).setDataValidation(rule('Double-click to pick a date.'));
  sh.getRange('H2:I' + MAX_ROWS).setDataValidation(rule('Double-click to pick a date.'));
}

// ---------- Activity log ----------
function buildLog_(sh) {
  sh.getRange(1, 1, 1, 8).setValues([['Timestamp', 'Task ID', 'Task', 'Action / Field', 'Old Status', 'New Status', 'Changed By', 'Note']])
    .setBackground(NAVY).setFontColor('#fff').setFontWeight('bold');
  sh.setFrozenRows(1);
  [150, 80, 280, 150, 110, 110, 200, 300].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange('A2:A').setNumberFormat('dd-mmm-yy hh:mm:ss');
}

// ---------- Master Task Data (all formulas) ----------
function buildData_(sh) {
  sh.clear();
  // must be at least as tall as Task_Input or the mirrored ARRAYFORMULA cannot expand
  if (sh.getMaxRows() < MAX_ROWS) sh.insertRowsAfter(sh.getMaxRows(), MAX_ROWS - sh.getMaxRows());
  sh.getRange(1, 1, 1, 16).setValues([INPUT_HEADERS.concat(['Month', 'Year', 'Duration (days)', 'Deadline Status'])])
    .setBackground(NAVY).setFontColor('#fff').setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('A2').setFormula('=ARRAYFORMULA(IF(' + INP + 'A2:L="","",' + INP + 'A2:L))');
  sh.getRange('M2').setFormula('=ARRAYFORMULA(IF(B2:B="","",DATE(YEAR(B2:B),MONTH(B2:B),1)))');
  sh.getRange('N2').setFormula('=ARRAYFORMULA(IF(B2:B="","",YEAR(B2:B)))');
  sh.getRange('O2').setFormula('=ARRAYFORMULA(IF((H2:H="")+(I2:I="")>0,"",I2:I-H2:H+1))');
  sh.getRange('P2').setFormula('=ARRAYFORMULA(IF(B2:B="","",IF(G2:G="Completed","Completed",IF(G2:G="Cancelled","Cancelled",' +
    'IF(I2:I="","No Due Date",IF(I2:I<TODAY(),"Overdue",IF(I2:I=TODAY(),"Due Today","Upcoming")))))))');
  ['B', 'H', 'I', 'J'].forEach(function (c) { sh.getRange(c + '2:' + c).setNumberFormat('dd-mmm-yy'); });
  sh.getRange('L2:L').setNumberFormat('dd-mmm-yy hh:mm');
  sh.getRange('M2:M').setNumberFormat('mmmm yyyy');
  sh.getRange('N2:N').setNumberFormat('0');
  [80, 90, 280, 150, 180, 80, 95, 90, 90, 100, 200, 130, 110, 60, 100, 110].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  const rules = [];
  addTextRules_(rules, sh.getRange('G2:G'), STATUS_COLORS);
  addTextRules_(rules, sh.getRange('P2:P'), STATUS_COLORS);
  addTextRules_(rules, sh.getRange('F2:F'), PRIORITY_COLORS);
  sh.setConditionalFormatRules(rules);
  warnOnly_(sh, 'Master data is formula driven - edit Task_Input instead');
}

// ---------- shared report helpers ----------
function dc_(c) { return D + '$' + c + ':$' + c; }
function col_(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

function reportFrame_(sh, title, subtitleFormula) {
  sh.clear(); sh.clearConditionalFormatRules();
  sh.setHiddenGridlines(true);
  sh.getRange('A1').setValue(title).setFontSize(20).setFontWeight('bold').setFontColor(NAVY);
  if (subtitleFormula) sh.getRange('A2').setFormula(subtitleFormula).setFontSize(12).setFontColor('#555');
}

function head_(sh, r, c, labels) {
  sh.getRange(r, c, 1, labels.length).setValues([labels])
    .setBackground(NAVY).setFontColor('#fff').setFontWeight('bold').setHorizontalAlignment('center');
}

/** Small grey line under the selectors: how many tasks exist and which dates they cover. */
function dataNote_(sh, a1) {
  const B = D + '$B$2:$B', C_ = D + '$C$2:$C';
  const n = 'SUMPRODUCT(--(LEN(' + C_ + ')>0))';   // tasks with a title (blank mirrored rows are ignored)
  const f = '=IF(' + n + '=0,"No tasks found yet - enter tasks in Task_Input",' +
    '"Tasks on file: "&' + n + '&"  |  dated "&TEXT(MIN(' + B + '),"dd mmm yyyy")&" to "&TEXT(MAX(' + B + '),"dd mmm yyyy")' +
    '&IF(' + n + '>COUNT(' + B + ')," - "&(' + n + '-COUNT(' + B + '))&" task(s) have no valid Task Date",""))';
  sh.getRange(a1).setFormula(f).setFontColor('#80868b').setFontStyle('italic').setFontSize(10);
}

function sectionTitle_(sh, r, c, text) {
  sh.getRange(r, c).setValue(text).setFontWeight('bold').setFontSize(12).setFontColor(NAVY);
}

function selectorCell_(sh, a1, value, listRange) {
  const r = sh.getRange(a1);
  r.setBackground('#fff2cc').setFontWeight('bold').setHorizontalAlignment('center').setBorder(true, true, true, true, false, false);
  r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(listRange, true).setAllowInvalid(false).build());
  if (value !== null) r.setValue(value);
}

/** cr = criteria prefix such as  <range>,<crit>  that restricts to the period. */
function summaryRows_(sh, r0, c0, cr, hasOverdue) {
  const labels = ['Total Tasks', 'Completed', 'In Progress', 'Pending', 'On Hold', 'Cancelled', 'Overdue', 'Completion Rate'];
  head_(sh, r0, c0, ['Metric', 'Result']);
  const f = [];
  const cnt = function (extra) { return '=COUNTIFS(' + cr + (extra ? ',' + extra : '') + ')'; };
  const sref = function (s) { return dc_('G') + ',"' + s + '"'; };
  const b = col_(c0 + 1);
  f.push([cnt('')], [cnt(sref('Completed'))], [cnt(sref('In Progress'))], [cnt(sref('Pending'))],
    [cnt(sref('On Hold'))], [cnt(sref('Cancelled'))], [cnt(dc_('P') + ',"Overdue"')],
    ['=IFERROR(' + b + (r0 + 2) + '/(' + b + (r0 + 1) + '-' + b + (r0 + 6) + '),0)']);
  sh.getRange(r0 + 1, c0, labels.length, 1).setValues(labels.map(function (l) { return [l]; })).setBackground(LIGHT).setFontWeight('bold');
  sh.getRange(r0 + 1, c0 + 1, labels.length, 1).setFormulas(f).setHorizontalAlignment('center');
  sh.getRange(r0 + 8, c0 + 1).setNumberFormat('0.0%');
  sh.getRange(r0, c0, labels.length + 1, 2).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
}

/** kind: 'team' | 'member'. Rows come from Settings. */
function breakdown_(sh, r0, c0, cr, kind, rows) {
  const isTeam = kind === 'team', off = isTeam ? 0 : 1, dim = isTeam ? 'D' : 'E';
  head_(sh, r0, c0, isTeam ? ['Team', 'Tasks', 'Completed', 'Open', 'Overdue', 'Completion %']
    : ['Member', 'Team', 'Tasks', 'Completed', 'Open', 'Overdue', 'Completion %']);
  const rng = sh.getRange(r0 + 1, c0, rows, 6 + off);
  const out = [];
  for (let i = 0; i < rows; i++) {
    const r = r0 + 1 + i, sr = i + 2;
    const nm = '$' + col_(c0) + r;
    const base = function (extra) { return 'COUNTIFS(' + cr + ',' + dc_(dim) + ',"*"&' + nm + '&"*"' + (extra ? ',' + extra : '') + ')'; };
    const tRef = col_(c0 + 1 + off) + r, cRef = col_(c0 + 2 + off) + r;
    const canc = base(dc_('G') + ',"Cancelled"');
    const line = [];
    if (isTeam) line.push('=IF(' + ST + 'A' + sr + '="","",' + ST + 'A' + sr + ')');
    else { line.push('=IF(' + ST + 'D' + sr + '="","",' + ST + 'D' + sr + ')'); line.push('=IF(' + nm + '="","",' + ST + 'C' + sr + ')'); }
    line.push('=IF(' + nm + '="","",' + base('') + ')');
    line.push('=IF(' + nm + '="","",' + base(dc_('G') + ',"Completed"') + ')');
    line.push('=IF(' + nm + '="","",' + tRef + '-' + cRef + '-' + canc + ')');
    line.push('=IF(' + nm + '="","",' + base(dc_('P') + ',"Overdue"') + ')');
    line.push('=IF(' + nm + '="","",IFERROR(' + cRef + '/(' + tRef + '-' + canc + '),0))');
    out.push(line);
  }
  rng.setFormulas(out).setHorizontalAlignment('center');
  sh.getRange(r0 + 1, c0, rows, 1).setHorizontalAlignment('left').setFontWeight('bold');
  sh.getRange(r0 + 1, c0 + 5 + off, rows, 1).setNumberFormat('0.0%');
  sh.getRange(r0, c0, rows + 1, 6 + off).setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
}

/** FILTER list of tasks; filterCond is a boolean array expression on Task_Data columns. */
function taskList_(sh, r0, title, filterCond) {
  sectionTitle_(sh, r0, 1, title);
  head_(sh, r0 + 1, 1, ['Task ID', 'Task Date', 'Task', 'Team', 'Assigned To', 'Priority', 'Status', 'Start Date', 'Due Date', 'Completed On', 'Deadline']);
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'P'].map(function (c) { return D + c + '2:' + c; }).join(',');
  sh.getRange(r0 + 2, 1).setFormula('=IFERROR(SORT(FILTER({' + cols + '},' + filterCond + '),2,TRUE,1,TRUE),"No tasks for this period")');
  [2, 8, 9, 10].forEach(function (c) { sh.getRange(r0 + 2, c, 600, 1).setNumberFormat('dd-mmm-yy'); });
  const rules = sh.getConditionalFormatRules();
  addTextRules_(rules, sh.getRange(r0 + 2, 7, 600, 1), STATUS_COLORS);
  addTextRules_(rules, sh.getRange(r0 + 2, 11, 600, 1), STATUS_COLORS);
  addTextRules_(rules, sh.getRange(r0 + 2, 6, 600, 1), PRIORITY_COLORS);
  sh.setConditionalFormatRules(rules);
}

function addTextRules_(rules, range, map) {
  Object.keys(map).forEach(function (k) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(k).setBackground(map[k]).setRanges([range]).build());
  });
}

function widths_(sh, arr) { arr.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); }); }

// ---------- Monthly ----------
function buildMonthly_(sh) {
  reportFrame_(sh, 'MONTHLY REPORT', '=TEXT($B$5,"mmmm yyyy")&" — automatically built from Task_Data"');
  const now = new Date();
  sh.getRange('A3').setValue('Select Month'); sh.getRange('A4').setValue('Select Year'); sh.getRange('A5').setValue('Period start (auto)');
  sh.getRange('A3:A5').setFontWeight('bold');
  const set = sheet_(N.SET);
  selectorCell_(sh, 'B3', MONTHS[now.getMonth()], set.getRange('J2:J13'));
  selectorCell_(sh, 'B4', now.getFullYear(), set.getRange('L2:L30'));
  sh.getRange('B5').setFormula('=DATE($B$4,MATCH($B$3,' + ST + '$J$2:$J$13,0),1)').setNumberFormat('dd-mmm-yyyy').setFontColor('#888').setHorizontalAlignment('center');

  dataNote_(sh, 'D3');
  const cr = dc_('M') + ',$B$5';
  sectionTitle_(sh, 6, 1, 'Summary');
  summaryRows_(sh, 7, 1, cr);
  sectionTitle_(sh, 6, 4, 'Team Performance (a task counts for every team on it)');
  breakdown_(sh, 7, 4, cr, 'team', 15);
  sectionTitle_(sh, 6, 11, 'Member Performance');
  breakdown_(sh, 7, 11, cr, 'member', 30);
  taskList_(sh, 40, 'All Tasks in selected month', D + 'M2:M=$B$5');
  widths_(sh, [150, 110, 260, 130, 170, 80, 100, 90, 90, 100, 100, 90, 70, 70, 70, 70, 90]);
  sh.setFrozenRows(5);
  protect_(sh, ['B3', 'B4']);
}

// ---------- Yearly ----------
function buildYearly_(sh) {
  reportFrame_(sh, 'YEARLY REPORT', '=$B$3&" Task Summary — automatically built from Task_Data"');
  const set = sheet_(N.SET);
  sh.getRange('A3').setValue('Select Year').setFontWeight('bold');
  selectorCell_(sh, 'B3', new Date().getFullYear(), set.getRange('L2:L30'));

  dataNote_(sh, 'D3');
  sectionTitle_(sh, 5, 1, 'Month by month');
  head_(sh, 6, 1, ['Month', 'Total', 'Completed', 'Open', 'Cancelled', 'Overdue', 'Completion %']);
  const f = [];
  for (let m = 1; m <= 12; m++) {
    const r = 6 + m, mon = 'DATE($B$3,' + m + ',1)';
    const cnt = function (extra) { return 'COUNTIFS(' + dc_('M') + ',' + mon + (extra ? ',' + extra : '') + ')'; };
    f.push(['=' + ST + 'J' + (m + 1), '=' + cnt(''), '=' + cnt(dc_('G') + ',"Completed"'),
      '=B' + r + '-C' + r + '-E' + r, '=' + cnt(dc_('G') + ',"Cancelled"'), '=' + cnt(dc_('P') + ',"Overdue"'),
      '=IFERROR(C' + r + '/(B' + r + '-E' + r + '),0)']);
  }
  f.push(['="TOTAL"', '=SUM(B7:B18)', '=SUM(C7:C18)', '=SUM(D7:D18)', '=SUM(E7:E18)', '=SUM(F7:F18)', '=IFERROR(C19/(B19-E19),0)']);
  sh.getRange(7, 1, 13, 7).setFormulas(f).setHorizontalAlignment('center');
  sh.getRange(7, 1, 12, 1).setHorizontalAlignment('left').setFontWeight('bold');
  sh.getRange('A19:G19').setBackground(LIGHT).setFontWeight('bold');
  sh.getRange('G7:G19').setNumberFormat('0.0%');
  sh.getRange('A6:G19').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);

  const cr = dc_('N') + ',$B$3';
  sectionTitle_(sh, 5, 9, 'Team Performance');
  breakdown_(sh, 6, 9, cr, 'team', 15);
  sectionTitle_(sh, 5, 16, 'Member Performance');
  breakdown_(sh, 6, 16, cr, 'member', 30);

  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.insertChart(sh.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(sh.getRange('A6:C18'))
    .setNumHeaders(1).setPosition(21, 1, 0, 0)
    .setOption('title', 'Tasks per month').setOption('width', 620).setOption('height', 300)
    .setOption('colors', ['#4285f4', '#34a853']).build());
  widths_(sh, [120, 70, 90, 70, 80, 70, 100, 30, 120, 70, 90, 70, 70, 90, 30, 120, 90, 70, 90, 70, 70, 90]);
  sh.setFrozenRows(3);
  protect_(sh, ['B3']);
}

// ---------- Weekly ----------
function buildWeekly_(sh) {
  reportFrame_(sh, 'WEEKLY REPORT', '="Week of "&TEXT($B$4,"dd mmm yyyy")&" to "&TEXT($B$5,"dd mmm yyyy")');
  sh.getRange('A3').setValue('Any date in the week').setFontWeight('bold');
  sh.getRange('A4').setValue('Week start (auto)'); sh.getRange('A5').setValue('Week end (auto)');
  sh.getRange('B3').setFormula('=TODAY()').setNumberFormat('dd-mmm-yyyy').setBackground('#fff2cc')
    .setFontWeight('bold').setHorizontalAlignment('center').setBorder(true, true, true, true, false, false)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().build());
  sh.getRange('B3').setNote('Defaults to today. Type any date to see that week. Week start day and off days (optional) are set in Settings.');
  sh.getRange('B4').setFormula('=$B$3-MOD(WEEKDAY($B$3)-IFERROR(' + ST + '$O$3,1),7)');
  sh.getRange('B5').setFormula('=$B$4+6');
  sh.getRange('B4:B5').setNumberFormat('ddd dd-mmm-yy').setHorizontalAlignment('center').setFontColor('#888');

  dataNote_(sh, 'D3');
  sectionTitle_(sh, 6, 1, 'Day by day');
  head_(sh, 7, 1, ['Day', 'Date', 'Total', 'Completed', 'Open', 'Completion %']);
  const f = [];
  for (let n = 0; n < 7; n++) {
    const r = 8 + n;
    const cnt = function (extra) { return 'COUNTIFS(' + dc_('B') + ',$B' + r + (extra ? ',' + extra : '') + ')'; };
    const off = 'OR(WEEKDAY($B' + r + ')=IFERROR(MATCH(' + ST + '$O$4,' + ST + '$Q$2:$Q$8,0),0),WEEKDAY($B' + r + ')=IFERROR(MATCH(' + ST + '$O$5,' + ST + '$Q$2:$Q$8,0),0))';
    const skip = function (x) { return '=IF(' + off + ',"",' + x + ')'; }; // off days show blank and are not counted
    f.push(['=TEXT($B' + r + ',"dddd")&IF(' + off + '," (off)","")', '=$B$4+' + n, skip(cnt('')), skip(cnt(dc_('G') + ',"Completed"')),
      skip('C' + r + '-D' + r + '-' + cnt(dc_('G') + ',"Cancelled"')),
      skip('IFERROR(D' + r + '/(C' + r + '-' + cnt(dc_('G') + ',"Cancelled"') + '),0)')]);
  }
  f.push(['="WEEK TOTAL"', '', '=SUM(C8:C14)', '=SUM(D8:D14)', '=SUM(E8:E14)', '=IFERROR(D15/C15,0)']);
  sh.getRange(8, 1, 8, 6).setFormulas(f).setHorizontalAlignment('center');
  sh.getRange('B8:B14').setNumberFormat('dd-mmm-yy');
  sh.getRange('F8:F15').setNumberFormat('0.0%');
  sh.getRange('A8:A14').setHorizontalAlignment('left').setFontWeight('bold');
  sh.getRange('A15:F15').setBackground(LIGHT).setFontWeight('bold');
  sh.getRange('A7:F15').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  sh.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=RIGHT($A8,5)="(off)"')
    .setBackground('#eceff1').setFontColor('#78909c').setRanges([sh.getRange('A8:F14')]).build()]);

  const cr = dc_('B') + ',">="&$B$4,' + dc_('B') + ',"<="&$B$5';
  sectionTitle_(sh, 6, 8, 'Team Performance');
  breakdown_(sh, 7, 8, cr, 'team', 15);
  sectionTitle_(sh, 6, 15, 'Member Performance');
  breakdown_(sh, 7, 15, cr, 'member', 30);
  taskList_(sh, 40, 'All Tasks in selected week', D + 'B2:B>=$B$4,' + D + 'B2:B<=$B$5');
  widths_(sh, [140, 110, 260, 130, 170, 90, 100, 120, 70, 90, 70, 70, 90, 30, 120, 90, 70, 90, 70, 70, 90]);
  sh.setFrozenRows(5);
  protect_(sh, ['B3']);
}

function warnOnly_(sh, description) {
  sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
  return sh.protect().setWarningOnly(true).setDescription(description);
}

function protect_(sh, unprotectedA1) {
  const p = warnOnly_(sh, 'Report is automatic - only change the yellow selector cells');
  p.setUnprotectedRanges(unprotectedA1.map(function (a) { return sh.getRange(a); }));
}

// ---------- chart source data (Settings!S:U) ----------
function buildChartData_() {
  const set = sheet_(N.SET);
  set.getRange('S1:U40').clear();
  const dim = '#9aa0a6';
  const dcr = function (c) { return dc_(c); };
  const mon = 'DATE(YEAR(TODAY()),MONTH(TODAY()),1)';
  set.getRange('S1').setValue('Chart data for the Dashboard (automatic - do not edit)').setFontColor(dim).setFontStyle('italic');
  set.getRange('S3:T3').setValues([['Status (this month)', 'Tasks']]).setFontWeight('bold');
  const sf = [];
  for (let i = 0; i < 5; i++) sf.push(['=F' + (i + 2), '=COUNTIFS(' + dcr('M') + ',' + mon + ',' + dcr('G') + ',S' + (4 + i) + ')']);
  set.getRange('S4:T8').setFormulas(sf);
  set.getRange('S11:T11').setValues([['Team (this month)', 'Tasks']]).setFontWeight('bold');
  const tf = [];
  for (let i = 0; i < 12; i++) {
    const r = 12 + i;
    tf.push(['=IF(A' + (i + 2) + '="","",A' + (i + 2) + ')',
      '=IF(S' + r + '="","",COUNTIFS(' + dcr('M') + ',' + mon + ',' + dcr('D') + ',"*"&S' + r + '&"*"))']);
  }
  set.getRange('S12:T23').setFormulas(tf);
  set.getRange('S27:U27').setValues([['Month (this year)', 'Total', 'Completed']]).setFontWeight('bold');
  const mf = [];
  for (let m = 1; m <= 12; m++) {
    const d = 'DATE(YEAR(TODAY()),' + m + ',1)';
    mf.push(['=J' + (m + 1), '=COUNTIFS(' + dcr('M') + ',' + d + ')',
      '=COUNTIFS(' + dcr('M') + ',' + d + ',' + dcr('G') + ',"Completed")']);
  }
  set.getRange('S28:U39').setFormulas(mf);
  set.getRange('S3:U39').setFontColor(dim);
  set.getRange('S1').setFontColor(dim);
  set.setColumnWidth(19, 150);
  return set;
}

// ---------- Dashboard ----------
// Layout (matches the preview):
//   rows 1-2    title + today's date
//   rows 4-12   TODAY table (A:B) and PERIOD OVERVIEW table (D:H)
//   rows 14-27  three charts side by side (chart data is on Settings!S:U)
//   row 29+     TODAY'S TASKS list (A:F) and, to its right, the PENDING TASKS list (H:M)
// Column widths A..H = 240,150,170,100,110,110,90,120 -> x offsets 0,240,390,560,660,770,880,970,
// so chart 1 (A, 380px) ends before C, chart 2 (C+10, 400px) ends before G, chart 3 starts at G.
function buildDashboard_(sh) {
  sh.clear(); sh.clearConditionalFormatRules();
  sh.getCharts().forEach(function (c) { sh.removeChart(c); });
  sh.setHiddenGridlines(true);
  sh.setRowHeights(1, 60, 21);
  sh.setRowHeight(1, 36);
  widths_(sh, [240, 150, 170, 100, 110, 110, 90, 120]);

  sh.getRange('A1').setValue('TASK TRACKER').setFontSize(24).setFontWeight('bold').setFontColor(NAVY).setVerticalAlignment('middle');
  sh.getRange('A2').setFormula('="Today: "&TEXT(TODAY(),"dddd, dd mmmm yyyy")').setFontColor('#555').setFontWeight('bold');

  // ----- TODAY -----
  sectionTitle_(sh, 4, 1, 'TODAY');
  head_(sh, 5, 1, ['Metric', 'Count']);
  const today = dc_('B') + ',TODAY()';
  const lab = ['Total Tasks Today', 'Completed', 'In Progress', 'Pending', 'On Hold', 'Due Today (all tasks)', 'Overdue (all open tasks)'];
  const fm = [
    '=COUNTIFS(' + today + ')',
    '=COUNTIFS(' + today + ',' + dc_('G') + ',"Completed")',
    '=COUNTIFS(' + today + ',' + dc_('G') + ',"In Progress")',
    '=COUNTIFS(' + today + ',' + dc_('G') + ',"Pending")',
    '=COUNTIFS(' + today + ',' + dc_('G') + ',"On Hold")',
    '=COUNTIFS(' + dc_('P') + ',"Due Today")',
    '=COUNTIFS(' + dc_('P') + ',"Overdue")'];
  sh.getRange(6, 1, 7, 1).setValues(lab.map(function (l) { return [l]; })).setBackground(LIGHT).setFontWeight('bold');
  sh.getRange(6, 2, 7, 1).setFormulas(fm.map(function (x) { return [x]; })).setHorizontalAlignment('center');
  sh.getRange('A5:B12').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  const rules = [SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(0).setBackground('#f4c7c3').setFontColor('#a50e0e')
    .setRanges([sh.getRange('B12')]).build()];

  // ----- PERIOD OVERVIEW -----
  sectionTitle_(sh, 4, 4, 'PERIOD OVERVIEW');
  head_(sh, 5, 4, ['Period', 'Total', 'Completed', 'Open', 'Completion %']);
  const ws = 'TODAY()-MOD(WEEKDAY(TODAY())-IFERROR(' + ST + '$O$3,1),7)';
  const periods = [
    ['Today', today],
    ['This Week', dc_('B') + ',">="&' + ws + ',' + dc_('B') + ',"<="&(' + ws + '+6)'],
    ['This Month', dc_('M') + ',DATE(YEAR(TODAY()),MONTH(TODAY()),1)'],
    ['This Year', dc_('N') + ',YEAR(TODAY())']];
  const pf = periods.map(function (p, i) {
    const r = 6 + i, cr = p[1];
    const canc = 'COUNTIFS(' + cr + ',' + dc_('G') + ',"Cancelled")';
    return ['="' + p[0] + '"', '=COUNTIFS(' + cr + ')', '=COUNTIFS(' + cr + ',' + dc_('G') + ',"Completed")',
      '=E' + r + '-F' + r + '-' + canc, '=IFERROR(F' + r + '/(E' + r + '-' + canc + '),0)'];
  });
  sh.getRange(6, 4, 4, 5).setFormulas(pf).setHorizontalAlignment('center');
  sh.getRange('D6:D9').setBackground(LIGHT).setFontWeight('bold').setHorizontalAlignment('left');
  sh.getRange('H6:H9').setNumberFormat('0.0%');
  sh.getRange('D5:H9').setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);

  // ----- charts (rows 14-27) -----
  const set = buildChartData_();
  const style = function (b, title, w) {
    return b.setOption('title', title).setOption('width', w).setOption('height', 270)
      .setOption('titleTextStyle', { fontSize: 12, bold: true, color: '#1f3a5f' })
      .setOption('backgroundColor', '#ffffff');
  };
  sh.insertChart(style(sh.newChart().setChartType(Charts.ChartType.PIE).addRange(set.getRange('S3:T8')).setNumHeaders(1)
    .setPosition(14, 1, 0, 0).setOption('pieHole', 0.55).setOption('legend', { position: 'bottom' })
    .setOption('pieSliceText', 'value')
    .setOption('colors', ['#d9a21b', '#4a7fd8', '#2e9e62', '#8a8f98', '#8f5bc9']), 'Task Status — This Month', 380).build());
  sh.insertChart(style(sh.newChart().setChartType(Charts.ChartType.BAR).addRange(set.getRange('S11:T23')).setNumHeaders(1)
    .setPosition(14, 3, 10, 0).setOption('legend', { position: 'none' })
    .setOption('colors', ['#4a7fd8']), 'Tasks by Team — This Month', 400).build());
  sh.insertChart(style(sh.newChart().setChartType(Charts.ChartType.COLUMN).addRange(set.getRange('S27:U39')).setNumHeaders(1)
    .setPosition(14, 7, 0, 0).setOption('legend', { position: 'bottom' })
    .setOption('colors', ['#4a7fd8', '#2e9e62']), 'Monthly Productivity — This Year', 450).build());

  // ----- TODAY'S TASKS (below the charts) -----
  sectionTitle_(sh, 29, 1, "TODAY'S TASKS");
  head_(sh, 30, 1, ['Task', 'Team', 'Assigned To', 'Priority', 'Status', 'Deadline']);
  sh.getRange('A31').setFormula('=IFERROR(FILTER({' + ['C', 'D', 'E', 'F', 'G', 'P'].map(function (c) { return D + c + '2:' + c; }).join(',') +
    '},' + D + 'B2:B=TODAY()),{"No tasks entered for today","","","","",""})');
  sh.getRange('A31:F300').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.getRange('D31:F300').setHorizontalAlignment('center');
  addTextRules_(rules, sh.getRange('E31:E300'), STATUS_COLORS);
  addTextRules_(rules, sh.getRange('F31:F300'), STATUS_COLORS);
  addTextRules_(rules, sh.getRange('D31:D300'), PRIORITY_COLORS);

  // ----- PENDING TASKS: every task that is not Completed or Cancelled, to the right of today's list (columns H:M) -----
  [220, 110, 130, 90, 100, 100].forEach(function (w, i) { sh.setColumnWidth(8 + i, w); });
  const open = ['(' + D + 'C2:C<>"")'].concat(PENDING_EXCLUDED.map(function (st) { return '(' + D + 'G2:G<>"' + st + '")'; })).join('*');
  const openCount = 'SUMPRODUCT(' + open.split(D + 'C2:C').join(D + '$C$2:$C').split(D + 'G2:G').join(D + '$G$2:$G') + ')';
  sh.getRange('H29').setFormula('="PENDING TASKS ("&' + openCount + '&")"').setFontWeight('bold').setFontSize(12).setFontColor(NAVY);
  head_(sh, 30, 8, ['Task', 'Team', 'Assigned To', 'Priority', 'Status', 'Deadline']);
  sh.getRange('H31').setFormula('=IFERROR(FILTER({' + ['C', 'D', 'E', 'F', 'G', 'P'].map(function (c) { return D + c + '2:' + c; }).join(',') +
    '},' + open + '),{"No pending tasks","","","","",""})');
  sh.getRange('H31:M300').setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sh.getRange('K31:M300').setHorizontalAlignment('center');
  addTextRules_(rules, sh.getRange('K31:K300'), PRIORITY_COLORS);
  addTextRules_(rules, sh.getRange('L31:L300'), STATUS_COLORS);
  addTextRules_(rules, sh.getRange('M31:M300'), STATUS_COLORS);

  sh.setConditionalFormatRules(rules);
  warnOnly_(sh, 'Dashboard is automatic');
}

// ===================== TASK INPUT AUTOMATION =====================
/** Returns the named sheet or throws a message that says how to fix it. */
function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" not found. Run setup() from Extensions > Apps Script (tab names must match exactly).');
  return sh;
}

function onEdit(e) {
  try { handleEdit_(e); } catch (err) { console.error(err); SpreadsheetApp.getActive().toast(String(err), 'Task Tracker error', 6); }
}

let LAST_USER_ = '';
let MEMO_ = {};                                   // Settings are read once per run, not once per call
function resetMemo_() { MEMO_ = {}; }
function memo_(key, fn) { if (!(key in MEMO_)) MEMO_[key] = fn(); return MEMO_[key]; }

function handleEdit_(e) {
  if (!e || !e.range) return;
  resetMemo_();
  try { LAST_USER_ = (e.user && e.user.getEmail && e.user.getEmail()) || ''; } catch (x) { LAST_USER_ = ''; }
  const sh = e.range.getSheet();
  if (sh.getName() !== N.INPUT) return;
  const rng = e.range, r1 = rng.getRow(), r2 = r1 + rng.getNumRows() - 1;
  const c1 = rng.getColumn(), c2 = c1 + rng.getNumColumns() - 1;
  if (r2 < 2) return;
  const single = rng.getNumRows() === 1 && rng.getNumColumns() === 1;

  // Team / Assigned To picks have their own short path: the cell must change as quickly as possible
  if (single && r1 >= 2 && (c1 === C.TEAM || c1 === C.MEMBER)) { handleMultiSelectEdit_(e, sh, r1, c1); return; }

  rejectOffDayDates_(sh, Math.max(r1, 2), r2, c1, c2);

  if (single && r1 >= 2) {
    // Activity log for single-cell edits
    if (c1 >= C.DATE && c1 <= C.NOTES && c1 !== C.DONE) {
      const row = r1, cur = sh.getRange(row, 1, 1, 3).getValues()[0];
      const id = cur[C.ID - 1];
      const nv = rng.getDisplayValue();
      const ov = e.oldValue === undefined ? '' : String(e.oldValue);
      if (id && nv !== ov) {
        const t = cur[C.TASK - 1];
        if (c1 === C.STATUS) logChange_(id, t, 'Status Changed', ov, nv, '');
        else logChange_(id, t, 'Edited: ' + INPUT_HEADERS[c1 - 1], '', '', (ov || '(blank)') + ' → ' + (nv || '(blank)'));
      }
    }
  } else if (c1 <= C.MEMBER && c2 >= C.TEAM) {
    applyRowRules_(sh, Math.max(r1, 2), r2, true);
  }
  processRows_(sh, Math.max(r1, 2), r2, c1 <= C.DATE && c2 >= C.DATE);
}

/**
 * One pick in a Team or Assigned To cell. Two reads (Settings, the row), then one write for the two cells and one
 * for their dropdown lists. The log entry comes last, after the cell has already changed.
 */
function handleMultiSelectEdit_(e, sh, row, col) {
  const cfg = settings_();
  if (cfg.style === 'native') { handleNativeEdit_(e, sh, row, col, cfg); return; }
  const cur = sh.getRange(row, 1, 1, 12).getValues()[0];
  const oldText = e.oldValue === undefined || e.oldValue === null ? '' : String(e.oldValue);
  let team = String(cur[C.TEAM - 1]).trim(), member = String(cur[C.MEMBER - 1]).trim();

  if (col === C.TEAM) {
    team = toggleResult_(oldText, e.value, cfg.teams, team);
    const allowed = membersForTeams_(splitList_(team)), have = splitList_(member);
    member = allowed.filter(function (m) { return have.indexOf(m) > -1; }).join(', ');   // drop members of removed teams
  } else {
    const teams = splitList_(team);
    if (!teams.length) {
      sh.getRange(row, C.MEMBER).setValue(oldText);
      SpreadsheetApp.getActive().toast('Select a Team first - members depend on it.', 'Task Tracker', 4);
      return;
    }
    member = toggleResult_(oldText, e.value, membersForTeams_(teams), member);
  }

  const pair = sh.getRange(row, C.TEAM, 1, 2);
  pair.setValues([[team, member]]);
  pair.setDataValidations([rulesFor_(team, member)]);

  const id = cur[C.ID - 1], newText = col === C.TEAM ? team : member;
  if (id && newText !== oldText) {
    logChange_(id, cur[C.TASK - 1], 'Edited: ' + INPUT_HEADERS[col - 1], '', '', (oldText || '(blank)') + ' → ' + (newText || '(blank)'));
  }
  if (!id && String(cur[C.TASK - 1]).trim()) processRows_(sh, row, row, false);   // a task row that still needs its ID
}

/**
 * "Native checkboxes" mode. Google's own multi-select dropdown (switched on by hand in Data validation) writes the whole
 * selection into the cell, e.g. "Database, KAM". The script then tidies it: items not in Settings are removed, the order
 * follows Settings, and members that do not belong to the selected teams are removed. It never touches the dropdown rules.
 */
function handleNativeEdit_(e, sh, row, col, cfg) {
  const cur = sh.getRange(row, 1, 1, 12).getValues()[0];
  const oldText = e.oldValue === undefined || e.oldValue === null ? '' : String(e.oldValue);
  const rawTeam = String(cur[C.TEAM - 1]).trim(), rawMember = String(cur[C.MEMBER - 1]).trim();
  const r = cleanPair_(rawTeam, rawMember, cfg);
  const msgs = cleanNotes_(r);
  if (col === C.MEMBER && !r.team) {
    msgs.length = 0;
    msgs.push('Select a Team first - members depend on it.');
  }
  if (r.team !== rawTeam || r.member !== rawMember) sh.getRange(row, C.TEAM, 1, 2).setValues([[r.team, r.member]]);
  if (col === C.TEAM || r.team !== rawTeam) writeMemberOptions_(row, [r.team]);   // the Assigned To checkboxes of this row follow the teams
  if (msgs.length) SpreadsheetApp.getActive().toast(msgs.join('; '), 'Task Tracker', 6);

  const id = cur[C.ID - 1], newText = col === C.TEAM ? r.team : r.member;
  if (id && newText !== oldText) {
    logChange_(id, cur[C.TASK - 1], 'Edited: ' + INPUT_HEADERS[col - 1], '', '', (oldText || '(blank)') + ' → ' + (newText || '(blank)'));
  }
  if (!id && String(cur[C.TASK - 1]).trim()) processRows_(sh, row, row, false);
}

/** Team and Assigned To text made consistent with Settings: valid items only, Settings order, members of the chosen teams only. */
function cleanPair_(team, member, cfg) {
  const strip = function (x) { return x.replace(/^\u2713\s*/, ''); };
  const teamsIn = splitList_(team).map(strip);
  const teamOut = cfg.teams.filter(function (t) { return teamsIn.indexOf(t) > -1; });
  const membersIn = splitList_(member).map(strip);
  const memberOut = membersForTeams_(teamOut).filter(function (m) { return membersIn.indexOf(m) > -1; });
  return {
    team: teamOut.join(', '), member: memberOut.join(', '),
    unknownTeams: teamsIn.filter(function (t) { return cfg.teams.indexOf(t) === -1; }),
    dropped: membersIn.filter(function (m) { return memberOut.indexOf(m) === -1; })
  };
}

function cleanNotes_(r) {
  const m = [];
  if (r.unknownTeams.length) m.push('Not a team in Settings, removed: ' + r.unknownTeams.join(', '));
  if (r.dropped.length) m.push('Removed from Assigned To (not in the selected teams): ' + r.dropped.join(', '));
  return m;
}

/** Native mode, many rows (paste, refresh): tidy Team / Assigned To in one read and one write. */
function normalizeRows_(sh, r1, r2) {
  if (r2 < r1) return;
  const cfg = settings_(), n = r2 - r1 + 1, block = sh.getRange(r1, C.TEAM, n, 2), v = block.getValues();
  let changed = false;
  const out = v.map(function (row) {
    const t = String(row[0]).trim(), m = String(row[1]).trim(), r = cleanPair_(t, m, cfg);
    if (r.team !== t || r.member !== m) changed = true;
    return [r.team, r.member];
  });
  if (changed) block.setValues(out);
  writeMemberOptions_(r1, out.map(function (o) { return o[0]; }));
}

/**
 * Dates picked on an off day are cleared with a message. A Task Date on a row that already has a task is left to
 * processRows_, which can put the previous date back.
 */
function rejectOffDayDates_(sh, r1, r2, c1, c2) {
  if (r2 < r1) return;
  const offs = offDayNumbers_(), msgs = [], n = r2 - r1 + 1;
  if (!offs.length) return;                      // no off days set: nothing to check
  const tasks = sh.getRange(r1, C.TASK, n, 1).getValues();
  [C.DATE, C.START, C.DUE].forEach(function (col) {
    if (col < c1 || col > c2) return;
    const vals = sh.getRange(r1, col, n, 1).getValues();
    for (let i = 0; i < n; i++) {
      const x = vals[i][0];
      if (!(x instanceof Date) || offs.indexOf(weekdayNum_(x)) === -1) continue;
      if (col === C.DATE && String(tasks[i][0]).trim()) continue;
      sh.getRange(r1 + i, col).clearContent();
      msgs.push(INPUT_HEADERS[col - 1] + ': ' + DAYS[weekdayNum_(x) - 1] + ' is an off day - pick a working day (row ' + (r1 + i) + ')');
    }
  });
  if (msgs.length) SpreadsheetApp.getActive().toast(msgs.join('; '), 'Off day', 8);
}

/**
 * Fills Task ID, Task Date (today, or the next working day, when left blank), defaults, Created At and Completion Date.
 * Created At always carries the Task Date; syncCreated=true means the Task Date was just edited, so Created At is moved too.
 * Task Date, Start Date and Due Date on an off day are rejected.
 *
 * Speed: everything is worked out in memory and written back one column at a time. The document lock is held only for
 * the short step that hands out Task IDs, so quick successive edits do not queue up behind each other.
 */
function processRows_(sh, r1, r2, syncCreated) {
  const n = r2 - r1 + 1;
  const vals = sh.getRange(r1, 1, n, 12).getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const offs = offDayNumbers_();
  const autoDate = nextWorkday_(today, offs);
  const changed = {}, needId = [], blocked = [];
  const put = function (i, col, value) { vals[i][col - 1] = value; changed[col] = true; };

  for (let i = 0; i < n; i++) {
    const v = vals[i], row = r1 + i;
    if (!String(v[C.TASK - 1]).trim()) continue;
    const given = v[C.DATE - 1];
    if (given instanceof Date && offs.indexOf(weekdayNum_(given)) > -1) {
      const prev = v[C.ID - 1] && v[C.CREATED - 1] instanceof Date ? v[C.CREATED - 1] : null;   // Created At carries the old Task Date
      if (prev) {
        put(i, C.DATE, new Date(prev.getFullYear(), prev.getMonth(), prev.getDate()));
        blocked.push('Task Date: ' + DAYS[weekdayNum_(given) - 1] + ' is an off day - previous date kept (row ' + row + ')');
      } else {
        put(i, C.DATE, '');
        blocked.push('Task Date: ' + DAYS[weekdayNum_(given) - 1] + ' is an off day - task not saved (row ' + row + ')');
      }
      continue;
    }
    const taskDate = given instanceof Date ? given : autoDate;
    if (!(given instanceof Date)) {
      put(i, C.DATE, autoDate);
      if (autoDate.getTime() !== today.getTime()) blocked.push('Task Date set to ' + DAYS[weekdayNum_(autoDate) - 1] + ', the next working day (row ' + row + ')');
    }
    [C.START, C.DUE].forEach(function (col) {
      const x = v[col - 1];
      if (x instanceof Date && offs.indexOf(weekdayNum_(x)) > -1) {
        put(i, col, '');
        blocked.push(INPUT_HEADERS[col - 1] + ': ' + DAYS[weekdayNum_(x) - 1] + ' is an off day - date cleared (row ' + row + ')');
      }
    });
    if (!v[C.ID - 1]) needId.push(i);
    if (!v[C.PRIO - 1]) put(i, C.PRIO, 'Medium');
    if (!v[C.STATUS - 1]) put(i, C.STATUS, 'Pending');
    if (!v[C.CREATED - 1]) put(i, C.CREATED, createdAtFor_(taskDate, null));
    else if (syncCreated && given instanceof Date) put(i, C.CREATED, createdAtFor_(given, v[C.CREATED - 1]));
    const done = v[C.DONE - 1];
    if (v[C.STATUS - 1] === 'Completed' && !done) put(i, C.DONE, today);
    else if (v[C.STATUS - 1] !== 'Completed' && done) put(i, C.DONE, '');
  }

  // one write per changed column
  Object.keys(changed).forEach(function (col) {
    sh.getRange(r1, +col, n, 1).setValues(vals.map(function (r) { return [r[col - 1]]; }));
  });

  // Task IDs: the only step that needs the lock (read the highest ID, hand out the next ones, write them)
  const created = [];
  if (needId.length) {
    const lock = LockService.getDocumentLock();
    if (!lock.tryLock(30000)) {
      SpreadsheetApp.getActive().toast('The sheet is busy saving another change. Please edit this row again in a moment.', 'Task Tracker', 6);
      return;
    }
    try {
      let maxId = 0;
      sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues().forEach(function (x) {
        const m = /^T-(\d+)$/.exec(String(x[0])); if (m) maxId = Math.max(maxId, +m[1]);
      });
      needId.forEach(function (i) {
        maxId++;
        vals[i][C.ID - 1] = 'T-' + ('0000' + maxId).slice(-4);
        created.push(i);
      });
      sh.getRange(r1, C.ID, n, 1).setValues(vals.map(function (r) { return [r[C.ID - 1]]; }));
    } finally { lock.releaseLock(); }
  }
  logMany_(created.map(function (i) {
    return [vals[i][C.ID - 1], vals[i][C.TASK - 1], 'Created', '', vals[i][C.STATUS - 1] || 'Pending', ''];
  }));
  if (blocked.length) SpreadsheetApp.getActive().toast(blocked.join('; '), 'Task Tracker', 8);
}

/** Created At = the Task Date, with the time of day kept from an earlier Created At (or from now for a new task). */
function createdAtFor_(taskDate, timeFrom) {
  const t = timeFrom instanceof Date ? timeFrom : new Date();
  return new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate(), t.getHours(), t.getMinutes(), t.getSeconds());
}

/**
 * The new text of a multi-select cell after one pick.
 *   oldText  what the cell held before the pick     rawValue  what the dropdown put in the cell
 *   allowed  the items that may be selected         typed     what the cell holds now (kept for clears and pasted lists)
 * Picking an item adds it, picking a ticked item ("\u2713 KAM") or one already in the cell removes it.
 */
function toggleResult_(oldText, rawValue, allowed, typed) {
  if (rawValue === undefined || rawValue === null || rawValue === '') return typed;   // the cell was cleared
  const pick = String(rawValue).trim().replace(/^\u2713\s*/, '');
  if (pick.indexOf(',') > -1) return typed;                                           // pasted list, or the "current selection" entry
  if (allowed.indexOf(pick) === -1) return oldText;                                   // not on the list: put the old text back
  const old = splitList_(oldText);
  const list = old.indexOf(pick) > -1 ? old.filter(function (x) { return x !== pick; }) : old.concat(pick);
  return allowed.filter(function (x) { return list.indexOf(x) > -1; }).join(', ');    // keep the Settings order
}

/**
 * Everything the entry logic needs from Settings, in ONE read per run:
 * teams (A2:A30), team -> member pairs (C2:D300), the two off days (O4:O5) and the dropdown style (O6).
 */
function settings_() {
  return memo_('settings', function () {
    const v = sheet_(N.SET).getRange(1, 1, 300, 15).getValues();     // A1:O300
    const teams = [], map = [];
    for (let i = 1; i < v.length; i++) {
      const team = String(v[i][0]).trim();
      if (team && i <= 29) teams.push(team);
      const t = String(v[i][2]).trim(), m = String(v[i][3]).trim();
      if (t && m) map.push([t, m]);
    }
    const offs = [v[3][14], v[4][14]].map(function (x) { return DAYS.indexOf(String(x).trim()) + 1; })
      .filter(function (n) { return n > 0; });
    const style = String(v[5][14]).trim() === STYLE_NATIVE ? 'native' : 'tick';
    return { teams: teams, map: map, offs: offs, style: style };
  });
}

/** WEEKDAY() numbers (1=Sunday ... 7=Saturday) of the off days chosen in Settings. */
function offDayNumbers_() { return settings_().offs; }

/** WEEKDAY() number of a date in the spreadsheet's time zone. */
function weekdayNum_(d) {
  const iso = Number(Utilities.formatDate(d, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'u')); // 1=Mon..7=Sun
  return (iso % 7) + 1;
}

/** The first working day on or after d (d is returned unchanged when it is already a working day). */
function nextWorkday_(d, offs) {
  const x = new Date(d.getTime());
  for (let i = 0; i < 7 && offs.indexOf(weekdayNum_(x)) > -1; i++) x.setDate(x.getDate() + 1);
  return x;
}

function splitList_(s) {
  return (s === undefined || s === null || s === '') ? [] : String(s).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

function teamList_() { return settings_().teams; }

function teamMap_() { return settings_().map; }

function membersForTeams_(teams) {
  const out = [];
  teamMap_().forEach(function (p) { if (teams.indexOf(p[0]) > -1 && out.indexOf(p[1]) === -1) out.push(p[1]); });
  return out;
}

/** List items with a tick in front of the ones that are already selected in the cell. */
function tickList_(all, chosen) {
  return all.map(function (x) { return chosen.indexOf(x) > -1 ? TICK + x : x; });
}

/**
 * The cell's own text goes first in its list. The cell therefore always matches an item, so Sheets never shows the red
 * "Invalid: Input must be an item on the specified list" message. Picking that first item changes nothing.
 */
function withCurrent_(items, current) {
  return current && items.indexOf(current) === -1 ? [current].concat(items) : items;
}

function listRule_(items, current) {
  const cur = String(current || '').trim();
  return SpreadsheetApp.newDataValidation().requireValueInList(withCurrent_(items, cur), true).setAllowInvalid(true).build();
}

/** [Team rule, Assigned To rule] for one row, from the text of its two cells. null clears a rule (no members to offer). */
function rulesFor_(teamText, memberText) {
  const teams = teamList_(), members = membersForTeams_(splitList_(teamText));
  return [
    teams.length ? listRule_(tickList_(teams, splitList_(teamText)), teamText) : null,
    members.length ? listRule_(tickList_(members, splitList_(memberText)), memberText) : null
  ];
}

/**
 * Sets the ticked dropdown lists for rows r1..r2 in one read and one write. With prune=true, members that no longer
 * belong to the row's teams are removed first.
 */
function applyRowRules_(sh, r1, r2, prune) {
  if (r2 < r1) return;
  if (settings_().style === 'native') {                                                       // the dropdown rules are managed by hand
    if (prune) normalizeRows_(sh, r1, r2); else syncMemberOptions_(sh, r1, r2);
    return;
  }
  const n = r2 - r1 + 1, block = sh.getRange(r1, C.TEAM, n, 2), v = block.getValues();
  let pruned = false;
  const texts = v.map(function (r) {
    const team = String(r[0]).trim();
    let member = String(r[1]).trim();
    if (prune && member) {
      const allowed = membersForTeams_(splitList_(team)), have = splitList_(member);
      const keep = allowed.filter(function (m) { return have.indexOf(m) > -1; }).join(', ');
      if (keep !== member) { member = keep; pruned = true; }
    }
    return [team, member];
  });
  if (pruned) block.setValues(texts);
  block.setDataValidations(texts.map(function (t) { return rulesFor_(t[0], t[1]); }));
}

function refreshAllMemberValidations() {
  resetMemo_();
  const sh = sheet_(N.INPUT);
  const last = sh.getLastRow();
  if (settings_().style === 'native') {
    buildMemberOptions_();
    if (last >= 2) normalizeRows_(sh, 2, last);
    SpreadsheetApp.getActive().toast('Native checkbox mode: the per-row member choices were rebuilt and the Team / Assigned To values tidied. The dropdown rules themselves are managed in Data validation.', 'Task Tracker', 8);
    return;
  }
  if (last >= 2) applyRowRules_(sh, 2, last, false);
  SpreadsheetApp.getActive().toast('Team and member dropdowns refreshed', 'Task Tracker', 4);
}

/** Several log rows in one write. Each entry is [id, task, action, oldStatus, newStatus, note]. */
function logMany_(entries) {
  if (!entries.length) return;
  const log = sheet_(N.LOG);
  let user = '';
  try { user = Session.getActiveUser().getEmail(); } catch (x) { /* ignore */ }
  user = user || LAST_USER_;
  const now = new Date();
  const rows = entries.map(function (en) { return [now, en[0], en[1], en[2], en[3], en[4], user, en[5] || '']; });
  log.getRange(log.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
}

function logChange_(id, task, action, oldStatus, newStatus, note) {
  const log = sheet_(N.LOG);
  let user = '';
  try { user = Session.getActiveUser().getEmail(); } catch (x) { /* ignore */ }
  user = user || LAST_USER_;
  log.appendRow([new Date(), id, task, action, oldStatus, newStatus, user, note || '']);
}

// ===================== ADD-TASK FORM (true checkbox multi-select) =====================
function showTaskForm() {
  SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(FORM_HTML_).setTitle('Add Task'));
}

function getFormData() {
  resetMemo_();
  const map = {};
  teamMap_().forEach(function (p) { (map[p[0]] = map[p[0]] || []).push(p[1]); });
  const set = sheet_(N.SET);
  const flat = function (a1) { return set.getRange(a1).getValues().map(function (r) { return r[0]; }).filter(String); };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const def = Utilities.formatDate(nextWorkday_(today, offDayNumbers_()), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  return { teams: teamList_(), map: map, statuses: flat('F2:F12'), priorities: flat('H2:H12'), defaultDate: def };
}

function addTaskFromForm(f) {
  resetMemo_();
  if (!f.task || !String(f.task).trim()) throw new Error('Task is required');
  if (!f.teams || !f.teams.length) throw new Error('Select at least one team');
  const sh = sheet_(N.INPUT);
  const col = sh.getRange(1, C.TASK, sh.getMaxRows(), 1).getValues();
  let last = 1;
  for (let i = col.length - 1; i >= 1; i--) if (String(col[i][0]).trim()) { last = i + 1; break; }
  const row = last + 1;
  const dt = function (s) { if (!s) return ''; const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  const offs = offDayNumbers_();
  [['Task Date', f.taskDate], ['Start Date', f.start], ['Due Date', f.due]].forEach(function (p) {
    const x = dt(p[1]);
    if (x && offs.indexOf(weekdayNum_(x)) > -1) throw new Error(p[0] + ' falls on ' + DAYS[weekdayNum_(x) - 1] + ', an off day. Choose a working day.');
  });
  const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
  const taskDate = dt(f.taskDate) || nextWorkday_(todayMidnight, offs);
  sh.getRange(row, C.DATE).setValue(taskDate);
  sh.getRange(row, C.TASK).setValue(f.task);
  sh.getRange(row, C.TEAM).setValue(f.teams.join(', '));
  sh.getRange(row, C.MEMBER).setValue((f.members || []).join(', '));
  sh.getRange(row, C.PRIO).setValue(f.priority || 'Medium');
  sh.getRange(row, C.STATUS).setValue(f.status || 'Pending');
  sh.getRange(row, C.START).setValue(dt(f.start));
  sh.getRange(row, C.DUE).setValue(dt(f.due));
  sh.getRange(row, C.NOTES).setValue(f.notes || '');
  applyRowRules_(sh, row, row, false);
  processRows_(sh, row, row, false);
  return 'Added ' + sh.getRange(row, C.ID).getValue() + ' (row ' + row + ')';
}

const FORM_HTML_ = '<!DOCTYPE html><html><head><base target="_top"><style>' +
  'body{font-family:Arial,sans-serif;font-size:13px;margin:12px}label.h{display:block;margin-top:10px;font-weight:bold}' +
  'input[type=text],input[type=date],select,textarea{width:100%;box-sizing:border-box;padding:5px;margin-top:3px}' +
  '.chk{display:inline-block;margin:3px 12px 3px 0}.grp{margin-top:6px;color:#1f3a5f;font-size:11px;font-weight:bold}' +
  'button{margin-top:14px;padding:9px 16px;background:#1f3a5f;color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:13px}' +
  '#msg{margin-top:10px;font-weight:bold}.ok{color:#188038}.err{color:#c5221f}</style></head><body>' +
  '<label class="h">Task *</label><input type="text" id="task">' +
  '<label class="h">Task Date</label><input type="date" id="date">' +
  '<label class="h">Team(s) *</label><div id="teams">Loading...</div>' +
  '<label class="h">Assigned To</label><div id="members"><i>Select a team first</i></div>' +
  '<label class="h">Priority</label><select id="prio"></select>' +
  '<label class="h">Status</label><select id="status"></select>' +
  '<label class="h">Start Date</label><input type="date" id="start">' +
  '<label class="h">Due Date</label><input type="date" id="due">' +
  '<label class="h">Notes</label><textarea id="notes" rows="3"></textarea>' +
  '<button onclick="save()">Add Task</button><div id="msg"></div>' +
  '<script>var DATA=null;' +
  'function $(i){return document.getElementById(i)}' +
  'function today(){var d=new Date();return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2)}' +
  'function checked(cls){return Array.prototype.slice.call(document.querySelectorAll("."+cls+":checked")).map(function(x){return x.value})}' +
  'function opts(sel,arr,def){$(sel).innerHTML=arr.map(function(a){return "<option"+(a===def?" selected":"")+">"+a+"</option>"}).join("")}' +
  'function init(d){DATA=d;$("date").value=d.defaultDate||today();' +
  '$("teams").innerHTML=d.teams.map(function(t){return "<label class=chk><input type=checkbox class=team value=\\""+t+"\\" onchange=renderMembers()> "+t+"</label>"}).join("");' +
  'opts("prio",d.priorities,"Medium");opts("status",d.statuses,"Pending")}' +
  'function renderMembers(){var sel=checked("team"),keep=checked("member"),h="";' +
  'sel.forEach(function(t){h+="<div class=grp>"+t+"</div>";(DATA.map[t]||[]).forEach(function(m){' +
  'h+="<label class=chk><input type=checkbox class=member value=\\""+m+"\\""+(keep.indexOf(m)>-1?" checked":"")+"> "+m+"</label>"})});' +
  '$("members").innerHTML=h||"<i>Select a team first</i>"}' +
  'function save(){var o={task:$("task").value,taskDate:$("date").value,teams:checked("team"),members:checked("member"),' +
  'priority:$("prio").value,status:$("status").value,start:$("start").value,due:$("due").value,notes:$("notes").value};' +
  '$("msg").className="";$("msg").textContent="Saving...";' +
  'google.script.run.withSuccessHandler(function(m){$("msg").className="ok";$("msg").textContent=m;$("task").value="";$("notes").value=""})' +
  '.withFailureHandler(function(e){$("msg").className="err";$("msg").textContent=e.message}).addTaskFromForm(o)}' +
  'google.script.run.withSuccessHandler(init).getFormData();</script></body></html>';

// ===================== SAMPLE DATA =====================
function loadSampleData() {
  resetMemo_();
  const sh = sheet_(N.INPUT);
  if (sh.getLastRow() > 1) {
    const ui = SpreadsheetApp.getUi();
    if (ui.alert('Task input already has data. Add sample rows anyway?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  }
  const d = function (offset) { const x = new Date(); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + offset); return x; };
  const offs = offDayNumbers_();
  const workday = function (offset) { const x = d(offset); while (offs.indexOf(weekdayNum_(x)) > -1) x.setDate(x.getDate() - 1); return x; };
  const sample = [
    [0, 'Prepare UBL Report', 'KAM, Database', 'Taibur, Shajib', 'High', 'In Progress', 0, 2],
    [0, 'API Investigation', 'Backend, QA', 'Priya, Kashpia', 'High', 'Pending', 0, 3],
    [0, 'App UI Update', 'Frontend, Android', 'Hasan, Shihab', 'Medium', 'Completed', -4, -1],
    [0, 'Check server health', 'DevOps', 'Mehadi', 'Critical', 'Pending', -1, 0],
    [-1, 'Send Univision report', 'KAM', 'Shawon', 'High', 'Completed', -2, -1],
    [-2, 'Fix login bug', 'Backend, QA', 'Priya', 'High', 'Pending', -3, -1],
    [-9, 'Database index tuning', 'Database', 'Tahima', 'Medium', 'Completed', -12, -8],
    [-20, 'Android release build', 'Android, DevOps', 'Shihab, Mayeen', 'High', 'Completed', -25, -18],
    [-35, 'Quarterly documentation', 'KAM, Frontend', 'Taibur, Hasan', 'Low', 'Cancelled', -40, -30]
  ];
  let row = Math.max(sh.getLastRow(), 1) + 1;
  const first = row;
  sample.forEach(function (s) {
    sh.getRange(row, C.DATE).setValue(workday(s[0]));
    sh.getRange(row, C.TASK).setValue(s[1]);
    sh.getRange(row, C.TEAM).setValue(s[2]);
    sh.getRange(row, C.MEMBER).setValue(s[3]);
    sh.getRange(row, C.PRIO).setValue(s[4]);
    sh.getRange(row, C.STATUS).setValue(s[5]);
    sh.getRange(row, C.START).setValue(workday(s[6]));
    sh.getRange(row, C.DUE).setValue(workday(s[7]));
    row++;
  });
  applyRowRules_(sh, first, row - 1, false);
  processRows_(sh, first, row - 1);
}
