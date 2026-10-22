import { Frame } from "@/components/frame";

export default function Loading() {
  return (
    <Frame>
      <p className="text-sm tracking-[0.16em] text-muted-foreground uppercase">donmartins</p>
      <div className="mt-6 h-10 max-w-sm animate-pulse rounded bg-secondary" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
    </Frame>
  );
}
