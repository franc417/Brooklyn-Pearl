import fs from "node:fs";
import path from "node:path";
import Script from "next/script";
import EventsTicker from "@/components/EventsTicker";
import DiscoverMoreSection from "@/components/DiscoverMoreSection";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Without this, Next.js may statically prerender this page at build time
// since it can't tell the Supabase client's internal fetches need to be
// re-run per-request — which would freeze the events ticker to whatever
// existed at build time and never show newly-featured events until the
// next deploy. force-dynamic guarantees it re-fetches on every request.
export const dynamic = "force-dynamic";

// The homepage markup below is your approved design, preserved exactly as
// provided — read from _homepage-content.html rather than rewritten into
// JSX, specifically to avoid any risk of visual drift from what you signed
// off on. The only changes made to the original file were adding id/name
// attributes to form fields and removing two placeholder alert() calls, so
// the real endpoints below have something to hook into (see public/js/booking.js).
//
// Phase 7: split at the exact boundary between the "experience" and
// "dining" sections so DiscoverMoreSection can be inserted genuinely
// between them — not appended to the end — while both halves of the
// original file remain byte-for-byte unmodified strings.
const SPLIT_MARKER = '<section id="dining">';

export default async function HomePage() {
  const htmlPath = path.join(process.cwd(), "src/app/_homepage-content.html");
  const html = fs.readFileSync(htmlPath, "utf-8");

  const splitIndex = html.indexOf(SPLIT_MARKER);
  const beforeDining = splitIndex === -1 ? html : html.slice(0, splitIndex);
  const fromDining = splitIndex === -1 ? "" : html.slice(splitIndex);

  // Featured events for the sliding announcement — fetched here, ABOVE the
  // preserved markup below, so the approved design itself stays untouched.
  const supabase = createServiceRoleClient();
  const { data: featuredEvents } = await supabase
    .from("events")
    .select("name, slug, event_date")
    .eq("is_published", true)
    .eq("is_featured", true)
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true })
    .limit(5);

  const hasTicker = (featuredEvents ?? []).length > 0;

  return (
    <div className={hasTicker ? "has-ticker" : undefined}>
      <EventsTicker events={featuredEvents ?? []} />
      <div dangerouslySetInnerHTML={{ __html: beforeDining }} />
      <DiscoverMoreSection />
      <div dangerouslySetInnerHTML={{ __html: fromDining }} />
      <Script src="/js/site-legacy.js" strategy="afterInteractive" />
      <Script src="/js/booking.js" strategy="afterInteractive" />
    </div>
  );
}
