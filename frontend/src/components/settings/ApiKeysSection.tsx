"use client";
// src/components/settings/ApiKeysSection.tsx
// API key management — list, create (show full key once), revoke.
// API: GET /api-keys · POST /api-keys · DELETE /api-keys/{id}

import React, { useState, useRef } from "react";
import { useQuery } from "@/hooks/useQuery";
import { apiKeysService } from "@/lib/services/settings";
import { Button } from "@/components/ui/Button";
import { Input, InputGroup } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Key,
  AlertTriangle,
  ClipboardCopy,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import type { ApiKey, ApiKeyCreateResponse } from "@/lib/types/settings";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function relativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

/* ─── New key reveal card ─────────────────────────────────────────────────── */

function NewKeyReveal({
  keyData,
  onDismiss,
}: {
  keyData: ApiKeyCreateResponse;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyData.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="rounded-[var(--radius-lg)] p-4 flex flex-col gap-3"
      style={{
        background: "color-mix(in srgb, var(--color-success) 8%, var(--bg-elevated))",
        border: "1px solid color-mix(in srgb, var(--color-success) 25%, var(--border-subtle))",
      }}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck size={15} style={{ color: "var(--color-success)" }} />
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--color-success)",
          }}
        >
          API key created — copy it now
        </span>
      </div>
      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
        This is the only time the full key will be shown. Store it securely.
      </p>
      <div
        className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 font-mono"
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-default)",
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          letterSpacing: "0.02em",
          wordBreak: "break-all",
        }}
      >
        <span className="flex-1">{keyData.rawKey}</span>
        <button
          type="button"
          id="copy-new-api-key"
          onClick={handleCopy}
          aria-label="Copy API key"
          className="shrink-0 transition-colors"
          style={{ color: copied ? "var(--color-success)" : "var(--text-muted)", cursor: "pointer" }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        I've saved it — dismiss
      </Button>
    </div>
  );
}

/* ─── Key row ─────────────────────────────────────────────────────────────── */

function KeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKey;
  onRevoke: (id: string) => void;
}) {
  const [revoking, setRevoking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPrefix = async () => {
    await navigator.clipboard.writeText(apiKey.keyPrefix);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRevoke = async () => {
    if (!confirm) { setConfirm(true); return; }
    setRevoking(true);
    try {
      await onRevoke(apiKey.id);
    } finally {
      setRevoking(false);
      setConfirm(false);
    }
  };

  const isExpired =
    apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date();

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <Key
        size={14}
        style={{ color: isExpired ? "var(--color-danger)" : "var(--color-accent)", flexShrink: 0 }}
      />

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: isExpired ? "var(--text-muted)" : "var(--text-primary)",
          }}
        >
          {apiKey.name}
          {isExpired && (
            <span
              className="ml-2 rounded-[var(--radius-full)] px-1.5 py-0.5"
              style={{
                fontSize: "var(--text-xs)",
                background: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
                color: "var(--color-danger)",
              }}
            >
              Expired
            </span>
          )}
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleCopyPrefix}
            title="Copy key prefix"
            className="flex items-center gap-1 cursor-pointer"
            style={{
              fontSize: "var(--text-xs)",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            {apiKey.keyPrefix}…
            {copied ? <Check size={10} style={{ color: "var(--color-success)" }} /> : <ClipboardCopy size={10} />}
          </button>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Created {relativeDate(apiKey.createdAt)}
          </span>
          {apiKey.lastUsedAt && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Last used {relativeDate(apiKey.lastUsedAt)}
            </span>
          )}
          {apiKey.expiresAt && !isExpired && (
            <span
              className="flex items-center gap-1"
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              <Calendar size={9} />
              Expires {new Date(apiKey.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>
      </div>

      <Button
        id={`revoke-key-${apiKey.id}`}
        variant={confirm ? "danger" : "ghost"}
        size="sm"
        loading={revoking}
        leftIcon={confirm ? <AlertTriangle size={13} /> : <Trash2 size={13} />}
        onClick={handleRevoke}
        onBlur={() => setConfirm(false)}
      >
        {confirm ? "Confirm revoke" : "Revoke"}
      </Button>
    </div>
  );
}

/* ─── Create form ─────────────────────────────────────────────────────────── */

function CreateKeyForm({
  onCreated,
}: {
  onCreated: (key: ApiKeyCreateResponse) => void;
}) {
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("90");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setErr("Key name is required");
      inputRef.current?.focus();
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      const expiresAt = expiry && expiry !== "0"
        ? new Date(Date.now() + parseInt(expiry) * 86400000).toISOString()
        : null;
      const key = await apiKeysService.create({
        name: name.trim(),
        expiresAt,
      });
      setName("");
      setExpiry("90");
      onCreated(key);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="rounded-[var(--radius-md)] p-4 flex flex-col gap-[var(--space-4)]"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <h4
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        Create new API key
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--space-3)]">
        <div className="sm:col-span-2">
          <InputGroup
            label="Key name"
            htmlFor="apikey-name"
            errorText={err ?? undefined}
          >
            <Input
              id="apikey-name"
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setErr(null); }}
              placeholder="e.g. My training app"
              error={Boolean(err)}
              leftAdornment={<Key size={13} />}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </InputGroup>
        </div>

        <div>
          <InputGroup label="Expires in" htmlFor="apikey-expiry">
            <select
              id="apikey-expiry"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full h-10 rounded-[var(--radius-sm)] border px-3 appearance-none"
              style={{
                background: "var(--bg-input)",
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
                fontSize: "var(--text-base)",
                outline: "none",
              }}
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="0">Never</option>
            </select>
          </InputGroup>
        </div>
      </div>

      <div>
        <Button
          id="create-api-key-btn"
          variant="primary"
          size="sm"
          loading={creating}
          leftIcon={<Plus size={14} />}
          onClick={handleCreate}
        >
          Generate key
        </Button>
      </div>
    </div>
  );
}

/* ─── Section ─────────────────────────────────────────────────────────────── */

export function ApiKeysSection() {
  const { data, loading, refetch } = useQuery<ApiKey[]>("/api-keys");
  const [newKey, setNewKey] = useState<ApiKeyCreateResponse | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const handleCreated = (key: ApiKeyCreateResponse) => {
    setNewKey(key);
    refetch();
  };

  const handleRevoke = async (id: string) => {
    setRevokeError(null);
    try {
      await apiKeysService.revoke(id);
      refetch();
      if (newKey?.id === id) setNewKey(null);
    } catch (e) {
      setRevokeError(e instanceof Error ? e.message : "Failed to revoke key");
    }
  };

  const keys = data ?? [];

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* Info */}
      <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        API keys allow third-party tools to access your CoachFit data using{" "}
        <code
          style={{
            fontFamily: "var(--font-mono)",
            background: "var(--bg-elevated)",
            padding: "1px 5px",
            borderRadius: 4,
            fontSize: "var(--text-xs)",
          }}
        >
          Authorization: Bearer &lt;key&gt;
        </code>
        . Keys inherit your account permissions.
      </p>

      {/* Create form */}
      <CreateKeyForm onCreated={handleCreated} />

      {/* Newly created key reveal */}
      {newKey && (
        <NewKeyReveal keyData={newKey} onDismiss={() => setNewKey(null)} />
      )}

      {/* Key list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} height="64px" />
          ))}
        </div>
      ) : keys.length > 0 ? (
        <div
          className="rounded-[var(--radius-md)] overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="px-4 py-2.5"
            style={{
              background: "var(--bg-elevated)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {keys.length} active key{keys.length !== 1 ? "s" : ""}
            </span>
          </div>
          {keys.map((k) => (
            <KeyRow key={k.id} apiKey={k} onRevoke={handleRevoke} />
          ))}
        </div>
      ) : (
        <div
          className="flex flex-col items-center gap-2 py-8 rounded-[var(--radius-md)]"
          style={{
            background: "var(--bg-surface)",
            border: "1px dashed var(--border-default)",
          }}
        >
          <Key size={24} style={{ color: "var(--text-muted)" }} />
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            No API keys yet
          </p>
        </div>
      )}

      {revokeError && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}>
          {revokeError}
        </p>
      )}
    </div>
  );
}
