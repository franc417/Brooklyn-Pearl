"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Field, inputStyle, buttonStyle } from "@/components/shared-ui";

export default function GuestLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title="Sign In" tagline="Access your bookings and loyalty status" />
      <section style={{ maxWidth: 420, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #eee", padding: "1.8rem" }}>
          {error && <p style={{ color: "#b33", fontSize: "0.82rem", marginBottom: "1rem" }}>{error}</p>}
          <div style={{ marginBottom: "0.9rem" }}>
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </Field>
          </div>
          <div style={{ marginBottom: "1.3rem" }}>
            <Field label="Password">
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </Field>
          </div>
          <button type="submit" disabled={loading} style={{ ...buttonStyle, width: "100%" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p style={{ fontSize: "0.78rem", color: "#999", marginTop: "1rem", textAlign: "center" }}>
            No account yet? <a href="/account/signup" style={{ color: "#a47f50" }}>Create one</a>
          </p>
        </form>
      </section>
    </main>
  );
}
