"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { ExerciseMedia } from "@/components/exercise/ExerciseMedia";
import type { MediaPref } from "@/lib/domain/types";
import { ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useT } from "@/components/app/I18nProvider";

export interface BrowserExercise {
  id: string;
  slug: string;
  name: string;
  category: string;
  equipment: string;
  difficulty: string;
  primaryMuscles: string[];
  svgKey: string | null;
  imageUrl: string | null;
}

const CATEGORIES = ["ben", "pres", "traek", "kerne", "kondi"] as const;
const EQUIPMENT = ["maskine", "haandvaegt", "kabel", "kropsvaegt", "stang"] as const;
const DIFFICULTIES = ["begynder", "erfaren", "pro"] as const;

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
  translate,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
  translate: (v: T) => string;
}) {
  const t = useT();
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-faint">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium",
            value === null ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
          )}
        >
          {t("common.all")}
        </button>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(value === o ? null : o)}
            aria-pressed={value === o}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              value === o ? "border-accent bg-accent-soft text-accent" : "border-border text-muted",
            )}
          >
            {translate(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Searchable, filterable exercise library (spec §5, layer 1). */
export function ExerciseBrowser({
  exercises,
  mediaPref = "illustration",
}: {
  exercises: BrowserExercise[];
  mediaPref?: MediaPref;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (!query || e.name.toLowerCase().includes(query.toLowerCase())) &&
          (!category || e.category === category) &&
          (!equipment || e.equipment === equipment) &&
          (!difficulty || e.difficulty === difficulty),
      ),
    [exercises, query, category, equipment, difficulty],
  );

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder={t("common.search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t("common.search")}
      />

      <div className="flex flex-col gap-3">
        <Chips
          label={t("library.filterMuscle")}
          options={CATEGORIES}
          value={category as (typeof CATEGORIES)[number] | null}
          onChange={(v) => setCategory(v)}
          translate={(v) => t(`muscles.${v}`)}
        />
        <Chips
          label={t("library.filterEquipment")}
          options={EQUIPMENT}
          value={equipment as (typeof EQUIPMENT)[number] | null}
          onChange={(v) => setEquipment(v)}
          translate={(v) => t(`equipment.${v}`)}
        />
        <Chips
          label={t("library.filterDifficulty")}
          options={DIFFICULTIES}
          value={difficulty as (typeof DIFFICULTIES)[number] | null}
          onChange={(v) => setDifficulty(v)}
          translate={(v) =>
            v === "begynder"
              ? t("me.difficultyBeginner")
              : v === "erfaren"
                ? t("me.difficultyExperienced")
                : t("me.difficultyPro")
          }
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("library.empty")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <li key={e.id}>
              <Link
                href={`/library/exercise/${e.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-elev p-3 active:brightness-95"
              >
                <span className="h-12 w-14 shrink-0 rounded-lg bg-elev-2 p-1">
                  <ExerciseMedia
                    svgKey={e.svgKey}
                    imageUrl={e.imageUrl}
                    alt={e.name}
                    pref={mediaPref}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text">{e.name}</span>
                  <span className="block truncate text-xs text-faint">
                    {t(`muscles.${e.category}`)} · {t(`equipment.${e.equipment}`)}
                  </span>
                </span>
                <ChevronRightIcon size={18} className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
