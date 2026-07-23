import { AppError } from '../middleware/errorHandler.js';

export interface CalendarDateRange {
  startDate: Date;
  endDate: Date;
  isoStartDate: string;
  isoEndDate: string;
  description: string;
}

export function getCalendarDateRange(
  yearStr?: string,
  monthStr?: string,
  weekStr?: string
): CalendarDateRange {
  if (!yearStr) {
    throw new AppError('Wymagany jest parametr "year" (np. year=2026).', 400);
  }

  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new AppError('Nieprawidłowy rok. Podaj rok z zakresu 1900 - 2100 (np. 2026).', 400);
  }

  let month: number | undefined;
  if (monthStr !== undefined) {
    month = parseInt(monthStr, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      throw new AppError('Nieprawidłowy miesiąc. Podaj wartość od 1 do 12 (np. month=5 dla maja).', 400);
    }
  }

  let week: number | undefined;
  if (weekStr !== undefined) {
    week = parseInt(weekStr, 10);
    if (isNaN(week) || week < 1 || week > 5) {
      throw new AppError('Nieprawidłowy tydzień. Podaj tydzień z zakresu 1 - 5 (np. week=1 dla 1. tygodnia miesiąca).', 400);
    }
    if (month === undefined) {
      throw new AppError('W przypadku podania parametru "week" należy również podać parametr "month" (np. month=5&week=2).', 400);
    }
  }

  let startDate: Date;
  let endDate: Date;
  let description = '';

  if (month !== undefined) {
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getDate();

    if (week !== undefined) {
      const startDay = (week - 1) * 7 + 1;
      const endDay = Math.min(week * 7, lastDayOfMonth);

      startDate = new Date(Date.UTC(year, month - 1, startDay, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, endDay, 23, 59, 59, 999));
      description = `Tydzień ${week} miesiąca ${month}/${year} (dni ${startDay}-${endDay})`;
    } else {
      startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      endDate = new Date(Date.UTC(year, month - 1, lastDayOfMonth, 23, 59, 59, 999));
      description = `Miesiąc ${month}/${year} (od 1 do ${lastDayOfMonth})`;
    }
  } else {
    startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
    description = `Rok ${year} (od 1 stycznia do 31 grudnia)`;
  }

  return {
    startDate,
    endDate,
    isoStartDate: startDate.toISOString(),
    isoEndDate: endDate.toISOString(),
    description
  };
}
