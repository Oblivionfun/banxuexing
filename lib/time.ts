/**
 * 日期统一用 "YYYY-MM-DD" 字符串、时间用 "HH:mm" 字符串，按北京时间理解。
 * 计算时把日期固定在 UTC 零点，避免服务器时区不同导致错位。
 */

const TIME_ZONE = "Asia/Shanghai";
const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;
const WEEKDAY_SHORT = ["日", "一", "二", "三", "四", "五", "六"] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateString(value: string | null | undefined): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const date = parseDate(value);
  return !Number.isNaN(date.getTime()) && formatDateKey(date) === value;
}

export function isTimeString(value: string | null | undefined): value is string {
  return Boolean(value && TIME_RE.test(value));
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function nowTimeKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

/** 1 = 周一 … 7 = 周日 */
export function isoWeekday(dateKey: string): number {
  const day = parseDate(dateKey).getUTCDay();
  return day === 0 ? 7 : day;
}

export function weekStart(dateKey: string): string {
  return addDays(dateKey, 1 - isoWeekday(dateKey));
}

export function weekDays(startKey: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(startKey, index));
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((parseDate(toKey).getTime() - parseDate(fromKey).getTime()) / 86_400_000);
}

export function weekdayName(dateKey: string): string {
  return WEEKDAY_NAMES[parseDate(dateKey).getUTCDay()];
}

export function weekdayShort(dateKey: string): string {
  return WEEKDAY_SHORT[parseDate(dateKey).getUTCDay()];
}

export function weekdayNameFromIso(weekday: number): string {
  return WEEKDAY_NAMES[weekday % 7];
}

export function dayOfMonth(dateKey: string): number {
  return parseDate(dateKey).getUTCDate();
}

/** 11月11日 */
export function formatMonthDay(dateKey: string): string {
  const date = parseDate(dateKey);
  return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

/** 11月11日 周三 */
export function formatDateWithWeekday(dateKey: string): string {
  return `${formatMonthDay(dateKey)} ${weekdayName(dateKey)}`;
}

/** 今天 / 明天 / 昨天 / 11月11日 周三 */
export function formatRelativeDate(dateKey: string, today: string = todayKey()): string {
  const diff = daysBetween(today, dateKey);
  if (diff === 0) return `今天 ${weekdayName(dateKey)}`;
  if (diff === 1) return `明天 ${weekdayName(dateKey)}`;
  if (diff === -1) return `昨天 ${weekdayName(dateKey)}`;
  return formatDateWithWeekday(dateKey);
}

/** 11月9日 – 15日 或跨月 11月30日 – 12月6日 */
export function formatWeekRange(startKey: string): string {
  const endKey = addDays(startKey, 6);
  const start = parseDate(startKey);
  const end = parseDate(endKey);
  const startText = formatMonthDay(startKey);
  const endText =
    start.getUTCMonth() === end.getUTCMonth() ? `${end.getUTCDate()}日` : formatMonthDay(endKey);
  return `${startText} – ${endText}`;
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${start}–${end}`;
}

export function formatDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: TIME_ZONE,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("month")}月${get("day")}日 ${get("hour")}:${get("minute")}`;
}

export function dateKeyOf(date: Date): string {
  return todayKey(date);
}
