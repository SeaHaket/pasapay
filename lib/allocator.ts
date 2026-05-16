import type { SendRoute } from "@/components/RouteSelector";

export type AllocatorRecipient = {
  id: string;
  name: string;
  route: SendRoute;
  countryId: string;
  recipientAddress: string;
  recipientDisplay: string;
  defaultAmount: string;
};

export type AllocatorGroup = {
  id: string;
  name: string;
  recipients: AllocatorRecipient[];
  createdAt: number;
};

const KEY = "pp_allocator";

export function loadGroups(): AllocatorGroup[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveGroups(groups: AllocatorGroup[]): void {
  localStorage.setItem(KEY, JSON.stringify(groups));
}

export function getGroup(id: string): AllocatorGroup | null {
  return loadGroups().find((g) => g.id === id) ?? null;
}

export function upsertGroup(group: AllocatorGroup): void {
  const groups = loadGroups();
  const idx = groups.findIndex((g) => g.id === group.id);
  if (idx >= 0) groups[idx] = group;
  else groups.unshift(group);
  saveGroups(groups);
}

export function deleteGroup(id: string): void {
  saveGroups(loadGroups().filter((g) => g.id !== id));
}

export function totalAmount(group: AllocatorGroup): number {
  return group.recipients.reduce((sum, r) => sum + (parseFloat(r.defaultAmount) || 0), 0);
}
