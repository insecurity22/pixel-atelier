"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { WorkspaceNavbar } from "@/components/workspace/navbar";
import { CharacterCustomizer } from "@/components/workspace/character-customizer";

interface WorkspaceShellProps {
  user: User;
  initialCredits: number;
}

export function WorkspaceShell({ user, initialCredits }: WorkspaceShellProps) {
  const [credits, setCredits] = useState(initialCredits);

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
