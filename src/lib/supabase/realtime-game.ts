import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SubscribeToGameSessionChangesParams = {
  roomCode: string;
  sessionId: string;
  onChange: () => void;
  onStatusChange?: (status: string) => void;
};

const realtimeTables = [
  "game_session_updates",
] as const;

export function subscribeToGameSessionChanges({
  roomCode,
  sessionId,
  onChange,
  onStatusChange,
}: SubscribeToGameSessionChangesParams) {
  let supabase: ReturnType<typeof createSupabaseBrowserClient>;

  try {
    supabase = createSupabaseBrowserClient();
  } catch {
    onStatusChange?.("fallback");
    return () => {};
  }

  const channel = supabase.channel(`game-session:${roomCode}:${sessionId}`);

  realtimeTables.forEach((table) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        onChange();
      },
    );
  });

  channel.subscribe((status) => {
    onStatusChange?.(status);
  });

  return () => {
    void supabase.removeChannel(channel);
  };
}
