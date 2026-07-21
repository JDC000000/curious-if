const ARCHIVE_PARAM_RE = /^\d{4}$/;

export const MIN_ARCHIVE_YEAR = 2026;

export function getMaxArchiveYear(now = new Date()): number {
  return now.getUTCFullYear() + 1;
}

export function parseArchiveMonthParams(
  yearParam: string,
  monthParam: string,
  now = new Date(),
): { year: number; month: number } | null {
  if (!ARCHIVE_PARAM_RE.test(yearParam) || !/^\d{1,2}$/.test(monthParam)) return null;

  const year = Number(yearParam);
  const month = Number(monthParam);
  const maxArchiveYear = getMaxArchiveYear(now);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < MIN_ARCHIVE_YEAR ||
    year > maxArchiveYear ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return { year, month };
}
