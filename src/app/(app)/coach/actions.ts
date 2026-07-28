"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth/session";
import {
  addConstraint,
  resolveConstraint,
  deleteConstraint,
} from "@/lib/db/repo/constraints";
import { mentionsPain } from "@/lib/coach/adapt";

const AddSchema = z.object({
  body: z.string().trim().min(1).max(300),
  kind: z.enum(["skavank", "oenske"]).optional(),
});

/**
 * Record an ailment or a wish. The kind is inferred from the wording when the
 * caller doesn't specify it — a user typing "skulderen gør ondt" shouldn't have
 * to categorise it first.
 */
export async function addConstraintAction(input: z.infer<typeof AddSchema>): Promise<void> {
  const ctx = await requireContext();
  const parsed = AddSchema.parse(input);
  addConstraint({
    userId: ctx.user.id,
    kind: parsed.kind ?? (mentionsPain(parsed.body) ? "skavank" : "oenske"),
    body: parsed.body,
  });
  revalidatePath("/coach");
}

/** Mark an ailment as over, or a wish as no longer wanted. */
export async function resolveConstraintAction(id: string): Promise<void> {
  const ctx = await requireContext();
  resolveConstraint(id, ctx.user.id);
  revalidatePath("/coach");
}

export async function deleteConstraintAction(id: string): Promise<void> {
  const ctx = await requireContext();
  deleteConstraint(id, ctx.user.id);
  revalidatePath("/coach");
}
