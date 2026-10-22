import Link from "next/link";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { live } from "@/lib/live";
import { mailIsConfigured } from "@/lib/mail";
import { requireUser } from "@/lib/session";
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
  const user = await requireUser("/post");
  const letters = listLetters(getDb(), user.email);
  return (
    <Frame>
      <PageHeader kicker="Your post" title="Letters for your account">
        <p>
          Account confirmations, password resets, and payment requests addressed to {user.email} are kept here. Other
          accounts cannot read these letters.
          {mailIsConfigured() ? " The same letter is emailed from afmsaucer@donmartinshop.ch." : ""}
        </p>
      </PageHeader>
      {letters.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no letters.</p>
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
