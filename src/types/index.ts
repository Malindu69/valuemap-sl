// ─── Land Valuation Types ──────────────────────────────────────────────────

export type LandType = 'residential' | 'commercial' | 'agricultural' | 'mixed-use' | 'industrial';
export type ValuationPurpose = 'mortgage' | 'sale' | 'insurance' | 'tax' | 'legal' | 'other';
export type RoadAccess = 'main-road' | 'secondary-road' | 'gravel-road' | 'no-road' | 'lane';
export type UserRole = 'admin' | 'valuer' | 'viewer';
export type Province =
  | 'Western'
  | 'Central'
  | 'Southern'
  | 'Northern'
  | 'Eastern'
  | 'North Western'
  | 'North Central'
  | 'Uva'
  | 'Sabaragamuwa';

export interface GPSCoordinates {
  lat: number;
  lng: number;
}

export interface LandExtent {
  perches: number;       // primary stored unit
  acres?: number;
  roods?: number;
  displayPerches?: number;
}

export interface ValuationRecord {
  id: string;
  // Property details
  referenceNumber: string;
  reportReference?: string;
  title: string;
  address: string;
  province: Province;
  district: string;
  divisionalSecretariat?: string;
  town: string;
  coordinates: GPSCoordinates;
  landExtent: LandExtent;
  landType: LandType;
  roadAccess: RoadAccess;
  propertyCharacteristics?: string;

  // Valuation details
  valuationDate: string;           // ISO date string
  totalLandValue: number;          // LKR
  pricePerPerch: number;           // auto-calculated
  valuerName?: string;
  valuationPurpose?: ValuationPurpose;
  notes?: string;
  attachments?: string[];          // file URLs / base64 refs

  // Meta
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  isArchived: boolean;
  isDemoData: boolean;             // marks sample records
}

export interface AreaStatistics {
  count: number;
  averagePricePerPerch: number;
  medianPricePerPerch: number;
  minPricePerPerch: number;
  maxPricePerPerch: number;
  mostRecentDate: string;
  byLandType: Partial<Record<LandType, { count: number; median: number }>>;
  records: ValuationRecord[];
  radiusKm: number;
  center: GPSCoordinates;
  hasEnoughData: boolean;         // true when count >= MIN_RECORDS_FOR_RELIABLE_STATS
}

// ─── User / Auth Types ─────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}

// ─── Filter / Search Types ─────────────────────────────────────────────────

export interface ValuationFilters {
  search?: string;
  province?: Province;
  district?: string;
  town?: string;
  landType?: LandType;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  showArchived?: boolean;
}

export type SortField = 'valuationDate' | 'pricePerPerch' | 'landExtent' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// ─── Map Types ─────────────────────────────────────────────────────────────

export type MapMode = 'markers' | 'heatmap' | 'price-range';
export type SearchRadius = 0.5 | 1 | 3 | 5;

export interface MapState {
  mode: MapMode;
  selectedRecord: ValuationRecord | null;
  clickedLocation: GPSCoordinates | null;
  searchRadius: SearchRadius;
  filters: ValuationFilters;
}

// ─── Dashboard Types ───────────────────────────────────────────────────────

export interface DashboardStats {
  totalRecords: number;
  totalDistricts: number;
  averagePricePerPerch: number;
  medianPricePerPerch: number;
  recentRecords: ValuationRecord[];
  topDistricts: { district: string; median: number; count: number }[];
  bottomDistricts: { district: string; median: number; count: number }[];
  byLandType: { type: LandType; count: number; median: number }[];
  monthlyActivity: { month: string; count: number }[];
}

// ─── Import / Export ───────────────────────────────────────────────────────

export interface ImportRow {
  referenceNumber: string;
  title: string;
  address: string;
  province: string;
  district: string;
  town: string;
  lat: number;
  lng: number;
  perches: number;
  landType: string;
  roadAccess: string;
  valuationDate: string;
  totalLandValue: number;
  valuerName?: string;
  notes?: string;
}

export interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
  duplicates: { row: number; existingId: string }[];
}
