import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PresenceDashboard from "./PresenceDashboard";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Check profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/inscription");
  }

  return <PresenceDashboard currentProfile={profile} />;
}
