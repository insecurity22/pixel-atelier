import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCT_CREDITS: Record<string, number> = {
  [process.env.POLAR_BASIC_PRODUCT_ID!]: 200,
  [process.env.POLAR_PLUS_PRODUCT_ID!]: 500,
  [process.env.POLAR_PRO_PRODUCT_ID!]: 1_000,
};

export async function POST(request: Request) {
  const body = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let event;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET!);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return new Response("Unauthorized", { status: 401 });
    }
    throw err;
  }

  if (event.type !== "order.paid") {
    return new Response("OK", { status: 200 });
  }

  const order = event.data;
  const userId = order.customer.externalId;
  const productId = order.productId;

  if (!userId || !productId) {
    return new Response("Missing user or product", { status: 400 });
  }

  const credits = PRODUCT_CREDITS[productId];
  if (credits === undefined) {
    return new Response("Unknown product", { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("record_payment", {
    p_user_id: userId,
    p_polar_order_id: order.id,
    p_amount: order.netAmount,
    p_credits: credits,
  });

  if (error) {
    console.error("[webhook] record_payment failed:", error);
    return new Response("Database error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
