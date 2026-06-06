// src/lib/services/coach.ts
// API service layer for all coach-related endpoints.

import { api } from "@/lib/api";
import type {
  PaginatedRoster,
  RosterAthlete,
  AthleteDashboard,
  InviteLink,
  CreateInviteLinkRequest,
  InviteAthleteRequest,
  WorkoutAssignRequest,
  BulkAssignRequest,
  BulkAssignResponse,
  ActivityComment,
  CreateCommentRequest,
  RecentActivity,
} from "@/lib/types/coach";
import type { CalendarEvent } from "@/lib/types/calendar";

// ─── Roster management ────────────────────────────────────────────────────────

export const rosterService = {
  /** GET /coach/athletes */
  list: (params?: { page?: number; size?: number }): Promise<PaginatedRoster> => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    const q = qs.toString();
    return api.get<PaginatedRoster>(`/coach/athletes${q ? `?${q}` : ""}`);
  },

  /** GET /coach/athletes/{athleteId} */
  get: (athleteId: string): Promise<RosterAthlete> =>
    api.get<RosterAthlete>(`/coach/athletes/${athleteId}`),

  /** POST /coach/athletes/invite */
  invite: (body: InviteAthleteRequest): Promise<{ id: string; status: string; invitedAt: string }> =>
    api.post(`/coach/athletes/invite`, body),

  /** DELETE /coach/athletes/{athleteId} */
  remove: (athleteId: string): Promise<void> =>
    api.delete<void>(`/coach/athletes/${athleteId}`),

  /** PUT /coach/athletes/{athleteId}/tags */
  updateTags: (athleteId: string, tags: string[]): Promise<void> =>
    api.put<void>(`/coach/athletes/${athleteId}/tags`, { tags }),

  /** PUT /coach/athletes/{athleteId}/nickname */
  updateNickname: (athleteId: string, nickname: string): Promise<void> =>
    api.put<void>(`/coach/athletes/${athleteId}/nickname`, { nickname }),

  /** PUT /coach/athletes/{athleteId}/notes */
  updateNotes: (athleteId: string, notes: string): Promise<void> =>
    api.put<void>(`/coach/athletes/${athleteId}/notes`, { notes }),
};

// ─── Invite links ─────────────────────────────────────────────────────────────

export const inviteLinksService = {
  /** GET /coach/invite-links */
  list: (): Promise<InviteLink[]> =>
    api.get<InviteLink[]>(`/coach/invite-links`),

  /** POST /coach/invite-links */
  create: (body: CreateInviteLinkRequest): Promise<InviteLink> =>
    api.post<InviteLink>(`/coach/invite-links`, body),

  /** DELETE /coach/invite-links/{id} */
  deactivate: (id: string): Promise<void> =>
    api.delete<void>(`/coach/invite-links/${id}`),
};

// ─── Athlete data access ──────────────────────────────────────────────────────

export const athleteDataService = {
  /** GET /coach/athletes/{id}/dashboard */
  getDashboard: (athleteId: string): Promise<AthleteDashboard> =>
    api.get<AthleteDashboard>(`/coach/athletes/${athleteId}/dashboard`),

  /** GET /coach/athletes/{id}/activities */
  getActivities: (
    athleteId: string,
    params?: { page?: number; size?: number; from?: string; to?: string }
  ): Promise<{ content: RecentActivity[]; totalElements: number; totalPages: number; page: number }> => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    if (params?.size !== undefined) qs.set("size", String(params.size));
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const q = qs.toString();
    return api.get(`/coach/athletes/${athleteId}/activities${q ? `?${q}` : ""}`);
  },

  /** GET /coach/athletes/{id}/calendar?from=...&to=... */
  getCalendar: (
    athleteId: string,
    from: string,
    to: string
  ): Promise<CalendarEvent[]> =>
    api.get<CalendarEvent[]>(
      `/coach/athletes/${athleteId}/calendar?from=${from}&to=${to}`
    ),

  /** GET /coach/athletes/{id}/wellness?from=...&to=... */
  getWellness: (
    athleteId: string,
    from: string,
    to: string
  ): Promise<unknown[]> =>
    api.get<unknown[]>(
      `/coach/athletes/${athleteId}/wellness?from=${from}&to=${to}`
    ),

  /** GET /coach/athletes/{id}/health/daily?from=...&to=... */
  getHealthDaily: (
    athleteId: string,
    from: string,
    to: string
  ): Promise<unknown[]> =>
    api.get<unknown[]>(
      `/coach/athletes/${athleteId}/health/daily?from=${from}&to=${to}`
    ),

  /** GET /coach/athletes/{id}/training-load/pmc?from=...&to=... */
  getPmc: (
    athleteId: string,
    from: string,
    to: string
  ): Promise<{ entries: { date: string; ctl: number; atl: number; tsb: number }[] }> =>
    api.get(
      `/coach/athletes/${athleteId}/training-load/pmc?from=${from}&to=${to}`
    ),
};

// ─── Workout assignment ───────────────────────────────────────────────────────

export const assignmentService = {
  /** POST /coach/athletes/{id}/calendar */
  assign: (
    athleteId: string,
    body: WorkoutAssignRequest
  ): Promise<CalendarEvent> =>
    api.post<CalendarEvent>(`/coach/athletes/${athleteId}/calendar`, body),

  /** DELETE /coach/athletes/{id}/calendar/{eventId} */
  removeAssignment: (athleteId: string, eventId: string): Promise<void> =>
    api.delete<void>(`/coach/athletes/${athleteId}/calendar/${eventId}`),

  /** POST /coach/athletes/bulk-assign */
  bulkAssign: (body: BulkAssignRequest): Promise<BulkAssignResponse> =>
    api.post<BulkAssignResponse>(`/coach/athletes/bulk-assign`, body),
};

// ─── Activity comments ────────────────────────────────────────────────────────

export const commentsService = {
  /** GET /activities/{id}/comments */
  list: (activityId: string): Promise<ActivityComment[]> =>
    api.get<ActivityComment[]>(`/activities/${activityId}/comments`),

  /** POST /activities/{id}/comments */
  create: (
    activityId: string,
    body: CreateCommentRequest
  ): Promise<ActivityComment> =>
    api.post<ActivityComment>(`/activities/${activityId}/comments`, body),

  /** PUT /activities/{id}/comments/{commentId} */
  update: (
    activityId: string,
    commentId: string,
    content: string
  ): Promise<ActivityComment> =>
    api.put<ActivityComment>(
      `/activities/${activityId}/comments/${commentId}`,
      { content }
    ),

  /** DELETE /activities/{id}/comments/{commentId} */
  delete: (activityId: string, commentId: string): Promise<void> =>
    api.delete<void>(`/activities/${activityId}/comments/${commentId}`),
};
