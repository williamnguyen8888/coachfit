// src/lib/services/account.ts
// API service layer for account & GDPR management.
// These endpoints are served by AccountController.java.
//
// Endpoints:
//   GET    /account            — get account info
//   PUT    /account/email      — change email
//   PUT    /account/password   — change password
//   POST   /account/export     — request full data export (GDPR)
//   DELETE /account            — delete account permanently (GDPR right to erasure)

import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccountInfo {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;    // ISO timestamp
  provider: string;     // "local" | "google" | etc.
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;     // Confirm current password for security
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface DataExportResponse {
  /** Message confirming the export was queued */
  message: string;
  /** Estimated time in minutes before the export is ready */
  estimatedMinutes?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const accountService = {
  /** GET /account — get the current user's account details */
  get: (): Promise<AccountInfo> =>
    api.get<AccountInfo>("/account"),

  /** PUT /account/email — change the login email */
  changeEmail: (body: ChangeEmailRequest): Promise<void> =>
    api.put<void>("/account/email", body),

  /** PUT /account/password — change the login password */
  changePassword: (body: ChangePasswordRequest): Promise<void> =>
    api.put<void>("/account/password", body),

  /**
   * POST /account/export
   * Request a full GDPR data export.
   * The export will be emailed to the registered address.
   */
  requestDataExport: (): Promise<DataExportResponse> =>
    api.post<DataExportResponse>("/account/export"),

  /**
   * DELETE /account
   * Permanently delete the account and all associated data.
   * This is irreversible — require explicit user confirmation before calling.
   */
  deleteAccount: (): Promise<void> =>
    api.delete<void>("/account"),
};
