/** NOAA Climate Prediction Center three-month seasons, for readers. */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/**
 * NOAA's three-month seasons ("ASO 2026") in words. A season that crosses the new year belongs to
 * the year of its middle month: "DJF 2026" runs from December 2025 to February 2026.
 */
export function seasonWords(season: string, year: number): string {
  const start = "JFMAMJJASONDJF".indexOf(season);
  if (season.length !== 3 || start < 0) return `${season} ${year}`;
  const first = start % 12,
    last = (start + 2) % 12,
    middleYear = year,
    firstYear = first > (start + 1) % 12 ? middleYear - 1 : middleYear,
    lastYear = last < (start + 1) % 12 ? middleYear + 1 : middleYear;
  return firstYear === lastYear
    ? `${MONTHS[first]} to ${MONTHS[last]} ${lastYear}`
    : `${MONTHS[first]} ${firstYear} to ${MONTHS[last]} ${lastYear}`;
}
