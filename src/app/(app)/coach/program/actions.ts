"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth/session";
import { buildProgram } from "@/lib/coach/program-builder";

const WishSchema = z.object({
  goal: z.string().trim().max(120),
  daysPerWeek: z.number().int().min(1).max(7),
  minutes: z.number().int().min(15).max(180),
  equipment: z.array(z.string().min(1).max(40)).max(10),
});

/**
 * Have Kvasir lay out a plan and put it in place.
 *
 * Only ever creates: new workouts, a new plan, and the previous plan retired
 * rather than deleted. Nothing that holds training data is touched, so a plan
 * you dislike costs you a plan, never a session.
 */
export async function buildProgramAction(
  input: z.infer<typeof WishSchema>,
): Promise<{ programId: string; fromModel: boolean; note: string }> {
  const ctx = await requireContext();
  const wish = WishSchema.parse(input);

  const built = await buildProgram(ctx.user.id, ctx.hall.id, wish);

  revalidatePath("/train");
  revalidatePath("/library");
  revalidatePath("/coach");
  return { programId: built.program.id, fromModel: built.fromModel, note: built.note };
}
