interface PlanUsageBarProps {
  label: string;
  used: number;
  limit: number | null;
}

/** Barra de progreso simple. Ilimitado (limit null) se muestra sin barra, ya que "% de infinito" no tiene sentido. */
export function PlanUsageBar({ label, used, limit }: PlanUsageBarProps) {
  const isUnlimited = limit === null;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const isNearLimit = !isUnlimited && percentage >= 90;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={isNearLimit ? "font-medium text-destructive" : "font-medium"}>
          {used.toLocaleString("es-AR")} {isUnlimited ? "" : `/ ${limit.toLocaleString("es-AR")}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={isNearLimit ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-primary"}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
