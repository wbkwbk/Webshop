import { cn } from "@/lib/utils";

export function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12", className)}>{children}</div>;
}

export function PageHeader({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 max-w-2xl">
      {kicker ? (
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">{kicker}</p>
      ) : null}
      <h1 className="mt-2 font-serif text-4xl tracking-tight text-balance sm:text-5xl">{title}</h1>
      {children ? <div className="mt-3 text-base leading-7 text-muted-foreground">{children}</div> : null}
    </header>
  );
}

export function Banner({
  tone = "info",
  children,
}: {
  tone?: "info" | "good" | "warn";
  children: React.ReactNode;
}) {
  const toneClass = {
    info: "border-border bg-card",
    good: "border-[#234237]/30 bg-[#234237]/8",
    warn: "border-primary/30 bg-primary/8",
  }[tone];
  return (
    <div className={`mb-6 rounded-lg border px-4 py-3 text-sm leading-6 ${toneClass}`} role="status">
      {children}
    </div>
  );
}
