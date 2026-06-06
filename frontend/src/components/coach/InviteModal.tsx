"use client";

// src/components/coach/InviteModal.tsx
// Coach invite modal — email invite + shareable link tabs.

import { useState, useEffect, useCallback } from "react";
import { X, Mail, Link2, Copy, Check, Trash2, PlusCircle } from "lucide-react";
import { rosterService, inviteLinksService } from "@/lib/services/coach";
import { useCoachStore } from "@/stores/coach.store";
import type { InviteLink } from "@/lib/types/coach";
import { formatDistanceToNow } from "@/lib/utils/time";

type Tab = "email" | "link";

function copyToClipboard(text: string) {
  return navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  });
}

export function InviteModal() {
  const { inviteModalOpen, closeInviteModal } = useCoachStore();
  const [tab, setTab] = useState<Tab>("email");

  // Email form
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [tags, setTags] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<"success" | "error" | null>(null);

  // Link management
  const [links, setLinks] = useState<InviteLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadLinks = useCallback(async () => {
    setLinksLoading(true);
    try {
      const res = await inviteLinksService.list();
      setLinks(res);
    } catch {
      setLinks([]);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (inviteModalOpen && tab === "link") {
      loadLinks();
    }
  }, [inviteModalOpen, tab, loadLinks]);

  const handleEmailInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      await rosterService.invite({
        email: email.trim(),
        nickname: nickname.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setSendResult("success");
      setEmail("");
      setNickname("");
      setTags("");
    } catch {
      setSendResult("error");
    } finally {
      setSending(false);
    }
  };

  const handleCreateLink = async () => {
    setCreating(true);
    try {
      const link = await inviteLinksService.create({
        isReusable: true,
        expiresInDays: 30,
      });
      setLinks((prev) => [link, ...prev]);
    } catch {
      // swallow
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await inviteLinksService.deactivate(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {
      // swallow
    }
  };

  const handleCopy = async (link: InviteLink) => {
    await copyToClipboard(link.url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!inviteModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeInviteModal}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Invite athlete"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(520px, calc(100vw - 32px))",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInScale 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-5) var(--space-6)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h3
            style={{
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Invite Athlete
          </h3>
          <button
            onClick={closeInviteModal}
            aria-label="Close"
            style={{
              width: 32, height: 32,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "0 var(--space-6)",
          }}
        >
          {(["email", "link"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                if (t === "link") loadLinks();
              }}
              style={{
                padding: "12px 16px",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--color-accent)" : "2px solid transparent",
                background: "transparent",
                color: tab === t ? "var(--color-accent)" : "var(--text-muted)",
                fontSize: "var(--text-sm)",
                fontWeight: tab === t ? 600 : 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                transition: "all var(--duration-micro)",
              }}
            >
              {t === "email" ? <Mail size={14} /> : <Link2 size={14} />}
              {t === "email" ? "Email Invite" : "Shareable Link"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: "var(--space-6)" }}>
          {/* ── Email tab ── */}
          {tab === "email" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label
                  htmlFor="invite-email"
                  style={{
                    display: "block",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Email address *
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@example.com"
                  style={{
                    width: "100%",
                    height: 40,
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 var(--space-3)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    transition: "border-color var(--duration-micro)",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
                />
              </div>

              <div>
                <label
                  htmlFor="invite-nickname"
                  style={{
                    display: "block",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Nickname <span style={{ color: "var(--text-muted)" }}>(optional)</span>
                </label>
                <input
                  id="invite-nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Ironman Mike"
                  style={{
                    width: "100%",
                    height: 40,
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 var(--space-3)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    transition: "border-color var(--duration-micro)",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
                />
              </div>

              <div>
                <label
                  htmlFor="invite-tags"
                  style={{
                    display: "block",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Tags <span style={{ color: "var(--text-muted)" }}>(comma separated)</span>
                </label>
                <input
                  id="invite-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. advanced, cyclist, triathlete"
                  style={{
                    width: "100%",
                    height: 40,
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)",
                    padding: "0 var(--space-3)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    transition: "border-color var(--duration-micro)",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
                />
              </div>

              {/* Result feedback */}
              {sendResult === "success" && (
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-success-8)",
                    border: "1px solid var(--color-success-15)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-success)",
                  }}
                >
                  <Check size={14} /> Invite sent successfully!
                </div>
              )}
              {sendResult === "error" && (
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-2)",
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--color-danger-8)",
                    border: "1px solid var(--color-danger-15)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-danger)",
                  }}
                >
                  <X size={14} /> Failed to send invite. Please try again.
                </div>
              )}

              <button
                id="send-invite-btn"
                onClick={handleEmailInvite}
                disabled={!email.trim() || sending}
                style={{
                  height: 40,
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: email.trim() && !sending ? "var(--color-accent)" : "var(--bg-input)",
                  color: email.trim() && !sending ? "white" : "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  cursor: email.trim() && !sending ? "pointer" : "not-allowed",
                  transition: "all var(--duration-micro)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-2)",
                }}
              >
                <Mail size={14} />
                {sending ? "Sending…" : "Send Invite"}
              </button>
            </div>
          )}

          {/* ── Link tab ── */}
          {tab === "link" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {/* Create new link */}
              <button
                onClick={handleCreateLink}
                disabled={creating}
                style={{
                  height: 40,
                  borderRadius: "var(--radius-sm)",
                  border: "1px dashed var(--border-default)",
                  background: "transparent",
                  color: creating ? "var(--text-muted)" : "var(--color-accent)",
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  cursor: creating ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-2)",
                  transition: "all var(--duration-micro)",
                }}
                onMouseEnter={(e) => {
                  if (!creating) e.currentTarget.style.background = "var(--color-accent-4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <PlusCircle size={14} />
                {creating ? "Creating…" : "Create New Invite Link"}
              </button>

              {/* Link list */}
              {linksLoading ? (
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" }}>
                  Loading links…
                </div>
              ) : links.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" }}>
                  No active invite links. Create one above.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {links.map((link) => {
                    const isCopied = copiedId === link.id;
                    const expiryLabel = link.expiresAt
                      ? (() => {
                          try {
                            return `Expires ${formatDistanceToNow(new Date(link.expiresAt), { addSuffix: true })}`;
                          } catch {
                            return "";
                          }
                        })()
                      : "No expiry";

                    return (
                      <div
                        key={link.id}
                        style={{
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-input)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            className="font-metric"
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--color-accent)",
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {link.url}
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                            {link.isReusable ? "Reusable" : "Single-use"} · {link.useCount} uses ·{" "}
                            {expiryLabel}
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopy(link)}
                          title="Copy link"
                          style={{
                            width: 30, height: 30,
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-default)",
                            background: isCopied ? "var(--color-success-8)" : "transparent",
                            color: isCopied ? "var(--color-success)" : "var(--text-muted)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            transition: "all var(--duration-micro)",
                          }}
                        >
                          {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        </button>

                        <button
                          onClick={() => handleDeactivate(link.id)}
                          title="Deactivate link"
                          style={{
                            width: 30, height: 30,
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid transparent",
                            background: "transparent",
                            color: "var(--color-danger)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                            transition: "all var(--duration-micro)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-danger-8)";
                            e.currentTarget.style.borderColor = "var(--color-danger-15)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "transparent";
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Share this link with athletes via email, WhatsApp, or social media. Athletes
                who click it will be added to your roster automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
