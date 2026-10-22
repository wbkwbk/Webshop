import { BATCH_SIZE } from "@/lib/constants";

export function BatchMeter({ filled, target = BATCH_SIZE }: { filled: number; target?: number }) {
  const safe = Math.max(0, Math.min(target, filled));
  const percent = (safe / target) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {safe} of {target} reserved
        </span>
        <span className="tabular-nums">{target - safe} to go</span>
      </div>
      <div
        className="mt-1.5 h-1.5 bg-secondary"
        role="meter"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`${safe} of ${target} pieces reserved`}
      >
        <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
