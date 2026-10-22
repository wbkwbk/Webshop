import Link from "next/link";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { LetterBody } from "@/components/letter-body";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listNotices, markNoticesRead } from "@/lib/shop";

export const metadata = { title: "Notices" };

export default function NoticesPage() {
  return (
    <Suspense fallback={null}>
      <Notices />
    </Suspense>
  );
}

async function Notices() {
  const user = await requireUser("/notifications");
  const db = getDb();
  const notices = listNotices(db, user.id);
  markNoticesRead(db, user.id);

  return (
    <Frame>
      <PageHeader kicker="In the workshop" title="Notices">
        <p>
          When 100 pieces are reserved, everyone who reserved gets a notice to pay. The same letter is in the{" "}
          <Link href="/post" className="text-foreground underline-offset-4 hover:underline">
            post office
          </Link>
          .
        </p>
      </PageHeader>
      {notices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-10">
          <p className="font-serif text-2xl">No notices yet.</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Reserve the AFM Saucer Mod. The request to pay appears here once 100 are reserved.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {notices.map((notice) => (
            <li key={notice.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{formatWhen(notice.createdAt)}</p>
              <h2 className="mt-1 font-serif text-2xl">{notice.title}</h2>
              <div className="mt-3">
                <LetterBody body={notice.body} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}
