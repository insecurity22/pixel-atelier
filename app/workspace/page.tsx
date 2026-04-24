import { createClient } from "@/lib/supabase/server";
import { getUserCredits } from "@/app/actions/credits";
import { WorkspaceShell } from "./workspace-shell";

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const params = await searchParams;

  if (params.payment_success) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const credits = await getUserCredits();

  return <WorkspaceShell user={user!} initialCredits={credits} />;
}
