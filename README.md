# Task Tracker — Quick Start

> The complete reference (every sheet, column, rule, formula, cell map, message and function) is in **[DOCUMENTATION.md](DOCUMENTATION.md)**. This page is the short version.

A task tracker built in Google Sheets. You enter tasks once, day by day. Weekly, monthly and yearly reports, the dashboard, and the team and member figures are all calculated automatically.

- **Code:** [Code.gs](Code.gs) (one file, Google Apps Script)
- **You type in:** the `Task_Input` sheet, or the **Add Task** form
- **Everything else is automatic**

---

## 1. Contents
1. [Install](#2-install)
2. [Updating to a new version](#3-updating-to-a-new-version)
3. [Daily use: entering tasks](#4-daily-use-entering-tasks)
4. [The sheets](#5-the-sheets)
5. [Rules and definitions](#6-rules-and-definitions)
6. [Settings](#7-settings)
7. [Reading the reports](#8-reading-the-reports)
8. [Troubleshooting](#9-troubleshooting)
9. [Limits](#10-limits)
10. [Technical notes](#11-technical-notes)

---

## 2. Install
1. Create a blank Google Sheet.
2. Open **Extensions → Apps Script**. Delete the default code.
3. Paste the whole of `Code.gs` and click **Save**.
4. In the function dropdown choose **`setup`** and click **▶ Run**.
5. Approve the permission prompt once (**Advanced → Go to project → Allow**).
6. Go back to the sheet. Eight tabs appear and a **Task Tracker** menu is added.
7. Optional: **Task Tracker → Load sample data** shows the reports filled in. Delete those rows when you start for real.

The script must be opened **from the sheet** (Extensions → Apps Script). A script created separately at script.google.com is not attached to your sheet and will not work.

## 3. Updating to a new version
1. Open **Extensions → Apps Script**, replace the old code with the new `Code.gs`, **Save**.
2. Run **`setup`** once if the change touched layouts, formulas, or validation (the change notes say so). A change that only touches the entry logic needs no `setup` run.

`setup` is safe to repeat. It rebuilds the Dashboard, Task_Data and the three reports. It **never** erases `Task_Input`, `Settings` or `Activity_Log`. An older Settings sheet is upgraded in place and keeps your teams and members.

To force one report to rebuild from scratch, delete that tab and run `setup`.

## 4. Daily use: entering tasks
Type in **Task_Input**, one task per row, or use **Task Tracker → Add Task (form)**.

### Columns
| Col | Field | You enter it? |
|---|---|---|
| A | Task ID | **Automatic** (`T-0001`, `T-0002` …) |
| B | Task Date | Optional. Pick or type a date. Blank means today. |
| C | Task | **Yes** |
| D | Team | Yes, multi-select |
| E | Assigned To | Yes, multi-select, depends on Team |
| F | Priority | Dropdown. Blank becomes **Medium**. |
| G | Status | Dropdown. Blank becomes **Pending**. |
| H | Start Date | Optional, calendar picker |
| I | Due Date | Optional, calendar picker |
| J | Completion Date | **Automatic** |
| K | Notes | Optional |
| L | Created At | **Automatic** |

Typing only the **Task** (and a team) is enough. The grey columns fill themselves.

### Team and Assigned To (multi-select)
- Click a **Team** cell and pick a team: it is **added** (`KAM, Backend`). Pick the same team again to **remove** it.
- **Assigned To** lists only the members of the teams already selected in that row. It works the same way. Pick a member to add, pick again to remove.
- Removing a team also removes that team's members.
- Choose a Team before Assigned To. Picking a member with no team shows a message.
- To start over in a cell, press **Delete**, then pick again.
- The **Add Task form** gives the same result with checkboxes, which some people find easier.

### Dates
- Task Date, Start Date and Due Date have a **calendar picker**. Double-click the cell.
- **Task Date**: type or pick it, or leave it blank for today.
- **Created At** always carries the Task Date, with a time of day. If you change the Task Date, Created At changes with it.
- **Optional native checkboxes:** in Settings set *Dropdown style* to *Native checkboxes* and run `setup`, then switch on "Allow multiple selections" by hand in Data validation (Apps Script cannot create Google's multi-select dropdown). Assigned To stays limited to the selected teams through a per-row list (plain values kept up to date by the script) on the Settings sheet. Steps are in [DOCUMENTATION.md](DOCUMENTATION.md) §4.2.
- **Completion Date** is set to today when Status becomes **Completed**, and cleared if the status changes back.

### Off days (optional)
By default there are **no off days** and every day is a working day. In **Settings** you can choose **Off day 1** and **Off day 2** (for example Friday and Saturday). Then:
- A Task, Start or Due date picked on an off day is rejected with a message. A task keeps its previous Task Date.
- A blank Task Date on an off day becomes the next working day.
- Weekly_Report greys that day, labels it "(off)", and does not count it.

## 5. The sheets
| Sheet | What it does | Do you edit it? |
|---|---|---|
| **Dashboard** | Today's counts, This Week / Month / Year overview, three charts, today's task list | No |
| **Task_Input** | The one place you enter tasks | **Yes** |
| **Task_Data** | Master table. Mirrors Task_Input and adds Month, Year, Duration, Deadline Status | No |
| **Weekly_Report** | Day by day, plus team, member and task list for one week | Yellow date cell only |
| **Monthly_Report** | Summary, team, member and task list for one month | Yellow Month and Year cells only |
| **Yearly_Report** | Month-by-month table and chart, plus team and member for one year | Yellow Year cell only |
| **Settings** | Teams, members, statuses, priorities, week start, off days | When your team changes |
| **Activity_Log** | History of every created task and every edit | No |

Report sheets show a warning if you try to edit a locked cell. Only the yellow selector cells are meant to be changed.

### Dashboard
- **TODAY** table: tasks dated today by status, tasks due today, and all overdue open tasks.
- **PERIOD OVERVIEW**: Today, This Week, This Month and This Year with Total, Completed, Open and Completion %.
- **Charts:** Task Status (this month), Tasks by Team (this month), Monthly Productivity (this year).
- **TODAY'S TASKS**: the list of tasks dated today.

### Activity_Log
Columns: Timestamp, Task ID, Task, Action / Field, Old Status, New Status, Changed By, Note.
- **Created**: New Status holds the starting status.
- **Status Changed**: Old Status and New Status.
- **Any other edit**: Action says which field, and Note holds `old → new`.

## 6. Rules and definitions
| Term | Meaning |
|---|---|
| **Open** | Not Completed and not Cancelled |
| **Completion %** | Completed ÷ (Total − Cancelled) |
| **Duration (days)** | Due Date − Start Date + 1, in calendar days |
| **Deadline Status** | Completed → Cancelled → *No Due Date* → **Overdue** (due date passed) → **Due Today** → **Upcoming** |
| **Which period a task belongs to** | Its **Task Date** |
| **Several teams or members on one task** | Counted once for **each** team or member in the team and member tables. The summary counts the task once. |

Colours: Completed green, In Progress blue, Pending yellow, On Hold purple, Cancelled grey, Overdue red, Due Today orange, Upcoming light green. Priority: Critical red, High orange, Medium yellow, Low green.

## 7. Settings
| Area | Cells | What it holds |
|---|---|---|
| Teams | A2:A30 | One team per row |
| Team → Member | C2:D100 | One `Team | Member` pair per row |
| Status | F2:F12 | Dropdown list for Status |
| Priority | H2:H12 | Dropdown list for Priority |
| Months / Years | J, L | Lists behind the report selectors |
| Options | N:O | **Week starts on** (default Sunday), **Off day 1 / 2** (default None) |
| Days | Q2:Q8 | Weekday list used by the options |
| Chart data | S:U | Automatic numbers behind the dashboard charts. Do not edit. |

- **Add a team:** type it in column A and add its members in C:D.
- **Add a member:** add a row in C:D (`Team | Member`). Run **Task Tracker → Refresh team & member dropdowns** so existing rows pick it up.
- **Do not rename the five built-in statuses** (Pending, In Progress, Completed, Cancelled, On Hold). The reports and colours look for these names.
- **Years** in the report selectors start two years before the current year. You can extend the list in column L, down to row 30.
- Member and team names are matched as text. Avoid names where one contains another (for example `Ann` and `Anna`), or the shorter one will also count the longer one's tasks.

## 8. Reading the reports
Each report has a grey line under the selectors, for example:
`Tasks on file: 87 | dated 02 Sep 2026 to 06 Oct 2026`
It shows how many tasks exist and what dates they cover. It also warns if some tasks have no valid Task Date.

- **Weekly_Report:** type any date in the yellow cell. The week is shown from the start day (Sunday by default) for 7 days.
- **Monthly_Report:** pick the Month and Year in the yellow cells.
- **Yearly_Report:** pick the Year in the yellow cell.

**A table of zeros usually means that week, month or year has no tasks.** Check the grey line and the selected period first.

## 9. Troubleshooting
| What you see | What to do |
|---|---|
| No **Task Tracker** menu | Refresh the page. |
| `Sheet "Settings" not found` | A tab is missing or renamed. Tab names must match exactly (Dashboard, Task_Input, Task_Data, Weekly_Report, Monthly_Report, Yearly_Report, Settings, Activity_Log). Run `setup`. |
| `#N/A` in the Weekly report | Run `setup` once. It upgrades an older Settings sheet. |
| `#NAME?` or `#ERROR!` in a label | Run `setup` with the latest `Code.gs`. |
| Reports show zeros | Check the grey line under the selectors, then the selected period. |
| "Lock timeout" | Use the latest `Code.gs`. If it appears once after saving, wait a minute and edit again. |
| "The sheet is busy…" | Another edit was saving. Edit the row again. Nothing is lost. |
| "…is an off day" message | The date you picked is an off day set in Settings. Pick another date, or set Off day 1 / 2 to **None**. |
| A task did not get a Task ID | The row has no Task text, or the Task Date was on an off day. |
| Permission window | Needed once per person on first use: **Advanced → Go to project → Allow**. |

## 10. Limits
- 2,000 task rows (`MAX_ROWS` in the code).
- Reports show up to **15 teams** and **30 members**. The Tasks-by-Team chart shows up to 12 teams.
- Task lists in the reports show up to about 600 rows for the selected period.
- Everyone who edits the sheet needs edit access and must approve the permission prompt once.

## 11. Technical notes
- **How it works:** `Task_Input` holds the raw tasks. `Task_Data` is a formula mirror that adds Month, Year, Duration and Deadline Status. Every report and chart reads only from `Task_Data`.
- **Triggers:** the script uses the built-in `onEdit` trigger. It needs no setup. It fills the automatic columns, handles the multi-select cells, enforces the date rules, and writes the Activity_Log.
- **Task IDs:** assigned under the document lock, so two people entering tasks at the same time never get the same ID.
- **Main functions in `Code.gs`:** `setup` (builds everything), `onEdit` (entry logic), `processRows_` (automatic columns), `addTaskFromForm` (the form), `build*_` (one builder per sheet).
- **Testing done:** the script logic was tested in a simulated Sheets environment, and the report formulas were evaluated with a formula engine against sample tasks. This was **not** a test inside a live Google Sheet. The layout, charts and calendar picker should be checked visually after you run `setup`.
- **Not built:** Google Calendar sync, e-mail summaries, PDF reports and per-user access control. They can be added on top of `Task_Data`.
