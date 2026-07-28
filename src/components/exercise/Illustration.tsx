/**
 * Exercise illustrations: simple stick figures with motion arrows, one shared
 * visual language across the whole library (spec §11). Drawn inline as SVG so
 * they are crisp, themeable via currentColor, and cost no network requests —
 * which matters for a beginner who wants the picture visible while training.
 *
 * Each illustration is keyed by `svgKey` on the exercise record.
 */

const FIG = {
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

const ARROW = {
  stroke: "var(--accent)",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      role="img"
      aria-label={label}
      className="h-full w-full text-muted"
    >
      <defs>
        <marker id="uruz-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

const Head = ({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) => (
  <circle cx={cx} cy={cy} r={r} {...FIG} />
);

/** Leg press: seated, pushing a plate away with the legs. */
function Benpres() {
  return (
    <Frame label="Benpres">
      <path d="M18 70 L18 40" {...FIG} />
      <Head cx={26} cy={34} />
      <path d="M26 41 L30 60 L22 72" {...FIG} />
      <path d="M30 60 L52 62 L74 52" {...FIG} />
      <path d="M30 52 L50 48" {...FIG} />
      <rect x="78" y="34" width="8" height="38" rx="2" {...FIG} />
      <path d="M92 46 L106 46" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Chest press: seated, pressing handles forward. */
function Brystpres() {
  return (
    <Frame label="Brystpres">
      <path d="M30 78 L30 44" {...FIG} />
      <Head cx={38} cy={36} />
      <path d="M38 43 L38 66 L30 78" {...FIG} />
      <path d="M38 50 L58 50" {...FIG} />
      <rect x="62" y="38" width="7" height="26" rx="2" {...FIG} />
      <path d="M76 50 L92 50" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Seated cable row: pulling a handle toward the stomach. */
function Roning() {
  return (
    <Frame label="Siddende roning">
      <path d="M26 76 L34 52" {...FIG} />
      <Head cx={36} cy={44} />
      <path d="M34 52 L58 62 L74 60" {...FIG} />
      <path d="M36 54 L62 54" {...FIG} />
      <rect x="80" y="44" width="6" height="20" rx="2" {...FIG} />
      <path d="M74 54 L80 54" {...FIG} />
      <path d="M66 32 L44 32" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Lat pulldown: pulling a bar down toward the chest. */
function Nedtraek() {
  return (
    <Frame label="Nedtræk">
      <path d="M40 40 L40 22" {...FIG} />
      <path d="M28 22 L52 22" {...FIG} />
      <Head cx={40} cy={48} />
      <path d="M40 55 L40 76" {...FIG} />
      <path d="M40 58 L28 44 M40 58 L52 44" {...FIG} />
      <path d="M40 76 L30 88 M40 76 L50 88" {...FIG} />
      <path d="M74 30 L74 54" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Shoulder press: pressing handles overhead. */
function Skulderpres() {
  return (
    <Frame label="Skulderpres">
      <Head cx={44} cy={50} />
      <path d="M44 57 L44 80" {...FIG} />
      <path d="M44 60 L30 46 M44 60 L58 46" {...FIG} />
      <path d="M24 40 L36 40 M52 40 L64 40" {...FIG} />
      <path d="M44 80 L34 92 M44 80 L54 92" {...FIG} />
      <path d="M84 44 L84 24" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Leg curl: lying, curling heels toward the seat. */
function LegCurl() {
  return (
    <Frame label="Baglårsbøj">
      <Head cx={24} cy={46} />
      <path d="M31 48 L64 52" {...FIG} />
      <path d="M64 52 L82 56 L84 74" {...FIG} />
      <path d="M31 52 L52 58" {...FIG} />
      <path d="M96 74 A16 16 0 0 0 92 56" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Plank: forearms and toes, body in one straight line. */
function Planke() {
  return (
    <Frame label="Planke">
      <Head cx={26} cy={50} />
      <path d="M33 54 L86 66" {...FIG} />
      <path d="M34 56 L32 72 L46 72" {...FIG} />
      <path d="M86 66 L92 84" {...FIG} />
      <path d="M24 34 L88 46" stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 4" fill="none" />
    </Frame>
  );
}

/** Goblet squat: holding a weight at the chest, squatting down. */
function Squat() {
  return (
    <Frame label="Squat">
      <Head cx={52} cy={30} />
      <path d="M52 37 L52 58" {...FIG} />
      <path d="M52 42 L40 50 M52 42 L64 50" {...FIG} />
      <rect x="44" y="46" width="14" height="10" rx="2" {...FIG} />
      <path d="M52 58 L38 70 L38 86" {...FIG} />
      <path d="M52 58 L66 70 L66 86" {...FIG} />
      <path d="M88 40 L88 72" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Romanian deadlift: hinging at the hips, weight along the legs. */
function RDL() {
  return (
    <Frame label="Rumænsk markløft">
      <Head cx={34} cy={36} />
      <path d="M40 40 L66 48" {...FIG} />
      <path d="M66 48 L70 86" {...FIG} />
      <path d="M48 44 L46 66" {...FIG} />
      <rect x="38" y="66" width="18" height="7" rx="2" {...FIG} />
      <path d="M92 46 A20 20 0 0 1 92 78" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Biceps curl: elbow flexion with a dumbbell. */
function Curl() {
  return (
    <Frame label="Biceps curl">
      <Head cx={52} cy={28} />
      <path d="M52 35 L52 74" {...FIG} />
      <path d="M52 74 L42 90 M52 74 L62 90" {...FIG} />
      <path d="M52 42 L40 58 L48 46" {...FIG} />
      <rect x="40" y="42" width="14" height="7" rx="2" {...FIG} />
      <path d="M78 62 A18 18 0 0 0 78 38" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Triceps pushdown: pressing a cable bar down. */
function Pushdown() {
  return (
    <Frame label="Triceps pushdown">
      <Head cx={48} cy={28} />
      <path d="M48 35 L48 74" {...FIG} />
      <path d="M48 74 L38 90 M48 74 L58 90" {...FIG} />
      <path d="M48 44 L44 58" {...FIG} />
      <rect x="34" y="58" width="20" height="6" rx="2" {...FIG} />
      <path d="M80 40 L80 68" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Crunch: lying, curling the torso up. */
function Crunch() {
  return (
    <Frame label="Mavehævninger">
      <path d="M30 76 L84 76" {...FIG} />
      <Head cx={34} cy={58} />
      <path d="M40 62 L58 70 L70 58 L70 76" {...FIG} />
      <path d="M42 44 A20 20 0 0 1 62 50" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Rowing machine. */
function RowMachine() {
  return (
    <Frame label="Romaskine">
      <path d="M20 80 L100 80" {...FIG} />
      <Head cx={44} cy={44} />
      <path d="M44 51 L48 66" {...FIG} />
      <path d="M48 66 L72 70 L78 62" {...FIG} />
      <path d="M46 54 L70 58" {...FIG} />
      <path d="M84 44 L60 44" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

/** Stationary bike. */
function Bike() {
  return (
    <Frame label="Kondicykel">
      <circle cx="36" cy="74" r="14" {...FIG} />
      <circle cx="84" cy="74" r="14" {...FIG} />
      <path d="M36 74 L58 74 L72 46 L84 74" {...FIG} />
      <path d="M62 46 L82 46" {...FIG} />
      <Head cx={62} cy={34} />
      <path d="M22 58 A16 16 0 0 1 44 54" {...ARROW} markerEnd="url(#uruz-arrow)" />
    </Frame>
  );
}

const REGISTRY: Record<string, () => React.JSX.Element> = {
  benpres: Benpres,
  brystpres: Brystpres,
  roning: Roning,
  nedtraek: Nedtraek,
  skulderpres: Skulderpres,
  legcurl: LegCurl,
  planke: Planke,
  squat: Squat,
  rdl: RDL,
  curl: Curl,
  pushdown: Pushdown,
  crunch: Crunch,
  "row-machine": RowMachine,
  bike: Bike,
};

/** Generic fallback so a new exercise without art still renders something. */
function Fallback() {
  return (
    <Frame label="Øvelse">
      <Head cx={60} cy={34} />
      <path d="M60 41 L60 66" {...FIG} />
      <path d="M60 46 L46 58 M60 46 L74 58" {...FIG} />
      <path d="M60 66 L48 84 M60 66 L72 84" {...FIG} />
    </Frame>
  );
}

export function ExerciseIllustration({
  svgKey,
  className,
}: {
  svgKey: string | null;
  className?: string;
}) {
  const Component = (svgKey && REGISTRY[svgKey]) || Fallback;
  return (
    <div className={className}>
      <Component />
    </div>
  );
}

export const hasIllustration = (key: string | null): boolean => !!key && key in REGISTRY;
