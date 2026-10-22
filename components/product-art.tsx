const washes: Record<string, string> = {
  "afm-saucer-mod": "#e4ddd2",
  "heavy-linen-apron": "#e7d7c8",
  "stoneware-bowl": "#e4ddd2",
  "oak-serving-board": "#e6d3b4",
  "merino-throw": "#ddd6cc",
  "enamel-kettle": "#e7e0d4",
  "beeswax-candles": "#efe2c4",
};

export function ProductArt({ slug, name }: { slug: string; name: string }) {
  const wash = washes[slug] ?? "#e7e1d4";
  return (
    <svg viewBox="0 0 320 240" aria-hidden="true" className="h-full w-full">
      <title>{name}</title>
      <rect width="320" height="240" fill={wash} />
      <g fill="none" stroke="#1c1915" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {slug === "afm-saucer-mod" ? <Saucer /> : null}
        {slug === "heavy-linen-apron" ? <Apron /> : null}
        {slug === "stoneware-bowl" ? <Bowl /> : null}
        {slug === "oak-serving-board" ? <Board /> : null}
        {slug === "merino-throw" ? <Throw /> : null}
        {slug === "enamel-kettle" ? <Kettle /> : null}
        {slug === "beeswax-candles" ? <Candles /> : null}
      </g>
    </svg>
  );
}

function Saucer() {
  return (
    <>
      <ellipse cx="160" cy="132" rx="112" ry="26" fill="#f7f4ec" />
      <ellipse cx="160" cy="132" rx="112" ry="26" />
      <path d="M48 132c18 28 206 28 224 0" />
      <ellipse cx="160" cy="118" rx="42" ry="14" fill="#efe4cf" />
      <path d="M160 86v22" />
      <circle cx="160" cy="80" r="5" fill="#1c1915" stroke="none" />
      <path d="M118 118h84" />
    </>
  );
}

function Apron() {
  return (
    <>
      <path d="M118 48h84l18 146H100L118 48z" fill="#f4efe6" />
      <path d="M132 48c8 28 48 28 56 0" />
      <path d="M128 78c-22 8-36 28-28 52" />
      <path d="M192 78c22 8 36 28 28 52" />
      <path d="M146 150h28" />
    </>
  );
}

function Bowl() {
  return (
    <>
      <ellipse cx="160" cy="132" rx="78" ry="28" fill="#f7f4ec" />
      <path d="M82 132c8 42 148 42 156 0" fill="#f3efe6" />
      <path d="M108 128c6 8 18 8 22-2" />
      <circle cx="188" cy="124" r="2" fill="#1c1915" stroke="none" />
      <circle cx="150" cy="118" r="1.4" fill="#1c1915" stroke="none" />
      <circle cx="170" cy="140" r="1.6" fill="#1c1915" stroke="none" />
    </>
  );
}

function Board() {
  return (
    <>
      <rect x="58" y="58" width="204" height="124" rx="18" fill="#c9854a" />
      <rect x="74" y="74" width="172" height="92" rx="10" />
      <circle cx="78" cy="78" r="3" fill="#1c1915" stroke="none" />
    </>
  );
}

function Throw() {
  return (
    <>
      <path d="M70 78h150l28 86H92L70 78z" fill="#f7f4ec" />
      <path d="M96 78h150l-20 86H84L96 78z" fill="#efe8dc" />
      <path d="M118 96h92" />
      <path d="M112 116h100" />
      <path d="M108 136h96" />
    </>
  );
}

function Kettle() {
  return (
    <>
      <path d="M118 92h84a46 46 0 0 1 0 92h-84a46 46 0 0 1 0-92z" fill="#f7f4ec" />
      <path d="M196 118c28 4 36 22 22 36" />
      <path d="M112 128c-26 2-34 24-16 36" />
      <path d="M146 78h28v18" />
      <path d="M138 78h44" />
      <path d="M128 168h64" stroke="#1c1915" />
    </>
  );
}

function Candles() {
  return (
    <>
      <rect x="92" y="96" width="22" height="84" fill="#f3d27a" />
      <rect x="128" y="72" width="22" height="108" fill="#e8c15a" />
      <rect x="164" y="88" width="22" height="92" fill="#f3d27a" />
      <rect x="200" y="108" width="22" height="72" fill="#e8c15a" />
      <path d="M139 72c0-14 10-14 10 0" />
      <path d="M103 96c0-12 8-12 8 0" />
      <path d="M175 88c0-12 8-12 8 0" />
      <path d="M211 108c0-12 8-12 8 0" />
      <path d="M78 180h164" />
    </>
  );
}
