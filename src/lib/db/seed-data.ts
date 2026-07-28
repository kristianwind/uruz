import type {
  Difficulty,
  Equipment,
  ExerciseCategory,
  ProgressionMode,
  Unit,
  WorkoutGoal,
} from "@/lib/domain/types";

/**
 * Seed content for Uruz: the exercise library, workout templates, and badges.
 *
 * Exercises are DATA, not code (spec §4/§5) so the library can grow without
 * deploys. Content is Danish; the seven core exercises reproduce Kristian &
 * Ib's actual start program (spec §15). `svgKey` points at a stick-figure
 * illustration in `@/components/exercise/illustrations`.
 */

export interface SeedExercise {
  slug: string;
  nameDa: string;
  nameEn: string;
  category: ExerciseCategory;
  primaryMuscles: string[];
  equipment: Equipment;
  unit: Unit;
  isBodyweight: boolean;
  instructionsSteps: string[];
  instructionsStepsEn: string[];
  cues: string[];
  cuesEn: string[];
  saferVariant: string | null;
  saferVariantEn: string | null;
  svgKey: string;
  difficulty: Difficulty;
}

export const SEED_EXERCISES: SeedExercise[] = [
  {
    slug: "benpres",
    nameDa: "Benpres (maskine)",
    nameEn: "Leg press (machine)",
    category: "ben",
    primaryMuscles: ["forlaar", "balder", "baglaar"],
    equipment: "maskine",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Sæt dig godt tilbage i sædet med hele ryggen støttet.",
      "Placér fødderne skulderbredt midt på pladen.",
      "Skub pladen roligt væk til benene er næsten strakte — lås ikke knæene.",
      "Sænk kontrolleret tilbage til knæene er ca. 90 grader.",
    ],
    instructionsStepsEn: [
      "Sit well back in the seat with your whole back supported.",
      "Place your feet shoulder-width apart in the middle of the plate.",
      "Push the plate away calmly until your legs are almost straight — don't lock your knees.",
      "Lower under control until your knees are at about 90 degrees.",
    ],
    cues: ["Hælene i pladen", "Knæ følger tæernes retning", "Rolig kontrol ned"],
    cuesEn: [
      "Heels into the plate",
      "Knees track over your toes",
      "Slow and controlled on the way down",
    ],
    saferVariant: "Kortere bevægebane og lavere vægt hvis knæene generer.",
    saferVariantEn: "Shorter range of motion and lighter weight if your knees complain.",
    svgKey: "benpres",
    difficulty: "begynder",
  },
  {
    slug: "brystpres",
    nameDa: "Brystpres (maskine)",
    nameEn: "Chest press (machine)",
    category: "pres",
    primaryMuscles: ["bryst", "skuldre", "triceps"],
    equipment: "maskine",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Justér sædet så håndtagene er i højde med midten af brystet.",
      "Hold skuldrene nede og bagud mod ryglænet.",
      "Skub håndtagene frem til armene er næsten strakte.",
      "Før roligt tilbage til du mærker et let stræk over brystet.",
    ],
    instructionsStepsEn: [
      "Adjust the seat so the handles are level with the middle of your chest.",
      "Keep your shoulders down and back against the backrest.",
      "Push the handles forward until your arms are almost straight.",
      "Return calmly until you feel a light stretch across the chest.",
    ],
    cues: ["Skulderblade samlet", "Pust ud når du presser", "Ingen låste albuer"],
    cuesEn: [
      "Shoulder blades together",
      "Breathe out as you press",
      "No locked elbows",
    ],
    saferVariant: "Reducér vægt og bevægebane hvis skulderen gør ondt.",
    saferVariantEn: "Reduce the weight and range of motion if your shoulder hurts.",
    svgKey: "brystpres",
    difficulty: "begynder",
  },
  {
    slug: "siddende-roning",
    nameDa: "Siddende roning (kabel)",
    nameEn: "Seated row (cable)",
    category: "traek",
    primaryMuscles: ["ryg", "biceps", "skuldre"],
    equipment: "kabel",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Sæt dig med let bøjede knæ og ret ryg.",
      "Grib håndtaget og træk skulderbladene sammen.",
      "Træk håndtaget ind mod maven, albuerne tæt på kroppen.",
      "Før roligt frem igen med kontrol — undgå at runde ryggen.",
    ],
    instructionsStepsEn: [
      "Sit with slightly bent knees and a straight back.",
      "Grab the handle and draw your shoulder blades together.",
      "Pull the handle in toward your stomach, elbows close to your body.",
      "Return forward under control — avoid rounding your back.",
    ],
    cues: ["Træk med albuerne", "Bryst frem", "Ret ryg hele vejen"],
    cuesEn: [
      "Pull with your elbows",
      "Chest forward",
      "Straight back throughout",
    ],
    saferVariant: "Let vægt og fokus på teknik hvis lænden er øm.",
    saferVariantEn: "Light weight and a focus on technique if your lower back is sore.",
    svgKey: "roning",
    difficulty: "begynder",
  },
  {
    slug: "nedtraek",
    nameDa: "Nedtræk / lat pulldown",
    nameEn: "Lat pulldown",
    category: "traek",
    primaryMuscles: ["ryg", "biceps"],
    equipment: "kabel",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Grib stangen lidt bredere end skulderbredde.",
      "Sæt lårene fast under puderne.",
      "Træk stangen ned mod øvre bryst mens du fører albuerne ned.",
      "Før roligt op igen til armene er strakte.",
    ],
    instructionsStepsEn: [
      "Grip the bar slightly wider than shoulder-width.",
      "Lock your thighs under the pads.",
      "Pull the bar down toward your upper chest as you drive your elbows down.",
      "Return calmly until your arms are straight.",
    ],
    cues: ["Albuer ned og tilbage", "Bryst op mod stangen", "Ingen gynge i kroppen"],
    cuesEn: [
      "Elbows down and back",
      "Chest up toward the bar",
      "No swinging",
    ],
    saferVariant: "Brug lettere vægt og assisteret variant ved skulderbesvær.",
    saferVariantEn: "Use a lighter weight or an assisted variation if your shoulders bother you.",
    svgKey: "nedtraek",
    difficulty: "begynder",
  },
  {
    slug: "skulderpres",
    nameDa: "Skulderpres (maskine)",
    nameEn: "Shoulder press (machine)",
    category: "pres",
    primaryMuscles: ["skuldre", "triceps"],
    equipment: "maskine",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Justér sædet så håndtagene starter ved skulderhøjde.",
      "Hold ryggen mod ryglænet og maven let spændt.",
      "Pres håndtagene op til armene er næsten strakte.",
      "Sænk roligt tilbage til skulderhøjde.",
    ],
    instructionsStepsEn: [
      "Adjust the seat so the handles start at shoulder height.",
      "Keep your back against the backrest and your core lightly braced.",
      "Press the handles up until your arms are almost straight.",
      "Lower calmly back to shoulder height.",
    ],
    cues: ["Spænd maven", "Pres lige op", "Undgå at låse albuerne"],
    cuesEn: [
      "Brace your core",
      "Press straight up",
      "Avoid locking your elbows",
    ],
    saferVariant: "Neutralt greb og lav vægt hvis skulderen er sart.",
    saferVariantEn: "Neutral grip and low weight if your shoulder is sensitive.",
    svgKey: "skulderpres",
    difficulty: "begynder",
  },
  {
    slug: "leg-curl",
    nameDa: "Baglårsbøj / leg curl (maskine)",
    nameEn: "Leg curl (machine)",
    category: "ben",
    primaryMuscles: ["baglaar"],
    equipment: "maskine",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Placér dig så knæene flugter med maskinens omdrejningspunkt.",
      "Læg anklerne over puden.",
      "Bøj benene og træk hælene mod bagdelen.",
      "Sænk roligt tilbage med kontrol.",
    ],
    instructionsStepsEn: [
      "Position yourself so your knees line up with the machine's pivot.",
      "Place your ankles over the pad.",
      "Bend your legs and pull your heels toward your seat.",
      "Lower back calmly under control.",
    ],
    cues: ["Rolig excentrisk fase", "Hoften bliver i sædet", "Fuld bevægebane"],
    cuesEn: [
      "Slow on the lowering phase",
      "Hips stay in the seat",
      "Full range of motion",
    ],
    saferVariant: "Mindre bevægebane hvis baglåret krammer.",
    saferVariantEn: "Reduce the range of motion if your hamstring cramps.",
    svgKey: "legcurl",
    difficulty: "begynder",
  },
  {
    slug: "planke",
    nameDa: "Planke",
    nameEn: "Plank",
    category: "kerne",
    primaryMuscles: ["mave", "kerne"],
    equipment: "kropsvaegt",
    unit: "sek",
    isBodyweight: true,
    instructionsSteps: [
      "Støt på underarme og tæer.",
      "Hold kroppen som en lige linje fra hoved til hæl.",
      "Spænd mave og balder, træk navlen let ind.",
      "Hold positionen og træk vejret roligt.",
    ],
    instructionsStepsEn: [
      "Support yourself on your forearms and toes.",
      "Hold your body in a straight line from head to heel.",
      "Brace your abs and glutes, drawing your navel in slightly.",
      "Hold the position and breathe calmly.",
    ],
    cues: ["Lige linje — ingen sænket hofte", "Spænd balderne", "Se ned i gulvet"],
    cuesEn: [
      "Straight line — no sagging hips",
      "Squeeze your glutes",
      "Look down at the floor",
    ],
    saferVariant: "Planke på knæene hvis lænden synker.",
    saferVariantEn: "Plank from your knees if your lower back sags.",
    svgKey: "planke",
    difficulty: "begynder",
  },
  // ---- Broader library (spec §15: "gør biblioteket rigt fra start") ----
  {
    slug: "goblet-squat",
    nameDa: "Goblet squat (håndvægt)",
    nameEn: "Goblet squat (dumbbell)",
    category: "ben",
    primaryMuscles: ["forlaar", "balder"],
    equipment: "haandvaegt",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Hold én håndvægt lodret ind mod brystet.",
      "Stå skulderbredt med tæerne let udad.",
      "Sæt dig ned i knæ og hofte til lårene er vandrette.",
      "Rejs dig igen ved at skubbe fra hælene.",
    ],
    instructionsStepsEn: [
      "Hold one dumbbell vertically against your chest.",
      "Stand shoulder-width apart with toes turned slightly out.",
      "Sit down through knees and hips until your thighs are horizontal.",
      "Stand back up by pushing through your heels.",
    ],
    cues: ["Albuer inde ved kroppen", "Bryst op", "Knæ ud over tæer"],
    cuesEn: [
      "Elbows tucked in",
      "Chest up",
      "Knees out over your toes",
    ],
    saferVariant: "Squat til en bænk hvis dybden er svær.",
    saferVariantEn: "Squat down to a bench if the depth is difficult.",
    svgKey: "squat",
    difficulty: "erfaren",
  },
  {
    slug: "rumaensk-markloeft-maskine",
    nameDa: "Rumænsk markløft (maskine)",
    nameEn: "Romanian deadlift (machine)",
    category: "ben",
    primaryMuscles: ["baglaar", "balder", "ryg"],
    equipment: "maskine",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Stå med let bøjede knæ og ret ryg.",
      "Før hoften bagud og sænk vægten langs benene.",
      "Stop når du mærker stræk i baglåret.",
      "Pres hoften frem og rejs dig igen.",
    ],
    instructionsStepsEn: [
      "Stand with slightly bent knees and a straight back.",
      "Push your hips back and lower the weight along your legs.",
      "Stop when you feel a stretch in your hamstrings.",
      "Drive your hips forward and stand back up.",
    ],
    cues: ["Hoften bagud", "Ret ryg", "Vægten tæt på kroppen"],
    cuesEn: [
      "Hips back",
      "Straight back",
      "Keep the weight close to your body",
    ],
    saferVariant: "Kortere bevægebane ved lændegener.",
    saferVariantEn: "Shorter range of motion if your lower back complains.",
    svgKey: "rdl",
    difficulty: "erfaren",
  },
  {
    slug: "biceps-curl",
    nameDa: "Biceps curl (håndvægt)",
    nameEn: "Biceps curl (dumbbell)",
    category: "traek",
    primaryMuscles: ["biceps"],
    equipment: "haandvaegt",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Stå med en håndvægt i hver hånd, armene langs siden.",
      "Bøj albuerne og løft vægtene mod skuldrene.",
      "Hold albuerne tæt på kroppen.",
      "Sænk roligt tilbage til strakte arme.",
    ],
    instructionsStepsEn: [
      "Stand with a dumbbell in each hand, arms at your sides.",
      "Bend your elbows and lift the weights toward your shoulders.",
      "Keep your elbows close to your body.",
      "Lower calmly back to straight arms.",
    ],
    cues: ["Albuer i ro", "Ingen sving i kroppen", "Fuld kontrol ned"],
    cuesEn: [
      "Elbows still",
      "No swinging the body",
      "Full control on the way down",
    ],
    saferVariant: "Lettere vægt hvis albuen generer.",
    saferVariantEn: "Lighter weight if your elbow bothers you.",
    svgKey: "curl",
    difficulty: "begynder",
  },
  {
    slug: "triceps-pushdown",
    nameDa: "Triceps pushdown (kabel)",
    nameEn: "Triceps pushdown (cable)",
    category: "pres",
    primaryMuscles: ["triceps"],
    equipment: "kabel",
    unit: "kg",
    isBodyweight: false,
    instructionsSteps: [
      "Grib stangen i skulderbredde ved en høj kabel.",
      "Hold albuerne tæt ind til kroppen.",
      "Pres stangen ned til armene er strakte.",
      "Før roligt op igen uden at albuerne vandrer.",
    ],
    instructionsStepsEn: [
      "Grip the bar at shoulder-width on a high cable.",
      "Keep your elbows tight to your body.",
      "Press the bar down until your arms are straight.",
      "Return calmly without letting your elbows drift.",
    ],
    cues: ["Albuer låst ved siden", "Stræk helt ud", "Rolig retur"],
    cuesEn: [
      "Elbows locked at your sides",
      "Extend fully",
      "Slow return",
    ],
    saferVariant: "Reb i stedet for stang ved albuegener.",
    saferVariantEn: "Use a rope instead of a bar if your elbows bother you.",
    svgKey: "pushdown",
    difficulty: "begynder",
  },
  {
    slug: "mavehaevninger",
    nameDa: "Mavehævninger (crunch)",
    nameEn: "Crunches",
    category: "kerne",
    primaryMuscles: ["mave"],
    equipment: "kropsvaegt",
    unit: "reps",
    isBodyweight: true,
    instructionsSteps: [
      "Lig på ryggen med bøjede knæ.",
      "Læg hænderne ved tindingerne eller over brystet.",
      "Krøl overkroppen op mod knæene.",
      "Sænk roligt tilbage uden at slippe spændingen.",
    ],
    instructionsStepsEn: [
      "Lie on your back with your knees bent.",
      "Place your hands at your temples or across your chest.",
      "Curl your upper body up toward your knees.",
      "Lower calmly without releasing the tension.",
    ],
    cues: ["Hagen fra brystet", "Rolig kontrol", "Træk navlen ind"],
    cuesEn: [
      "Chin off your chest",
      "Slow and controlled",
      "Draw your navel in",
    ],
    saferVariant: "Mindre bevægebane ved nakkegener.",
    saferVariantEn: "Reduce the range of motion if your neck bothers you.",
    svgKey: "crunch",
    difficulty: "begynder",
  },
  {
    slug: "kondi-romaskine",
    nameDa: "Romaskine (kondi)",
    nameEn: "Rowing machine (cardio)",
    category: "kondi",
    primaryMuscles: ["ryg", "ben", "kondi"],
    equipment: "maskine",
    unit: "km",
    isBodyweight: false,
    instructionsSteps: [
      "Sæt fødderne fast i remmene.",
      "Skub fra med benene først.",
      "Træk håndtaget ind mod maven til sidst.",
      "Vend bevægelsen roligt: arme, derefter ben.",
    ],
    instructionsStepsEn: [
      "Strap your feet in securely.",
      "Drive with your legs first.",
      "Pull the handle in toward your stomach last.",
      "Reverse the movement calmly: arms, then legs.",
    ],
    cues: ["Ben — krop — arme", "Ret ryg", "Rolig rytme"],
    cuesEn: [
      "Legs — body — arms",
      "Straight back",
      "Calm rhythm",
    ],
    saferVariant: "Lavere modstand og tempo ved lændegener.",
    saferVariantEn: "Lower resistance and pace if your lower back bothers you.",
    svgKey: "row-machine",
    difficulty: "begynder",
  },
  {
    slug: "kondi-kondicykel",
    nameDa: "Kondicykel (kondi)",
    nameEn: "Stationary bike (cardio)",
    category: "kondi",
    primaryMuscles: ["ben", "kondi"],
    equipment: "maskine",
    unit: "km",
    isBodyweight: false,
    instructionsSteps: [
      "Justér sadelhøjden så knæet er let bøjet i bunden.",
      "Vælg en modstand du kan holde jævnt.",
      "Træd i en rolig, stabil rytme.",
      "Hold en oprejst, afslappet overkrop.",
    ],
    instructionsStepsEn: [
      "Adjust the saddle height so your knee is slightly bent at the bottom.",
      "Pick a resistance you can hold steadily.",
      "Pedal at a calm, stable rhythm.",
      "Keep your upper body upright and relaxed.",
    ],
    cues: ["Jævn kadence", "Skuldre afslappede", "Træk vejret roligt"],
    cuesEn: [
      "Steady cadence",
      "Relaxed shoulders",
      "Breathe calmly",
    ],
    saferVariant: "Lavere modstand ved knægener.",
    saferVariantEn: "Lower the resistance if your knees bother you.",
    svgKey: "bike",
    difficulty: "begynder",
  },
];

// ---- Workout templates ---------------------------------------------------

export interface SeedTemplateExercise {
  slug: string;
  targetSets: number;
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetSeconds?: number;
  restSeconds: number;
  progressionMode?: ProgressionMode;
}

export interface SeedTemplate {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  goal: WorkoutGoal;
  level: Difficulty;
  estimatedMinutes: number;
  exercises: SeedTemplateExercise[];
}

const R = (sets: number, min: number, max: number, rest = 90): SeedTemplateExercise => ({
  slug: "",
  targetSets: sets,
  targetRepsMin: min,
  targetRepsMax: max,
  restSeconds: rest,
});
const withSlug = (slug: string, base: SeedTemplateExercise): SeedTemplateExercise => ({
  ...base,
  slug,
});

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    name: "Startprogram – Helkrop",
    nameEn: "Starter Programme – Full Body",
    description: "Kristian & Ibs syv-øvelsers startprogram. Hele kroppen, roligt tempo.",
    descriptionEn: "Kristian & Ib's seven-exercise starter programme. Whole body, calm pace.",
    goal: "helkrop",
    level: "begynder",
    estimatedMinutes: 50,
    exercises: [
      withSlug("benpres", R(3, 10, 12)),
      withSlug("brystpres", R(3, 10, 12)),
      withSlug("siddende-roning", R(3, 10, 12)),
      withSlug("nedtraek", R(3, 10, 12)),
      withSlug("skulderpres", R(3, 10, 12)),
      withSlug("leg-curl", R(3, 10, 12)),
      { slug: "planke", targetSets: 3, targetSeconds: 30, restSeconds: 45 },
    ],
  },
  {
    name: "Helkrop A",
    nameEn: "Full Body A",
    description: "Variant A i et A/B-split. Fokus på pres og forben.",
    descriptionEn: "Variant A of an A/B split. Focus on pushing and quads.",
    goal: "helkrop",
    level: "begynder",
    estimatedMinutes: 45,
    exercises: [
      withSlug("benpres", R(3, 10, 12)),
      withSlug("brystpres", R(3, 10, 12)),
      withSlug("nedtraek", R(3, 10, 12)),
      withSlug("skulderpres", R(3, 10, 12)),
      { slug: "planke", targetSets: 3, targetSeconds: 30, restSeconds: 45 },
    ],
  },
  {
    name: "Helkrop B",
    nameEn: "Full Body B",
    description: "Variant B i et A/B-split. Fokus på træk og baglår.",
    descriptionEn: "Variant B of an A/B split. Focus on pulling and hamstrings.",
    goal: "helkrop",
    level: "begynder",
    estimatedMinutes: 45,
    exercises: [
      withSlug("leg-curl", R(3, 10, 12)),
      withSlug("siddende-roning", R(3, 10, 12)),
      withSlug("goblet-squat", R(3, 8, 12)),
      withSlug("biceps-curl", R(3, 10, 15)),
      withSlug("triceps-pushdown", R(3, 10, 15)),
    ],
  },
  {
    name: "Kort 20-min",
    nameEn: "Short 20-min",
    description: "Presset tid? Fire øvelser, ind og ud på 20 minutter.",
    descriptionEn: "Short on time? Four exercises, in and out in 20 minutes.",
    goal: "helkrop",
    level: "begynder",
    estimatedMinutes: 20,
    exercises: [
      withSlug("benpres", R(2, 10, 12, 60)),
      withSlug("brystpres", R(2, 10, 12, 60)),
      withSlug("siddende-roning", R(2, 10, 12, 60)),
      { slug: "planke", targetSets: 2, targetSeconds: 30, restSeconds: 45 },
    ],
  },
  {
    name: "Kun overkrop",
    nameEn: "Upper Body Only",
    description: "Overkropsdag: bryst, ryg, skuldre og arme.",
    descriptionEn: "Upper body day: chest, back, shoulders and arms.",
    goal: "split",
    level: "begynder",
    estimatedMinutes: 45,
    exercises: [
      withSlug("brystpres", R(3, 10, 12)),
      withSlug("nedtraek", R(3, 10, 12)),
      withSlug("skulderpres", R(3, 10, 12)),
      withSlug("siddende-roning", R(3, 10, 12)),
      withSlug("biceps-curl", R(2, 10, 15, 60)),
      withSlug("triceps-pushdown", R(2, 10, 15, 60)),
    ],
  },
  {
    name: "Kun ben",
    nameEn: "Legs Only",
    description: "Bendag: forben, baglår og balder.",
    descriptionEn: "Leg day: quads, hamstrings and glutes.",
    goal: "split",
    level: "begynder",
    estimatedMinutes: 40,
    exercises: [
      withSlug("benpres", R(3, 10, 12)),
      withSlug("leg-curl", R(3, 10, 12)),
      withSlug("goblet-squat", R(3, 8, 12)),
      withSlug("rumaensk-markloeft-maskine", R(3, 10, 12)),
    ],
  },
  {
    name: "Kondi + kerne",
    nameEn: "Cardio + Core",
    description: "Rolig kondition og en stærk mave. God aktiv restitution.",
    descriptionEn: "Easy cardio and a strong core. Good active recovery.",
    goal: "kondi",
    level: "begynder",
    estimatedMinutes: 30,
    exercises: [
      { slug: "kondi-romaskine", targetSets: 1, restSeconds: 60, progressionMode: "none" },
      { slug: "planke", targetSets: 3, targetSeconds: 30, restSeconds: 45 },
      withSlug("mavehaevninger", R(3, 12, 20, 45)),
    ],
  },
];

// ---- Badges (runes) ------------------------------------------------------

export interface SeedBadge {
  slug: string;
  name: string;
  description: string;
  runeSymbol: string;
  tier: "bronze" | "soelv" | "guld";
  criteriaJson: Record<string, unknown>;
}

export const SEED_BADGES: SeedBadge[] = [
  { slug: "foerste-traening", name: "Første skridt", description: "Din allerførste træning er logget.", runeSymbol: "ᚠ", tier: "bronze", criteriaJson: { type: "sessions", count: 1 } },
  { slug: "ti-traeninger", name: "Ti gange rejst", description: "10 træninger gennemført.", runeSymbol: "ᚦ", tier: "bronze", criteriaJson: { type: "sessions", count: 10 } },
  { slug: "halvtreds-traeninger", name: "Hærdet", description: "50 træninger gennemført.", runeSymbol: "ᚨ", tier: "soelv", criteriaJson: { type: "sessions", count: 50 } },
  { slug: "hundrede-traeninger", name: "Hundrede vintre", description: "100 træninger gennemført.", runeSymbol: "ᚱ", tier: "guld", criteriaJson: { type: "sessions", count: 100 } },
  { slug: "foerste-pr", name: "Første rekord", description: "Du har slået din første personlige rekord.", runeSymbol: "ᚲ", tier: "bronze", criteriaJson: { type: "pr", count: 1 } },
  { slug: "fem-ugers-stime", name: "Ubrudt stime", description: "5 uger i træk med træning.", runeSymbol: "ᚷ", tier: "soelv", criteriaJson: { type: "week_streak", count: 5 } },
  { slug: "tidlig-fugl", name: "Før ravnene", description: "Trænede før kl. 7 om morgenen.", runeSymbol: "ᚹ", tier: "bronze", criteriaJson: { type: "before_hour", hour: 7 } },
  { slug: "hele-biblioteket", name: "Alt prøvet", description: "Du har prøvet hver øvelse i biblioteket.", runeSymbol: "ᚺ", tier: "guld", criteriaJson: { type: "all_exercises" } },
];
