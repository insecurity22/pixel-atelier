import { createClient } from "@/lib/supabase/server";
import { getUserCredits } from "@/app/actions/credits";
import { WorkspaceShell } from "./workspace-shell";

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const credits = await getUserCredits();

  return <WorkspaceShell user={user!} initialCredits={credits} />;
}
