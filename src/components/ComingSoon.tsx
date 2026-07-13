import Link from "next/link";
import { PageHeader } from "@/components/shared-ui";

// Deliberately a placeholder, not a fake "book now" page — these services
// aren't built yet, and pretending they are would let a guest try to
// interact with something that doesn't exist. Nav/footer links point here
// so the site's structure already reflects the planned service catalog.
export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <main style={{ fontFamily: "'Montserrat', sans-serif", minHeight: "100vh", background: "#f8f4ee" }}>
      <PageHeader title={title} tagline="Coming soon" />
      <section style={{ maxWidth: 560, margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <p style={{ color: "#666", lineHeight: 1.7, marginBottom: "2rem" }}>{description}</p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "0.8rem 2rem",
            border: "1px solid #a47f50",
            color: "#a47f50",
            textDecoration: "none",
            fontSize: "0.72rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
