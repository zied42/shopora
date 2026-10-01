import { at, mulberry32 } from './shipments';
import { CATALOG } from './collectionCatalog';

export type CollectionStatus = 'Active' | 'Inactive' | 'Draft';

export interface Collection {
  id: number;
  title: string;
  description: string;
  products: number;
  created_at: string;
  status: CollectionStatus;
  is_active: boolean;
  marketplace_sort_rank: number | null;
}

export interface CollectionsResult {
  collections: Collection[];
  total: number;
}

export interface CollectionSeedDetail {
  is_active: boolean;
  marketplace_sort_rank: number | null;
  product_ids: number[];
}

export interface CollectionsSeed {
  collections: Collection[];
  details: Record<number, CollectionSeedDetail>;
  total: number;
}

interface RowDef {
  id: number;
  title: string;
  description: string;
  products: number;
  status: CollectionStatus;
  is_active: boolean;
  marketplace_sort_rank: number | null;
}

const ROWS: RowDef[] = [
  { id: 23, title: 'TOP 60', description: 'Top 60 products (first page)', products: 0, status: 'Active', is_active: true, marketplace_sort_rank: 1 },
  { id: 22, title: 'Mode & Accessoires', description: 'Mode & Accessoires', products: 1, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 21, title: 'bien être et Santé', description: 'Bien-être et santé', products: 20, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 20, title: 'Électronique & High-Tech', description: 'Électronique & High-Tech', products: 251, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 19, title: 'L\'essentiel du ramadan', description: 'contient tous les produits nécessaires pour le démarrage du mois de Ramadan', products: 66, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 18, title: 'L\'essentiel pour l\'homme', description: 'Tout produit qui présente un besoin pour l\'homme', products: 19, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 17, title: 'Nouveautés', description: 'Les derniers produits ajoutés au catalogue', products: 12, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 16, title: 'Top ventes Tunisie', description: 'Meilleures ventes sur la plateforme en Tunisie', products: 30, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 15, title: 'Essentiel de l’hiver ✅', description: 'Products for winter', products: 118, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 14, title: 'Beauté & Cosmétiques', description: 'Tous les produits de beauté et cosmétiques', products: 42, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 13, title: 'Produit recommandé', description: 'Concernant tous les produits recommandés qui présente un potentiel +10 commandes par jour', products: 10, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 12, title: 'Maison & Cuisine', description: 'Produits pour la maison et la cuisine', products: 34, status: 'Active', is_active: true, marketplace_sort_rank: 3 },
  { id: 11, title: 'Sport & Fitness', description: 'Équipements et accessoires de sport', products: 8, status: 'Inactive', is_active: false, marketplace_sort_rank: null },
  { id: 10, title: 'Dropshipping Best Sellers', description: 'Les produits les plus vendus en dropshipping', products: 25, status: 'Active', is_active: true, marketplace_sort_rank: 4 },
  { id: 9, title: 'Sac à dos & Bagagerie', description: 'Sacs à dos, valises et bagagerie', products: 6, status: 'Draft', is_active: false, marketplace_sort_rank: null },
  { id: 8, title: 'Promotion -50%', description: 'Produits en promotion jusqu\'à -50%', products: 15, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 7, title: 'Jardin & Extérieur', description: 'Outils de jardin et équipements extérieurs', products: 4, status: 'Inactive', is_active: false, marketplace_sort_rank: null },
  { id: 6, title: 'WINNER PRODUCT 72 h', description: 'WINNER PRODUCT 72 h', products: 1, status: 'Active', is_active: true, marketplace_sort_rank: 2 },
  { id: 5, title: 'Électroménager', description: 'Réfrigérateurs, machines à laver et plus', products: 9, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 4, title: 'Literie', description: 'Draps, couettes et oreillers', products: 3, status: 'Draft', is_active: false, marketplace_sort_rank: null },
  { id: 3, title: 'Produits d\'été ☀️', description: '_', products: 103, status: 'Active', is_active: true, marketplace_sort_rank: null },
  { id: 2, title: 'Fournitures médicales', description: 'Matériel et fournitures médicales', products: 7, status: 'Inactive', is_active: false, marketplace_sort_rank: null },
  { id: 1, title: 'Bébé & Puériculture', description: 'Tout pour bébé et la puériculture', products: 22, status: 'Active', is_active: true, marketplace_sort_rank: null },
];

const CATALOG_IDS = CATALOG.map((p) => p.id);

function productIds(count: number, seed: number): number[] {
  if (count <= 0) return [];
  const rand = mulberry32(seed * 7919 + 17);
  const unique = new Set<number>();
  while (unique.size < Math.min(count, CATALOG_IDS.length)) {
    unique.add(CATALOG_IDS[Math.floor(rand() * CATALOG_IDS.length)] ?? CATALOG_IDS[0]!);
  }
  const arr = Array.from(unique);
  while (arr.length < count) arr.push(CATALOG_IDS[Math.floor(rand() * CATALOG_IDS.length)] ?? CATALOG_IDS[0]!);
  return arr;
}

export function buildCollections(): CollectionsSeed {
  const collections: Collection[] = [];
  const details: Record<number, CollectionSeedDetail> = {};
  ROWS.forEach((r, i) => {
    collections.push({
      id: r.id,
      title: r.title,
      description: r.description,
      products: r.products,
      created_at: at(30 + i * 3, 9 + (i % 10), (i * 7) % 60),
      status: r.status,
      is_active: r.is_active,
      marketplace_sort_rank: r.marketplace_sort_rank,
    });
    details[r.id] = {
      is_active: r.is_active,
      marketplace_sort_rank: r.marketplace_sort_rank,
      product_ids: productIds(r.products, r.id),
    };
  });
  return { collections, details, total: collections.length };
}