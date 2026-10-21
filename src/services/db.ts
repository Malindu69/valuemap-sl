import {
  type ValuationRecord,
  type ValuationFilters,
  type SortConfig,
  type AreaStatistics,
  type DashboardStats,
  type GPSCoordinates,
  type SearchRadius,
  type LandType,
} from '../types';
import {
  generateId,
  haversineDistance,
  median,
  average,
  monthKey,
  areLikelyDuplicates,
  calculatePricePerPerch,
} from '../utils';
import { DEMO_RECORDS } from '../data/demoRecords';
import { MIN_RECORDS_FOR_RELIABLE_STATS } from '../constants';
import { supabase, isSupabaseConfigured } from './supabase';

export type AppEnvironment = 'live' | 'demo';

const LIVE_STORAGE_KEY = 'valuemap_sl_records_live_v2';
const DEMO_STORAGE_KEY = 'valuemap_sl_records_demo_v2';
const ENV_STORAGE_KEY = 'valuemap_sl_env_mode_v2';

// ─── Environment Detection ─────────────────────────────────────────────────

function detectInitialEnv(): AppEnvironment {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true' || params.get('mode') === 'demo') {
      return 'demo';
    }
    const saved = localStorage.getItem(ENV_STORAGE_KEY);
    if (saved === 'live' || saved === 'demo') {
      return saved;
    }
  }
  return 'live';
}

let _currentEnv: AppEnvironment = detectInitialEnv();

// ─── Row Mappers for Supabase ──────────────────────────────────────────────

function toRow(r: ValuationRecord) {
  return {
    id: r.id,
    reference_number: r.referenceNumber,
    report_reference: r.reportReference || null,
    title: r.title,
    address: r.address,
    province: r.province,
    district: r.district,
    divisional_secretariat: r.divisionalSecretariat || null,
    town: r.town,
    latitude: r.coordinates.lat,
    longitude: r.coordinates.lng,
    extent_perches: r.landExtent.perches,
    land_type: r.landType,
    road_access: r.roadAccess,
    property_characteristics: r.propertyCharacteristics || null,
    valuation_date: r.valuationDate,
    total_land_value: r.totalLandValue,
    price_per_perch: r.pricePerPerch,
    valuer_name: r.valuerName || null,
    valuation_purpose: r.valuationPurpose || null,
    notes: r.notes || null,
    is_archived: r.isArchived,
    is_demo_data: r.isDemoData,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function fromRow(row: any): ValuationRecord {
  return {
    id: String(row.id),
    referenceNumber: row.reference_number,
    reportReference: row.report_reference ?? undefined,
    title: row.title,
    address: row.address,
    province: row.province,
    district: row.district,
    divisionalSecretariat: row.divisional_secretariat ?? undefined,
    town: row.town,
    coordinates: {
      lat: Number(row.latitude) || 0,
      lng: Number(row.longitude) || 0,
    },
    landExtent: {
      perches: Number(row.extent_perches) || 0,
    },
    landType: row.land_type,
    roadAccess: row.road_access,
    propertyCharacteristics: row.property_characteristics ?? undefined,
    valuationDate: row.valuation_date,
    totalLandValue: Number(row.total_land_value) || 0,
    pricePerPerch: Number(row.price_per_perch) || 0,
    valuerName: row.valuer_name ?? undefined,
    valuationPurpose: row.valuation_purpose ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by ?? 'system',
    isArchived: Boolean(row.is_archived),
    isDemoData: Boolean(row.is_demo_data),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

// ─── Storage Layer ─────────────────────────────────────────────────────────

function loadFromStorage(env: AppEnvironment): ValuationRecord[] {
  try {
    const key = env === 'live' ? LIVE_STORAGE_KEY : DEMO_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return env === 'demo' ? [...DEMO_RECORDS] : [];
    }
    return JSON.parse(raw) as ValuationRecord[];
  } catch {
    return env === 'demo' ? [...DEMO_RECORDS] : [];
  }
}

function saveToStorage(records: ValuationRecord[], env: AppEnvironment = _currentEnv): void {
  const key = env === 'live' ? LIVE_STORAGE_KEY : DEMO_STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(records));
  notifyListeners();
}

// ─── In-Memory Cache ───────────────────────────────────────────────────────

let _liveRecords: ValuationRecord[] = loadFromStorage('live');
let _demoRecords: ValuationRecord[] = loadFromStorage('demo');

function getActiveList(): ValuationRecord[] {
  return _currentEnv === 'live' ? _liveRecords : _demoRecords;
}

function setActiveList(records: ValuationRecord[]): void {
  if (_currentEnv === 'live') {
    _liveRecords = records;
  } else {
    _demoRecords = records;
  }
  saveToStorage(records, _currentEnv);
}

type Listener = () => void;
const _listeners = new Set<Listener>();

function notifyListeners(): void {
  _listeners.forEach((fn) => {
    try { fn(); } catch (err) { console.error('db listener error', err); }
  });
}

// ─── Supabase Sync (Live Mode Only) ────────────────────────────────────────

async function initSupabaseLiveSync(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data, error } = await supabase.from('valuation_records').select('*');
    if (error) {
      console.warn('Supabase query notice:', error.message);
      return;
    }
    if (data) {
      _liveRecords = data.map(fromRow);
      localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(_liveRecords));
      notifyListeners();
    }
  } catch (err) {
    console.warn('Supabase sync notice:', err);
  }
}

if (typeof window !== 'undefined') {
  initSupabaseLiveSync();
}

// ─── CRUD Operations ───────────────────────────────────────────────────────

export const db = {
  /** Get current environment mode */
  getEnvironment(): AppEnvironment {
    return _currentEnv;
  },

  /** Switch environment between 'live' and 'demo' */
  setEnvironment(env: AppEnvironment): void {
    _currentEnv = env;
    if (typeof window !== 'undefined') {
      localStorage.setItem(ENV_STORAGE_KEY, env);
    }
    if (env === 'live') {
      initSupabaseLiveSync();
    }
    notifyListeners();
  },

  /** Subscribe to data or environment changes */
  subscribe(fn: Listener): () => void {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },

  /** Manual sync with Supabase (Live mode) */
  async syncWithSupabase(): Promise<void> {
    if (_currentEnv === 'live') {
      await initSupabaseLiveSync();
    }
  },

  /** Clear all records in the live database */
  async cleanLiveDatabase(): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('valuation_records')
          .delete()
          .neq('reference_number', '__placeholder_never_matches__');
      } catch (err) {
        console.warn('Supabase clean warning:', err);
      }
    }
    _liveRecords = [];
    saveToStorage([], 'live');
    return true;
  },

  /** Reset demo sandbox to default 15 sample records */
  resetDemoData(): void {
    _demoRecords = [...DEMO_RECORDS];
    saveToStorage(_demoRecords, 'demo');
  },

  /** Return all active records in the current environment */
  getAll(includeArchived = false): ValuationRecord[] {
    const records = getActiveList();
    return includeArchived ? records : records.filter((r) => !r.isArchived);
  },

  getById(id: string): ValuationRecord | undefined {
    return getActiveList().find((r) => r.id === id);
  },

  create(data: Omit<ValuationRecord, 'id' | 'createdAt' | 'updatedAt' | 'pricePerPerch'>): ValuationRecord {
    const now = new Date().toISOString();
    const isLive = _currentEnv === 'live';
    const record: ValuationRecord = {
      ...data,
      id: generateId(),
      pricePerPerch: calculatePricePerPerch(data.totalLandValue, data.landExtent.perches),
      createdAt: now,
      updatedAt: now,
      isDemoData: !isLive,
    };

    const updated = [record, ...getActiveList()];
    setActiveList(updated);

    if (isLive && isSupabaseConfigured) {
      supabase.from('valuation_records').insert([toRow(record)]).then(({ error }) => {
        if (error) console.warn('Supabase sync warning:', error.message);
      });
    }

    return record;
  },

  update(id: string, data: Partial<ValuationRecord>): ValuationRecord | null {
    const list = getActiveList();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated: ValuationRecord = {
      ...list[idx],
      ...data,
      id,
      updatedAt: new Date().toISOString(),
      pricePerPerch: calculatePricePerPerch(
        data.totalLandValue ?? list[idx].totalLandValue,
        data.landExtent?.perches ?? list[idx].landExtent.perches,
      ),
    };
    const newList = [...list.slice(0, idx), updated, ...list.slice(idx + 1)];
    setActiveList(newList);

    if (_currentEnv === 'live' && isSupabaseConfigured) {
      supabase.from('valuation_records').update(toRow(updated)).eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase sync warning:', error.message);
      });
    }

    return updated;
  },

  archive(id: string): boolean {
    const updated = db.update(id, { isArchived: true });
    return updated !== null;
  },

  restore(id: string): boolean {
    const updated = db.update(id, { isArchived: false });
    return updated !== null;
  },

  delete(id: string): boolean {
    const list = getActiveList();
    const before = list.length;
    const newList = list.filter((r) => r.id !== id);
    setActiveList(newList);

    if (_currentEnv === 'live' && isSupabaseConfigured) {
      supabase.from('valuation_records').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase delete warning:', error.message);
      });
    }

    return newList.length < before;
  },

  resetToDemo(): void {
    if (_currentEnv === 'demo') {
      db.resetDemoData();
    }
  },

  // ─── Filtering & Sorting ─────────────────────────────────────────────────

  filter(filters: ValuationFilters, sort?: SortConfig): ValuationRecord[] {
    let result = db.getAll(filters.showArchived);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.address.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.referenceNumber.toLowerCase().includes(q) ||
          (r.reportReference ?? '').toLowerCase().includes(q) ||
          r.town.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q),
      );
    }
    if (filters.province) result = result.filter((r) => r.province === filters.province);
    if (filters.district) result = result.filter((r) => r.district === filters.district);
    if (filters.town) {
      const t = filters.town.toLowerCase();
      result = result.filter((r) => r.town.toLowerCase().includes(t));
    }
    if (filters.landType) result = result.filter((r) => r.landType === filters.landType);
    if (filters.dateFrom) result = result.filter((r) => r.valuationDate >= filters.dateFrom!);
    if (filters.dateTo) result = result.filter((r) => r.valuationDate <= filters.dateTo!);
    if (filters.priceMin) result = result.filter((r) => r.pricePerPerch >= filters.priceMin!);
    if (filters.priceMax) result = result.filter((r) => r.pricePerPerch <= filters.priceMax!);

    if (sort) {
      result = [...result].sort((a, b) => {
        let va: string | number = a[sort.field] as string | number;
        let vb: string | number = b[sort.field] as string | number;
        if (sort.field === 'landExtent') {
          va = a.landExtent.perches;
          vb = b.landExtent.perches;
        }
        if (typeof va === 'string') {
          return sort.direction === 'asc'
            ? (va as string).localeCompare(vb as string)
            : (vb as string).localeCompare(va as string);
        }
        return sort.direction === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
      });
    }

    return result;
  },

  // ─── Area Statistics ──────────────────────────────────────────────────────

  getAreaStatistics(center: GPSCoordinates, radiusKm: SearchRadius): AreaStatistics {
    const all = db.getAll();
    const recordsWithDistance = all
      .map((r) => ({ record: r, distance: haversineDistance(center, r.coordinates) }))
      .filter(({ distance }) => distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    const nearbyRecords = recordsWithDistance.map(({ record }) => record);
    const count = nearbyRecords.length;
    const prices = nearbyRecords.map((r) => r.pricePerPerch);

    const byLandType: AreaStatistics['byLandType'] = {};
    for (const r of nearbyRecords) {
      if (!byLandType[r.landType]) {
        const typeRecords = nearbyRecords.filter((x) => x.landType === r.landType);
        const typePrices = typeRecords.map((x) => x.pricePerPerch);
        byLandType[r.landType] = {
          count: typeRecords.length,
          median: median(typePrices),
        };
      }
    }

    const dates = nearbyRecords.map((r) => r.valuationDate).sort();
    const mostRecentDate = dates[dates.length - 1] ?? '';

    return {
      center,
      radiusKm,
      count,
      medianPricePerPerch: median(prices),
      averagePricePerPerch: average(prices),
      minPricePerPerch: prices.length ? Math.min(...prices) : 0,
      maxPricePerPerch: prices.length ? Math.max(...prices) : 0,
      records: nearbyRecords,
      byLandType,
      mostRecentDate,
      hasEnoughData: count >= MIN_RECORDS_FOR_RELIABLE_STATS,
    };
  },

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  getDashboardStats(): DashboardStats {
    const all = db.getAll();
    const prices = all.map((r) => r.pricePerPerch);

    const districtMap: Record<string, number[]> = {};
    for (const r of all) {
      if (!districtMap[r.district]) districtMap[r.district] = [];
      districtMap[r.district].push(r.pricePerPerch);
    }

    const districtStats = Object.entries(districtMap).map(([district, p]) => ({
      district,
      count: p.length,
      median: median(p),
      average: average(p),
    }));

    const typeCount: Record<string, number> = {};
    for (const r of all) {
      typeCount[r.landType] = (typeCount[r.landType] ?? 0) + 1;
    }
    const byLandType = Object.entries(typeCount).map(([type, count]) => {
      const typePrices = all.filter((r) => r.landType === type).map((r) => r.pricePerPerch);
      return {
        type: type as LandType,
        count,
        median: median(typePrices),
      };
    });

    const monthMap: Record<string, number> = {};
    for (const r of all) {
      const k = monthKey(r.valuationDate);
      monthMap[k] = (monthMap[k] ?? 0) + 1;
    }
    const monthlyActivity = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }))
      .slice(-12);

    const recentRecords = [...all]
      .sort((a, b) => b.valuationDate.localeCompare(a.valuationDate))
      .slice(0, 5);

    return {
      totalRecords: all.length,
      totalDistricts: Object.keys(districtMap).length,
      averagePricePerPerch: prices.length ? average(prices) : 0,
      medianPricePerPerch: prices.length ? median(prices) : 0,
      recentRecords,
      topDistricts: districtStats.slice(0, 5),
      bottomDistricts: [...districtStats].reverse().slice(0, 5),
      byLandType,
      monthlyActivity,
    };
  },

  // ─── Duplicate Detection ──────────────────────────────────────────────────

  findDuplicates(record: Partial<ValuationRecord>): ValuationRecord[] {
    return getActiveList().filter((r) =>
      areLikelyDuplicates(r, record as ValuationRecord),
    );
  },

  // ─── Bulk Import ──────────────────────────────────────────────────────────

  bulkCreate(records: Omit<ValuationRecord, 'id' | 'createdAt' | 'updatedAt' | 'pricePerPerch'>[]): ValuationRecord[] {
    const now = new Date().toISOString();
    const isLive = _currentEnv === 'live';
    const created = records.map((data) => ({
      ...data,
      id: generateId(),
      pricePerPerch: calculatePricePerPerch(data.totalLandValue, data.landExtent.perches),
      createdAt: now,
      updatedAt: now,
      isDemoData: !isLive,
    } as ValuationRecord));

    const updated = [...created, ...getActiveList()];
    setActiveList(updated);

    if (isLive && isSupabaseConfigured) {
      supabase.from('valuation_records').insert(created.map(toRow)).then(({ error }) => {
        if (error) console.warn('Supabase bulk insert warning:', error.message);
      });
    }

    return created;
  },
};
