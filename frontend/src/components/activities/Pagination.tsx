"use client";

/**
 * Pagination — page navigator for the activities list.
 *
 * Shows: prev button, page number buttons (with ellipsis), next button.
 * Design: secondary buttons for inactive pages, primary for current page.
 */

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface PaginationProps {
  /** 0-indexed current page */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Page size for aria labelling */
  pageSize?: number;
  totalElements?: number;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const pages: (number | "...")[] = [];

  // Always show first page
  pages.push(0);

  if (current > 3) pages.push("...");

  // Show pages around current
  const start = Math.max(1, current - 1);
  const end = Math.min(total - 2, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 4) pages.push("...");

  // Always show last page
  if (total > 1) pages.push(total - 1);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalElements,
  pageSize = 20,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(page, totalPages);

  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements ?? (page + 1) * pageSize);

  return (
    <nav
      aria-label="Activity list pagination"
      className="flex flex-col items-center gap-3 py-6"
    >
      {/* Page range info */}
      {totalElements !== undefined && (
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
          aria-live="polite"
        >
          Showing {startItem}–{endItem} of {totalElements.toLocaleString()}
        </p>
      )}

      {/* Page buttons */}
      <div className="flex items-center gap-1" role="list">
        {/* Prev */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
          leftIcon={<ChevronLeft size={14} />}
          role="listitem"
        >
          Prev
        </Button>

        {/* Page numbers */}
        {pageNumbers.map((p, idx) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${idx}`}
                role="listitem"
                aria-hidden="true"
                style={{
                  padding: "0 4px",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  userSelect: "none",
                }}
              >
                …
              </span>
            );
          }

          const isCurrent = p === page;
          return (
            <button
              key={p}
              role="listitem"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p + 1}`}
              aria-current={isCurrent ? "page" : undefined}
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${isCurrent ? "var(--color-accent)" : "var(--border-default)"}`,
                background: isCurrent
                  ? "var(--color-accent)"
                  : "var(--bg-elevated)",
                color: isCurrent ? "#fff" : "var(--text-secondary)",
                fontSize: "var(--text-sm)",
                fontWeight: isCurrent ? 700 : 400,
                cursor: isCurrent ? "default" : "pointer",
                transition: `all var(--duration-micro) ease-out`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.background = "var(--bg-surface)";
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) {
                  e.currentTarget.style.background = "var(--bg-elevated)";
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }
              }}
            >
              {p + 1}
            </button>
          );
        })}

        {/* Next */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
          rightIcon={<ChevronRight size={14} />}
          role="listitem"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
