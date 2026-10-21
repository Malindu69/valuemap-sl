import { type ValuationRecord, type LandExtent, type GPSCoordinates } from '../types';
import { PERCHES_PER_ACRE, PERCHES_PER_ROOD } from '../constants';

// ─── Land Measurement Conversions ──────────────────────────────────────────

export function acresToPerches(acres: number): number {
  return acres * PERCHES_PER_ACRE;
}

export function perchesToAcres(perches: number): number {
  return perches / PERCHES_PER_ACRE;
}

export function parseExtentToPerches(acres = 0, roods = 0, perches = 0): number {
  return acres * PERCHES_PER_ACRE + roods * PERCHES_PER_ROOD + perches;
}

export function perchesToARP(totalPerches: number): { acres: number; roods: number; perches: number } {
  const acres = Math.floor(totalPerches / PERCHES_PER_ACRE);
  const remainder = totalPerches % PERCHES_PER_ACRE;
  const roods = Math.floor(remainder / PERCHES_PER_ROOD);
  const perches = Math.round(remainder % PERCHES_PER_ROOD);
  return { acres, roods, perches };
}

export function formatExtent(extent: LandExtent): string {
  const arp = perchesToARP(extent.perches);
  if (arp.acres > 0) {
    return `${arp.acres}A ${arp.roods}R ${arp.perches}P (${extent.perches.toFixed(2)} perches)`;
  }
  if (arp.roods > 0) {
    return `${arp.roods}R ${arp.perches}P (${extent.perches.toFixed(2)} perches)`;
  }
  return `${extent.perches.toFixed(2)} perches`;
}

// ─── Price Calculations ────────────────────────────────────────────────────

export function calculatePricePerPerch(totalValue: number, extentPerches: number): number {
  if (!extentPerches || extentPerches <= 0) return 0;
  return totalValue / extentPerches;
}

// ─── Currency Formatting ───────────────────────────────────────────────────

export function formatLKR(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 1_000_000_000) return `LKR ${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `LKR ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `LKR ${(amount / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

// ─── Date Utilities ────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

// ─── Geographical Utilities ────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng points */
export function haversineDistance(a: GPSCoordinates, b: GPSCoordinates): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinDLat * sinDLat +
          Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng,
      ),
    );
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ─── Statistics ────────────────────────────────────────────────────────────

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ─── ID Generation (UUID v4) ───────────────────────────────────────────────

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Duplicate Detection ───────────────────────────────────────────────────

export function areLikelyDuplicates(a: ValuationRecord, b: ValuationRecord): boolean {
  if (a.id === b.id) return false;
  // Same reference number
  if (a.referenceNumber && a.referenceNumber === b.referenceNumber) return true;
  // Same report reference
  if (a.reportReference && a.reportReference === b.reportReference) return true;
  // Same GPS within 10m and same date
  if (
    a.valuationDate === b.valuationDate &&
    haversineDistance(a.coordinates, b.coordinates) < 0.01
  )
    return true;
  return false;
}

// ─── Colour helpers ────────────────────────────────────────────────────────

import { PRICE_RANGE_COLORS } from '../constants';

export function colorForPrice(pricePerPerch: number): string {
  for (const range of PRICE_RANGE_COLORS) {
    if (pricePerPerch <= range.max) return range.color;
  }
  return PRICE_RANGE_COLORS[PRICE_RANGE_COLORS.length - 1].color;
}
