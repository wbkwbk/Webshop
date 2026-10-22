import { PRODUCTION_AT } from "@/lib/constants";

export function BatchMeter({ filled, target = PRODUCTION_AT }: { filled: number; target?: number }) {
  const reserved = Math.max(0, filled);
  const started = reserved >= target;
  const percent = Math.min(100, (reserved / target) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">{reserved} reserved</span>
        <span className="tabular-nums">
          {started ? "Production has started" : `${target - reserved} until production`}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 bg-secondary"
        role="meter"
        aria-valuenow={reserved}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`${reserved} reserved. Production starts at ${target}.`}
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
