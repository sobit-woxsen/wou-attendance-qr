import { DateTime } from "luxon";
import { env } from "./env";

export const PERIODS = [
  { id: "P1", label: "Period 1", start: "0930", end: "1030" },
  { id: "P2", label: "Period 2", start: "1030", end: "1130" },
  { id: "P3", label: "Period 3", start: "1145", end: "1245" },
  { id: "P4", label: "Period 4", start: "1400", end: "1500" },
  { id: "P5", label: "Period 5", start: "1500", end: "1600" },
  { id: "P6", label: "Period 6", start: "1600", end: "1700" },
] as const;

export type PeriodId = (typeof PERIODS)[number]["id"];

export interface PeriodWindow {
  id: PeriodId;
  label: string;
  start: DateTime;
  end: DateTime;
}

export const TIMEZONE = env.timezone ?? "Asia/Kolkata";

function parseHHmm(value: string, base: DateTime): DateTime {
  const [hh, mm] = [value.slice(0, 2), value.slice(2, 4)];
  return base.set({ hour: Number(hh), minute: Number(mm), second: 0, millisecond: 0 });
}

export function nowIST(): DateTime {
  return DateTime.now().setZone(TIMEZONE);
}

export function nowUTC(): DateTime {
  return DateTime.utc();
}

export function toIST(date: Date | string | number): DateTime {
  return DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE);
}

export function formatIST(date: Date | DateTime, format = "dd MMM yyyy, hh:mm a") {
  const dt = date instanceof DateTime ? date : DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE);
  return dt.toFormat(format);
}

export function getLocalDateString(date: DateTime): string {
  return date.toFormat("yyyy-MM-dd");
}

export function getPeriodWindow(id: PeriodId, reference = nowIST()): PeriodWindow {
  const period = PERIODS.find((p) => p.id === id);
  if (!period) {
    throw new Error(`Unknown period id ${id}`);
  }
  const start = parseHHmm(period.start.replace(":", ""), reference);
  const end = parseHHmm(period.end.replace(":", ""), reference);
  return {
    id: period.id,
    label: period.label,
    start,
    end,
  };
}

export function getCurrentPeriod(reference = nowIST()): PeriodWindow | null {
  for (const period of PERIODS) {
    const window = getPeriodWindow(period.id, reference);
    if (reference >= window.start && reference < window.end) {
      return window;
    }
  }
  return null;
}

export function computeSessionEnd(now: DateTime, period: PeriodWindow): DateTime {
  const proposed = now.plus({ minutes: 10 });
  return proposed < period.end ? proposed : period.end;
}

export function secondsBetween(from: DateTime, to: DateTime): number {
  return Math.max(Math.floor(to.diff(from, "seconds").seconds), 0);
}

export function secondsUntil(date: Date | DateTime): number {
  const target = date instanceof DateTime ? date : DateTime.fromJSDate(new Date(date)).setZone(TIMEZONE);
  return secondsBetween(nowIST(), target);
}
