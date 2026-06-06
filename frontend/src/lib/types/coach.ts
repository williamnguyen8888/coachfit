// src/lib/types/coach.ts
// TypeScript types for all coach-related API responses and UI models.

// ─── Fitness / Training Load ──────────────────────────────────────────────────

export interface AthleteFitness {
  ctl: number;
  atl: number;
  tsb: number;
  trend?: "building" | "maintaining" | "recovering" | "detraining";
}

/** TSB-based athlete readiness status */
export type AthleteStatus = "fresh" | "optimal" | "fatigued" | "nodata";

export function getAthleteStatus(tsb: number | undefined | null): AthleteStatus {
  if (tsb === undefined || tsb === null) return "nodata";
  if (tsb > 5) return "fresh";
  if (tsb >= -5) return "optimal";
  return "fatigued";
}

// ─── Roster / Athlete ─────────────────────────────────────────────────────────

export interface RosterAthlete {
  /** coach_athletes row id */
  id: string;
  athleteId: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  status: "active" | "pending" | "revoked";
  sports: string[];
  tags: string[];
  fitness: AthleteFitness | null;
  lastActivity: {
    date: string;
    sport: string;
    name: string;
  } | null;
  healthSnapshot: {
    restingHr: number | null;
    sleepScore: number | null;
    hrv?: number | null;
  } | null;
  acceptedAt: string | null;
}

export interface PaginatedRoster {
  content: RosterAthlete[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── Athlete Dashboard (coach view) ─────────────────────────────────────────

export interface AthleteAlert {
  type:
    | "missed_workout"
    | "overtraining_risk"
    | "elevated_hr"
    | "poor_sleep"
    | "low_hrv";
  date?: string;
  workout?: string;
  value?: number;
  baseline?: number;
  severity: "warning" | "danger";
}

export interface AthleteDashboard {
  athlete: {
    id: string;
    name: string;
    nickname: string | null;
    avatarUrl: string | null;
  };
  fitness: AthleteFitness;
  weekSummary: {
    plannedHours: number;
    completedHours: number;
    compliance: number;
  };
  recentActivities: RecentActivity[];
  healthSnapshot: {
    restingHr: number | null;
    sleepScore: number | null;
    hrv: number | null;
  } | null;
  alerts: AthleteAlert[];
}

export interface RecentActivity {
  id: string;
  sport: string;
  name: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number | null;
  tss: number | null;
}

// ─── Invite ──────────────────────────────────────────────────────────────────

export interface InviteLink {
  id: string;
  code: string;
  url: string;
  isReusable: boolean;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  createdAt: string;
  active: boolean;
}

export interface CreateInviteLinkRequest {
  isReusable: boolean;
  maxUses?: number;
  expiresInDays?: number;
}

export interface InviteAthleteRequest {
  email: string;
  nickname?: string;
  tags?: string[];
}

// ─── Workout Assignment ───────────────────────────────────────────────────────

export interface WorkoutAssignRequest {
  workoutId: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface BulkAssignRequest {
  athleteIds: string[];
  workoutId: string;
  date: string;
  notes?: string;
}

export interface BulkAssignResponse {
  created: number;
  failed: number;
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface CommentAuthor {
  id: string;
  name: string;
  role: "athlete" | "coach" | "admin";
  avatarUrl: string | null;
}

export interface ActivityComment {
  id: string;
  content: string;
  author: CommentAuthor;
  parentId: string | null;
  replies?: ActivityComment[];
  createdAt: string;
  updatedAt: string | null;
  edited: boolean;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string | null;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | "coach_invite"
  | "workout_assigned"
  | "workout_completed"
  | "comment_added"
  | "alert_overtraining"
  | "alert_missed_workout";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  /** Optional deep-link (e.g., /activities/uuid, /coach?athlete=uuid) */
  linkUrl: string | null;
  /** Associated resource ids */
  meta: {
    athleteId?: string;
    athleteName?: string;
    activityId?: string;
    workoutTitle?: string;
  };
}

export interface PaginatedNotifications {
  content: Notification[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── Athlete permissions ──────────────────────────────────────────────────────

export interface AthleteCoachPermissions {
  readActivities: boolean;
  readActivityStreams: boolean;
  readCalendar: boolean;
  readWellness: boolean;
  readHealthData: boolean;
  readTrainingLoad: boolean;
  viewZones: boolean;
  writeCalendar: boolean;
  writeWorkouts: boolean;
}
