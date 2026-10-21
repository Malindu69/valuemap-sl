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

const STORAGE_KEY = 'valuemap_sl_records';

// ─── Storage Layer ─────────────────────────────────────────────────────────

function loadFromStorage(): ValuationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEMO_RECORDS];
    return JSON.parse(raw) as ValuationRecord[];
  } catch {
    return [...DEMO_RECORDS];
  }
}

function saveToStorage(records: ValuationRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  notifyListeners();
}

// ─── In-Memory Cache ───────────────────────────────────────────────────────

let _records: ValuationRecord[] = loadFromStorage();

type Listener = () => void;
const _listeners = new Set<Listener>();

function notifyListeners(): void {
  _listeners.forEach((fn) => {
    try { fn(); } catch (err) { console.error('db listener error', err); }
  });
}

// ─── CRUD Operations ───────────────────────────────────────────────────────

export const db = {
  /** Subscribe to data changes (create, update, delete, restore, etc.) */
  subscribe(fn: Listener): () => void {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },

  /** Return all active (non-archived) records */
  getAll(includeArchived = false): ValuationRecord[] {
    return includeArchived ? _records : _records.filter((r) => !r.isArchived);
  },

  getById(id: string): ValuationRecord | undefined {
    return _records.find((r) => r.id === id);
  },

  create(data: Omit<ValuationRecord, 'id' | 'createdAt' | 'updatedAt' | 'pricePerPerch'>): ValuationRecord {
    const now = new Date().toISOString();
    const record: ValuationRecord = {
      ...data,
      id: generateId(),
      pricePerPerch: calculatePricePerPerch(data.totalLandValue, data.landExtent.perches),
      createdAt: now,
      updatedAt: now,
    };
    _records = [record, ..._records];
    saveToStorage(_records);
    return record;
  },

  update(id: string, data: Partial<ValuationRecord>): ValuationRecord | null {
    const idx = _records.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const updated: ValuationRecord = {
      ..._records[idx],
      ...data,
      id,
      updatedAt: new Date().toISOString(),
      pricePerPerch: calculatePricePerPerch(
        data.totalLandValue ?? _records[idx].totalLandValue,
        data.landExtent?.perches ?? _records[idx].landExtent.perches,
      ),
    };
    _records = [..._records.slice(0, idx), updated, ..._records.slice(idx + 1)];
    saveToStorage(_records);
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

  /** Permanently delete — requires confirmation from caller */
  delete(id: string): boolean {
    const before = _records.length;
    _records = _records.filter((r) => r.id !== id);
    saveToStorage(_records);
    return _records.length < before;
  },

  /** Reset to demo data */
  resetToDemo(): void {
    _records = [...DEMO_RECORDS];
    saveToStorage(_records);
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
        let va: number | string;
        let vb: number | string;
        switch (sort.field) {
          case 'valuationDate':
            va = a.valuationDate; vb = b.valuationDate; break;
          case 'pricePerPerch':
            va = a.pricePerPerch; vb = b.pricePerPerch; break;
          case 'landExtent':
            va = a.landExtent.perches; vb = b.landExtent.perches; break;
          default:
            va = a.createdAt; vb = b.createdAt;
        }
        if (va < vb) return sort.direction === 'asc' ? -1 : 1;
        if (va > vb) return sort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  },

  // ─── Area Statistics ─────────────────────────────────────────────────────

  getAreaStatistics(center: GPSCoordinates, radiusKm: SearchRadius): AreaStatistics {
    const nearby = _records.filter(
      (r) => !r.isArchived && haversineDistance(center, r.coordinates) <= radiusKm,
    );

    const prices = nearby.map((r) => r.pricePerPerch);

    const byLandType: AreaStatistics['byLandType'] = {};
    const typeGroups: Partial<Record<LandType, number[]>> = {};
    for (const r of nearby) {
      if (!typeGroups[r.landType]) typeGroups[r.landType] = [];
      typeGroups[r.landType]!.push(r.pricePerPerch);
    }
    for (const [type, vals] of Object.entries(typeGroups)) {
      byLandType[type as LandType] = {
        count: vals.length,
        median: median(vals),
      };
    }

    const sortedByDate = [...nearby].sort((a, b) =>
      b.valuationDate.localeCompare(a.valuationDate),
    );

    return {
      count: nearby.length,
      averagePricePerPerch: average(prices),
      medianPricePerPerch: median(prices),
      minPricePerPerch: prices.length ? Math.min(...prices) : 0,
      maxPricePerPerch: prices.length ? Math.max(...prices) : 0,
      mostRecentDate: sortedByDate[0]?.valuationDate ?? '',
      byLandType,
      records: sortedByDate.slice(0, 10),
      radiusKm,
      center,
      hasEnoughData: nearby.length >= MIN_RECORDS_FOR_RELIABLE_STATS,
    };
  },

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  getDashboardStats(): DashboardStats {
    const all = db.getAll();
    const prices = all.map((r) => r.pricePerPerch);

    // By district
    const districtMap: Record<string, number[]> = {};
    for (const r of all) {
      if (!districtMap[r.district]) districtMap[r.district] = [];
      districtMap[r.district].push(r.pricePerPerch);
    }
    const districtStats = Object.entries(districtMap)
      .map(([district, vals]) => ({ district, median: median(vals), count: vals.length }))
      .filter((d) => d.count >= 1)
      .sort((a, b) => b.median - a.median);

    // By land type
    const typeMap: Partial<Record<LandType, number[]>> = {};
    for (const r of all) {
      if (!typeMap[r.landType]) typeMap[r.landType] = [];
      typeMap[r.landType]!.push(r.pricePerPerch);
    }
    const byLandType = Object.entries(typeMap).map(([type, vals]) => ({
      type: type as LandType,
      count: vals.length,
      median: median(vals),
    }));

    // Monthly activity
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
      averagePricePerPerch: average(prices),
      medianPricePerPerch: median(prices),
      recentRecords,
      topDistricts: districtStats.slice(0, 5),
      bottomDistricts: [...districtStats].reverse().slice(0, 5),
      byLandType,
      monthlyActivity,
    };
  },

  // ─── Duplicate Detection ──────────────────────────────────────────────────

  findDuplicates(record: Partial<ValuationRecord>): ValuationRecord[] {
    return _records.filter((r) =>
      areLikelyDuplicates(r, record as ValuationRecord),
    );
  },

  // ─── Bulk Import ──────────────────────────────────────────────────────────

  bulkCreate(records: Omit<ValuationRecord, 'id' | 'createdAt' | 'updatedAt' | 'pricePerPerch'>[]): ValuationRecord[] {
    const created = records.map((data) => {
      const now = new Date().toISOString();
      return {
        ...data,
        id: generateId(),
        pricePerPerch: calculatePricePerPerch(data.totalLandValue, data.landExtent.perches),
        createdAt: now,
        updatedAt: now,
      } as ValuationRecord;
    });
    _records = [...created, ..._records];
    saveToStorage(_records);
    return created;
  },
};
