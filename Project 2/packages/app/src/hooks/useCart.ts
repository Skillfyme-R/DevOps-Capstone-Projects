import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id:          string;
  productId:   string;
  variantId?:  string;
  name:        string;
  price:       number;
  quantity:    number;
  image:       string;
  vendorId:    string;
  vendorName:  string;
  maxStock:    number;
}

interface CartStore {
  items:      CartItem[];
  couponCode: string | null;
  discount:   number;
  addItem:    (item: Omit<CartItem, 'id'>) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty:  (productId: string, qty: number, variantId?: string) => void;
  clearCart:  () => void;
  setCoupon:  (code: string, discount: number) => void;
  subtotal:   () => number;
  total:      () => number;
  itemCount:  () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items:      [],
      couponCode: null,
      discount:   0,

      addItem: (newItem) => set((state) => {
        const existing = state.items.find(
          i => i.productId === newItem.productId && i.variantId === newItem.variantId
        );
        if (existing) {
          return {
            items: state.items.map(i =>
              i.productId === newItem.productId && i.variantId === newItem.variantId
                ? { ...i, quantity: Math.min(i.quantity + newItem.quantity, i.maxStock) }
                : i
            ),
          };
        }
        return { items: [...state.items, { ...newItem, id: crypto.randomUUID() }] };
      }),

      removeItem: (productId, variantId) => set((state) => ({
        items: state.items.filter(
          i => !(i.productId === productId && i.variantId === variantId)
        ),
      })),

      updateQty: (productId, qty, variantId) => set((state) => ({
        items: qty <= 0
          ? state.items.filter(i => !(i.productId === productId && i.variantId === variantId))
          : state.items.map(i =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: Math.min(qty, i.maxStock) }
                : i
            ),
      })),

      clearCart:  () => set({ items: [], couponCode: null, discount: 0 }),
      setCoupon:  (code, discount) => set({ couponCode: code, discount }),

      subtotal:  () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      total:     () => {
        const sub = get().subtotal();
        return Math.max(0, sub - get().discount);
      },
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'vv-cart' }
  )
);
