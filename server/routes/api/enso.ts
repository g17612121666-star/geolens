/**
 * Today's ENSO status for the ENSO lab, from NOAA's Climate Prediction Center. CPC's files send
 * no CORS headers, so the site fetches them here and caches the result at the edge for six
 * hours. No key is needed and nothing about the visitor is forwarded.
 */
const ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt";
const DISCUSSION_URL =
  "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml";

function text(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&deg;/g, "°")
    .replace(/&#37;/g, "%")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function get(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Geolens education site (ENSO lab)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}

export default async function enso() {
  try {
    const [oni, discussion] = await Promise.all([get(ONI_URL), get(DISCUSSION_URL)]);
    const rows = oni
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .filter((cols) => cols.length >= 4 && Number.isFinite(Number(cols[3])))
      .map(([season, year, , anomaly]) => ({
        season,
        year: Number(year),
        anomaly: Number(anomaly),
      }));
    const plain = text(discussion);
    const status =
      plain.match(/ENSO Alert System Status:\s*(.+?)\s*Synopsis:/)?.[1]?.trim() ?? null;
    const synopsis = plain.match(/Synopsis:\s*(.+?\.)\s/)?.[1]?.trim() ?? null;
    const issued =
      plain.match(/issued by\s+CLIMATE PREDICTION CENTER[^0-9]*(\d{1,2}\s+\w+\s+\d{4})/i)?.[1] ??
      null;
    return new Response(
      JSON.stringify({
        status,
        synopsis,
        issued,
        oni: rows.slice(-12),
        sources: { oni: ONI_URL, discussion: DISCUSSION_URL },
        fetched: new Date().toISOString(),
      }),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "NOAA's ENSO data could not be reached just now." }),
      {
        status: 502,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      },
    );
  }
}
