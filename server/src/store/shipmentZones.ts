import { SHIPMENT_ZONES, ShipmentZone } from './types';

const ZONE_KEYWORDS: Array<[RegExp, ShipmentZone]> = [
  [/eljem|el\s*jem|mahdia|chebba|souassi|boumerdes/i, 'Eljem'],
  [/sousse|monastir|kairouan|moknine|ksar\s*hellal|bouficha|takelsa|mahres|lamta/i, 'Sousse'],
  [/sfax|gab[eè]s|m[eé]denine|tataouine|gafsa|k[eé]bili|tozeur|sid[iï]\s*bouzid|kasserine|skhira|sbeitla|feriana/i, 'Sfax'],
  [/tunis|ariana|ben\s*arous|manouba|bizerte|zaghouan|nabeul|beja|b[jé]a|jendouba|kef|siliana|kap\b|la\s*goulette|hammam[- ]?lif|carthage|rad[eè]s|marsa|ben\s*akious?/i, 'Tunis'],
];

export function inferShipmentZone(governorate?: string | null, city?: string | null): ShipmentZone | null {
  for (const value of [city, governorate]) {
    const text = (value ?? '').toLowerCase();
    if (!text) continue;
    for (const [re, zone] of ZONE_KEYWORDS) {
      if (re.test(text)) return zone;
    }
  }
  return null;
}

export function isShipmentZone(value: unknown): value is ShipmentZone {
  return typeof value === 'string' && (SHIPMENT_ZONES as readonly string[]).includes(value);
}

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow === 5 || dow === 0) continue; // skip Friday, Sunday
    added++;
  }
  return d;
}
