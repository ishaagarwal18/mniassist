/**
 * Master Data definitions for Industrial Accounts:
 * - Industry categories
 * - States and Union Territories
 * - Major industrial cities and manufacturing clusters per state
 */

export const MASTER_INDUSTRIES = [
  'Aerospace & Defence',
  'Automotive & Auto Components',
  'Cement & Building Materials',
  'Chemicals & Petrochemicals',
  'Electrical & Electronics',
  'Food & Beverage',
  'Machine Tools & Industrial Machinery',
  'Mining & Heavy Equipment',
  'Packaging & Printing',
  'Panel Building & Switchgear',
  'Pharmaceuticals & Healthcare',
  'Plastics & Polymers',
  'Power & Renewable Energy',
  'Process Instrumentation & Automation',
  'Pumps & Compressors',
  'Sheet Metal & Heavy Forging',
  'Steel & Metals',
  'Textiles & Apparel',
  'Valves & Actuators',
  'Water & Wastewater Treatment',
  'Other',
] as const;

export type MasterIndustry = (typeof MASTER_INDUSTRIES)[number];

export interface StateMaster {
  code: string;
  name: string;
  cities: readonly string[];
}

export const MASTER_STATES: readonly StateMaster[] = [
  {
    code: '27',
    name: 'Maharashtra',
    cities: [
      'Pune',
      'Mumbai',
      'Thane',
      'Navi Mumbai',
      'Nashik',
      'Chhatrapati Sambhajinagar (Aurangabad)',
      'Nagpur',
      'Kolhapur',
      'Solapur',
      'Ahmednagar',
      'Pimpri-Chinchwad',
      'Vasai-Virar',
      'Tarapur',
      'Waluj',
      'Bhosari',
      'Chakan',
    ],
  },
  {
    code: '24',
    name: 'Gujarat',
    cities: [
      'Ahmedabad',
      'Vadodara',
      'Surat',
      'Rajkot',
      'Sanand',
      'Bharuch',
      'Ankleshwar',
      'Gandhinagar',
      'Jamnagar',
      'Bhavnagar',
      'Vapi',
      'Morbi',
      'Hazira',
      'Dahej',
      'Halol',
    ],
  },
  {
    code: '29',
    name: 'Karnataka',
    cities: [
      'Bengaluru',
      'Mysuru',
      'Hubballi-Dharwad',
      'Belagavi',
      'Mangaluru',
      'Tumakuru',
      'Ballari',
      'Shivamogga',
      'Hosapete',
      'Peenya',
      'Bidadi',
    ],
  },
  {
    code: '33',
    name: 'Tamil Nadu',
    cities: [
      'Chennai',
      'Coimbatore',
      'Hosur',
      'Madurai',
      'Tiruchirappalli',
      'Salem',
      'Tiruppur',
      'Erode',
      'Vellore',
      'Ranipet',
      'Sriperumbudur',
      'Oragadam',
    ],
  },
  {
    code: '07',
    name: 'Delhi',
    cities: ['New Delhi', 'Okhla', 'Naraina', 'Mayapuri', 'Bawana', 'Patparganj', 'Kirti Nagar'],
  },
  {
    code: '06',
    name: 'Haryana',
    cities: [
      'Gurugram',
      'Faridabad',
      'Manesar',
      'Panipat',
      'Sonipat',
      'Ambala',
      'Rohtak',
      'Bahadurgarh',
      'Dharuhera',
      'Kundli',
    ],
  },
  {
    code: '09',
    name: 'Uttar Pradesh',
    cities: [
      'Noida',
      'Greater Noida',
      'Kanpur',
      'Lucknow',
      'Ghaziabad',
      'Agra',
      'Meerut',
      'Varanasi',
      'Aligarh',
      'Mathura',
    ],
  },
  {
    code: '36',
    name: 'Telangana',
    cities: [
      'Hyderabad',
      'Secunderabad',
      'Warangal',
      'Medak',
      'Sangareddy',
      'Karimnagar',
      'Nizamabad',
    ],
  },
  {
    code: '37',
    name: 'Andhra Pradesh',
    cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati', 'Sri City', 'Nellore', 'Kakinada'],
  },
  {
    code: '23',
    name: 'Madhya Pradesh',
    cities: ['Indore', 'Bhopal', 'Pithampur', 'Jabalpur', 'Gwalior', 'Dewas', 'Ujjain'],
  },
  {
    code: '08',
    name: 'Rajasthan',
    cities: ['Jaipur', 'Bhiwadi', 'Neemrana', 'Kota', 'Jodhpur', 'Udaipur', 'Alwar', 'Ajmer'],
  },
  {
    code: '03',
    name: 'Punjab',
    cities: [
      'Ludhiana',
      'Jalandhar',
      'Amritsar',
      'Mohali',
      'Mandi Gobindgarh',
      'Patiala',
      'Bathinda',
    ],
  },
  {
    code: '19',
    name: 'West Bengal',
    cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Haldia', 'Kalyani', 'Siliguri'],
  },
  {
    code: '22',
    name: 'Chhattisgarh',
    cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Raigarh', 'Durg', 'Korba'],
  },
  {
    code: '21',
    name: 'Odisha',
    cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Angul', 'Jharsuguda', 'Balasore'],
  },
  {
    code: '20',
    name: 'Jharkhand',
    cities: ['Jamshedpur', 'Ranchi', 'Bokaro', 'Dhanbad', 'Adityapur'],
  },
  {
    code: '32',
    name: 'Kerala',
    cities: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Palakkad', 'Alappuzha'],
  },
  {
    code: '05',
    name: 'Uttarakhand',
    cities: ['Dehradun', 'Haridwar', 'Pantnagar', 'Rudrapur', 'Roorkee', 'Kashipur'],
  },
  {
    code: '02',
    name: 'Himachal Pradesh',
    cities: ['Baddi', 'Nalagarh', 'Parwanoo', 'Solan', 'Shimla', 'Kala Amb'],
  },
  {
    code: '30',
    name: 'Goa',
    cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Kundaim', 'Verna', 'Mapusa'],
  },
  {
    code: '18',
    name: 'Assam',
    cities: ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tinsukia'],
  },
  {
    code: '10',
    name: 'Bihar',
    cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia'],
  },
  {
    code: '04',
    name: 'Chandigarh',
    cities: ['Chandigarh'],
  },
  {
    code: '01',
    name: 'Jammu and Kashmir',
    cities: ['Srinagar', 'Jammu', 'Bari Brahmana', 'Kathua'],
  },
  {
    code: '34',
    name: 'Puducherry',
    cities: ['Puducherry', 'Karaikal'],
  },
  {
    code: '26',
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    cities: ['Silvassa', 'Daman', 'Diu'],
  },
];

export interface CustomCity {
  cityName: string;
  stateName?: string | null;
}

const STORAGE_KEY_INDUSTRIES = 'ar_custom_industries';
const STORAGE_KEY_CITIES = 'ar_custom_cities';

let inMemoryCustomIndustries: string[] | null = null;
let inMemoryCustomCities: CustomCity[] | null = null;

function loadStoredIndustries(): string[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY_INDUSTRIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

function saveStoredIndustries(items: readonly string[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_INDUSTRIES, JSON.stringify(items));
    }
  } catch {}
}

function loadStoredCities(): CustomCity[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(STORAGE_KEY_CITIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

function saveStoredCities(items: readonly CustomCity[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY_CITIES, JSON.stringify(items));
    }
  } catch {}
}

export function getCustomIndustries(): readonly string[] {
  if (inMemoryCustomIndustries === null) {
    inMemoryCustomIndustries = loadStoredIndustries();
  }
  return inMemoryCustomIndustries;
}

export function addCustomIndustry(name: string): string {
  const clean = name.trim();
  if (!clean) return '';
  const current = [...getCustomIndustries()];
  if (!current.some((i) => i.toLowerCase() === clean.toLowerCase())) {
    current.push(clean);
    inMemoryCustomIndustries = current;
    saveStoredIndustries(current);
  }
  return clean;
}

export function getCustomCities(): readonly CustomCity[] {
  if (inMemoryCustomCities === null) {
    inMemoryCustomCities = loadStoredCities();
  }
  return inMemoryCustomCities;
}

export function addCustomCity(cityName: string, stateName?: string | null): string {
  const cleanCity = cityName.trim();
  if (!cleanCity) return '';
  const cleanState = stateName ? stateName.trim() : null;
  const current = [...getCustomCities()];
  const exists = current.some(
    (c) =>
      c.cityName.toLowerCase() === cleanCity.toLowerCase() &&
      (!cleanState || !c.stateName || c.stateName.toLowerCase() === cleanState.toLowerCase()),
  );
  if (!exists) {
    current.push({ cityName: cleanCity, stateName: cleanState });
    inMemoryCustomCities = current;
    saveStoredCities(current);
  }
  return cleanCity;
}

export function resetCustomMasterData(): void {
  inMemoryCustomIndustries = [];
  inMemoryCustomCities = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY_INDUSTRIES);
      localStorage.removeItem(STORAGE_KEY_CITIES);
    }
  } catch {}
}

export function getMasterIndustries(): readonly string[] {
  const custom = getCustomIndustries();
  const base = MASTER_INDUSTRIES.filter((i) => i !== 'Other');
  const set = new Map<string, string>();
  for (const b of base) {
    set.set(b.toLowerCase(), b);
  }
  for (const c of custom) {
    if (!set.has(c.toLowerCase())) {
      set.set(c.toLowerCase(), c);
    }
  }
  const sorted = Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  return [...sorted, 'Other'];
}

export function getMasterStateNames(): readonly string[] {
  return MASTER_STATES.map((s) => s.name);
}

export function getCitiesForState(stateName?: string | null): readonly string[] {
  const custom = getCustomCities();
  if (!stateName) {
    const all = new Set(getAllMasterCities());
    for (const c of custom) {
      all.add(c.cityName);
    }
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }
  const targetState = stateName.trim().toLowerCase();
  const match = MASTER_STATES.find(
    (s) => s.name.toLowerCase() === targetState,
  );
  const citiesSet = new Set<string>(match ? match.cities : []);
  for (const c of custom) {
    if (!c.stateName || c.stateName.toLowerCase() === targetState) {
      citiesSet.add(c.cityName);
    }
  }
  return Array.from(citiesSet).sort((a, b) => a.localeCompare(b));
}

export function getAllMasterCities(): readonly string[] {
  const set = new Set<string>();
  for (const s of MASTER_STATES) {
    for (const c of s.cities) {
      set.add(c);
    }
  }
  const custom = getCustomCities();
  for (const c of custom) {
    set.add(c.cityName);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getStateForCity(cityName?: string | null): string | null {
  if (!cityName) return null;
  const target = cityName.trim().toLowerCase();
  for (const s of MASTER_STATES) {
    if (s.cities.some((c) => c.toLowerCase() === target)) {
      return s.name;
    }
  }
  const custom = getCustomCities();
  const match = custom.find((c) => c.cityName.toLowerCase() === target && c.stateName);
  return match?.stateName ?? null;
}
