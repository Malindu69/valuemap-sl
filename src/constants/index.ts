import { type Province } from '../types';

// ─── Sri Lanka Geographical Data ───────────────────────────────────────────

export const SL_CENTER = { lat: 7.8731, lng: 80.7718 };
export const SL_BOUNDS = {
  north: 9.85,
  south: 5.87,
  east: 81.9,
  west: 79.65,
};

export const PROVINCES: Province[] = [
  'Western',
  'Central',
  'Southern',
  'Northern',
  'Eastern',
  'North Western',
  'North Central',
  'Uva',
  'Sabaragamuwa',
];

export const DISTRICTS_BY_PROVINCE: Record<Province, string[]> = {
  Western: ['Colombo', 'Gampaha', 'Kalutara'],
  Central: ['Kandy', 'Matale', 'Nuwara Eliya'],
  Southern: ['Galle', 'Matara', 'Hambantota'],
  Northern: ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'],
  Eastern: ['Ampara', 'Batticaloa', 'Trincomalee'],
  'North Western': ['Kurunegala', 'Puttalam'],
  'North Central': ['Anuradhapura', 'Polonnaruwa'],
  Uva: ['Badulla', 'Monaragala'],
  Sabaragamuwa: ['Kegalle', 'Ratnapura'],
};

export const ALL_DISTRICTS = Object.values(DISTRICTS_BY_PROVINCE).flat().sort();

export const DISTRICT_CENTERS: Record<string, { lat: number; lng: number }> = {
  Colombo: { lat: 6.9271, lng: 79.8612 },
  Gampaha: { lat: 7.0873, lng: 79.9993 },
  Kalutara: { lat: 6.5854, lng: 79.9607 },
  Kandy: { lat: 7.2906, lng: 80.6337 },
  Matale: { lat: 7.4675, lng: 80.6234 },
  'Nuwara Eliya': { lat: 6.9497, lng: 80.7891 },
  Galle: { lat: 6.0535, lng: 80.2210 },
  Matara: { lat: 5.9485, lng: 80.5353 },
  Hambantota: { lat: 6.1429, lng: 81.1212 },
  Jaffna: { lat: 9.6615, lng: 80.0255 },
  Kilinochchi: { lat: 9.3803, lng: 80.3770 },
  Mannar: { lat: 8.9777, lng: 79.9045 },
  Mullaitivu: { lat: 9.2740, lng: 80.8124 },
  Vavuniya: { lat: 8.7514, lng: 80.4977 },
  Ampara: { lat: 7.2981, lng: 81.6724 },
  Batticaloa: { lat: 7.7172, lng: 81.6950 },
  Trincomalee: { lat: 8.5922, lng: 81.2336 },
  Kurunegala: { lat: 7.4818, lng: 80.3609 },
  Puttalam: { lat: 8.0362, lng: 79.8283 },
  Anuradhapura: { lat: 8.3114, lng: 80.4037 },
  Polonnaruwa: { lat: 7.9403, lng: 81.0188 },
  Badulla: { lat: 6.9934, lng: 81.0550 },
  Monaragala: { lat: 6.8728, lng: 81.3497 },
  Kegalle: { lat: 7.2513, lng: 80.3464 },
  Ratnapura: { lat: 6.6828, lng: 80.4045 },
};

// ─── Constants ─────────────────────────────────────────────────────────────

export const PERCHES_PER_ACRE = 160;
export const PERCHES_PER_ROOD = 40;
export const MIN_RECORDS_FOR_RELIABLE_STATS = 3;

export const PRICE_RANGE_COLORS = [
  { max: 500_000, color: '#22c55e', label: 'Under 500K' },
  { max: 1_000_000, color: '#84cc16', label: '500K – 1M' },
  { max: 2_500_000, color: '#eab308', label: '1M – 2.5M' },
  { max: 5_000_000, color: '#f97316', label: '2.5M – 5M' },
  { max: 10_000_000, color: '#ef4444', label: '5M – 10M' },
  { max: Infinity, color: '#7c3aed', label: 'Over 10M' },
];

export const SEARCH_RADII = [
  { value: 0.5, label: '500m' },
  { value: 1, label: '1 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
] as const;

export const LAND_TYPE_LABELS: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  agricultural: 'Agricultural',
  'mixed-use': 'Mixed Use',
  industrial: 'Industrial',
};

export const ROAD_ACCESS_LABELS: Record<string, string> = {
  'main-road': 'Main Road',
  'secondary-road': 'Secondary Road',
  'gravel-road': 'Gravel Road',
  'no-road': 'No Road Access',
  lane: 'Lane',
};

export const VALUATION_PURPOSE_LABELS: Record<string, string> = {
  mortgage: 'Mortgage / Finance',
  sale: 'Sale & Purchase',
  insurance: 'Insurance',
  tax: 'Tax Assessment',
  legal: 'Legal / Court',
  other: 'Other',
};
