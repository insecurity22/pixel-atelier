"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { WorkspaceNavbar } from "@/components/workspace/navbar";
import { CharacterCustomizer } from "@/components/workspace/character-customizer";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceShellProps {
  user: User;
  initialCredits: number;
}

export function WorkspaceShell({ user, initialCredits }: WorkspaceShellProps) {
  const [credits, setCredits] = useState(initialCredits);

  useEffect(() => {
    // payment_success 파라미터가 남아있으면 URL에서 제거
    if (window.location.search.includes("payment_success")) {
      window.history.replaceState(null, "", "/workspace");
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const fetchCredits = () =>
      supabase.from("users").select("credits").eq("id", user.id).single()
        .then(({ data }) => { if (data) setCredits(data.credits); });

    const channel = supabase
      .channel("credits")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${user.id}` },
        (payload) => setCredits((payload.new as { credits: number }).credits)
      )
      .subscribe((status) => { if (status === "SUBSCRIBED") fetchCredits(); });

    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <WorkspaceNavbar user={user} credits={credits} />
      <CharacterCustomizer credits={credits} onCreditsChange={setCredits} />
    </div>
  );
}
