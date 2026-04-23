"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createCheckoutSession, type PlanKey } from "@/app/actions/checkout";

// ── Data ───────────────────────────────────────────────────────────────────────

const PLANS: { key: PlanKey; name: string; price: number; credits: number; featured?: true }[] = [
  { key: "basic", name: "Basic", price: 2, credits: 200 },
  { key: "plus", name: "Plus", price: 5, credits: 500, featured: true },
  { key: "pro", name: "Pro", price: 10, credits: 1_000 },
];

// ── Component ──────────────────────────────────────────────────────────────────

interface CreditModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreditModal({ open, onClose }: CreditModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function handleSelectPlan(key: PlanKey) {
    if (loadingPlan) return;
    setLoadingPlan(key);
    setError(null);
    try {
      const { url } = await createCheckoutSession(key);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 페이지를 불러오지 못했어요. 다시 시도해주세요.");
      setLoadingPlan(null);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md rounded-3xl bg-background border border-border shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-7">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">크레딧 충전</h2>
                <p className="text-xs text-muted-foreground mt-0.5">플랜을 선택해 크레딧을 충전하세요</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Error message */}
            {error && (
              <p className="mb-4 text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {/* Pricing cards */}
            <div className="grid grid-cols-3 gap-3">
              {PLANS.map((plan) => {
                const isLoading = loadingPlan === plan.key;
                const isDisabled = loadingPlan !== null;

                return (
                  <button
                    key={plan.key}
                    onClick={() => handleSelectPlan(plan.key)}
                    disabled={isDisabled}
                    className={`
                      flex flex-col items-center gap-3 rounded-2xl px-4 py-5 border-2
                      transition-all duration-150 cursor-pointer
                      disabled:cursor-not-allowed
                      ${plan.featured
                        ? "border-foreground bg-foreground text-background hover:opacity-85"
                        : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-accent"
                      }
                      ${isLoading ? "opacity-70" : ""}
                    `}
                  >
                    <span className={`text-xs font-semibold tracking-tight ${plan.featured ? "text-background/70" : "text-muted-foreground"}`}>
                      {plan.name}
                    </span>

                    <span className="relative flex items-center justify-center h-6">
                      <span className={`text-2xl font-bold tracking-tighter leading-none transition-opacity duration-150 ${isLoading ? "opacity-0" : "opacity-100"}`}>
                        ${plan.price}
                      </span>
                      {isLoading && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="animate-spin">
                            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="12 24" strokeLinecap="round" />
                          </svg>
                        </span>
                      )}
                    </span>

                    <span className={`text-[11px] font-medium ${plan.featured ? "text-background/60" : "text-muted-foreground"}`}>
                      {plan.credits.toLocaleString()} 크레딧
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
