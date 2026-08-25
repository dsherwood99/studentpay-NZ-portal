export const COLLECTIONS_SETTLEMENT_LAG_BUSINESS_DAYS = 5;

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function toIsoFromParts(parts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function shiftCalendarDay(parts, deltaDays) {
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + deltaDays)
  );

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function weekdayUtc(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function isWeekend(parts) {
  const weekday = weekdayUtc(parts);
  return weekday === 0 || weekday === 6;
}

export function isNonBusinessDay(
  parts,
  { isHoliday } = {}
) {
  if (isWeekend(parts)) {
    return true;
  }

  if (typeof isHoliday === 'function') {
    return isHoliday(toIsoFromParts(parts)) === true;
  }

  return false;
}

export function subtractBusinessDays(
  isoDate,
  count,
  { isHoliday } = {}
) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error('ISO date required to subtract business days.');
  }

  let cursor = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  let remaining = Number(count);

  while (remaining > 0) {
    cursor = shiftCalendarDay(cursor, -1);

    if (!isNonBusinessDay(cursor, { isHoliday })) {
      remaining -= 1;
    }
  }

  return toIsoFromParts(cursor);
}
