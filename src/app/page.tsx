import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSessionLanding } from "@/lib/auth/landing";
import { getAuthMode } from "@/lib/auth/mode";
import { getGoogleAccountState, googleStatePath } from "@/lib/auth/google-session";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(await getSessionLanding(session));
  redirect(getAuthMode() === "google" ? googleStatePath(await getGoogleAccountState()) : "/login");
}
