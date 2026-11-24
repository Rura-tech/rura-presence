import { requireProfile } from "@/lib/session";
import SallesView from "./SallesView";

export default async function SallesPage() {
  const { supabase, profile, navState } = await requireProfile();

  const { data: salles } = await supabase.from("salles").select("*").order("nom");

  return <SallesView currentProfile={profile} salles={salles ?? []} navState={navState} />;
}
