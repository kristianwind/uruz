import { redirect } from "next/navigation";
import { requireContext } from "@/lib/auth/session";
import { getActiveSession, startSession } from "@/lib/db/repo/sessions";

export const dynamic = "force-dynamic";

/** Start (or resume) a free-training session with no template attached. */
export default async function FreeTrainPage() {
  const ctx = await requireContext();
  const existing = getActiveSession(ctx.user.id);
  const session = existing ?? startSession(ctx.user.id, null);
  redirect(`/train/session/${session.id}`);
}
