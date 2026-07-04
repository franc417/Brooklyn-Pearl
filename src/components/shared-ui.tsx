import Link from "next/link";

// Shared, deliberately plain UI for the new service pages (Swimming,
// Restaurant, and whatever follows in Phase 4-6). This is functional, not
// final design — Phase 7 (Site-wide UX) is where these get folded into the
// same visual language as the approved homepage. Keeping them plain now
// makes that later pass a styling change, not a rewrite.

export function PageHeader({ title, tagline }: { title: string; tagline: string }) {
  return (
    <header style={{ background: "#292f1a", color: "#fff", padding: "2.5rem 1.5rem", textAlign: "center" }}>
      <Link href="/" style={{ color: "#c4a06e", fontSize: "0.65rem", letterSpacing: "0.25em", textTransform: "uppercase", textDecoration: "none" }}>
        ← Brooklyn Pearl Resort
      </Link>
      <h1 style={{ fontWeight: 300, fontSize: "2rem", margin: "0.8rem 0 0.3rem" }}>{title}</h1>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>{tagline}</p>
    </header>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#999", marginBottom: "0.3rem" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export const inputStyle: React.CSSProperties = { padding: "0.6rem 0.7rem", border: "1px solid #ddd", fontFamily: "inherit", fontSize: "0.85rem" };
export const buttonStyle: React.CSSProperties = { background: "#a47f50", color: "#fff", border: "none", padding: "0.65rem 1.3rem", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" };
export const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(20,20,12,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" };
export const modalStyle: React.CSSProperties = { background: "#fff", maxWidth: 420, width: "100%", padding: "2.2rem", position: "relative" };
export const closeButtonStyle: React.CSSProperties = { position: "absolute", top: "0.8rem", right: "1rem", background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#999" };
export const eyebrowStyle: React.CSSProperties = { fontSize: "0.6rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "#a47f50", marginBottom: "0.6rem" };
