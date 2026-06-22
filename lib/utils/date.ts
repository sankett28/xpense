// Pure, dependency-free date helpers. All "ISO date" values are YYYY-MM-DD in
// LOCAL time (not UTC), so "today" matches the user's wall clock.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Local YYYY-MM-DD for today.
export function todayISO(): string {
  return toISODate(new Date());
}

// Local YYYY-MM-DD for an arbitrary Date.
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a YYYY-MM-DD string into a local-midnight Date (avoids UTC shift).
function parseISODate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

// "1 Jun" — accepts a YYYY-MM-DD string or a Date.
export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? parseISODate(d) : d;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// "1 Jun to 30 Jun"
export function formatDateRange(start: string | Date, end: string | Date): string {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

// Whole-day difference (b - a). Same day = 0. Uses local dates.
export function daysBetween(a: string | Date, b: string | Date): number {
  const da = typeof a === "string" ? parseISODate(a) : a;
  const db = typeof b === "string" ? parseISODate(b) : b;
  const ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate());
  const ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / MS_PER_DAY);
}

// "2:30 PM" — accepts a timestamp string or Date.
export function formatTime(ts: string | Date): string {
  const date = typeof ts === "string" ? new Date(ts) : ts;
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}
