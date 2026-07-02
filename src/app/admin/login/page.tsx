"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notAuthorized = searchParams.get("error") === "not_authorized";

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

    router.push("/admin");
    router.refresh();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#292f1a",
        fontFamily: "'Montserrat', sans-serif",
        padding: "1.5rem",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{ background: "#ffffff", padding: "2.5rem", maxWidth: 380, width: "100%" }}
      >
        <p
          style={{
            fontSize: "0.6rem",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#a47f50",
            marginBottom: "0.5rem",
          }}
        >
          Brooklyn Pearl Resort
        </p>
        <h1 style={{ fontWeight: 300, fontSize: "1.5rem", color: "#292f1a", marginBottom: "1.5rem" }}>
          Staff Sign In
        </h1>

        {notAuthorized && (
          <p style={{ color: "#b33", fontSize: "0.8rem", marginBottom: "1rem" }}>
            That account isn&apos;t authorized for staff access.
          </p>
        )}
        {error && <p style={{ color: "#b33", fontSize: "0.8rem", marginBottom: "1rem" }}>{error}</p>}

        <label style={{ display: "block", fontSize: "0.72rem", color: "#6b6b6b", marginBottom: "0.3rem" }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "0.7rem", border: "1px solid #ddd", marginBottom: "1rem", fontFamily: "inherit" }}
        />

        <label style={{ display: "block", fontSize: "0.72rem", color: "#6b6b6b", marginBottom: "0.3rem" }}>
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "0.7rem", border: "1px solid #ddd", marginBottom: "1.5rem", fontFamily: "inherit" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.8rem",
            background: "#a47f50",
            color: "#fff",
            border: "none",
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </main>
  );
}
