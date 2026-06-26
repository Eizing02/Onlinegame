import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";

export default function DashboardLoading() {
  return (
    <AppShell>
      <section className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
        <Panel className="h-80 animate-pulse bg-white" />
      </section>
    </AppShell>
  );
}
