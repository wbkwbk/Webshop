import Link from "next/link";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { live } from "@/lib/live";
import { listLetters } from "@/lib/shop";

export const metadata = { title: "Post office" };

export default function PostPage() {
  return (
    <Suspense fallback={null}>
      <Post />
    </Suspense>
  );
}

async function Post() {
  await live();
  const letters = listLetters(getDb());
  return (
    <Frame>
      <PageHeader kicker="Demo post office" title="Letters kept on this machine">
        <p>
          Password resets and payment requests are written here. There is no mail server, so this is the inbox for
          every account in the workshop.
        </p>
      </PageHeader>
      {letters.length === 0 ? (
        <p className="text-sm text-muted-foreground">The post office is empty.</p>
      ) : (
        <ul className="grid gap-3">
          {letters.map((letter) => (
            <li key={letter.id}>
              <Link href={`/post/${letter.id}`} className="block rounded-xl border border-border bg-card px-4 py-3 hover:border-primary">
                <p className="text-xs text-muted-foreground">
                  {formatWhen(letter.createdAt)} · {letter.toEmail}
                </p>
                <p className="mt-1 font-medium">{letter.subject}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
