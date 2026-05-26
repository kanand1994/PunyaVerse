// Region utilities
export const REGIONS = [
  { value: "north_india", label: "North India" },
  { value: "east_india", label: "East India" },
  { value: "west_india", label: "West India" },
  { value: "central_india", label: "Central India" },
  { value: "south_india", label: "South India" },
  { value: "nepal", label: "Nepal" },
  { value: "kailash", label: "Kailash Mansarovar" },
];

export function regionLabel(v) {
  const r = REGIONS.find((x) => x.value === v);
  return r ? r.label : v;
}

export function formatINR(n) {
  if (typeof n !== "number") return n;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

// Hidden superadmin portal path - matches backend env SUPERADMIN_PORTAL_PATH
export const SANCTUM_PATH = "sanctum-portal-7821";
