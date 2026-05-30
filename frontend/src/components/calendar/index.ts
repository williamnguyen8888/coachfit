// src/components/calendar/index.ts
// Calendar component exports

export { CalendarEventChip } from "./CalendarEventChip";
export type { CalendarEventChipProps } from "./CalendarEventChip";

export { WorkoutCard } from "./WorkoutCard";
export type { WorkoutCardProps } from "./WorkoutCard";

export { ActivityCard } from "./ActivityCard";
export type { ActivityCardProps } from "./ActivityCard";

export { WorkoutStepViz } from "./WorkoutStepViz";

export { CalendarEventModal } from "./CalendarEventModal";
export type { CalendarEventModalProps } from "./CalendarEventModal";

export { CalendarEventTooltip } from "./CalendarEventTooltip";
export type { CalendarEventTooltipProps } from "./CalendarEventTooltip";

export { WeekNavBar } from "./WeekNavBar";
export { WeekView } from "./WeekView";

export { MonthView } from "./MonthView";

export {
  getSportMeta,
  getZoneDistribution,
  getEstimatedLoad,
  formatDuration,
  formatDistance,
  formatPace,
  getSportHex,
  getSportSvgIcon,
  getRpeEmoji,
  getRpeColor,
  computeWeekStats,
} from "./calendarUtils";
export type { SportMeta, WeekStats } from "./calendarUtils";

