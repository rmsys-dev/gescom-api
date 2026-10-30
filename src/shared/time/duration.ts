export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

export const addMinutesFromNow = (minutes: number): Date =>
  new Date(Date.now() + minutes * MS_PER_MINUTE);

export const subtractMinutesFromNow = (minutes: number): Date =>
  new Date(Date.now() - minutes * MS_PER_MINUTE);
