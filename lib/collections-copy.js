import { parseIsoDate } from './auckland-calendar.js';

export function formatDayMonth(isoDate) {
  const parts = parseIsoDate(isoDate);

  if (!parts) {
    return '';
  }

  return new Intl.DateTimeFormat('en-NZ', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function collectedThroughLabel(isoDate) {
  const formatted = formatDayMonth(isoDate);
  return formatted ? `Collected through ${formatted}` : '';
}

export function settlementLagNote(isoDate) {
  const formatted = formatDayMonth(isoDate);
  return formatted
    ? `Data shown through ${formatted} to allow recent collections time to settle.`
    : '';
}

export function comparisonToneClass() {
  return 'collections-comparison';
}
