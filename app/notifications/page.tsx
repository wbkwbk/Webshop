import Link from "next/link";
import { Suspense } from "react";
import { Frame, PageHeader } from "@/components/frame";
import { LetterBody } from "@/components/letter-body";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { listNotices, listReservationNotices, markNoticesRead, type ReservationNotice } from "@/lib/shop";
import type { Notice } from "@/lib/types";

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
  const superuser = user.role === "admin";
  const notices = superuser ? listReservationNotices(db) : listNotices(db, user.id);
  if (!superuser) markNoticesRead(db, user.id);

  return (
    <Frame>
      <PageHeader kicker="donmartins" title="Notices">
        <p>
          {superuser
            ? "Every notice that belongs to a reservation, from every account."
            : "These are the notices sent to you, including your account confirmation and each reservation."}{" "}
          The same letters are in the{" "}
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
            {superuser
              ? "Reservation notices appear here as soon as someone pre-orders the AFM Saucer MOD."
              : "Your account confirmation and later reservation notices appear here."}
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

function NoticeCard({ notice }: { notice: Notice | ReservationNotice }) {
  const owner = "email" in notice ? notice : null;
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{formatWhen(notice.createdAt)}</p>
      {owner ? <p className="mt-1 font-bold">{owner.name} · {owner.email}</p> : null}
      <h2 className="mt-1 font-serif text-2xl">{notice.title}</h2>
      <div className="mt-3">
        <LetterBody body={notice.body} />
      </div>
    </li>
  );
}
