"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterCanvas, type HairColorConfig } from "./character-canvas";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { deductCredits, getUnlockedHairStyles, unlockHairStyle } from "@/app/actions/credits";
import { CreditModal } from "./credit-modal";
import { PREMIUM_HAIR_COSTS, PREMIUM_OUTFIT_COST } from "@/lib/constants";

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = "hair-style" | "hair-color" | "outfit" | "pet";

interface HairStyle {
  id: string;
  label: string;
  premium?: boolean;
}

interface Outfit {
  id: string;
  label: string;
  badge: string;
  premium?: boolean;
}

interface Pet {
  id: string;
  label: string;
}

// ── Data ───────────────────────────────────────────────────────────────────────

const HAIR_STYLES: HairStyle[] = [
  { id: "none", label: "없음" },
  { id: "wavy", label: "웨이브" },
  { id: "ponytail", label: "포니테일" },
  { id: "ponytail-long", label: "롱 포니테일" },
  { id: "braids", label: "땋은 머리", premium: true },
  { id: "space-bun", label: "스페이스 번", premium: true },
];

// targetHue, saturationScale, lightnessOffset 으로 픽셀 단위 색 교체
const HAIR_COLORS: HairColorConfig[] = [
  { id: "red", label: "레드", hex: "#C0392B", targetHue: 4, saturationScale: 1.3, lightnessOffset: 0.00 },
  { id: "brown", label: "브라운", hex: "#8B5E3C", targetHue: 28, saturationScale: 1.0, lightnessOffset: 0.00 },
  { id: "blonde", label: "블론드", hex: "#D4AF37", targetHue: 42, saturationScale: 0.9, lightnessOffset: 0.18 },
  { id: "blue", label: "블루", hex: "#2980B9", targetHue: 210, saturationScale: 1.0, lightnessOffset: 0.00 },
  { id: "purple", label: "보라", hex: "#8E44AD", targetHue: 270, saturationScale: 0.9, lightnessOffset: 0.00 },
  { id: "pink", label: "핑크", hex: "#E91E8C", targetHue: 330, saturationScale: 1.1, lightnessOffset: 0.08 },
  { id: "black", label: "블랙", hex: "#2a2a2a", targetHue: 0, saturationScale: 0.1, lightnessOffset: -0.22 },
];

const OUTFITS: Outfit[] = [
  { id: "none", label: "없음", badge: '' },
];


const PETS: Pet[] = [
  { id: "none", label: "없음" },
];

// ── Category Tab Config ────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "hair-style", label: "헤어 스타일" },
  { id: "hair-color", label: "헤어 컬러" },
  { id: "outfit", label: "옷" },
  { id: "pet", label: "펫" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function OptionCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3
        border-2 transition-all duration-150 cursor-pointer select-none
        ${selected
          ? "border-foreground bg-foreground text-background shadow-md scale-[1.03]"
          : "border-border bg-card text-foreground hover:border-foreground/30 hover:bg-accent"
        }
      `}
    >
      {children}
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CharacterCustomizerProps {
  credits: number;
  onCreditsChange: (credits: number) => void;
}

export function CharacterCustomizer({ credits, onCreditsChange }: CharacterCustomizerProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>("hair-style");
  const [hairStyle, setHairStyle] = useState("none");
  const [hairColor, setHairColor] = useState("brown");
  const [outfit, setOutfit] = useState("none");
  const [pet, setPet] = useState("none");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isLoaded, setIsLoaded] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [pendingHairStyle, setPendingHairStyle] = useState<HairStyle | null>(null);
  const [unlockedStyles, setUnlockedStyles] = useState<string[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("characters")
        .select("hair_style, hair_color, outfit, pet")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle(),
      getUnlockedHairStyles(),
    ]).then(([{ data }, unlocked]) => {
      if (data) {
        setHairStyle(data.hair_style);
        setHairColor(data.hair_color);
        setOutfit(OUTFITS.find((o) => o.id === data.outfit)?.id ?? "none");
        setPet(data.pet);
      }
      setUnlockedStyles(unlocked);
      setIsLoaded(true);
    });
  }, [user]);

  if (!isLoaded) return null;

  const selectedColor = HAIR_COLORS.find((c) => c.id === hairColor)!;

  function handleHairStyleSelect(s: HairStyle) {
    if (s.premium && !unlockedStyles.includes(s.id)) {
      setPendingHairStyle(s);
      return;
    }
    setHairStyle(s.id);
    setPendingHairStyle(null);
  }

  function handleOutfitSelect(o: Outfit) {
    if (o.premium && credits < PREMIUM_OUTFIT_COST) {
      setCreditModalOpen(true);
      return;
    }
    if (o.premium) {
      deductCredits(PREMIUM_OUTFIT_COST).then(({ credits: remaining }) => {
        onCreditsChange(remaining);
        setOutfit(o.id);
      });
    } else {
      setOutfit(o.id);
    }
  }

  async function handleSave() {
    if (!user || saveStatus === "saving") return;

    // PRO 헤어 미리보기 중이면 크레딧 차감 후 확정
    let effectiveHairStyle = hairStyle;
    if (pendingHairStyle) {
      if (credits < (PREMIUM_HAIR_COSTS[pendingHairStyle.id] ?? 0)) {
        setCreditModalOpen(true);
        return;
      }
      try {
        const { credits: remaining, unlockedStyles: newUnlocked } = await unlockHairStyle(pendingHairStyle.id);
        onCreditsChange(remaining);
        setUnlockedStyles(newUnlocked);
        effectiveHairStyle = pendingHairStyle.id;
      } catch {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2500);
        return;
      }
    }

    setSaveStatus("saving");
    try {
      const supabase = createClient();

      const { data: existing } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      const payload = {
        hair_style: effectiveHairStyle,
        hair_color: hairColor,
        outfit,
        pet,
      };

      if (existing) {
        const { error } = await supabase
          .from("characters")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("characters")
          .insert({ user_id: user.id, ...payload, is_active: true });
        if (error) throw error;
      }

      if (pendingHairStyle) {
        setHairStyle(pendingHairStyle.id);
        setPendingHairStyle(null);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  }

  return (
    <>
      <div className="flex-1 flex items-stretch overflow-hidden">
        {/* ── Left: Character Preview ────────────────────────────── */}
        <div className="relative flex flex-col items-center justify-center w-[340px] shrink-0 border-r border-border bg-muted/40 overflow-hidden select-none">
          {/* Pixel grid backdrop */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          {/* Ambient glow behind character */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-foreground/5 rounded-full blur-3xl pointer-events-none" />

          {/* Character sprite — canvas로 픽셀 단위 헤어 컬러 교체 */}
          <div className={`relative z-10 drop-shadow-xl transition-opacity duration-300 ${canvasReady ? "opacity-100" : "opacity-0"}`}>
            <CharacterCanvas
              config={selectedColor}
              hairStyle={pendingHairStyle?.id ?? hairStyle}
              displayWidth={180}
              onReady={() => setCanvasReady(true)}
            />
          </div>

          {/* Shadow under character */}
          <div className="relative z-0 w-28 h-4 bg-foreground/10 rounded-full blur-sm -mt-1" />

          {/* Stat badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
            <StatBadge label="헤어 스타일" value={hairStyle} />
            <StatBadge label="헤어 컬러" value={hairColor} />
            <StatBadge label="옷" value={outfit} />
          </div>

          {/* Color indicator dot */}
          <div
            className="absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-background shadow ring-1 ring-border"
            style={{ backgroundColor: selectedColor.hex }}
            title={selectedColor.label}
          />
        </div>

        {/* ── Right: Customization Panel ─────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category tabs */}
          <div className="shrink-0 flex items-center gap-1 px-6 pt-6 pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`
                flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                transition-all duration-150 cursor-pointer select-none
                ${category === cat.id
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }
              `}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-6 mt-4 mb-0 h-px bg-border" />

          {/* Option grid */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {/* Hair Style */}
                {category === "hair-style" && (
                  <div>
                    <SectionTitle title="헤어 스타일 선택" subtitle={`${HAIR_STYLES.length}가지 스타일 중 골라보세요`} />
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {HAIR_STYLES.map((s) => (
                        <OptionCard key={s.id} selected={pendingHairStyle ? pendingHairStyle.id === s.id : hairStyle === s.id} onClick={() => handleHairStyleSelect(s)}>
                          <span className={`text-xs font-medium leading-tight ${s.premium && !unlockedStyles.includes(s.id) ? "text-muted-foreground" : ""}`}>
                            {s.label}
                          </span>
                          {s.premium && !unlockedStyles.includes(s.id) && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M4 1L5 3H7L5.5 4.5L6 7L4 5.5L2 7L2.5 4.5L1 3H3L4 1Z" fill="currentColor" />
                              </svg>
                              PRO
                            </span>
                          )}
                        </OptionCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hair Color */}
                {category === "hair-color" && (
                  <div>
                    <SectionTitle title="헤어 컬러 선택" subtitle="원하는 색으로 염색해보세요" />
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      {HAIR_COLORS.map((c) => (
                        <OptionCard key={c.id} selected={hairColor === c.id} onClick={() => setHairColor(c.id)}>
                          <div
                            className="w-8 h-8 rounded-full border-2 border-border shadow-sm"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-xs font-medium leading-tight">{c.label}</span>
                        </OptionCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outfit */}
                {category === "outfit" && (
                  <div>
                    <SectionTitle title="옷 선택" subtitle="나만의 스타일을 완성하세요" />
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {OUTFITS.map((o) => (
                        <OptionCard key={o.id} selected={outfit === o.id} onClick={() => handleOutfitSelect(o)}>
                          {o.badge && (
                            <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${o.badge === "NEW"
                              ? "bg-rose-500 text-white"
                              : "bg-muted text-muted-foreground"
                              }`}>
                              {o.badge}
                            </span>
                          )}
                          {o.premium && (
                            <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M4 1L5 3H7L5.5 4.5L6 7L4 5.5L2 7L2.5 4.5L1 3H3L4 1Z" fill="currentColor" />
                              </svg>
                              PRO
                            </span>
                          )}
                          <span className="text-xs font-medium leading-tight">{o.label}</span>
                        </OptionCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pet */}
                {category === "pet" && (
                  <div>
                    <SectionTitle title="펫 선택" subtitle="함께할 친구를 골라보세요" />
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {PETS.map((p) => (
                        <OptionCard key={p.id} selected={pet === p.id} onClick={() => setPet(p.id)}>
                          <span className="text-xs font-medium leading-tight">{p.label}</span>
                        </OptionCard>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Save bar */}
          <div className={`shrink-0 px-6 py-4 border-t flex items-center justify-between gap-4 transition-colors duration-200 ${pendingHairStyle
            ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            : "border-border bg-background/80 backdrop-blur-sm"
            }`}>
            <div className="flex items-center gap-2 min-w-0">
              {pendingHairStyle ? (
                <>
                  <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 shrink-0">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M4 1L5 3H7L5.5 4.5L6 7L4 5.5L2 7L2.5 4.5L1 3H3L4 1Z" fill="currentColor" />
                    </svg>
                    PRO
                  </span>
                  <p className="text-xs text-amber-800 dark:text-amber-300 truncate">
                    <span className="font-semibold">{pendingHairStyle.label}</span> 미리보기 중 · 저장 시 {PREMIUM_HAIR_COSTS[pendingHairStyle.id]} 크레딧 차감
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground truncate">
                  {saveStatus === "saved" && "저장됐어요!"}
                  {saveStatus === "error" && "저장에 실패했어요. 다시 시도해주세요."}
                  {(saveStatus === "idle" || saveStatus === "saving") && "마음에 드는 스타일을 완성했나요?"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-75 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${pendingHairStyle
                  ? "bg-amber-500 text-white"
                  : "bg-foreground text-background"
                  }`}
              >
                {saveStatus === "saving" ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.6" strokeDasharray="8 16" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {saveStatus === "saving" ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <CreditModal open={creditModalOpen} onClose={() => setCreditModalOpen(false)} />
    </>
  );
}

// ── Tiny helpers ───────────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 bg-background/70 backdrop-blur-sm border border-border rounded-lg px-2 py-1 shadow-sm">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
      <span className="text-[9px] text-foreground font-medium">{value}</span>
    </div>
  );
}
