"use server";

import { headers } from "next/headers";
import { Polar } from "@polar-sh/sdk";
import { createClient } from "@/lib/supabase/server";

export type PlanKey = "basic" | "plus" | "pro";

const PRODUCT_IDS: Record<PlanKey, string> = {
  basic: process.env.POLAR_BASIC_PRODUCT_ID!,
  plus: process.env.POLAR_PLUS_PRODUCT_ID!,
  pro: process.env.POLAR_PRO_PRODUCT_ID!,
};

export async function createCheckoutSession(plan: PlanKey): Promise<{ url: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto");
  const host = headerStore.get("host");
  const origin =
    headerStore.get("origin") ??
    (proto && host ? `${proto}://${host}` : "http://localhost:3000");

  const polar = new Polar({
    accessToken: process.env.POLAR_API_TOKEN!,
    server: (process.env.POLAR_SERVER ?? "sandbox") as "sandbox" | "production",
  });

  const checkout = await polar.checkouts.create({
    products: [PRODUCT_IDS[plan]],
    externalCustomerId: user.id,
    customerEmail: user.email,
    successUrl: `${origin}/workspace`,
  });

  return { url: checkout.url };
}
