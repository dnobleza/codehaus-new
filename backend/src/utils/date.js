// Plain-calendar-date helpers for computations against DATE columns
// (start_date/end_date-style, e.g. milestones/projects). Per commit
// 80bfb34, DATE columns already round-trip as plain 'YYYY-MM-DD' strings
// (see config/database.js's type parser) -- these helpers keep everything
// downstream of that fix working in the same plain-string domain, rather
// than reintroducing the exact TZ-shift bug that commit fixed by routing a
// value back through `new Date(...).toISOString()`.

// "Today" as a plain 'YYYY-MM-DD' string, built from LOCAL date parts
// (getFullYear/getMonth/getDate), never `toISOString()` -- toISOString()
// converts to UTC first, which can roll the calendar day backwards/forwards
// depending on the server's timezone offset relative to local midnight.
function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Whole-day difference between two 'YYYY-MM-DD' strings (later - earlier),
// computed via Date.UTC on the parsed y/m/d components so neither operand
// is ever subject to a local-timezone offset -- avoids the same class of
// off-by-one-day bug commit 80bfb34 fixed at the DB layer.
function daysBetweenDateStrings(laterDateString, earlierDateString) {
  const toUtcMillis = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  const diffMs = toUtcMillis(laterDateString) - toUtcMillis(earlierDateString);
  return Math.round(diffMs / 86400000);
}

module.exports = { todayDateString, daysBetweenDateStrings };
