import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SallesView from "./SallesView";

export default async function SallesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/inscription");
  }

  const { data: salles } = await supabase
    .from("salles")
    .select("*")
    .order("nom");

  return <SallesView currentProfile={profile} salles={salles ?? []} />;
}
