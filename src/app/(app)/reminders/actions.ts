"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext } from "@/lib/auth/session";
import { upsertReminder, toCron } from "@/lib/db/repo/reminders";
import { updateUser } from "@/lib/db/repo/users";

const SaveSchema = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  hour: z.number().int().min(0).max(23),
  enabled: z.boolean(),
});

/** Save the user's training days and reminder time. */
export async function saveReminderAction(input: z.infer<typeof SaveSchema>): Promise<void> {
  const ctx = await requireContext();
  const parsed = SaveSchema.parse(input);
  upsertReminder({
    userId: ctx.user.id,
    kind: "training_day",
    scheduleCron: toCron(parsed.weekdays, parsed.hour),
    channel: "push",
    enabled: parsed.enabled && parsed.weekdays.length > 0,
  });
  revalidatePath("/reminders");
}

/** Switch the ravens between a gentle and a blunt voice. */
export async function setCoachToneAction(tone: "soft" | "hard"): Promise<void> {
  const ctx = await requireContext();
  updateUser(ctx.user.id, { coachTone: tone });
  revalidatePath("/reminders");
  revalidatePath("/coach");
}
