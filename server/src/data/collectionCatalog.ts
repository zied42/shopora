export type CatalogOfferType = 'dropshipping' | 'wholesale' | 'white_label';

export interface CatalogProduct {
  id: number;
  name: string;
  emoji: string;
  eligible_to_marketplace: boolean;
  offer_type: CatalogOfferType;
}

export const CATALOG: CatalogProduct[] = [
  { id: 1, name: 'Berceau', emoji: '🛏️', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 2, name: 'Vélo', emoji: '🚲', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 3, name: 'Robe', emoji: '👗', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 4, name: 'Réfrigérateur', emoji: '🧊', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 5, name: 'Four', emoji: '🔥', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 6, name: 'Set robot chauffage', emoji: '🔥', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 7, name: 'Barre de marche', emoji: '🏃', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 8, name: 'Food process', emoji: '🥣', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 9, name: 'Contrôleuse de puissance', emoji: '⚡', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 10, name: 'Robe voile', emoji: '👗', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 11, name: 'Plateforme pas-bébé', emoji: '👶', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 12, name: 'Tapis', emoji: '🧶', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 13, name: 'Climatiseur', emoji: '❄️', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 14, name: 'Machine à laver', emoji: '🧺', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 15, name: 'Téléviseur', emoji: '📺', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 16, name: 'Smartphone', emoji: '📱', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 17, name: 'Casque', emoji: '🎧', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 18, name: 'Montre', emoji: '⌚', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 19, name: 'Lampadaire', emoji: '💡', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 20, name: 'Chaise', emoji: '🪑', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 21, name: 'FFP2 masques', emoji: '😷', eligible_to_marketplace: false, offer_type: 'dropshipping' },
  { id: 22, name: 'Manteau', emoji: '🧥', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 23, name: 'Sac à main', emoji: '👜', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 24, name: 'Chaussures', emoji: '👟', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 25, name: 'Perceuse', emoji: '🔧', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 26, name: 'Aspirateur', emoji: '🧹', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 27, name: 'Fer à repasser', emoji: '👔', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 28, name: 'Mixeur', emoji: '🥤', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 29, name: 'Bouilloire', emoji: '🫖', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 30, name: 'Multiple', emoji: '📦', eligible_to_marketplace: false, offer_type: 'white_label' },
  { id: 31, name: 'Bikini', emoji: '🩱', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 32, name: 'Essuie-tout', emoji: '🧻', eligible_to_marketplace: false, offer_type: 'white_label' },
  { id: 33, name: 'Shampoing', emoji: '🧴', eligible_to_marketplace: true, offer_type: 'white_label' },
  { id: 34, name: 'Eau de parfum', emoji: '🌸', eligible_to_marketplace: true, offer_type: 'white_label' },
  { id: 35, name: 'Sérum visage', emoji: '✨', eligible_to_marketplace: true, offer_type: 'white_label' },
  { id: 36, name: 'Horloge murale', emoji: '🕰️', eligible_to_marketplace: true, offer_type: 'dropshipping' },
  { id: 37, name: 'Rideaux', emoji: '🪟', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 38, name: 'Tondeuse', emoji: '🧑‍🌾', eligible_to_marketplace: true, offer_type: 'wholesale' },
  { id: 39, name: 'Gel douche', emoji: '🚿', eligible_to_marketplace: true, offer_type: 'white_label' },
  { id: 40, name: 'Matelas bébé', emoji: '👶', eligible_to_marketplace: false, offer_type: 'white_label' },
];

export function catalogProduct(id: number): CatalogProduct {
  return CATALOG.find((p) => p.id === id) ?? CATALOG[0]!;
}

export interface CollectionCatalogResult {
  products: CatalogProduct[];
}

export function buildCollectionCatalog(): CollectionCatalogResult {
  return { products: [...CATALOG] };
}