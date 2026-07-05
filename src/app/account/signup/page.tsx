"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, Field, inputStyle, buttonStyle } from "@/components/shared-ui";

// Guest accounts are optional everywhere else on the site (guest checkout
// still works without one) -- this only exists because loyalty tracking
// needs a persistent identity across visits, which anonymous checkout can't
// provide. See migration 002's guests table comment.
export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Create the matching guests row -- auth.users only holds credentials;
    // this is where name/phone actually live (see migration 002).
    const { error: profileError } = await supabase.from("guests").insert({
      id: data.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title="Create an Account" tagline="Track your stays and unlock loyalty rewards" />
      <section style={{ maxWidth: 420, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #eee", padding: "1.8rem" }}>
          {error && <p style={{ color: "#b33", fontSize: "0.82rem", marginBottom: "1rem" }}>{error}</p>}
          <div style={{ display: "flex", gap: "0.7rem", marginBottom: "0.9rem" }}>
            <Field label="First name">
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </Field>
            <Field label="Last name">
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </Field>
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </Field>
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <Field label="Phone">
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </Field>
          </div>
          <div style={{ marginBottom: "1.3rem" }}>
            <Field label="Password">
              <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
            </Field>
          </div>
          <button type="submit" disabled={loading} style={{ ...buttonStyle, width: "100%" }}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
          <p style={{ fontSize: "0.78rem", color: "#999", marginTop: "1rem", textAlign: "center" }}>
            Already have an account? <a href="/account/login" style={{ color: "#a47f50" }}>Sign in</a>
          </p>
        </form>
      </section>
    </main>
  );
}
