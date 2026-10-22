import Link from "next/link";

export function LetterBody({ body }: { body: string }) {
  return (
    <div className="grid gap-2 text-sm leading-6 whitespace-pre-wrap">
      {body.split("\n").map((line, index) => {
        if (!line.trim()) return <div key={index} className="h-2" />;
        if (line.startsWith("Link: ")) {
          const href = line.slice(6).trim();
          if (href.startsWith("/")) {
            return (
              <Link key={index} href={href} className="font-medium text-primary underline-offset-4 hover:underline">
                Open this page
              </Link>
            );
          }
        }
        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
