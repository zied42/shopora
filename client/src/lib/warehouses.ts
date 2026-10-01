export interface Warehouse {
  id: number;
  name: string;
  phone1: string;
  phone2: string;
  country: string;
  location: string;
  address1: string;
  address2: string;
}

const KEY = 'd42_warehouses';

export function getWarehouses(): Warehouse[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Warehouse[];
  } catch {
    return [];
  }
}

export function getWarehouse(id: number): Warehouse | undefined {
  return getWarehouses().find((w) => w.id === id);
}

export function saveWarehouse(wh: Warehouse) {
  const list = getWarehouses();
  const i = list.findIndex((w) => w.id === wh.id);
  if (i >= 0) list[i] = wh;
  else list.push(wh);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function warehouseNames(): string[] {
  return getWarehouses().map((w) => w.name);
}
