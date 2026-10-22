import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { LetterBody } from "@/components/letter-body";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { live } from "@/lib/live";
import { getLetter } from "@/lib/shop";

export const metadata = { title: "Letter" };

export default function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Letter params={params} />
    </Suspense>
  );
}

async function Letter({ params }: { params: Promise<{ id: string }> }) {
  await live();
  const { id } = await params;
  const letter = getLetter(getDb(), id);
  if (!letter) notFound();
  return (
    <Frame>
      <Link href="/post" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        All letters
      </Link>
      <PageHeader kicker={`${letter.toEmail} · ${formatWhen(letter.createdAt)}`} title={letter.subject} />
      <article className="max-w-2xl rounded-xl border border-border bg-card p-5">
        <LetterBody body={letter.body} />
      </article>
    </Frame>
  );
}
