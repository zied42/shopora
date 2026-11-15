import { Role } from './types';

export const isCustomerRole = (role: Role): boolean => role === 'customer' || role === 'dropshipper';
export const isSupplierRole = (role: Role): boolean => role === 'seller' || role === 'fournisseur';
