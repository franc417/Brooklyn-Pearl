import fs from "node:fs";
import path from "node:path";
import Script from "next/script";

// The homepage markup below is your approved design, preserved exactly as
// provided — read from _homepage-content.html rather than rewritten into
// JSX, specifically to avoid any risk of visual drift from what you signed
// off on. The only changes made to the original file were adding id/name
// attributes to form fields and removing two placeholder alert() calls, so
// the real endpoints below have something to hook into (see public/js/booking.js).
//
// Phase 2 (once Supabase has real content): the room cards and testimonials
// sections will be pulled out of this static blob and rendered as live data
// from the database, the same way booking.js already talks to /api routes.
export default function HomePage() {
  const htmlPath = path.join(process.cwd(), "src/app/_homepage-content.html");
  const html = fs.readFileSync(htmlPath, "utf-8");

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/js/site-legacy.js" strategy="afterInteractive" />
      <Script src="/js/booking.js" strategy="afterInteractive" />
    </>
  );
}
