import Link from "next/link";

// Reuses the exact .section-label / .section-title / .section-body /
// .exp-grid / .exp-item / .exp-icon classes already defined in globals.css
// for the "experience" section — guarantees pixel-consistent styling
// without writing a single new CSS rule. Inserted between #experience and
// #dining in page.tsx (see the split-and-splice there), not appended to
// the end, so it reads as part of the page rather than bolted on.
export default function DiscoverMoreSection() {
  const items = [
    {
      href: "/swimming",
      title: "Swimming",
      body: "Book a session by the pool, solo or with a group.",
      icon: (
        <svg viewBox="0 0 24 24"><path d="M2 12c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" /><path d="M2 17c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0 3-1.5 4.5 0 3 1.5 4.5 0" /><circle cx="12" cy="6" r="2" /></svg>
      ),
    },
    {
      href: "/restaurant",
      title: "Restaurant",
      body: "Reserve a table and browse the full menu online.",
      icon: (
        <svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h1v11" /><path d="M9 2v20" /><path d="M15 2c-1.1 0-2 3-2 6s.9 6 2 6 2-3 2-6-.9-6-2-6z" /><path d="M15 14v8" /></svg>
      ),
    },
    {
      href: "/events",
      title: "Events",
      body: "See what's happening and reserve your spot.",
      icon: (
        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      ),
    },
    {
      href: "/offers",
      title: "Offers",
      body: "Current promotions and rewards for guests.",
      icon: (
        <svg viewBox="0 0 24 24"><path d="M20.59 13.41L13.42 20.6a2 2 0 01-2.83 0L2.59 12.6A2 2 0 012 11.17V4a2 2 0 012-2h7.17a2 2 0 011.42.59l7.99 8a2.003 2.003 0 010 2.82z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
      ),
    },
  ];

  return (
    <section id="discover-more" style={{ background: "var(--dark)", padding: "6rem 4rem" }}>
      <div style={{ textAlign: "center", maxWidth: 620, margin: "0 auto" }}>
        <p className="section-label" style={{ color: "var(--gold-light)" }}>Explore More</p>
        <h2 className="section-title" style={{ color: "var(--white)" }}>
          Beyond Your <em>Room</em>
        </h2>
        <p className="section-body" style={{ color: "rgba(255,255,255,0.6)", margin: "0 auto" }}>
          Swimming, dining, celebrations, and rewards — all part of the Brooklyn Pearl stay.
        </p>
      </div>
      <div className="exp-grid reveal">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="exp-item"
            style={{ textDecoration: "none", color: "inherit", display: "block", cursor: "pointer" }}
          >
            <div className="exp-icon">{item.icon}</div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
