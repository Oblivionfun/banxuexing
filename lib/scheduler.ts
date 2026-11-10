import { addDays, fromMinutes, isoWeekday, toMinutes } from "@/lib/time";

export type WeeklyWindow = { weekday: number; startTime: string; endTime: string };

export type SubjectRequest = {
  subjectId: number;
  name: string;
  sessions: number;
  minutes: number;
  teacherWindows: WeeklyWindow[];
};

export type BusySlot = { date: string; startTime: string; endTime: string };

export type ProposedSlot = { subjectId: number; date: string; startTime: string; endTime: string };

export type UnmetRequest = { subjectId: number; name: string; missing: number; reason: string };

export type ScheduleInput = {
  weekStart: string;
  studentWindows: WeeklyWindow[];
  subjects: SubjectRequest[];
  busy: BusySlot[];
  breakMinutes?: number;
  maxPerDay?: number;
  stepMinutes?: number;
};

export type ScheduleResult = {
  slots: ProposedSlot[];
  unmet: UnmetRequest[];
  candidateCount: Record<number, number>;
};

type Interval = { start: number; end: number };
type Candidate = { date: string; start: number; end: number };

const MAX_STEPS = 50_000;

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) result.push({ start, end });
    }
  }
  return result;
}

function windowsFor(windows: WeeklyWindow[], weekday: number): Interval[] {
  return windows
    .filter((window) => window.weekday === weekday)
    .map((window) => ({ start: toMinutes(window.startTime), end: toMinutes(window.endTime) }));
}

function overlaps(a: Interval, b: Interval, gap: number): boolean {
  return a.start < b.end + gap && b.start < a.end + gap;
}

/** 列出某科目这一周所有可行的开始时间（学生、老师都有空，且不撞已有课程）。 */
export function candidatesFor(
  subject: SubjectRequest,
  input: Required<Pick<ScheduleInput, "weekStart" | "studentWindows" | "busy" | "breakMinutes" | "stepMinutes">>,
): Candidate[] {
  const result: Candidate[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(input.weekStart, offset);
    const weekday = isoWeekday(date);
    const free = intersect(windowsFor(input.studentWindows, weekday), windowsFor(subject.teacherWindows, weekday));
    const busyToday = input.busy
      .filter((slot) => slot.date === date)
      .map((slot) => ({ start: toMinutes(slot.startTime), end: toMinutes(slot.endTime) }));
    for (const range of free) {
      const firstStart = Math.ceil(range.start / input.stepMinutes) * input.stepMinutes;
      for (let start = firstStart; start + subject.minutes <= range.end; start += input.stepMinutes) {
        const slot = { start, end: start + subject.minutes };
        if (busyToday.some((busy) => overlaps(slot, busy, input.breakMinutes))) continue;
        result.push({ date, ...slot });
      }
    }
  }
  return result;
}

/**
 * 回溯搜索：先排可选时间最少的科目；同一科目一天最多一节；
 * 课与课之间留出休息时间；每天不超过上限。找不到完整方案时返回排进最多的一版。
 */
export function proposeSchedule(raw: ScheduleInput): ScheduleResult {
  const input = {
    breakMinutes: 15,
    maxPerDay: 4,
    stepMinutes: 30,
    ...raw,
  };

  const requests = input.subjects.filter((subject) => subject.sessions > 0);
  const candidates = new Map<number, Candidate[]>();
  const candidateCount: Record<number, number> = {};
  for (const subject of requests) {
    const list = candidatesFor(subject, input);
    candidates.set(subject.subjectId, list);
    candidateCount[subject.subjectId] = list.length;
  }

  const queue = requests
    .flatMap((subject) => Array.from({ length: subject.sessions }, () => subject))
    .sort(
      (a, b) =>
        (candidates.get(a.subjectId)?.length ?? 0) / a.sessions -
        (candidates.get(b.subjectId)?.length ?? 0) / b.sessions,
    );

  const chosen: (ProposedSlot & Interval)[] = [];
  let best: (ProposedSlot & Interval)[] = [];
  let steps = 0;

  const fits = (subjectId: number, candidate: Candidate) => {
    const sameDay = chosen.filter((slot) => slot.date === candidate.date);
    if (sameDay.length >= input.maxPerDay) return false;
    if (sameDay.some((slot) => slot.subjectId === subjectId)) return false;
    return !sameDay.some((slot) => overlaps(slot, candidate, input.breakMinutes));
  };

  const score = (candidate: Candidate) => {
    const sameDay = chosen.filter((slot) => slot.date === candidate.date).length;
    return sameDay * 1000 + candidate.start;
  };

  const optionsFor = (subjectId: number) =>
    (candidates.get(subjectId) ?? [])
      .filter((candidate) => fits(subjectId, candidate))
      .sort((a, b) => score(a) - score(b));

  const place = (subjectId: number, candidate: Candidate) =>
    chosen.push({
      subjectId,
      date: candidate.date,
      startTime: fromMinutes(candidate.start),
      endTime: fromMinutes(candidate.end),
      start: candidate.start,
      end: candidate.end,
    });

  // 第一阶段：严格回溯，要求每一节都排进去
  const search = (index: number): boolean => {
    steps += 1;
    if (chosen.length > best.length) best = [...chosen];
    if (index === queue.length) return true;
    if (steps > MAX_STEPS) return false;
    const subject = queue[index];
    for (const candidate of optionsFor(subject.subjectId)) {
      place(subject.subjectId, candidate);
      if (search(index + 1)) return true;
      chosen.pop();
      if (steps > MAX_STEPS) return false;
    }
    return false;
  };

  let complete = search(0);

  // 第二阶段：排不满时，贪心地能排就排，与回溯中最好的部分方案比较取多者
  if (!complete) {
    chosen.length = 0;
    for (const subject of queue) {
      const [first] = optionsFor(subject.subjectId);
      if (first) place(subject.subjectId, first);
    }
    if (chosen.length >= best.length) best = [...chosen];
    complete = best.length === queue.length;
  }

  const finalSlots = (complete && chosen.length === queue.length ? chosen : best)
    .map(({ subjectId, date, startTime, endTime }) => ({ subjectId, date, startTime, endTime }))
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

  const unmet: UnmetRequest[] = [];
  for (const subject of requests) {
    const placed = finalSlots.filter((slot) => slot.subjectId === subject.subjectId).length;
    if (placed >= subject.sessions) continue;
    const available = candidates.get(subject.subjectId)?.length ?? 0;
    unmet.push({
      subjectId: subject.subjectId,
      name: subject.name,
      missing: subject.sessions - placed,
      reason:
        subject.teacherWindows.length === 0
          ? "老师还没有填可上课时间"
          : available === 0
            ? "老师和学生的空闲时间没有重合"
            : "空闲时间被其他科目占满了",
    });
  }

  return { slots: finalSlots, unmet, candidateCount };
}
