const DAY_MS = 24 * 60 * 60 * 1000;

const DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

const dateFormat = new Intl.DateTimeFormat("en-GB", DATE);
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", { ...DATE, ...TIME });

export const formatDate = (instant: string): string => dateFormat.format(new Date(instant));

export const formatDateTime = (instant: string): string => dateTimeFormat.format(new Date(instant));

export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

const wholeDaysBetween = (earlier: string, later: string): number =>
  Math.floor((Date.parse(later) - Date.parse(earlier)) / DAY_MS);

export const daysBefore = (instant: string, asOf: string): string =>
  wholeDaysBetween(instant, asOf) > 0
    ? `${plural(wholeDaysBetween(instant, asOf), "day")} ago`
    : "in the last day";
