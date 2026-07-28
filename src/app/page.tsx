import { redirect } from "next/navigation";
import { isFirstRun } from "@/lib/db/repo/halls";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Entry point. Routes to first-run admin setup, sign-in, or the app depending
 * on whether the hall has been created and whether the visitor is signed in.
 */
export default async function Root() {
  if (isFirstRun()) redirect("/welcome");
  const user = await getCurrentUser();
  redirect(user ? "/train" : "/login");
}
