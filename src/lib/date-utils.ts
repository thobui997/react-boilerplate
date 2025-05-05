import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(utc);
dayjs.extend(localeData);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isoWeek);

const dateUtils = {
  now: () => dayjs(),
  parse: (date: string, format?: string) => (format ? dayjs(date, format) : dayjs(date)),
  isBetween: (date: string, start: string, end: string) => dayjs(date).isBetween(start, end),
  isSameOrBefore: (date: string, compareDate: string) => dayjs(date).isSameOrBefore(compareDate),
  isSameOrAfter: (date: string, compareDate: string) => dayjs(date).isSameOrAfter(compareDate),
  toUTC: (date?: string) => (date ? dayjs(date).utc() : dayjs().utc()),
  startOfISOWeek: (date: string) => dayjs(date).startOf('isoWeek'),
  endOfISOWeek: (date: string) => dayjs(date).endOf('isoWeek'),
  format: (date: string, formatType: string) => dayjs(date).format(formatType)
};

export default dateUtils;