import Link from "next/link";
import { Suspense } from "react";
import { Banner, Frame, PageHeader } from "@/components/frame";
import { LetterBody } from "@/components/letter-body";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listNotices, markNoticesRead } from "@/lib/shop";
import type { Notice, SearchParams } from "@/lib/types";

export const metadata = { title: "Notices" };

export default function NoticesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <Notices searchParams={searchParams} />
    </Suspense>
  );
}

async function Notices({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser("/notifications");
  const query = await searchParams;
  const created = query.created === "1";
  const db = getDb();
  const notices = listNotices(db, user.id);
  markNoticesRead(db, user.id);

  return (
    <Frame>
      <PageHeader kicker="donmartins" title="Notices">
        <p>
          These are the notices sent to you, including your account confirmation and each reservation. The same letters
          are in your{" "}
          <Link href="/post" className="text-foreground underline-offset-4 hover:underline">
            post office
          </Link>
          .
        </p>
      </PageHeader>
      {created ? (
        <Banner tone="good">
          Confirmation email sent to {user.email}. Subject: Account Created for AMF Saucer Shop. The letter is below,
          and the same copy is in the post office.
        </Banner>
      ) : null}
      {notices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-10">
          <p className="font-serif text-2xl">No notices yet.</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Your account confirmation and later reservation notices appear here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {notices.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </ul>
      )}
    </Frame>
  );
}

function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{formatWhen(notice.createdAt)}</p>
      <h2 className="mt-1 font-serif text-2xl">{notice.title}</h2>
      <div className="mt-3">
        <LetterBody body={notice.body} />
      </div>
    </li>
  );
}
