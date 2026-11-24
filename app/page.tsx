import { requireProfile } from "@/lib/session";
import PresenceDashboard from "./PresenceDashboard";

export default async function HomePage() {
  const { profile, navState } = await requireProfile();

  return <PresenceDashboard currentProfile={profile} navState={navState} />;
}
