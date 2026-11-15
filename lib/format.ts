export function money(cents: number): string {
  return '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}
export function money2(cents: number): string {
  return '$' + (cents / 100).toFixed(2);
}

const TZ = 'America/New_York';

function dayKey(d: Date) {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}
function hour(d: Date) {
  const s = d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  return s.replace(':00', '').replace(' AM', ' am').replace(' PM', ' pm');
}

export function pickupWindow(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  let day: string;
  if (dayKey(s) === dayKey(now)) day = 'Today';
  else if (dayKey(s) === dayKey(tomorrow)) day = 'Tomorrow';
  else day = s.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
  let sh = hour(s);
  const eh = hour(e);
  if (sh.slice(-2) === eh.slice(-2)) sh = sh.slice(0, -3);
  return `${day} ${sh}–${eh}`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });
}

// "2026-11-15" + "16:00" in New York time -> ISO string
export function nyLocalToIso(date: string, time: string): string {
  const guess = new Date(`${date}T${time}:00Z`);
  const nyAsUtc = new Date(guess.toLocaleString('en-US', { timeZone: TZ }));
  const offset = guess.getTime() - nyAsUtc.getTime();
  return new Date(guess.getTime() + offset).toISOString();
}

export function todayNY(offsetDays = 0): string {
  return dayKey(new Date(Date.now() + offsetDays * 86400000));
}
