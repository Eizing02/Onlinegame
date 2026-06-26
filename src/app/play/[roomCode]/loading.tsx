import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";

export default function PlayLoading() {
  return (
    <AppShell>
      <section className="mx-auto w-full max-w-4xl px-6 py-10 lg:px-8">
        <Panel className="h-72 animate-pulse bg-white" />
      </section>
    </AppShell>
  );
}
