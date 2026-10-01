import { createContext, ReactNode, useContext, useState } from 'react';
import { Product } from '../lib/api';

interface CartLine {
  product: Product;
  quantity: number;
}

interface CartContextValue {
  items: CartLine[];
  supplierName: string | null;
  add: (product: Product, qty?: number) => { error?: string };
  remove: (productId: number) => void;
  setQty: (productId: number, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  totalCost: number;
  estimatedProfit: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);

  const supplierId = items.length ? items[0].product.fournisseur_id : null;
  const supplierName = items.length ? items[0].product.fournisseur_name : null;

  const add = (product: Product, qty = 1) => {
    if (supplierId !== null && supplierId !== product.fournisseur_id) {
      return { error: 'Cart contains products from another supplier. Clear cart or place separate orders.' };
    }
    setItems((prev) => {
      const found = prev.find((l) => l.product.id === product.id);
      if (found) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + qty, product.stock) } : l));
      }
      return [...prev, { product, quantity: qty }];
    });
    return {};
  };

  const remove = (productId: number) => setItems((prev) => prev.filter((l) => l.product.id !== productId));

  const setQty = (productId: number, qty: number) =>
    setItems((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity: Math.max(1, Math.min(qty, l.product.stock)) } : l)));

  const clear = () => setItems([]);

  const count = items.reduce((s, l) => s + l.quantity, 0);
  const subtotal = items.reduce((s, l) => s + l.quantity * l.product.price, 0);
  const totalCost = items.reduce((s, l) => s + l.quantity * l.product.price, 0);
  const estimatedProfit = subtotal - totalCost;

  return (
    <CartContext.Provider value={{ items, supplierName, add, remove, setQty, clear, count, subtotal, totalCost, estimatedProfit }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}