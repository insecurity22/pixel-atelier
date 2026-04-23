"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Star } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { CreditModal } from "./credit-modal";

interface WorkspaceNavbarProps {
  user: User;
  credits: number;
}

export function WorkspaceNavbar({ user, credits }: WorkspaceNavbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const displayName = user.user_metadata?.name as string | undefined ?? user.email ?? "Artist";
  const email = user.email ?? "";
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <>
      <motion.div
        className="relative z-20 shrink-0"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="h-14 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md shadow-[0_1px_0_0_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.04)]">
          {/* Left — wordmark */}
          <Link
            href="/"
            className="text-sm font-semibold tracking-tighter select-none text-foreground hover:opacity-70 transition-opacity duration-150"
          >
            Pixel Atelier
          </Link>

          {/* Right — credits chip + profile popover */}
          <div className="flex items-center gap-2">

            {/* Credits chip */}
            <div className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5">
              <svg width="11" height="11" viewBox="0 0 13 13" fill="none" className="text-amber-500 shrink-0">
                <circle cx="6.5" cy="6.5" r="5.5" fill="currentColor" opacity="0.25" />
                <circle cx="6.5" cy="6.5" r="3.5" fill="currentColor" />
              </svg>
              <span className="text-xs font-semibold text-amber-700 tabular-nums">
                {credits.toLocaleString()}
              </span>
            </div>

            {/* Profile popover */}
            <div ref={popoverRef} className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-colors duration-150 hover:bg-accent cursor-pointer"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-6 h-6 rounded-lg shrink-0 shadow-sm"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0 bg-muted text-foreground">
                    {initials}
                  </div>
                )}
                <span className="hidden sm:block max-w-[140px] truncate text-sm text-foreground/75">
                  {displayName}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden bg-background border border-border shadow-lg"
                  >
                    {/* Avatar + info */}
                    <div className="px-5 pt-5 pb-4">
                      <div className="flex items-center gap-3.5">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="w-11 h-11 rounded-xl shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-semibold shrink-0 bg-muted text-foreground">
                            {initials}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold tracking-tight truncate leading-tight text-foreground">
                            {displayName}
                          </span>
                          <span className="text-xs truncate mt-0.5 leading-tight text-muted-foreground">
                            {email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-4 h-px bg-border" />

                    {/* Actions */}
                    <div className="p-2 pb-2.5">
                      <button
                        onClick={() => { setOpen(false); setCreditModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors duration-150 cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Star className="w-3.5 h-3.5 shrink-0" />
                        <span className="tracking-tight">Upgrade</span>
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors duration-150 cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                        <span className="tracking-tight">Sign out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
      </motion.div>

      <CreditModal open={creditModalOpen} onClose={() => setCreditModalOpen(false)} />
    </>
  );
}
