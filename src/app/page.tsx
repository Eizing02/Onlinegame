import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getSessionLanding } from "@/lib/auth/landing";

export default async function Home() {
  const session = await getSession();
  redirect(session ? await getSessionLanding(session) : "/login");
}
