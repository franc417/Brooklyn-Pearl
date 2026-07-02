"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.3)",
        color: "rgba(255,255,255,0.7)",
        padding: "0.5rem 1rem",
        fontSize: "0.68rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      Sign Out
    </button>
  );
}
