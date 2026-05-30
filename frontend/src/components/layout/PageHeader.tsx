interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header
      className="flex items-start justify-between px-4 lg:px-6 pt-6 pb-4"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div>
        <h1
          className="font-bold tracking-tight"
          style={{
            fontSize: "var(--text-2xl)",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-1"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </header>
  );
}
