# Task Tracker — Full Documentation

A task tracker built in **Google Sheets** with **Google Apps Script**. Tasks are entered once, day by day. The weekly, monthly and yearly reports, the dashboard, the team and member figures, and the charts are all calculated automatically.

| | |
|---|---|
| **Code** | [Code.gs](Code.gs), a single Apps Script file |
| **Quick start** | [README.md](README.md) |
| **Manual input** | Only the `Task_Input` sheet (or the Add Task form) |
| **Everything else** | Automatic |

---

## Table of contents
1. [Overview and data flow](#1-overview-and-data-flow)
2. [Installation](#2-installation)
3. [Updating the code](#3-updating-the-code)
4. [Using the tracker day to day](#4-using-the-tracker-day-to-day)
5. [Sheet reference](#5-sheet-reference)
6. [Business rules](#6-business-rules)
7. [Reports in detail](#7-reports-in-detail)
8. [Settings in detail](#8-settings-in-detail)
9. [Validation, formatting and protection](#9-validation-formatting-and-protection)
10. [Automation reference](#10-automation-reference)
11. [Messages you may see](#11-messages-you-may-see)
12. [Troubleshooting](#12-troubleshooting)
13. [Limits](#13-limits)
14. [Administration and maintenance](#14-administration-and-maintenance)
15. [Design decisions](#15-design-decisions)
16. [Testing and what is not verified](#16-testing-and-what-is-not-verified)
17. [FAQ](#17-faq)
18. [Glossary](#18-glossary)

---

## 1. Overview and data flow

```
      YOU
       │  type or use the Add Task form
       ▼
 ┌───────────────┐   onEdit script fills ID, dates, defaults,
 │  Task_Input   │──▶ Created At, Completion Date, multi-select
 └──────┬────────┘   cells, and writes Activity_Log
        │ formula mirror (no script)
        ▼
 ┌───────────────┐
 │  Task_Data    │  adds Month, Year, Duration, Deadline Status
 └──────┬────────┘
        │ formulas only
   ┌────┴─────┬───────────┬────────────┬───────────┐
   ▼          ▼           ▼            ▼           ▼
Dashboard  Weekly_    Monthly_     Yearly_     Settings!S:U
           Report     Report       Report      (chart data)
```

- **Task_Input** is the raw data. **Task_Data** is the single source of truth for every report and chart.
- Reports contain **formulas only**. They update immediately when a task changes.
- **Settings** feeds every dropdown (teams, members, statuses, priorities) and the week and off-day options.
- **Activity_Log** records history and is written by the script.

## 2. Installation

1. Create a blank Google Sheet.
2. **Extensions → Apps Script**. Delete the default code.
3. Paste the whole of `Code.gs`, click **Save**.
4. Choose **`setup`** in the function dropdown and click **▶ Run**.
5. Approve permissions once: **Advanced → Go to (project) → Allow**.
6. Return to the sheet. Eight tabs are created, in this order, with colored tabs:

| Order | Tab | Tab colour |
|---|---|---|
| 1 | Dashboard | dark blue |
| 2 | Task_Input | green |
| 3 | Task_Data | grey |
| 4 | Weekly_Report | blue |
| 5 | Monthly_Report | blue |
| 6 | Yearly_Report | blue |
| 7 | Settings | yellow |
| 8 | Activity_Log | grey |

7. A **Task Tracker** menu is added (see [§10.1](#101-menu)). Optional: **Load sample data** to see the reports populated.

**Important:** open the script editor **from the sheet** (Extensions → Apps Script). A script created at script.google.com is not attached to a spreadsheet and fails.

**Everyone who edits** the sheet needs Editor access. The `onEdit` trigger is built in and needs no setup. Each person is asked to authorise once on their first edit.

## 3. Updating the code

1. Extensions → Apps Script, replace the old code with the new `Code.gs`, **Save**.
2. Run **`setup`** if the change affects layouts, formulas or validation rules. A change that only affects the entry logic does not need it.

What `setup` does and does not do:

| Sheet | On re-run |
|---|---|
| Task_Input | **Kept.** Only the date validation rules are re-applied. |
| Settings | **Kept.** An older Settings sheet is upgraded in place (see below). |
| Activity_Log | **Kept.** |
| Task_Data, Dashboard, Weekly, Monthly, Yearly | **Rebuilt** (formulas, formatting, charts). |
| Missing sheets | **Created.** |

Settings upgrade (`upgradeSettings_`): if the sheet predates the off-day settings, the labels `Off day 1/2` and the cells `O4:O5` are added. If both off-day cells are empty, or hold the previous default (Friday + Saturday), they are set to **None**. A week start of Saturday (the earlier default) is changed to **Sunday**. Teams, members and anything else you entered are untouched. A custom off-day choice is never overwritten.

To force one sheet to rebuild from scratch, delete its tab and run `setup`. Do not delete Task_Input, Settings or Activity_Log unless you intend to lose their data.

---

## 4. Using the tracker day to day

### 4.1 Entering a task in Task_Input
One task per row, starting at row 2. Only **Task** is required. A team is needed to assign members.

| Col | Field | Entered by | Details |
|---|---|---|---|
| A | Task ID | **Automatic** | `T-0001`, `T-0002` … assigned when the row first has a Task |
| B | Task Date | You or automatic | Calendar picker. Blank means today. |
| C | Task | You | Free text, wraps |
| D | Team | You | Multi-select (see 4.2) |
| E | Assigned To | You | Dependent multi-select (see 4.2) |
| F | Priority | You (dropdown) | Blank becomes **Medium** |
| G | Status | You (dropdown) | Blank becomes **Pending** |
| H | Start Date | You | Calendar picker |
| I | Due Date | You | Calendar picker. Turns red when overdue. |
| J | Completion Date | **Automatic** | Set when Status becomes Completed |
| K | Notes | You | Free text, wraps |
| L | Created At | **Automatic** | The Task Date plus a time of day |

Grey cells (A, J, L) are automatic. Do not type in them.

### 4.2 Team and Assigned To (multi-select)
Google Sheets dropdowns pick one value, so multi-select is built with a toggle:

- Click a **Team** cell, pick a team → it is **added**: `KAM`, then `KAM, Backend`, then `KAM, Backend, QA`.
- Teams already in the cell are shown with a **✓ tick** in the dropdown (`✓ KAM`). Pick a ticked team → it is **removed**.
- The **first line of the list** repeats the cell's current selection (for example `KAM, Backend`). It keeps the cell valid so Sheets shows no red "Invalid" warning. Picking it changes nothing.
- The order always follows the Settings list, not the order you clicked.
- **Assigned To** offers only the members of the teams already selected in that row's Team cell. Selected members are ticked, and picking a ticked member removes it.
- Removing a team automatically removes that team's members from Assigned To.
- Select a Team **before** Assigned To. A member picked with no team is rejected with a message.
- A value that is not in the list is reverted.
- To start a cell over, press **Delete**, then pick again.
- Pasting a ready-made list such as `KAM, QA` into the Team cell is accepted as typed.

#### Optional: native checkboxes (Google's own multi-select)
Google Sheets has a real multi-select dropdown with checkboxes. Apps Script **cannot create it** (Google has not exposed it to scripts), so it is switched on by hand once. The tracker supports it as a second **Dropdown style**, and keeps **Assigned To limited to the selected teams**.

| | **Ticked list** (default) | **Native checkboxes** |
|---|---|---|
| Who sets up the dropdown | The script, per row | You, once, in Data validation |
| Look | A list with `✓` in front of selected items | Google's checkboxes / chips |
| Assigned To offers only the chosen teams' members | Yes | **Yes**, through a per-row list on the Settings sheet (columns W:AZ) |
| Needs a manual step | No | Yes (below) |

**How the team-wise list works.** In native mode the script keeps `Settings!W2:AZ2000` up to date. Row *r* there lists, one member per cell across, the members of the teams chosen in Task_Input row *r*. These are plain **values written by the script**, only for rows that have a team (formulas made the sheet recalculate for so long that `setup` timed out). The Assigned To dropdown points at `=Settings!W2:AZ2` **without \$ signs**, so each row reads its own list. A row's list is rewritten as soon as you change its Team cell, on paste, and when a task is added with the form. If you add or move members in Settings, run **Task Tracker → Refresh team & member dropdowns** to rebuild all rows.

To switch to native checkboxes:
1. In **Settings**, set **Dropdown style** (`O6`) to **Native checkboxes**, then run **`setup`** (or **Task Tracker → Refresh team & member dropdowns**). This writes the per-row lists into `Settings!W:AZ`.
2. **Team:** in **Task_Input** select `D2:D2000` → **Data → Data validation → Add rule** → **Dropdown (from a range)** → `=Settings!$A$2:$A$30` → **Advanced options** → display style **Chip** → tick **Allow multiple selections** → **Done**.
3. **Assigned To:** select `E2:E2000` → **Add rule** → **Dropdown (from a range)** → type exactly `=Settings!W2:AZ2` (start with `=`, **no \$ signs**) → **Chip** → tick **Allow multiple selections** → **Done**.

Notes:
- The reference must start with `=` and have no `$`, otherwise Sheets makes it fixed and every row shows the same list. The rule must be applied to a range that **starts at row 2**, so row 2 of the rule matches row 2 of the list.
- A row's list holds up to 30 members (`W:AZ`).
- After each pick the script tidies the cell: text that is not a team or member in Settings is removed, the order follows Settings, and members who do not belong to the selected teams are removed with a message. This also covers the case where you change the Team after choosing members.
- In this mode the script never changes the dropdown rules. `setup`, the Add Task form and **Refresh** leave them alone.
- To go back, set **Dropdown style** to **Ticked list** and run **Task Tracker → Refresh team & member dropdowns**. The per-row lists are removed and the ticked lists are applied again.

### 4.3 The Add Task form
**Task Tracker → Add Task (form)** opens a sidebar with checkboxes:

- Fields: Task, Task Date, Team(s), Assigned To, Priority, Status, Start Date, Due Date, Notes.
- Ticking teams shows the members of those teams, grouped by team. Members you already ticked stay ticked.
- Task Date is pre-filled with today (or the next working day if today is an off day).
- The task is added on the first empty row after the last task.
- Required: Task and at least one team. Errors appear in red under the button.
- After saving, a green message shows the new ID and row. The Task and Notes fields clear so you can add the next task.

### 4.4 Dates
- **Calendar picker:** double-click a Task Date, Start Date or Due Date cell. Typing works too. The cells accept real dates only.
- **Task Date**: type it, pick it, or leave it blank for today.
- **Created At** always carries the Task Date. Changing the Task Date changes Created At. The time of day is kept from the original. A task entered with a back-date gets Created At on that date.
- **Completion Date** becomes today when Status turns **Completed**, and is cleared if the status changes back.
- **Duration (days)** in Task_Data is `Due − Start + 1` in calendar days.

### 4.5 Off days (optional)
Off days are **disabled by default** (Settings `Off day 1` and `Off day 2` are both **None**). Every day is a working day and the week starts on **Sunday**.

If you choose off days in Settings (for example Friday and Saturday):

| Situation | What happens |
|---|---|
| Date picked on an off day, empty row | The date is cleared, with a message naming the row |
| New task (no ID yet), Task Date is an off day | Date cleared, task **not saved** |
| Existing task, Task Date changed to an off day | The previous Task Date is put back (taken from Created At) |
| Start or Due Date on an off day | That date is cleared. The task is saved. |
| Task Date left blank and today is an off day | Task Date becomes the **next working day**, with a message |
| Add Task form, off-day date | Refused with a message naming the field |
| Pasted block of dates | Only the off-day cells are cleared, the rest are kept |
| Weekly_Report | Off-day rows are greyed, labelled `(off)`, shown blank and not counted |

### 4.6 Editing and deleting
- Change any cell of an existing task normally. Edits are logged in Activity_Log.
- Deleting a task row removes it from every report immediately.
- Task IDs come from the highest ID currently on the sheet plus one. If you delete the **last** row, its ID can be reused. IDs of deleted middle rows leave gaps. This is normal.
- Do not sort Task_Input by clicking in the middle of the data without selecting every column. Select all columns before sorting, so rows stay together.

---

## 5. Sheet reference

### 5.1 Dashboard
Layout, with fixed positions:

| Area | Cells | Content |
|---|---|---|
| Title | A1 | `TASK TRACKER` |
| Date | A2 | `Today: <weekday, date>` |
| TODAY table | A4 title, A5:B5 header, A6:B12 | Total Tasks Today, Completed, In Progress, Pending, On Hold, Due Today (all tasks), Overdue (all open tasks). Overdue turns red above 0. |
| PERIOD OVERVIEW | D4 title, D5:H5 header, D6:H9 | Rows: Today, This Week, This Month, This Year. Columns: Period, Total, Completed, Open, Completion % |
| Charts | rows 14–27 | Task Status (donut, this month) · Tasks by Team (bar, this month) · Monthly Productivity (column, this year) |
| TODAY'S TASKS | A29 title, A30:F30 header, A31 formula | Task, Team, Assigned To, Priority, Status, Deadline for tasks dated today |
| PENDING TASKS | H29 title (with the count), H30:M30 header, H31 formula | Same six columns and colours as Today's Tasks, for **every task that is not Completed or Cancelled** (Pending, In Progress, On Hold), whatever its date. Placed to the right of Today's Tasks, below the charts. To exclude other statuses, edit `PENDING_EXCLUDED` in the code and run `setup`. |

Column widths A–H: 240, 150, 170, 100, 110, 110, 90, 120 px; the Pending table uses H–M: 220, 110, 130, 90, 100, 100 px (so column H, which also holds the Period Overview's Completion %, is 220 px wide). The three charts are placed so they never overlap each other or the list. Chart source numbers live in `Settings!S:U`, not on the dashboard. "This Week" uses the week start day from Settings.

### 5.2 Task_Input
See [§4.1](#41-entering-a-task-in-task_input). Frozen header row and first three columns. Formatted for 2,000 rows.

### 5.3 Task_Data
Formula-driven master table. **Do not edit.** A warning appears if you try.

| Col | Header | Source |
|---|---|---|
| A–L | Task ID … Created At | Mirror of Task_Input A–L |
| M | Month | First day of the Task Date's month (shown as `October 2026`) |
| N | Year | Year of the Task Date |
| O | Duration (days) | `Due − Start + 1`, blank if either date is missing |
| P | Deadline Status | See [§6](#6-business-rules) |

Formulas (row 2 only, each fills down automatically):
```
A2  =ARRAYFORMULA(IF('Task_Input'!A2:L="","",'Task_Input'!A2:L))
M2  =ARRAYFORMULA(IF(B2:B="","",DATE(YEAR(B2:B),MONTH(B2:B),1)))
N2  =ARRAYFORMULA(IF(B2:B="","",YEAR(B2:B)))
O2  =ARRAYFORMULA(IF((H2:H="")+(I2:I="")>0,"",I2:I-H2:H+1))
P2  =ARRAYFORMULA(IF(B2:B="","",IF(G2:G="Completed","Completed",IF(G2:G="Cancelled","Cancelled",
      IF(I2:I="","No Due Date",IF(I2:I<TODAY(),"Overdue",IF(I2:I=TODAY(),"Due Today","Upcoming")))))))
```
The sheet has 2,000 rows, at least as many as Task_Input, so the mirror can fill down.

### 5.4 Weekly_Report
| Area | Cells | Content |
|---|---|---|
| Selector | B3 (yellow) | Any date in the week. Defaults to `=TODAY()`. |
| Auto | B4, B5 | Week start and week end (start + 6) |
| Data note | D3 | Tasks on file and their date range |
| Day by day | A7:F7 header, A8:F14 days, A15:F15 total | Day, Date, Total, Completed, Open, Completion % |
| Team performance | H6 title, H7:M7 header, H8:M22 | 15 team rows |
| Member performance | O6 title, O7:U7 header, O8:U37 | 30 member rows |
| Task list | A40 title, A41:K41 header, A42 formula | All tasks in the week |

### 5.5 Monthly_Report
| Area | Cells | Content |
|---|---|---|
| Selectors | B3 month (yellow), B4 year (yellow) | Dropdowns |
| Auto | B5 | First day of the chosen month |
| Data note | D3 | Tasks on file and their date range |
| Summary | A7:B15 | Total, Completed, In Progress, Pending, On Hold, Cancelled, Overdue, Completion Rate |
| Team performance | D6 title, D7:I7 header, D8:I22 | 15 team rows |
| Member performance | K6 title, K7:Q7 header, K8:Q37 | 30 member rows |
| Task list | A40 title, A41:K41 header, A42 formula | All tasks in the month |

### 5.6 Yearly_Report
| Area | Cells | Content |
|---|---|---|
| Selector | B3 (yellow) | Year dropdown |
| Data note | D3 | Tasks on file and their date range |
| Month by month | A6:G6 header, A7:G18 months, A19:G19 TOTAL | Month, Total, Completed, Open, Cancelled, Overdue, Completion % |
| Team performance | I5 title, I6:N6 header, I7:N21 | 15 team rows |
| Member performance | P5 title, P6:V6 header, P7:V36 | 30 member rows |
| Chart | A21 | Tasks per month (Total and Completed), 620 × 300 px |

### 5.7 Settings
See [§8](#8-settings-in-detail).

### 5.8 Activity_Log
| Col | Header | Content |
|---|---|---|
| A | Timestamp | When the change happened |
| B | Task ID | |
| C | Task | Task text at that moment |
| D | Action / Field | `Created`, `Status Changed`, or `Edited: <field>` |
| E | Old Status | For `Status Changed` |
| F | New Status | For `Created` (starting status) and `Status Changed` |
| G | Changed By | The editing user's e-mail |
| H | Note | For other edits: `old value → new value` |

Written by the script, newest at the bottom. Single-cell edits to Task Date, Task, Team, Assigned To, Priority, Status, Start, Due and Notes are logged. Edits to the automatic columns are not. A multi-cell paste logs the new tasks as `Created` but does not log each pasted field.

---

## 6. Business rules

### 6.1 Definitions
| Term | Rule |
|---|---|
| **Open** | Not Completed and not Cancelled |
| **Completion %** | Completed ÷ (Total − Cancelled). 0 when there is nothing to divide. |
| **Period of a task** | Decided by its **Task Date** (week, month, year) |
| **Overdue** | Deadline Status = Overdue (see 6.2) |
| **Counting by team or member** | A task listed for several teams or members is counted once for **each** of them in the team and member tables. The summary counts it once. |

### 6.2 Deadline Status (Task_Data column P)
Evaluated in this order. The first match wins:

| # | Condition | Result |
|---|---|---|
| 1 | No Task Date | blank |
| 2 | Status = Completed | **Completed** |
| 3 | Status = Cancelled | **Cancelled** |
| 4 | Due Date empty | **No Due Date** |
| 5 | Due Date before today | **Overdue** |
| 6 | Due Date = today | **Due Today** |
| 7 | otherwise | **Upcoming** |

"Today" is the sheet's current date and updates each day.

### 6.3 Automatic fields in Task_Input
| Field | When | Value |
|---|---|---|
| Task ID | First time a row has a Task | Next number after the highest existing `T-nnnn` |
| Task Date | Blank | Today, or the next working day when today is an off day |
| Priority | Blank | Medium |
| Status | Blank | Pending |
| Created At | Blank, or Task Date edited | Task Date plus time of day |
| Completion Date | Status = Completed and cell blank | Today |
| Completion Date | Status ≠ Completed and cell filled | Cleared |

A row is only processed when it has **Task text**. Rows without a Task are ignored.

### 6.4 Status colours
Completed green · In Progress blue · Pending yellow · On Hold purple · Cancelled grey · Overdue red · Due Today orange · Upcoming light green.
Priority: Critical red · High orange · Medium yellow · Low green.

---

## 7. Reports in detail

### 7.1 How every number is calculated
All counts use `COUNTIFS` over whole columns of Task_Data. With the period criteria first:

| Report | Period criteria |
|---|---|
| Monthly | `Month column = Period start (B5)` |
| Yearly | `Year column = B3` |
| Weekly | `Task Date ≥ week start` and `Task Date ≤ week end` |
| Dashboard Today | `Task Date = TODAY()` |

Team and member rows add a text match, `Team contains "<name>"` or `Assigned To contains "<name>"`, using `"*"&name&"*"`.

| Column | Formula idea |
|---|---|
| Tasks | `COUNTIFS(period, team/member match)` |
| Completed | the same plus `Status = "Completed"` |
| Open | `Tasks − Completed − Cancelled` |
| Overdue | the same plus `Deadline Status = "Overdue"` |
| Completion % | `Completed ÷ (Tasks − Cancelled)`, 0 if empty |

Team rows come from `Settings!A2:A…`. Member rows come from `Settings!C:D`. Blank rows show nothing.

### 7.2 The data note
Under the selectors on Weekly, Monthly and Yearly (cell `D3`):
- `Tasks on file: 87 | dated 02 Sep 2026 to 06 Oct 2026`
- `No tasks found yet - enter tasks in Task_Input` when the sheet is empty
- adds ` - N task(s) have no valid Task Date` if some rows have a Task but no real date

It explains most "everything is zero" situations at a glance.

### 7.3 Weekly details
- Week start = chosen date − ((weekday of that date − week-start number) mod 7). The week-start number comes from `Settings!O3`.
- Day rows list 7 days from the week start.
- Off-day rows (if configured) show the day name with `(off)`, are blank and are greyed. They are excluded from the totals.
- `WEEK TOTAL` sums the Total, Completed and Open columns of the counted days. Its percentage is Completed ÷ Total.

### 7.4 Task lists
Weekly and Monthly list all tasks for the period below the tables: Task ID, Task Date, Task, Team, Assigned To, Priority, Status, Start, Due, Completed On, Deadline. They are sorted by Task Date then ID. They show `No tasks for this period` when empty. The lists use `FILTER`/`SORT` and show up to about 600 rows.

---

## 8. Settings in detail

### 8.1 Cell map
| Area | Cells | Content |
|---|---|---|
| Teams | `A1` header, `A2:A30` | One team per row |
| Team → Member | `C1:D1` header, `C2:D300` | One `Team \| Member` pair per row |
| Status | `F1`, `F2:F12` | Pending, In Progress, Completed, Cancelled, On Hold |
| Priority | `H1`, `H2:H12` | Low, Medium, High, Critical |
| Months | `J1`, `J2:J13` | January … December |
| Years | `L1`, `L2:L13` (list extends to row 30) | Starts two years before the current year |
| Options | `N1:O1` header | |
| Week starts on | `N2` / **`O2`** | Default **Sunday** (dropdown) |
| Week start # (auto) | `N3` / `O3` | `=MATCH(O2,Q2:Q8,0)` (1 = Sunday … 7 = Saturday). Do not edit. |
| Off day 1 | `N4` / **`O4`** | Default **None** (dropdown: None or a weekday) |
| Off day 2 | `N5` / **`O5`** | Default **None** |
| Dropdown style | `N6` / **`O6`** | **Ticked list** (default) or **Native checkboxes** (see §4.2) |
| Notes | `N7`, `N8` | Explanations of the off-day and dropdown-style options |
| Days | `Q1`, `Q2:Q8` | Sunday … Saturday |
| Chart data | `S1:U39` | Numbers behind the Dashboard charts. **Do not edit.** |
| Assigned To choices | `W1:AZ2000` | Only in **Native checkboxes** mode: for each Task_Input row, the members of its selected teams, as values written by the script. **Do not edit.** |
| Help text | `A32` | How to add teams and members |

### 8.2 Default teams and members
| Team | Members |
|---|---|
| KAM | Taibur, Shawon |
| Database | Shajib, Tahima |
| Backend | Priya |
| Frontend | Hasan |
| Android | Shihab |
| DevOps | Mehadi, Mayeen |
| QA | Kashpia |

### 8.3 Common changes
| To… | Do this |
|---|---|
| Add a team | Type it in the next empty cell of column A. Add its members in C:D. |
| Add a member | Add a row in C:D (`Team`, `Member`). Then run **Task Tracker → Refresh team & member dropdowns**. |
| Remove a member | Delete the row in C:D. Old tasks keep the name as text. Run Refresh member dropdowns. |
| Rename a team | Change it in A and in every C:D row. Old tasks keep the old name as text and will no longer count under the new name. |
| Change the week start | `O2`. Reports and the dashboard follow. |
| Set off days | `O4` and `O5`. Choose a weekday, or None. |
| Add a year | Add it under the Years list (column L, down to row 30). |

### 8.4 Cautions
- **Do not rename the five built-in statuses.** The reports, Deadline Status and colours look for these exact names: `Pending`, `In Progress`, `Completed`, `Cancelled`, `On Hold`.
- Names are matched as **text**. Avoid a name that contains another (for example `Ann` and `Anna`). The shorter one would also count the longer one's tasks.
- Leave a blank row inside the Teams or Members list only if you do not mind the report row staying blank.

---

## 9. Validation, formatting and protection

### 9.1 Data validation
| Where | Rule |
|---|---|
| Task_Input B2:B2000 (Task Date) | Valid date (calendar picker) |
| Task_Input H2:I2000 (Start, Due) | Valid date (calendar picker) |
| Task_Input D2:D2000 (Team) | Dropdown of Settings teams. Invalid values allowed because the cell holds comma lists. The script reverts unknown values. |
| Task_Input E (Assigned To) | Per-row dropdown set by the script from the row's teams |
| Task_Input F2:F2000 (Priority) | Dropdown from `Settings!H2:H12` |
| Task_Input G2:G2000 (Status) | Dropdown from `Settings!F2:F12` |
| Report selectors | Dropdowns from Settings lists (months, years). Weekly B3 accepts a date. |
| Settings O2 | Weekday dropdown |
| Settings O4:O5 | None or a weekday |

### 9.2 Conditional formatting
| Where | Rule |
|---|---|
| Task_Input G, F | Status colours, priority colours |
| Task_Input I (Due Date) | Red when the date has passed and the task is not Completed or Cancelled |
| Task_Data F, G, P | Priority, status and deadline colours |
| Report task lists | Status, deadline and priority colours |
| Dashboard | Status, deadline and priority colours. Overdue count red above 0. |
| Weekly day table | Grey rows for off days |

### 9.3 Protection
Warning-only protection (it warns, it does not block):
- Task_Data and Dashboard: the whole sheet.
- Weekly, Monthly, Yearly: the whole sheet **except** the yellow selector cells.

Protection is re-applied (replaced, not stacked) every time `setup` runs.

---

## 10. Automation reference

### 10.1 Menu
| Item | Function | Purpose |
|---|---|---|
| ➕ Add Task (form) | `showTaskForm` | Opens the checkbox sidebar |
| Refresh team & member dropdowns | `refreshAllMemberValidations` | Re-applies the per-row Team and Assigned To dropdowns (with their ticks) after a Settings change |
| Load sample data | `loadSampleData` | Adds 9 example tasks (asks first if data exists) |
| Rebuild reports & dashboard | `setup` | Runs the full setup (see §3) |

### 10.2 What happens on every edit in Task_Input (`onEdit` → `handleEdit_`)
1. Settings (teams, team → member pairs, off days) are read in a single call for this run, so edits stay fast.
2. If off days are set, dates in the edited cells that fall on an off day are cleared (`rejectOffDayDates_`).
3. **Team or Assigned To pick (fast path, `handleMultiSelectEdit_`):** two reads (Settings, the row), then one write for the two cells and one for their ticked dropdown lists. The cell changes first; the activity-log entry is written afterwards. A row that still has no Task ID also goes through `processRows_`.
4. **Any other single-cell edit:** activity log for status changes and other field edits.
5. `processRows_` fills the automatic columns (see below).

Edits on any other sheet are ignored.

### 10.3 `processRows_` (automatic columns)
Works in memory on the edited rows and writes one column at a time:
1. Rows with no Task text are skipped.
2. Off-day Task Date handling (see §4.5).
3. Blank Task Date → today / next working day.
4. Off-day Start and Due dates are cleared.
5. Defaults: Priority = Medium, Status = Pending.
6. Created At = Task Date plus time (new rows, or when the Task Date column was edited).
7. Completion Date follows the Status.
8. **Task IDs:** only this step takes the document lock. It reads the highest ID, assigns the next ones, and writes them. If the lock cannot be obtained within 30 seconds the row is left to complete on the next edit, with a message.
9. New tasks are written to Activity_Log as `Created`.

### 10.4 Function reference
| Function | Role |
|---|---|
| `onOpen` | Adds the Task Tracker menu |
| `setup` | Creates missing sheets, upgrades Settings, rebuilds reports, orders and colours the tabs |
| `buildSettings_`, `upgradeSettings_`, `offDayRule_` | Settings creation, in-place upgrade, off-day dropdown |
| `buildInput_`, `applyInputDateRules_` | Task_Input layout and date rules |
| `buildLog_` | Activity_Log layout |
| `buildData_` | Task_Data formulas and formatting |
| `buildMonthly_`, `buildYearly_`, `buildWeekly_` | The reports |
| `buildDashboard_`, `buildChartData_` | The dashboard and its chart source data |
| `summaryRows_`, `breakdown_`, `taskList_`, `dataNote_` | Shared report building blocks |
| `head_`, `sectionTitle_`, `selectorCell_`, `widths_`, `addTextRules_`, `reportFrame_` | Formatting helpers |
| `warnOnly_`, `protect_` | Protection |
| `onEdit`, `handleEdit_` | Entry logic |
| `rejectOffDayDates_`, `processRows_`, `createdAtFor_` | Date rules and automatic columns |
| `handleMultiSelectEdit_`, `handleNativeEdit_`, `buildMemberOptions_`, `writeMemberOptions_`, `syncMemberOptions_`, `memberOptionsMatrix_`, `clearMemberOptions_`, `cleanPair_`, `cleanNotes_`, `normalizeRows_`, `styleRule_`, `toggleResult_`, `rulesFor_`, `applyRowRules_`, `listRule_`, `tickList_`, `withCurrent_`, `membersForTeams_`, `teamList_`, `teamMap_`, `settings_`, `splitList_` | Multi-select logic and the ticked dropdown lists |
| `offDayNumbers_`, `weekdayNum_`, `nextWorkday_` | Off-day and weekday helpers (time-zone aware) |
| `logChange_` | Writes Activity_Log rows |
| `sheet_` | Finds a sheet or throws a clear error |
| `memo_`, `resetMemo_` | Per-run cache of Settings reads |
| `showTaskForm`, `getFormData`, `addTaskFromForm`, `FORM_HTML_` | The Add Task sidebar |
| `loadSampleData` | Sample tasks |

### 10.5 Constants you can change in the code
| Constant | Meaning |
|---|---|
| `N` | Sheet names (must match the tabs exactly) |
| `DEFAULT_TEAMS` | Teams and members written when Settings is first created |
| `STATUSES`, `PRIORITIES` | Default dropdown values |
| `MAX_ROWS` | Rows formatted in Task_Input and Task_Data (2,000) |
| `NAVY`, `LIGHT`, `GREY`, `STATUS_COLORS`, `PRIORITY_COLORS` | Colours |

Changing the sheet names in `N` after setup requires renaming the tabs to match, then running `setup`.

### 10.6 Permissions the script uses
Read and edit this spreadsheet; show a sidebar, menu and messages in it. It does not contact other services and sends no e-mail.

---

## 11. Messages you may see
Shown briefly at the bottom of the sheet.

| Message | Meaning |
|---|---|
| Task Tracker is ready… | `setup` finished |
| Select a Team first - members depend on it. | A member was picked before any team |
| Member dropdowns refreshed | Refresh finished |
| `<Field>: <Day> is an off day - pick a working day (row n)` | An off-day date was cleared |
| `Task Date: <Day> is an off day - task not saved (row n)` | A new task was not saved |
| `Task Date: <Day> is an off day - previous date kept (row n)` | An existing task kept its old date |
| `Task Date set to <Day>, the next working day (row n)` | Blank date on an off day |
| `<Field>: <Day> is an off day - date cleared (row n)` | Start or Due cleared, task saved |
| The sheet is busy saving another change. Please edit this row again in a moment. | The ID lock was busy. Nothing is lost. |
| Sheet "…" not found. Run setup()… | A tab is missing or renamed |
| `<Field> falls on <Day>, an off day. Choose a working day.` | The Add Task form refused a date |
| Task is required / Select at least one team | Add Task form validation |

---

## 12. Troubleshooting

| What you see | Cause | What to do |
|---|---|---|
| No **Task Tracker** menu | Page opened before the script was saved | Refresh the page |
| Run shows an error about `null` | Script created outside the sheet | Open Apps Script from **Extensions** inside the sheet |
| `Sheet "Settings" not found` | A tab is missing or renamed | Fix the tab names, run `setup` |
| Weekly report shows `#N/A` | Older Settings sheet | Run `setup` (upgrades Settings) |
| `#NAME?` / `#ERROR!` in a label | Old formulas | Update `Code.gs`, run `setup` |
| Tables are all zero | The selected week, month or year has no tasks | Read the grey data note; check the selected period |
| A task is missing from a report | Task Date is blank or outside the period | Fix the Task Date; check the data note |
| Dropdown for Assigned To is empty | No team selected, or team has no members | Pick a team; add members in Settings |
| Native checkboxes disappeared | Dropdown style is **Ticked list**, and the script re-applied its own lists | Set Settings `O6` to **Native checkboxes** and redo the Data validation steps (§4.2) |
| `setup` fails with "Service Spreadsheets timed out" | An earlier version put thousands of formulas in `Settings!W:AZ` | Select columns **W:AZ** on Settings → right-click → **Delete columns**, then run `setup` again with the latest `Code.gs` |
| In native mode every row shows all members | The Assigned To rule uses `# Task Tracker — Full Documentation

A task tracker built in **Google Sheets** with **Google Apps Script**. Tasks are entered once, day by day. The weekly, monthly and yearly reports, the dashboard, the team and member figures, and the charts are all calculated automatically.

| | |
|---|---|
| **Code** | [Code.gs](Code.gs), a single Apps Script file |
| **Quick start** | [README.md](README.md) |
| **Manual input** | Only the `Task_Input` sheet (or the Add Task form) |
| **Everything else** | Automatic |

---

## Table of contents
1. [Overview and data flow](#1-overview-and-data-flow)
2. [Installation](#2-installation)
3. [Updating the code](#3-updating-the-code)
4. [Using the tracker day to day](#4-using-the-tracker-day-to-day)
5. [Sheet reference](#5-sheet-reference)
6. [Business rules](#6-business-rules)
7. [Reports in detail](#7-reports-in-detail)
8. [Settings in detail](#8-settings-in-detail)
9. [Validation, formatting and protection](#9-validation-formatting-and-protection)
10. [Automation reference](#10-automation-reference)
11. [Messages you may see](#11-messages-you-may-see)
12. [Troubleshooting](#12-troubleshooting)
13. [Limits](#13-limits)
14. [Administration and maintenance](#14-administration-and-maintenance)
15. [Design decisions](#15-design-decisions)
16. [Testing and what is not verified](#16-testing-and-what-is-not-verified)
17. [FAQ](#17-faq)
18. [Glossary](#18-glossary)

---

## 1. Overview and data flow

```
      YOU
       │  type or use the Add Task form
       ▼
 ┌───────────────┐   onEdit script fills ID, dates, defaults,
 │  Task_Input   │──▶ Created At, Completion Date, multi-select
 └──────┬────────┘   cells, and writes Activity_Log
        │ formula mirror (no script)
        ▼
 ┌───────────────┐
 │  Task_Data    │  adds Month, Year, Duration, Deadline Status
 └──────┬────────┘
        │ formulas only
   ┌────┴─────┬───────────┬────────────┬───────────┐
   ▼          ▼           ▼            ▼           ▼
Dashboard  Weekly_    Monthly_     Yearly_     Settings!S:U
           Report     Report       Report      (chart data)
```

- **Task_Input** is the raw data. **Task_Data** is the single source of truth for every report and chart.
- Reports contain **formulas only**. They update immediately when a task changes.
- **Settings** feeds every dropdown (teams, members, statuses, priorities) and the week and off-day options.
- **Activity_Log** records history and is written by the script.

## 2. Installation

1. Create a blank Google Sheet.
2. **Extensions → Apps Script**. Delete the default code.
3. Paste the whole of `Code.gs`, click **Save**.
4. Choose **`setup`** in the function dropdown and click **▶ Run**.
5. Approve permissions once: **Advanced → Go to (project) → Allow**.
6. Return to the sheet. Eight tabs are created, in this order, with colored tabs:

| Order | Tab | Tab colour |
|---|---|---|
| 1 | Dashboard | dark blue |
| 2 | Task_Input | green |
| 3 | Task_Data | grey |
| 4 | Weekly_Report | blue |
| 5 | Monthly_Report | blue |
| 6 | Yearly_Report | blue |
| 7 | Settings | yellow |
| 8 | Activity_Log | grey |

7. A **Task Tracker** menu is added (see [§10.1](#101-menu)). Optional: **Load sample data** to see the reports populated.

**Important:** open the script editor **from the sheet** (Extensions → Apps Script). A script created at script.google.com is not attached to a spreadsheet and fails.

**Everyone who edits** the sheet needs Editor access. The `onEdit` trigger is built in and needs no setup. Each person is asked to authorise once on their first edit.

## 3. Updating the code

1. Extensions → Apps Script, replace the old code with the new `Code.gs`, **Save**.
2. Run **`setup`** if the change affects layouts, formulas or validation rules. A change that only affects the entry logic does not need it.

What `setup` does and does not do:

| Sheet | On re-run |
|---|---|
| Task_Input | **Kept.** Only the date validation rules are re-applied. |
| Settings | **Kept.** An older Settings sheet is upgraded in place (see below). |
| Activity_Log | **Kept.** |
| Task_Data, Dashboard, Weekly, Monthly, Yearly | **Rebuilt** (formulas, formatting, charts). |
| Missing sheets | **Created.** |

Settings upgrade (`upgradeSettings_`): if the sheet predates the off-day settings, the labels `Off day 1/2` and the cells `O4:O5` are added. If both off-day cells are empty, or hold the previous default (Friday + Saturday), they are set to **None**. A week start of Saturday (the earlier default) is changed to **Sunday**. Teams, members and anything else you entered are untouched. A custom off-day choice is never overwritten.

To force one sheet to rebuild from scratch, delete its tab and run `setup`. Do not delete Task_Input, Settings or Activity_Log unless you intend to lose their data.

---

## 4. Using the tracker day to day

### 4.1 Entering a task in Task_Input
One task per row, starting at row 2. Only **Task** is required. A team is needed to assign members.

| Col | Field | Entered by | Details |
|---|---|---|---|
| A | Task ID | **Automatic** | `T-0001`, `T-0002` … assigned when the row first has a Task |
| B | Task Date | You or automatic | Calendar picker. Blank means today. |
| C | Task | You | Free text, wraps |
| D | Team | You | Multi-select (see 4.2) |
| E | Assigned To | You | Dependent multi-select (see 4.2) |
| F | Priority | You (dropdown) | Blank becomes **Medium** |
| G | Status | You (dropdown) | Blank becomes **Pending** |
| H | Start Date | You | Calendar picker |
| I | Due Date | You | Calendar picker. Turns red when overdue. |
| J | Completion Date | **Automatic** | Set when Status becomes Completed |
| K | Notes | You | Free text, wraps |
| L | Created At | **Automatic** | The Task Date plus a time of day |

Grey cells (A, J, L) are automatic. Do not type in them.

### 4.2 Team and Assigned To (multi-select)
Google Sheets dropdowns pick one value, so multi-select is built with a toggle:

- Click a **Team** cell, pick a team → it is **added**: `KAM`, then `KAM, Backend`, then `KAM, Backend, QA`.
- Teams already in the cell are shown with a **✓ tick** in the dropdown (`✓ KAM`). Pick a ticked team → it is **removed**.
- The **first line of the list** repeats the cell's current selection (for example `KAM, Backend`). It keeps the cell valid so Sheets shows no red "Invalid" warning. Picking it changes nothing.
- The order always follows the Settings list, not the order you clicked.
- **Assigned To** offers only the members of the teams already selected in that row's Team cell. Selected members are ticked, and picking a ticked member removes it.
- Removing a team automatically removes that team's members from Assigned To.
- Select a Team **before** Assigned To. A member picked with no team is rejected with a message.
- A value that is not in the list is reverted.
- To start a cell over, press **Delete**, then pick again.
- Pasting a ready-made list such as `KAM, QA` into the Team cell is accepted as typed.

#### Optional: native checkboxes (Google's own multi-select)
Google Sheets has a real multi-select dropdown with checkboxes. Apps Script **cannot create it** (Google has not exposed it to scripts), so it is switched on by hand once. The tracker supports it as a second **Dropdown style**, and keeps **Assigned To limited to the selected teams**.

| | **Ticked list** (default) | **Native checkboxes** |
|---|---|---|
| Who sets up the dropdown | The script, per row | You, once, in Data validation |
| Look | A list with `✓` in front of selected items | Google's checkboxes / chips |
| Assigned To offers only the chosen teams' members | Yes | **Yes**, through a per-row list on the Settings sheet (columns W:AZ) |
| Needs a manual step | No | Yes (below) |

**How the team-wise list works.** In native mode the script fills `Settings!W2:AZ2000`. Row *r* there lists, one member per cell across, the members of the teams chosen in Task_Input row *r* (formula per row). The Assigned To dropdown points at `=Settings!W2:AZ2` **without \$ signs**, so each row reads its own list. The list refreshes the moment you change the Team cell.

To switch to native checkboxes:
1. In **Settings**, set **Dropdown style** (`O6`) to **Native checkboxes**, then run **`setup`** (or **Task Tracker → Refresh team & member dropdowns**). This creates the per-row lists in `Settings!W:AZ`.
2. **Team:** in **Task_Input** select `D2:D2000` → **Data → Data validation → Add rule** → **Dropdown (from a range)** → `=Settings!$A$2:$A$30` → **Advanced options** → display style **Chip** → tick **Allow multiple selections** → **Done**.
3. **Assigned To:** select `E2:E2000` → **Add rule** → **Dropdown (from a range)** → type exactly `=Settings!W2:AZ2` (start with `=`, **no \$ signs**) → **Chip** → tick **Allow multiple selections** → **Done**.

Notes:
- The reference must start with `=` and have no `$`, otherwise Sheets makes it fixed and every row shows the same list. The rule must be applied to a range that **starts at row 2**, so row 2 of the rule matches row 2 of the list.
- A row's list holds up to 30 members (`W:AZ`).
- After each pick the script tidies the cell: text that is not a team or member in Settings is removed, the order follows Settings, and members who do not belong to the selected teams are removed with a message. This also covers the case where you change the Team after choosing members.
- In this mode the script never changes the dropdown rules. `setup`, the Add Task form and **Refresh** leave them alone.
- To go back, set **Dropdown style** to **Ticked list** and run **Task Tracker → Refresh team & member dropdowns**. The per-row lists are removed and the ticked lists are applied again.

### 4.3 The Add Task form
**Task Tracker → Add Task (form)** opens a sidebar with checkboxes:

- Fields: Task, Task Date, Team(s), Assigned To, Priority, Status, Start Date, Due Date, Notes.
- Ticking teams shows the members of those teams, grouped by team. Members you already ticked stay ticked.
- Task Date is pre-filled with today (or the next working day if today is an off day).
- The task is added on the first empty row after the last task.
- Required: Task and at least one team. Errors appear in red under the button.
- After saving, a green message shows the new ID and row. The Task and Notes fields clear so you can add the next task.

### 4.4 Dates
- **Calendar picker:** double-click a Task Date, Start Date or Due Date cell. Typing works too. The cells accept real dates only.
- **Task Date**: type it, pick it, or leave it blank for today.
- **Created At** always carries the Task Date. Changing the Task Date changes Created At. The time of day is kept from the original. A task entered with a back-date gets Created At on that date.
- **Completion Date** becomes today when Status turns **Completed**, and is cleared if the status changes back.
- **Duration (days)** in Task_Data is `Due − Start + 1` in calendar days.

### 4.5 Off days (optional)
Off days are **disabled by default** (Settings `Off day 1` and `Off day 2` are both **None**). Every day is a working day and the week starts on **Sunday**.

If you choose off days in Settings (for example Friday and Saturday):

| Situation | What happens |
|---|---|
| Date picked on an off day, empty row | The date is cleared, with a message naming the row |
| New task (no ID yet), Task Date is an off day | Date cleared, task **not saved** |
| Existing task, Task Date changed to an off day | The previous Task Date is put back (taken from Created At) |
| Start or Due Date on an off day | That date is cleared. The task is saved. |
| Task Date left blank and today is an off day | Task Date becomes the **next working day**, with a message |
| Add Task form, off-day date | Refused with a message naming the field |
| Pasted block of dates | Only the off-day cells are cleared, the rest are kept |
| Weekly_Report | Off-day rows are greyed, labelled `(off)`, shown blank and not counted |

### 4.6 Editing and deleting
- Change any cell of an existing task normally. Edits are logged in Activity_Log.
- Deleting a task row removes it from every report immediately.
- Task IDs come from the highest ID currently on the sheet plus one. If you delete the **last** row, its ID can be reused. IDs of deleted middle rows leave gaps. This is normal.
- Do not sort Task_Input by clicking in the middle of the data without selecting every column. Select all columns before sorting, so rows stay together.

---

## 5. Sheet reference

### 5.1 Dashboard
Layout, with fixed positions:

| Area | Cells | Content |
|---|---|---|
| Title | A1 | `TASK TRACKER` |
| Date | A2 | `Today: <weekday, date>` |
| TODAY table | A4 title, A5:B5 header, A6:B12 | Total Tasks Today, Completed, In Progress, Pending, On Hold, Due Today (all tasks), Overdue (all open tasks). Overdue turns red above 0. |
| PERIOD OVERVIEW | D4 title, D5:H5 header, D6:H9 | Rows: Today, This Week, This Month, This Year. Columns: Period, Total, Completed, Open, Completion % |
| Charts | rows 14–27 | Task Status (donut, this month) · Tasks by Team (bar, this month) · Monthly Productivity (column, this year) |
| TODAY'S TASKS | A29 title, A30:F30 header, A31 formula | Task, Team, Assigned To, Priority, Status, Deadline for tasks dated today |
| PENDING TASKS | H29 title (with the count), H30:M30 header, H31 formula | Same six columns and colours as Today's Tasks, for **every task that is not Completed or Cancelled** (Pending, In Progress, On Hold), whatever its date. Placed to the right of Today's Tasks, below the charts. To exclude other statuses, edit `PENDING_EXCLUDED` in the code and run `setup`. |

Column widths A–H: 240, 150, 170, 100, 110, 110, 90, 120 px; the Pending table uses H–M: 220, 110, 130, 90, 100, 100 px (so column H, which also holds the Period Overview's Completion %, is 220 px wide). The three charts are placed so they never overlap each other or the list. Chart source numbers live in `Settings!S:U`, not on the dashboard. "This Week" uses the week start day from Settings.

### 5.2 Task_Input
See [§4.1](#41-entering-a-task-in-task_input). Frozen header row and first three columns. Formatted for 2,000 rows.

### 5.3 Task_Data
Formula-driven master table. **Do not edit.** A warning appears if you try.

| Col | Header | Source |
|---|---|---|
| A–L | Task ID … Created At | Mirror of Task_Input A–L |
| M | Month | First day of the Task Date's month (shown as `October 2026`) |
| N | Year | Year of the Task Date |
| O | Duration (days) | `Due − Start + 1`, blank if either date is missing |
| P | Deadline Status | See [§6](#6-business-rules) |

Formulas (row 2 only, each fills down automatically):
```
A2  =ARRAYFORMULA(IF('Task_Input'!A2:L="","",'Task_Input'!A2:L))
M2  =ARRAYFORMULA(IF(B2:B="","",DATE(YEAR(B2:B),MONTH(B2:B),1)))
N2  =ARRAYFORMULA(IF(B2:B="","",YEAR(B2:B)))
O2  =ARRAYFORMULA(IF((H2:H="")+(I2:I="")>0,"",I2:I-H2:H+1))
P2  =ARRAYFORMULA(IF(B2:B="","",IF(G2:G="Completed","Completed",IF(G2:G="Cancelled","Cancelled",
      IF(I2:I="","No Due Date",IF(I2:I<TODAY(),"Overdue",IF(I2:I=TODAY(),"Due Today","Upcoming")))))))
```
The sheet has 2,000 rows, at least as many as Task_Input, so the mirror can fill down.

### 5.4 Weekly_Report
| Area | Cells | Content |
|---|---|---|
| Selector | B3 (yellow) | Any date in the week. Defaults to `=TODAY()`. |
| Auto | B4, B5 | Week start and week end (start + 6) |
| Data note | D3 | Tasks on file and their date range |
| Day by day | A7:F7 header, A8:F14 days, A15:F15 total | Day, Date, Total, Completed, Open, Completion % |
| Team performance | H6 title, H7:M7 header, H8:M22 | 15 team rows |
| Member performance | O6 title, O7:U7 header, O8:U37 | 30 member rows |
| Task list | A40 title, A41:K41 header, A42 formula | All tasks in the week |

### 5.5 Monthly_Report
| Area | Cells | Content |
|---|---|---|
| Selectors | B3 month (yellow), B4 year (yellow) | Dropdowns |
| Auto | B5 | First day of the chosen month |
| Data note | D3 | Tasks on file and their date range |
| Summary | A7:B15 | Total, Completed, In Progress, Pending, On Hold, Cancelled, Overdue, Completion Rate |
| Team performance | D6 title, D7:I7 header, D8:I22 | 15 team rows |
| Member performance | K6 title, K7:Q7 header, K8:Q37 | 30 member rows |
| Task list | A40 title, A41:K41 header, A42 formula | All tasks in the month |

### 5.6 Yearly_Report
| Area | Cells | Content |
|---|---|---|
| Selector | B3 (yellow) | Year dropdown |
| Data note | D3 | Tasks on file and their date range |
| Month by month | A6:G6 header, A7:G18 months, A19:G19 TOTAL | Month, Total, Completed, Open, Cancelled, Overdue, Completion % |
| Team performance | I5 title, I6:N6 header, I7:N21 | 15 team rows |
| Member performance | P5 title, P6:V6 header, P7:V36 | 30 member rows |
| Chart | A21 | Tasks per month (Total and Completed), 620 × 300 px |

### 5.7 Settings
See [§8](#8-settings-in-detail).

### 5.8 Activity_Log
| Col | Header | Content |
|---|---|---|
| A | Timestamp | When the change happened |
| B | Task ID | |
| C | Task | Task text at that moment |
| D | Action / Field | `Created`, `Status Changed`, or `Edited: <field>` |
| E | Old Status | For `Status Changed` |
| F | New Status | For `Created` (starting status) and `Status Changed` |
| G | Changed By | The editing user's e-mail |
| H | Note | For other edits: `old value → new value` |

Written by the script, newest at the bottom. Single-cell edits to Task Date, Task, Team, Assigned To, Priority, Status, Start, Due and Notes are logged. Edits to the automatic columns are not. A multi-cell paste logs the new tasks as `Created` but does not log each pasted field.

---

## 6. Business rules

### 6.1 Definitions
| Term | Rule |
|---|---|
| **Open** | Not Completed and not Cancelled |
| **Completion %** | Completed ÷ (Total − Cancelled). 0 when there is nothing to divide. |
| **Period of a task** | Decided by its **Task Date** (week, month, year) |
| **Overdue** | Deadline Status = Overdue (see 6.2) |
| **Counting by team or member** | A task listed for several teams or members is counted once for **each** of them in the team and member tables. The summary counts it once. |

### 6.2 Deadline Status (Task_Data column P)
Evaluated in this order. The first match wins:

| # | Condition | Result |
|---|---|---|
| 1 | No Task Date | blank |
| 2 | Status = Completed | **Completed** |
| 3 | Status = Cancelled | **Cancelled** |
| 4 | Due Date empty | **No Due Date** |
| 5 | Due Date before today | **Overdue** |
| 6 | Due Date = today | **Due Today** |
| 7 | otherwise | **Upcoming** |

"Today" is the sheet's current date and updates each day.

### 6.3 Automatic fields in Task_Input
| Field | When | Value |
|---|---|---|
| Task ID | First time a row has a Task | Next number after the highest existing `T-nnnn` |
| Task Date | Blank | Today, or the next working day when today is an off day |
| Priority | Blank | Medium |
| Status | Blank | Pending |
| Created At | Blank, or Task Date edited | Task Date plus time of day |
| Completion Date | Status = Completed and cell blank | Today |
| Completion Date | Status ≠ Completed and cell filled | Cleared |

A row is only processed when it has **Task text**. Rows without a Task are ignored.

### 6.4 Status colours
Completed green · In Progress blue · Pending yellow · On Hold purple · Cancelled grey · Overdue red · Due Today orange · Upcoming light green.
Priority: Critical red · High orange · Medium yellow · Low green.

---

## 7. Reports in detail

### 7.1 How every number is calculated
All counts use `COUNTIFS` over whole columns of Task_Data. With the period criteria first:

| Report | Period criteria |
|---|---|
| Monthly | `Month column = Period start (B5)` |
| Yearly | `Year column = B3` |
| Weekly | `Task Date ≥ week start` and `Task Date ≤ week end` |
| Dashboard Today | `Task Date = TODAY()` |

Team and member rows add a text match, `Team contains "<name>"` or `Assigned To contains "<name>"`, using `"*"&name&"*"`.

| Column | Formula idea |
|---|---|
| Tasks | `COUNTIFS(period, team/member match)` |
| Completed | the same plus `Status = "Completed"` |
| Open | `Tasks − Completed − Cancelled` |
| Overdue | the same plus `Deadline Status = "Overdue"` |
| Completion % | `Completed ÷ (Tasks − Cancelled)`, 0 if empty |

Team rows come from `Settings!A2:A…`. Member rows come from `Settings!C:D`. Blank rows show nothing.

### 7.2 The data note
Under the selectors on Weekly, Monthly and Yearly (cell `D3`):
- `Tasks on file: 87 | dated 02 Sep 2026 to 06 Oct 2026`
- `No tasks found yet - enter tasks in Task_Input` when the sheet is empty
- adds ` - N task(s) have no valid Task Date` if some rows have a Task but no real date

It explains most "everything is zero" situations at a glance.

### 7.3 Weekly details
- Week start = chosen date − ((weekday of that date − week-start number) mod 7). The week-start number comes from `Settings!O3`.
- Day rows list 7 days from the week start.
- Off-day rows (if configured) show the day name with `(off)`, are blank and are greyed. They are excluded from the totals.
- `WEEK TOTAL` sums the Total, Completed and Open columns of the counted days. Its percentage is Completed ÷ Total.

### 7.4 Task lists
Weekly and Monthly list all tasks for the period below the tables: Task ID, Task Date, Task, Team, Assigned To, Priority, Status, Start, Due, Completed On, Deadline. They are sorted by Task Date then ID. They show `No tasks for this period` when empty. The lists use `FILTER`/`SORT` and show up to about 600 rows.

---

## 8. Settings in detail

### 8.1 Cell map
| Area | Cells | Content |
|---|---|---|
| Teams | `A1` header, `A2:A30` | One team per row |
| Team → Member | `C1:D1` header, `C2:D300` | One `Team \| Member` pair per row |
| Status | `F1`, `F2:F12` | Pending, In Progress, Completed, Cancelled, On Hold |
| Priority | `H1`, `H2:H12` | Low, Medium, High, Critical |
| Months | `J1`, `J2:J13` | January … December |
| Years | `L1`, `L2:L13` (list extends to row 30) | Starts two years before the current year |
| Options | `N1:O1` header | |
| Week starts on | `N2` / **`O2`** | Default **Sunday** (dropdown) |
| Week start # (auto) | `N3` / `O3` | `=MATCH(O2,Q2:Q8,0)` (1 = Sunday … 7 = Saturday). Do not edit. |
| Off day 1 | `N4` / **`O4`** | Default **None** (dropdown: None or a weekday) |
| Off day 2 | `N5` / **`O5`** | Default **None** |
| Dropdown style | `N6` / **`O6`** | **Ticked list** (default) or **Native checkboxes** (see §4.2) |
| Notes | `N7`, `N8` | Explanations of the off-day and dropdown-style options |
| Days | `Q1`, `Q2:Q8` | Sunday … Saturday |
| Chart data | `S1:U39` | Numbers behind the Dashboard charts. **Do not edit.** |
| Assigned To choices | `W1:AZ2000` | Only in **Native checkboxes** mode: for each Task_Input row, the members of its selected teams. Automatic. **Do not edit.** |
| Help text | `A32` | How to add teams and members |

### 8.2 Default teams and members
| Team | Members |
|---|---|
| KAM | Taibur, Shawon |
| Database | Shajib, Tahima |
| Backend | Priya |
| Frontend | Hasan |
| Android | Shihab |
| DevOps | Mehadi, Mayeen |
| QA | Kashpia |

### 8.3 Common changes
| To… | Do this |
|---|---|
| Add a team | Type it in the next empty cell of column A. Add its members in C:D. |
| Add a member | Add a row in C:D (`Team`, `Member`). Then run **Task Tracker → Refresh team & member dropdowns**. |
| Remove a member | Delete the row in C:D. Old tasks keep the name as text. Run Refresh member dropdowns. |
| Rename a team | Change it in A and in every C:D row. Old tasks keep the old name as text and will no longer count under the new name. |
| Change the week start | `O2`. Reports and the dashboard follow. |
| Set off days | `O4` and `O5`. Choose a weekday, or None. |
| Add a year | Add it under the Years list (column L, down to row 30). |

### 8.4 Cautions
- **Do not rename the five built-in statuses.** The reports, Deadline Status and colours look for these exact names: `Pending`, `In Progress`, `Completed`, `Cancelled`, `On Hold`.
- Names are matched as **text**. Avoid a name that contains another (for example `Ann` and `Anna`). The shorter one would also count the longer one's tasks.
- Leave a blank row inside the Teams or Members list only if you do not mind the report row staying blank.

---

## 9. Validation, formatting and protection

### 9.1 Data validation
| Where | Rule |
|---|---|
| Task_Input B2:B2000 (Task Date) | Valid date (calendar picker) |
| Task_Input H2:I2000 (Start, Due) | Valid date (calendar picker) |
| Task_Input D2:D2000 (Team) | Dropdown of Settings teams. Invalid values allowed because the cell holds comma lists. The script reverts unknown values. |
| Task_Input E (Assigned To) | Per-row dropdown set by the script from the row's teams |
| Task_Input F2:F2000 (Priority) | Dropdown from `Settings!H2:H12` |
| Task_Input G2:G2000 (Status) | Dropdown from `Settings!F2:F12` |
| Report selectors | Dropdowns from Settings lists (months, years). Weekly B3 accepts a date. |
| Settings O2 | Weekday dropdown |
| Settings O4:O5 | None or a weekday |

### 9.2 Conditional formatting
| Where | Rule |
|---|---|
| Task_Input G, F | Status colours, priority colours |
| Task_Input I (Due Date) | Red when the date has passed and the task is not Completed or Cancelled |
| Task_Data F, G, P | Priority, status and deadline colours |
| Report task lists | Status, deadline and priority colours |
| Dashboard | Status, deadline and priority colours. Overdue count red above 0. |
| Weekly day table | Grey rows for off days |

### 9.3 Protection
Warning-only protection (it warns, it does not block):
- Task_Data and Dashboard: the whole sheet.
- Weekly, Monthly, Yearly: the whole sheet **except** the yellow selector cells.

Protection is re-applied (replaced, not stacked) every time `setup` runs.

---

## 10. Automation reference

### 10.1 Menu
| Item | Function | Purpose |
|---|---|---|
| ➕ Add Task (form) | `showTaskForm` | Opens the checkbox sidebar |
| Refresh team & member dropdowns | `refreshAllMemberValidations` | Re-applies the per-row Team and Assigned To dropdowns (with their ticks) after a Settings change |
| Load sample data | `loadSampleData` | Adds 9 example tasks (asks first if data exists) |
| Rebuild reports & dashboard | `setup` | Runs the full setup (see §3) |

### 10.2 What happens on every edit in Task_Input (`onEdit` → `handleEdit_`)
1. Settings (teams, team → member pairs, off days) are read in a single call for this run, so edits stay fast.
2. If off days are set, dates in the edited cells that fall on an off day are cleared (`rejectOffDayDates_`).
3. **Team or Assigned To pick (fast path, `handleMultiSelectEdit_`):** two reads (Settings, the row), then one write for the two cells and one for their ticked dropdown lists. The cell changes first; the activity-log entry is written afterwards. A row that still has no Task ID also goes through `processRows_`.
4. **Any other single-cell edit:** activity log for status changes and other field edits.
5. `processRows_` fills the automatic columns (see below).

Edits on any other sheet are ignored.

### 10.3 `processRows_` (automatic columns)
Works in memory on the edited rows and writes one column at a time:
1. Rows with no Task text are skipped.
2. Off-day Task Date handling (see §4.5).
3. Blank Task Date → today / next working day.
4. Off-day Start and Due dates are cleared.
5. Defaults: Priority = Medium, Status = Pending.
6. Created At = Task Date plus time (new rows, or when the Task Date column was edited).
7. Completion Date follows the Status.
8. **Task IDs:** only this step takes the document lock. It reads the highest ID, assigns the next ones, and writes them. If the lock cannot be obtained within 30 seconds the row is left to complete on the next edit, with a message.
9. New tasks are written to Activity_Log as `Created`.

### 10.4 Function reference
| Function | Role |
|---|---|
| `onOpen` | Adds the Task Tracker menu |
| `setup` | Creates missing sheets, upgrades Settings, rebuilds reports, orders and colours the tabs |
| `buildSettings_`, `upgradeSettings_`, `offDayRule_` | Settings creation, in-place upgrade, off-day dropdown |
| `buildInput_`, `applyInputDateRules_` | Task_Input layout and date rules |
| `buildLog_` | Activity_Log layout |
| `buildData_` | Task_Data formulas and formatting |
| `buildMonthly_`, `buildYearly_`, `buildWeekly_` | The reports |
| `buildDashboard_`, `buildChartData_` | The dashboard and its chart source data |
| `summaryRows_`, `breakdown_`, `taskList_`, `dataNote_` | Shared report building blocks |
| `head_`, `sectionTitle_`, `selectorCell_`, `widths_`, `addTextRules_`, `reportFrame_` | Formatting helpers |
| `warnOnly_`, `protect_` | Protection |
| `onEdit`, `handleEdit_` | Entry logic |
| `rejectOffDayDates_`, `processRows_`, `createdAtFor_` | Date rules and automatic columns |
| `handleMultiSelectEdit_`, `handleNativeEdit_`, `cleanPair_`, `cleanNotes_`, `normalizeRows_`, `styleRule_`, `toggleResult_`, `rulesFor_`, `applyRowRules_`, `listRule_`, `tickList_`, `withCurrent_`, `membersForTeams_`, `teamList_`, `teamMap_`, `settings_`, `splitList_` | Multi-select logic and the ticked dropdown lists |
| `offDayNumbers_`, `weekdayNum_`, `nextWorkday_` | Off-day and weekday helpers (time-zone aware) |
| `logChange_` | Writes Activity_Log rows |
| `sheet_` | Finds a sheet or throws a clear error |
| `memo_`, `resetMemo_` | Per-run cache of Settings reads |
| `showTaskForm`, `getFormData`, `addTaskFromForm`, `FORM_HTML_` | The Add Task sidebar |
| `loadSampleData` | Sample tasks |

### 10.5 Constants you can change in the code
| Constant | Meaning |
|---|---|
| `N` | Sheet names (must match the tabs exactly) |
| `DEFAULT_TEAMS` | Teams and members written when Settings is first created |
| `STATUSES`, `PRIORITIES` | Default dropdown values |
| `MAX_ROWS` | Rows formatted in Task_Input and Task_Data (2,000) |
| `NAVY`, `LIGHT`, `GREY`, `STATUS_COLORS`, `PRIORITY_COLORS` | Colours |

Changing the sheet names in `N` after setup requires renaming the tabs to match, then running `setup`.

### 10.6 Permissions the script uses
Read and edit this spreadsheet; show a sidebar, menu and messages in it. It does not contact other services and sends no e-mail.

---

## 11. Messages you may see
Shown briefly at the bottom of the sheet.

| Message | Meaning |
|---|---|
| Task Tracker is ready… | `setup` finished |
| Select a Team first - members depend on it. | A member was picked before any team |
| Member dropdowns refreshed | Refresh finished |
| `<Field>: <Day> is an off day - pick a working day (row n)` | An off-day date was cleared |
| `Task Date: <Day> is an off day - task not saved (row n)` | A new task was not saved |
| `Task Date: <Day> is an off day - previous date kept (row n)` | An existing task kept its old date |
| `Task Date set to <Day>, the next working day (row n)` | Blank date on an off day |
| `<Field>: <Day> is an off day - date cleared (row n)` | Start or Due cleared, task saved |
| The sheet is busy saving another change. Please edit this row again in a moment. | The ID lock was busy. Nothing is lost. |
| Sheet "…" not found. Run setup()… | A tab is missing or renamed |
| `<Field> falls on <Day>, an off day. Choose a working day.` | The Add Task form refused a date |
| Task is required / Select at least one team | Add Task form validation |

---

## 12. Troubleshooting

| What you see | Cause | What to do |
|---|---|---|
| No **Task Tracker** menu | Page opened before the script was saved | Refresh the page |
| Run shows an error about `null` | Script created outside the sheet | Open Apps Script from **Extensions** inside the sheet |
| `Sheet "Settings" not found` | A tab is missing or renamed | Fix the tab names, run `setup` |
| Weekly report shows `#N/A` | Older Settings sheet | Run `setup` (upgrades Settings) |
| `#NAME?` / `#ERROR!` in a label | Old formulas | Update `Code.gs`, run `setup` |
| Tables are all zero | The selected week, month or year has no tasks | Read the grey data note; check the selected period |
| A task is missing from a report | Task Date is blank or outside the period | Fix the Task Date; check the data note |
| Dropdown for Assigned To is empty | No team selected, or team has no members | Pick a team; add members in Settings |
 signs or does not start with `=` | Edit the rule to exactly `=Settings!W2:AZ2`, applied to `E2:E2000` |
| In native mode the Assigned To list is empty or out of date | The per-row lists were not built, no team is selected, or members changed in Settings | Run **Refresh team & member dropdowns**; pick a Team first |
| A member I ticked was removed | In Native checkboxes mode the member does not belong to a selected team | Select the member's team first |
| New member not in dropdown | Existing rows keep their old list | **Task Tracker → Refresh team & member dropdowns** |
| "Lock timeout" error | Old version of the code | Use the latest `Code.gs`. Wait a minute and edit again. |
| No Task ID on a row | No Task text, or the date was rejected | Enter the Task text; choose a working-day date |
| Date cleared right after picking | The date is an off day | Pick another day, or set Off day 1/2 to None |
| Permission prompt on first edit | Needed once per person | **Advanced → Go to project → Allow** |
| Charts empty | No tasks this month/year | Add tasks, or load sample data |
| Chart shows a blank team slot | Fewer than 12 teams | Normal |

---

## 13. Limits
| Item | Limit |
|---|---|
| Task rows | 2,000 (`MAX_ROWS`). Extend by raising it and re-running `setup`, which adds rows. |
| Teams in reports | 15 (Settings A2:A30 may hold up to 29, but reports show 15) |
| Members in reports | 30 |
| Teams in the dashboard team chart | 12 |
| Task list in Weekly and Monthly reports | About 600 rows |
| Years list | Settings L2:L30 |
| Concurrent editors | Supported. IDs are assigned under a lock. |

---

## 14. Administration and maintenance

- **Backups:** use **File → Make a copy** regularly. Version history (File → Version history) also works.
- **Copying the whole workbook:** copy the Google Sheet. The script copies with it. The copy's users approve permissions once.
- **Sharing:** give Editor access to people who enter tasks. Give Viewer access to people who only read the reports.
- **Archiving:** at year end, make a copy of the sheet for the record. Clear old rows from Task_Input only if you no longer need them in reports.
- **Large volumes:** beyond 2,000 tasks, raise `MAX_ROWS`, save, and run `setup`. Whole-column formulas keep working.
- **New team structure:** edit Settings. Nothing in the code changes.
- **Adding people mid-year:** add the member in Settings. Older tasks are not affected.

---

## 15. Design decisions

| Decision | Reason |
|---|---|
| One continuous task table (no sheet per day or month) | Reports can group any period. One place to maintain. |
| Task_Input separate from Task_Data | You edit raw data. Reports read a clean master with added columns. |
| Formulas for all reports, script only for entry | Reports are fast and always current. Script is limited to what formulas cannot do. |
| Multi-select by toggling | Standard Sheets dropdowns pick one value. The toggle gives multi-select and dependent members. |
| Team → Member mapping in Settings | Adding a person is one row. No code or formula changes. |
| Date cells use the "valid date" rule | It is the only rule that gives a calendar picker. Off days are therefore checked right after a date is picked. |
| Off days are optional (default None) | Every day is a working day unless you choose otherwise. |
| Created At follows the Task Date | A task's creation date matches the day it belongs to. |
| Dashboard chart data on Settings (S:U) | Keeps the dashboard clean and charts from covering data cells. |
| Lock only around ID assignment | Quick successive edits do not time out. IDs stay unique. |
| Weekly formulas tolerate empty settings | A missing off-day or week-start cell can never turn the report into errors. |
| Native checkboxes are an option, not the default | Apps Script cannot create Google's multi-select dropdown, so it needs a one-time manual setup; the ✓ list works with no manual step |
| Warning-only protection | Protects against accidents without locking the owner out. |
| Duration in calendar days | Simple, predictable, unaffected by off-day settings. |

---

## 16. Testing and what is not verified

**Done (in simulated environments):**
- The script logic was run in a simulated Google Sheets environment, using a clock that can be set to any day. About 120 checks cover: setup and re-run safety, the Settings upgrade, ID assignment (including 200 pasted rows), the team and member toggle, status and completion dates, Created At, off-day rules, calendar-date rules, the Add Task form and its embedded script, sample data, the activity log, and lock-busy behaviour.
- The report formulas were evaluated by a real formula engine against sample tasks and compared with independently computed numbers: about 96 checks covering Task_Data, Monthly, Weekly (including off days and the no-off-days case), Yearly, and the data note.

**Not verified by automated tests (check in the live sheet):**
- How the sheets, colours and the three charts look.
- The calendar picker and dropdown behaviour in the browser.
- The `FILTER`/`SORT` task lists and the dashboard task list (the test formula engine does not support them).
- Behaviour with several people editing at once on a live sheet.

---

## 17. FAQ

**Can I type a Task Date manually?** Yes. Type it or use the picker. If you leave it blank, today is used.

**Why did my date disappear?** It fell on an off day set in Settings. Pick another day, or set Off day 1 and 2 to None.

**Why does Created At change when I change the Task Date?** By design. Created At carries the Task Date.

**Can one task belong to several teams and people?** Yes. It counts once for each in the team and member tables.

**Can I change a status name?** Not the five built-in ones. The reports depend on those names.

**Do reports update by themselves?** Yes. They are formulas. They also roll forward each day (Today, This Week, This Month).

**Can I add columns to Task_Input?** Not without code changes, because Task_Data mirrors columns A–L and the reports use fixed columns. Put extra notes in the Notes column.

**Can I rename a sheet tab?** Only together with the `N` constant in the code, then run `setup`.

**What if two people add a task at the same moment?** IDs are assigned under a short lock, so they never clash. If the lock is busy you will be asked to edit the row again.

**Will setup delete my data?** No. It never clears Task_Input, Settings or Activity_Log.

**How do I start fresh?** Delete the rows in Task_Input (and the log rows if you want), keeping row 1. Do not delete the headers.

---

## 18. Glossary
| Term | Meaning |
|---|---|
| **Task Date** | The day a task belongs to. Decides its week, month and year. |
| **Created At** | Task Date plus a time of day. Follows the Task Date. |
| **Open** | Not Completed and not Cancelled |
| **Working day** | Any day that is not an off day. Without off days, every day. |
| **Off day** | A weekday chosen in Settings on which tasks and dates are not accepted |
| **Selector cell** | A yellow cell on a report that you change to choose the period |
| **Task_Data** | The master table every report reads |
| **Toggle** | Picking an item adds it. Picking it again removes it. |
| **`setup`** | The function that builds or rebuilds the sheets |
| **Apps Script** | Google's scripting tool inside Sheets (Extensions → Apps Script) |
