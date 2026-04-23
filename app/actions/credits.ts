"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getUnlockedHairStyles(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("unlocked_hair_styles")
    .eq("id", user.id)
    .single();

  return data?.unlocked_hair_styles ?? [];
}

export async function unlockHairStyle(styleId: string): Promise<{ credits: number; unlockedStyles: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const admin = createAdminClient();

  const { data: userData, error: fetchError } = await admin
    .from("users")
    .select("credits, unlocked_hair_styles")
    .eq("id", user.id)
    .single();

  if (fetchError) throw new Error("유저 정보를 불러오지 못했습니다");

  const unlockedStyles: string[] = userData?.unlocked_hair_styles ?? [];
  if (unlockedStyles.includes(styleId)) {
    return { credits: userData?.credits ?? 0, unlockedStyles };
  }

  const currentCredits = userData?.credits ?? 0;
  if (currentCredits < 2000) throw new Error("크레딧이 부족합니다");

  const newCredits = currentCredits - 2000;
  const newUnlocked = [...unlockedStyles, styleId];

  const { error } = await admin
    .from("users")
    .update({ credits: newCredits, unlocked_hair_styles: newUnlocked })
    .eq("id", user.id);

  if (error) throw new Error("해금에 실패했습니다");

  return { credits: newCredits, unlockedStyles: newUnlocked };
}

export async function getUserCredits(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  return data?.credits ?? 0;
}

export async function deductCredits(amount: number): Promise<{ credits: number }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다");

  const admin = createAdminClient();

  const { data: userData, error: fetchError } = await admin
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (fetchError) throw new Error("크레딧 정보를 불러오지 못했습니다");

  const currentCredits = userData?.credits ?? 0;
  if (currentCredits < amount) {
    throw new Error("크레딧이 부족합니다");
  }

  const newCredits = currentCredits - amount;
  const { error } = await admin
    .from("users")
    .update({ credits: newCredits })
    .eq("id", user.id);

  if (error) throw new Error("크레딧 차감에 실패했습니다");

  return { credits: newCredits };
}
