"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonStyle } from "@/components/shared-ui";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={handleSignOut} style={{ ...buttonStyle, background: "transparent", border: "1px solid #a47f50", color: "#a47f50" }}>
      Sign Out
    </button>
  );
}
