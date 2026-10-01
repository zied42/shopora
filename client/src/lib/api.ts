import axios from 'axios';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer' | 'seller';
  photo: string | null;
  cin: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  fournisseur_id: number;
  fournisseur_name: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  category: ProductCategory;
  /** Marketplace offers this product supports (a product can be both dropshipping and wholesale). */
  offers?: ProductCategory[];
  retail_category?: string | null;
  height?: number | null;
  length?: number | null;
  width?: number | null;
  weight?: number | null;
  stock: number;
  house_stock?: number;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  video_url: string | null;
  images: string[];
  videos: string[];
  keywords?: string[];
  specifications?: { k: string; v: string }[];
  wholesale_tiers?: { min: number; max: number; price: number }[];
  is_active: boolean;
  moderation_status?: 'pending' | 'approved' | 'refused' | 'hidden';
  moderation_note?: string | null;
  rating: number;
  rating_count: number;
  stats?: { created: number; confirmed: number; returns: number; profit: number };
}

export type ProductCategory = 'dropshipping' | 'wholesale' | 'white_label' | 'fulfillment';

export interface StockingProduct extends Product {
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_org_name: string | null;
  supplier_city: string | null;
  supplier_account_manager: string | null;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = ['dropshipping', 'wholesale', 'white_label', 'fulfillment'];

export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

export const PRODUCT_CATEGORY_TREE: CategoryNode[] = [
  {
    name: 'Health & Beauty',
    children: [
      {
        name: 'Makeup',
        children: [
          { name: 'Lipstick' },
          { name: 'Lip Gloss' },
          { name: 'Foundation' },
          { name: 'Mascara' },
          { name: 'Eyeliner' },
          { name: 'Eyeshadow' },
          { name: 'Makeup Kits & Sets' },
        ],
      },
      {
        name: 'Beauty & Personal Care',
        children: [
          { name: 'Skin Care' },
          { name: 'Hair Care' },
          { name: 'Body Care' },
          { name: 'Shaving & Grooming' },
          { name: 'Tools & Accessories' },
        ],
      },
      {
        name: 'The Essentials',
        children: [
          { name: 'Sun Protection & Bronzers' },
          { name: "Women's Shaving & Hair Removal" },
          { name: 'Clippers & Electric Shavers' },
          { name: 'Beard & Mustache Care & After Shave' },
          { name: 'Sports Nutrition' },
          { name: 'Bath & Shower Gel' },
          { name: 'Hand & Foot Care' },
          { name: 'Hair Dyes' },
          { name: 'Extensions & Wigs' },
          { name: 'Hair Straighteners, Hair Dryers & Brushes' },
          { name: 'Monoi Oil' },
        ],
      },
      {
        name: 'Perfumes',
        children: [
          { name: "Women's Perfume" },
          { name: "Men's Perfume" },
          { name: 'Unisex' },
          { name: 'Travel Sizes' },
          { name: 'Gift Sets' },
        ],
      },
      {
        name: 'Other Beauty Products',
        children: [
          { name: 'Brushes & Applicators' },
          { name: 'Beauty Tools' },
          { name: 'Salon Supplies' },
          { name: 'Cleaning & Accessories' },
        ],
      },
    ],
  },
  {
    name: 'Phone & Tablet',
    children: [
      {
        name: 'Smartphones',
        children: [
          { name: 'Android' },
          { name: 'iPhone' },
          { name: 'Refurbished Phones' },
          { name: 'Phablets & Phones' },
        ],
      },
      {
        name: 'Tablets',
        children: [
          { name: 'iPad' },
          { name: 'Android Tablets' },
          { name: 'Tablet Accessories' },
        ],
      },
      {
        name: 'Phone & Tablet Accessories',
        children: [
          { name: 'Chargers & Cables' },
          { name: 'Power Banks' },
          { name: 'Screen Protectors' },
          { name: 'Phone Holders & Stands' },
        ],
      },
      {
        name: 'Cases & Covers',
        children: [
          { name: 'Phone Cases' },
          { name: 'Tablet Cases' },
          { name: 'Stands & Mounts' },
        ],
      },
      {
        name: 'Wearables',
        children: [
          { name: 'Smart Watches' },
          { name: 'Fitness Bands' },
          { name: 'Smartwatch Bands' },
        ],
      },
    ],
  },
  {
    name: 'Kitchen & Appliances',
    children: [
      {
        name: 'Small Appliances',
        children: [
          { name: 'Blenders & Juicers' },
          { name: 'Coffee & Espresso Makers' },
          { name: 'Toasters & Grills' },
          { name: 'Kettles & Hot Water' },
        ],
      },
      {
        name: 'Large Appliances',
        children: [
          { name: 'Refrigerators & Freezers' },
          { name: 'Washing Machines' },
          { name: 'Microwave & Ovens' },
          { name: 'Dishwashers' },
        ],
      },
      {
        name: 'Cookware',
        children: [
          { name: 'Pots & Pans' },
          { name: 'Baking Trays' },
          { name: 'Knives & Cutting Boards' },
        ],
      },
      {
        name: 'Tableware',
        children: [
          { name: 'Dinnerware Sets' },
          { name: 'Drinkware' },
          { name: 'Serving & Storage' },
        ],
      },
      {
        name: 'Kitchen Tools & Utensils',
        children: [
          { name: 'Measuring & Mixing' },
          { name: 'Peelers & Grinders' },
          { name: 'Kitchen Organizers' },
        ],
      },
    ],
  },
  {
    name: 'Fashion',
    children: [
      {
        name: "Men's Clothing",
        children: [
          { name: 'T-Shirts & Tops' },
          { name: 'Shirts & Polos' },
          { name: 'Jeans & Pants' },
          { name: 'Jackets & Coats' },
          { name: 'Suits & Blazers' },
        ],
      },
      {
        name: "Women's Clothing",
        children: [
          { name: 'Dresses' },
          { name: 'Tops & Blouses' },
          { name: 'Skirts & Shorts' },
          { name: 'Jeans & Pants' },
          { name: 'Jackets & Coats' },
        ],
      },
      {
        name: 'Shoes',
        children: [
          { name: "Men's Shoes" },
          { name: "Women's Shoes" },
          { name: 'Sports Shoes' },
          { name: 'Sandals & Flip-Flops' },
        ],
      },
      {
        name: 'Bags & Luggage',
        children: [
          { name: 'Handbags' },
          { name: 'Backpacks' },
          { name: 'Suitcases' },
          { name: 'Wallets & Card Holders' },
        ],
      },
      {
        name: 'Accessories',
        children: [
          { name: 'Belts & Hats' },
          { name: 'Scarves & Gloves' },
          { name: 'Sunglasses' },
          { name: 'Hair Accessories' },
        ],
      },
      {
        name: 'Jewelry',
        children: [
          { name: 'Rings & Necklaces' },
          { name: 'Bracelets' },
          { name: 'Earrings' },
          { name: 'Watches' },
        ],
      },
    ],
  },
  {
    name: 'Computers',
    children: [
      {
        name: 'Laptops',
        children: [
          { name: 'Windows Laptops' },
          { name: 'MacBooks' },
          { name: 'Gaming Laptops' },
          { name: 'Laptop Accessories' },
        ],
      },
      {
        name: 'Desktop PCs',
        children: [
          { name: 'Pre-Built Desktops' },
          { name: 'All-in-One PCs' },
          { name: 'Mini PCs' },
        ],
      },
      {
        name: 'Computer Components',
        children: [
          { name: 'CPUs & Motherboards' },
          { name: 'Graphics Cards' },
          { name: 'RAM & Storage' },
          { name: 'PSUs & Cases' },
        ],
      },
      {
        name: 'Peripherals',
        children: [
          { name: 'Keyboards & Mice' },
          { name: 'Monitors' },
          { name: 'Headsets & Speakers' },
          { name: 'Webcams & Docks' },
        ],
      },
      {
        name: 'Storage Devices',
        children: [
          { name: 'USB Flash Drives' },
          { name: 'External Hard Drives' },
          { name: 'Memory Cards' },
        ],
      },
    ],
  },
  {
    name: 'Electronics',
    children: [
      {
        name: 'Audio',
        children: [
          { name: 'Headphones & Earbuds' },
          { name: 'Speakers & Soundbars' },
          { name: 'Microphones & Mixers' },
        ],
      },
      {
        name: 'Video',
        children: [
          { name: 'TVs' },
          { name: 'Streaming Devices' },
          { name: 'Projectors' },
        ],
      },
      {
        name: 'Cameras & Photography',
        children: [
          { name: 'Digital Cameras' },
          { name: 'Action Cameras' },
          { name: 'Camera Lenses' },
          { name: 'Camera Accessories' },
        ],
      },
      {
        name: 'Smart Home',
        children: [
          { name: 'Smart Speakers' },
          { name: 'Smart Lighting' },
          { name: 'Security Cameras' },
          { name: 'Smart Plugs & Sensors' },
        ],
      },
      {
        name: 'Gadgets',
        children: [
          { name: 'Drones' },
          { name: 'Smart Glasses' },
          { name: 'VR & AR Devices' },
          { name: 'E-Readers' },
        ],
      },
    ],
  },
  {
    name: 'Home & Office',
    children: [
      {
        name: 'Furniture',
        children: [
          { name: 'Office Chairs' },
          { name: 'Desks & Tables' },
          { name: 'Sofas & Seating' },
          { name: 'Beds & Wardrobes' },
        ],
      },
      {
        name: 'Home Decor',
        children: [
          { name: 'Wall Art & Frames' },
          { name: 'Vases & Centerpieces' },
          { name: 'Rugs & Carpets' },
          { name: 'Curtains & Blinds' },
        ],
      },
      {
        name: 'Lighting',
        children: [
          { name: 'Lamps & Lampshades' },
          { name: 'Ceiling Lights' },
          { name: 'String Lights' },
          { name: 'Bulbs' },
        ],
      },
      {
        name: 'Office Supplies',
        children: [
          { name: 'Stationery' },
          { name: 'Paper & Notebooks' },
          { name: 'Desk Organizers' },
          { name: 'Printing & Labeling' },
        ],
      },
      {
        name: 'Cleaning & Storage',
        children: [
          { name: 'Cleaning Supplies' },
          { name: 'Storage Boxes & Bins' },
          { name: 'Laundry Care' },
        ],
      },
    ],
  },
  {
    name: 'Video Games & Consoles',
    children: [
      {
        name: 'Consoles',
        children: [
          { name: 'PlayStation' },
          { name: 'Xbox' },
          { name: 'Nintendo' },
          { name: 'Handheld Consoles' },
        ],
      },
      {
        name: 'Video Games',
        children: [
          { name: 'Action & Adventure' },
          { name: 'Shooting & Sports' },
          { name: 'Racing & RPG' },
          { name: 'Kids & Family' },
        ],
      },
      {
        name: 'Controllers & Accessories',
        children: [
          { name: 'Controllers' },
          { name: 'Charging Stations' },
          { name: 'Replacement Parts' },
        ],
      },
      {
        name: 'Gaming Headsets',
        children: [
          { name: 'Wired Headsets' },
          { name: 'Wireless Headsets' },
          { name: 'Microphones' },
        ],
      },
      {
        name: 'Gaming Chairs & Furniture',
        children: [
          { name: 'Gaming Chairs' },
          { name: 'Desks & Rigs' },
          { name: 'Racing Wheels & Pedals' },
        ],
      },
    ],
  },
  {
    name: 'Sports Equipments',
    children: [
      {
        name: 'Fitness & Training',
        children: [
          { name: 'Dumbbells & Weights' },
          { name: 'Yoga & Pilates' },
          { name: 'Treadmills & Bikes' },
          { name: 'Resistance Bands' },
        ],
      },
      {
        name: 'Outdoor Sports',
        children: [
          { name: 'Camping Gear' },
          { name: 'Hiking & Trekking' },
          { name: 'Fishing' },
          { name: 'Climbing' },
        ],
      },
      {
        name: 'Team Sports',
        children: [
          { name: 'Football & Soccer' },
          { name: 'Basketball' },
          { name: 'Volleyball' },
          { name: 'Tennis' },
        ],
      },
      {
        name: 'Swimming & Water Sports',
        children: [
          { name: 'Swimwear & Goggles' },
          { name: 'Pools & Accessories' },
          { name: 'Snorkeling & Diving' },
        ],
      },
      {
        name: 'Cycling',
        children: [
          { name: 'Bicycles' },
          { name: 'Helmets & Safety' },
          { name: 'Bike Accessories' },
        ],
      },
    ],
  },
  {
    name: 'Garden & Outdoors',
    children: [
      {
        name: 'Garden Tools',
        children: [
          { name: 'Hand Tools' },
          { name: 'Power Tools' },
          { name: 'Watering & Irrigation' },
        ],
      },
      {
        name: 'Plants & Seeds',
        children: [
          { name: 'Indoor Plants' },
          { name: 'Seeds & Bulbs' },
          { name: 'Pots & Planters' },
        ],
      },
      {
        name: 'Outdoor Furniture',
        children: [
          { name: 'Garden Sets' },
          { name: 'Hammocks & Swings' },
          { name: 'Parasols & Shades' },
        ],
      },
      {
        name: 'Grills & Outdoor Cooking',
        children: [
          { name: 'BBQ Grills' },
          { name: 'Smokers' },
          { name: 'Outdoor Cookware' },
        ],
      },
      {
        name: 'Camping & Hiking',
        children: [
          { name: 'Tents & Shelters' },
          { name: 'Sleeping Bags' },
          { name: 'Lanterns & Lights' },
        ],
      },
    ],
  },
  {
    name: 'Other Categories',
    children: [
      {
        name: 'Toys & Games',
        children: [
          { name: 'Building Toys' },
          { name: 'Board Games & Puzzles' },
          { name: 'Action Figures' },
          { name: 'Educational Toys' },
        ],
      },
      {
        name: 'Baby & Kids',
        children: [
          { name: 'Baby Care' },
          { name: 'Feeding & Nursing' },
          { name: 'Kids Clothing' },
          { name: 'Strollers & Carriers' },
        ],
      },
      {
        name: 'Pet Supplies',
        children: [
          { name: 'Dog Supplies' },
          { name: 'Cat Supplies' },
          { name: 'Pet Food & Treats' },
        ],
      },
      {
        name: 'Automotive',
        children: [
          { name: 'Car Accessories' },
          { name: 'Car Care & Detailing' },
          { name: 'Motorcycle Accessories' },
        ],
      },
      {
        name: 'Books & Media',
        children: [
          { name: 'Books' },
          { name: 'Magazines' },
          { name: 'Music & Movies' },
        ],
      },
    ],
  },
];

export const CATEGORY_META: Record<ProductCategory, { label: string; icon: string; desc: string }> = {
  dropshipping: { label: 'Dropshipping', icon: '💱', desc: 'No stock needed — we ship each order to your customer' },
  wholesale: { label: 'Wholesale', icon: '🏷️', desc: 'Buy in bulk at wholesale prices for maximum margins' },
  white_label: { label: 'White Label', icon: '🔖', desc: 'Source the product and brand it with your own logo' },
  fulfillment: { label: 'Fulfillment', icon: '📦', desc: 'Private fulfillment catalog — not shown on the marketplace' },
};

export interface SupplierOffer {
  product_id: number;
  fournisseur_id: number;
  fournisseur_name: string;
  price: number;
  cost_price: number;
  stock: number;
  rating: number;
  rating_count: number;
  is_active: boolean;
  created: number;
  confirmed: number;
  returns: number;
  profit: number;
  total_products: number;
  score: number;
}

export interface TrendingItem {
  key: string;
  name: string;
  image_url: string | null;
  rating: number;
  rating_count: number;
  offers: number;
  created: number;
  confirmed: number;
  returns: number;
  profit: number;
  score: number;
  best: {
    product_id: number;
    fournisseur_id: number;
    fournisseur_name: string;
    price: number;
    cost_price: number;
    stock: number;
  };
}

export type StoreSort = 'recommended' | 'rating' | 'orders' | 'price_asc' | 'price_desc';

export const STORE_SORTS: { id: StoreSort; label: string }[] = [
  { id: 'recommended', label: '⭐ Recommended' },
  { id: 'rating', label: '★ Top rated' },
  { id: 'orders', label: '🧾 Most ordered' },
  { id: 'price_asc', label: 'Price low → high' },
  { id: 'price_desc', label: 'Price high → low' },
];

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string | null;
  quantity: number;
  house_qty?: number;
  supplier_qty?: number;
  price: number;
  cost: number;
  fournisseur_id: number;
  fournisseur_name: string;
}

export interface TrackStep {
  id: number;
  carrier: string | null;
  tracking_number: string | null;
  status: string | null;
  detail: string | null;
  updated_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  barcode: string | null;
  order_type?: SavedOfferType;
  dropshipper_id: number;
  dropshipper_name: string;
  dropshipper_cin: string | null;
  fournisseur_id: number;
  fournisseur_name: string;
  customer_name: string | null;
  customer_phone: string | null;
  governorate: string | null;
  city: string | null;
  shipping_address: string | null;
  delivery_company: string | null;
  delivery_status: string | null;
  locality_id: number | null;
  telephone2: string | null;
  commentaire: string | null;
  est_fragile: string;
  ouvrir_colis: string;
  nombre_article: number | null;
  nombre_echange: string;
  status: 'draft' | 'ready' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'retour';
  payment_status: 'unpaid' | 'paid';
  payment_method: 'stripe' | 'paypal' | 'cod' | string | null;
  total: number;
  total_cost: number;
  profit: number;
  commission: number;
  confirmed_at: string | null;
  confirmed_by: number | null;
  confirmed_by_name: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  returned_at: string | null;
  auto_deliver_at: string | null;
  created_at: string;
  items: OrderItem[];
  tracking: TrackStep[];
}

export interface Ticket {
  id: number;
  user_id: number;
  email: string;
  type: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  answer: string | null;
  assigned_to: number | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
  assigned_to_name?: string | null;
}

export interface ChefTicketMessage {
  user: string;
  org: string;
  text: string;
  time: string;
  type?: 'normal' | 'resolution_request';
}

export interface ChefTicket {
  id: number;
  author: { name: string };
  owners: { name: string }[];
  assignees: string[];
  internal_ticket: 'none' | 'unresolved' | 'resolved';
  labels: string[];
  org_type: 'Service' | 'Fulfiller';
  department: string;
  type: string;
  related_to: string | null;
  subject: string;
  rating: number | null;
  spam_reason: string | null;
  last_message: { user: string; org: string; text: string };
  messages: ChefTicketMessage[];
  created_at: string;
  programmed: boolean;
  answered: boolean;
  non_answered: boolean;
  no_follow: boolean;
  under_process: boolean;
  first_response_at: string | null;
  first_response_mins: number | null;
  resolution_at: string | null;
  resolution_mins: number | null;
  resolution_overdue: boolean;
  priority: 'urgent' | 'high' | 'medium';
  status: 'resolved' | 'unresolved';
}

export interface ChefTicketsResult {
  tickets: ChefTicket[];
  stats: {
    underProcess: number;
    scheduled: number;
    today: number;
    answered: number;
    nonAnswered: number;
    noFollow: number;
  };
}

export interface Shipment {
  id: number;
  gid: string;
  order_type: string;
  account_incubators: string[];
  account_managers: string[];
  business_developers: string[];
  retailer_name: string | null;
  retailer_phone: string | null;
  suppliers: string[];
  fulfiller: string | null;
  warehouse: string | null;
  created_at: string;
  updated_at: string;
  fullfillable_at: string | null;
  prepared_at: string | null;
  picked_up_at: string | null;
  first_carrier_attempt_at: string | null;
  last_carrier_attempt_at: string | null;
  delivery_issue_resolved_at: string | null;
  delivery_issue_reason: string | null;
  attempt_count: number;
  delivered_at: string | null;
  last_carrier_update_at: string | null;
  expected_shipping_date_from: string | null;
  expected_shipping_date_to: string | null;
  expected_delivery_date_from: string | null;
  expected_delivery_date_to: string | null;
  delivery_verified_at: string | null;
  delivery_verified_by: string | null;
  marked_delivered_post_verification: boolean;
  carrier_refunded: boolean;
  client_refunded: boolean;
  cod_settlement_status: string | null;
  cod_settlement_at: string | null;
  receivables_status: string | null;
  carrier_cod_payment_amount: number | null;
  carrier_cod_payment_status: string | null;
  address: string | null;
  status: string;
  status_icon: 'clock' | 'truck' | 'dropbox';
  status_detail: string | null;
  customer_name: string | null;
  customer_call: boolean;
  tracking_numbers: string[];
  product_name: string;
  product_variation: string | null;
  quantity: number;
  image_url: string | null;
  cost: number;
  cod_amount: number;
}

export interface ShipmentsResult {
  shipments: Shipment[];
}

export interface ShipmentTimelineItem {
  id: number;
  key: string;
  title: string;
  completed: boolean;
  at: string | null;
}

export interface ShipmentDetail extends Shipment {
  confirmed_by: string;
  order_created_at: string;
  task_created_at: string;
  confirmed_created_at: string;
  warehouse_phone: string;
  warehouse_phone_full: string;
  fulfiller_phone: string;
  fulfiller_phone_full: string;
  customer_phone: string;
  customer_phone_full: string;
  carrier_name: string;
  carrier_account_id: string;
  pickup_request_id: string | null;
  pickup_note: string | null;
  timeline: ShipmentTimelineItem[];
}

export interface ShipmentDetailResult {
  shipment: ShipmentDetail;
}

export type ChefReturnType = 'replacement' | 'product_return';

export type ReturnApprovalStatus = 'approved' | 'waiting' | 'rejected';
export type ReturnDeliveryStatus = 'awaiting_arrival' | 'packed' | 'ready_for_pickup' | 'picked_up' | 'on_its_way' | 'delivered' | 'returning_to_sender' | 'returned_to_sender' | 'return_delivered' | 'canceled';
export type ExchangeDeliveryStatus = 'packed' | 'awaiting_packaging' | 'ready_for_pickup' | 'picked_up' | 'on_its_way' | 'at_carrier_facility' | 'delivered' | 'returning_to_sender' | 'returned_to_sender' | 'canceled';

export interface ChefReturnProduct {
  name: string;
  variation: string | null;
  quantity: number;
}

export interface ChefReturn {
  id: number;
  gid: string;
  created_by: string | null;
  type: ChefReturnType;
  retailer_name: string;
  retailer_code: string;
  retailer_premium: boolean;
  address: string;
  destination_warehouse: string | null;
  products: ChefReturnProduct[];
  approval_status: ReturnApprovalStatus;
  exchange_delivery_status: ExchangeDeliveryStatus | null;
  exchange_shipment_id: number | null;
  return_delivery_status: ReturnDeliveryStatus | null;
  delivery_type: string;
  process_type: string;
  carrier: string;
  dispute_status: 'unresolved' | null;
  created_at: string;
  accepted_at: string | null;
  received_at: string | null;
  inspection: boolean;
  reason: string | null;
  reply: string | null;
  attachments: string[];
}

export interface ReturnsResult {
  returns: ChefReturn[];
}

export type ReturnDeliveryLabel =
  | 'Awaiting products arrival to fulfillment center'
  | 'Packed'
  | 'Ready for pickup'
  | 'Picked Up'
  | 'On its way'
  | 'Delivered'
  | 'Returning to sender'
  | 'Returned to sender'
  | 'Return delivered'
  | 'Canceled';

export interface ReturnTimelineItem {
  id: number;
  key: string;
  title: string;
  completed: boolean;
}

export interface ReturnDetail extends ChefReturn {
  customer_name: string;
  customer_phone: string;
  customer_phone_full: string;
  address_lines: string[];
  delivery_type: string;
  process_type: string;
  carrier: string;
  return_delivery_label: ReturnDeliveryLabel;
  exchange_delivery_label: string;
  carrier_name: string;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  inspection_by: string | null;
  tracking_number: string | null;
  order_id: number;
  order_gid: string;
  order_shipment_id: number | null;
  order_shipment_gid: string | null;
  exchange_shipment_id: number | null;
  exchange_shipment_gid: string | null;
  exchange_timeline: ReturnTimelineItem[];
}

export type TransferStatus = 'rejected' | 'delivered' | 'packed';
export type PaymentBadge = 'failed' | 'pending' | 'successful';

export interface TransferShipment {
  id: number;
  gid: string;
  client_id: number;
  ship_to_name: string;
  ship_to_code: string;
  account_manager: string;
  business_developer: string;
  account_incubator: string | null;
  ship_to: string;
  created_at: string;
  delivered_at: string | null;
  status: TransferStatus;
  product_name: string;
  product_variation: string | null;
  pack_units: number;
  product_qty: number;
  deposit_amount: number | null;
  deposit_status: PaymentBadge;
  payment_amount: number | null;
  payment_status: PaymentBadge;
  received_units: number;
  total_units: number;
  carrier_logo: string;
  tracking_number: string | null;
}

export interface TransferShipmentsResult {
  transfers: TransferShipment[];
}

export interface PickupRequestCarrier {
  state: 'none' | 'created' | 'unsupported';
  reference: string | null;
  date_label: string | null;
}

export interface PickupRequest {
  id: number;
  title: string;
  products: number;
  status: string;
  date: string;
  storage_request: string | null;
  reservation: string | null;
}

export interface PickupRequestsResult {
  pickups: PickupRequest[];
}

export interface Manifest {
  id: number;
  gid: string;
  manifest_ref: string;
  fulfiller_name: string;
  fulfiller_code: string;
  carrier_logo: string;
  warehouse: string;
  supplier_name: string | null;
  delivery_company: string | null;
  date: string;
  status: 'not_uploaded';
  shipments: number;
}

export interface ManifestItem {
  id: number;
  manifest_id: number;
  order_id: number;
  order_number: string;
  customer_name: string | null;
  governorate: string | null;
  city: string | null;
  status: string;
  product_name: string;
  product_variation: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  delivered_at: string | null;
}

export interface ManifestDetail extends Manifest {
  items: ManifestItem[];
}

export interface ManifestsResult {
  manifests: Manifest[];
}

export interface ManifestGroup {
  supplier_id: number;
  supplier_name: string;
  delivery_company: string;
  order_count: number;
  shipped_count: number;
  delivered_count: number;
  total_products: number;
  total_qty: number;
}

export interface ManifestGroupOrder {
  order_id: number;
  order_number: string;
  customer_name: string | null;
  governorate: string | null;
  city: string | null;
  status: string;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  products: ManifestGroupProduct[];
}

export interface ManifestGroupProduct {
  product_id: number;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  cost: number;
}

export interface ManifestGroupDetail {
  supplier_id: number;
  supplier_name: string;
  delivery_company: string;
  orders: ManifestGroupOrder[];
  summary: { total_orders: number; total_products: number; total_qty: number };
}

export interface SupplierConversation {
  id: number;
  type: string;
  title: string;
  created_at: string;
  supplier_id: number;
  supplier_name: string;
  dropshipper_name: string | null;
  last_sender_id: number | null;
  last_sender_name: string | null;
  last_body: string | null;
  last_image_url: string | null;
  last_created_at: string | null;
  message_count: number;
}

export type TxEntityType = 'service' | 'carrier' | 'retailer';
export type TxStatus = 'pending' | 'successful';

export interface Transaction {
  id: number;
  gid: string;
  summary: string;
  shipment_id: string | null;
  shipment_display: string | null;
  created_at: string;
  updated_at: string;
  status: TxStatus;
  amount: number;
  payment_method: string;
  cash_pickup_location: string | null;
  from_type: TxEntityType;
  from_name: string;
  from_code: string | null;
  to_type: TxEntityType;
  to_name: string;
  to_code: string | null;
  follow_up: null;
  bulk: null;
}

export interface RealTransaction {
  id: number;
  type: 'order' | 'cost' | 'payout' | 'inscription';
  summary: string;
  amount: number;
  created_at: string;
  entity_name: string;
  entity_role: string;
  order_number?: string;
  status?: string;
}

export type ServiceInscriptionStatus = 'pending' | 'confirmed' | 'rejected';

export interface ServiceInscription {
  id: number;
  user_id: number;
  user_name: string | null;
  email: string | null;
  service: string;
  status: ServiceInscriptionStatus;
  amount: number;
  notes: string | null;
  confirmed_by: string | null;
  created_at: string;
  confirmed_at: string | null;
  orders_count?: number;
}

export interface TransactionsResult {
  transactions: Transaction[] | RealTransaction[];
  total: number;
}

export interface ReconciliationSupplier {
  id: number; name: string; email: string; earned: number; paid: number; owed: number; total_orders: number; total_products: number;
}

export interface ReconciliationDropshipper {
  id: number; name: string; email: string; profit: number; paid: number; owed: number; total_orders: number; total_sales: number;
}

export interface ReconciliationReviewsResult {
  suppliers: ReconciliationSupplier[];
  dropshippers: ReconciliationDropshipper[];
}

export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export type SellerStatus =
  | 'Uncompleted registration'
  | 'Complete registration'
  | 'Email Verified'
  | 'Has 0 subscriptions'
  | 'Has 0 orders'
  | 'Has 0 advance deposits'
  | 'Balance 0.000 TND';

export interface SellerOrganization {
  id: number;
  code: string;
  account_manager: string | null;
  business_developer?: string | null;
  owner_name: string;
  owner_photo?: string | null;
  org_name: string | null;
  phone: string;
  phone_full?: string;
  email: string;
  tags: string[];
  joined_at: string;
  last_seen_at: string;
  onboarding: { label: SellerStatus; ok: boolean }[];
  documents: 'none' | 'review';
  follow_up_new: boolean;
  follow_up?: SupplierFollowUp | null;
  source: string;
  is_main_retailer: boolean;
  plus_membership: boolean;
  supplier: string;
  account_status?: string;
  allow_marketplace?: boolean;
  dropshipping_eligible?: boolean;
  doc_files?: Record<string, string>;
  doc_statuses?: Record<string, string>;
}

export interface SellerOrganizationsResult {
  rows: SellerOrganization[];
  total: number;
  filters: { statuses: string[]; sources: string[] };
  page: number;
  per_page: number;
}

export interface SellerNotification {
  id: number;
  org_id: number;
  name: string;
  data: string;
  channel: string;
  created_at: string;
}

export interface SellerNotificationResult {
  rows: SellerNotification[];
  total: number;
  filters: { channels: string[] };
  page: number;
  per_page: number;
}

export async function getSellerOrganization(id: number): Promise<SellerOrganization> {
  return apiGet(`/chef/seller-organizations/${id}`);
}

export async function updateSellerOrganizationTags(id: number, tags: string[]): Promise<SellerOrganization> {
  return apiPatch(`/chef/seller-organizations/${id}/tags`, { tags });
}

export async function patchSellerOrganizationFlags(
  id: number,
  patch: { account_status?: string; allow_marketplace?: boolean; dropshipping_eligible?: boolean; doc_files?: Record<string, string>; doc_statuses?: Record<string, string> }
): Promise<SellerOrganization> {
  return apiPatch(`/chef/seller-organizations/${id}/flags`, patch);
}

export async function updateSellerOrganizationOnboarding(id: number, status: string): Promise<SellerOrganization> {
  return apiPatch(`/chef/seller-organizations/${id}/onboarding`, { status });
}

export interface ManagerStaffOption {
  id: number;
  name: string;
  role: 'admin';
}

export async function listManagerStaffOptions(): Promise<ManagerStaffOption[]> {
  return apiGet('/chef/seller-organizations-staff');
}

export async function updateSellerOrganizationManagers(
  id: number,
  patch: { account_manager?: string | null; business_developer?: string | null }
): Promise<SellerOrganization> {
  return apiPatch(`/chef/seller-organizations/${id}/managers`, patch);
}

export async function createSellerFollowUp(id: number, input: SupplierFollowUpInput): Promise<SellerOrganization> {
  return apiPost(`/chef/seller-organizations/${id}/follow-up`, input);
}

export async function updateSellerFollowUp(id: number, patch: SupplierFollowUpPatchInput): Promise<SellerOrganization> {
  return apiPatch(`/chef/seller-organizations/${id}/follow-up`, patch);
}

export interface SupplierFollowUp {
  person: string;
  label: string;
  note: string | null;
  meeting: string;
  scheduled_at: string;
  confirmed: boolean;
  outcome?: string;
  by?: string;
  tags?: string[];
  attachments?: string[];
}

export interface SupplierOrganization {
  id: number;
  code: string;
  account_manager: string | null;
  owner_name: string;
  owner_photo?: string | null;
  org_name: string;
  city: string;
  email: string;
  phone: string;
  phone_full: string;
  tax_id: string;
  registration_pct: number;
  rne_code: string;
  main_type_supplier: boolean;
  onboarding: { label: string; ok: boolean }[];
  documents: 'no_document' | 'no_contract' | 'missing' | null;
  follow_up: SupplierFollowUp | null;
  source: string;
  labels: string[];
  joined_at: string;
  last_seen_at: string;
}

export interface SupplierOrganizationsResult {
  rows: SupplierOrganization[];
  total: number;
  filters: { statuses: string[]; sources: string[] };
  page: number;
  per_page: number;
}

export interface SupplierOrganizationDetail extends SupplierOrganization {
  about: string | null;
  role: string;
  entity_type: string;
  national_id: string | null;
  vat_code: string | null;
  branch_number: string | null;
  legal_name: string | null;
  related_seller: { name: string; code: string } | null;
  affiliated_by: { name: string; code: string } | null;
  call_schedule: boolean;
  orders_prep_average_time: string | null;
  fulfillment_rate: number | null;
  on_time_fulfillment_rate: number | null;
  allow_marketplace: boolean;
  dropshipping_eligible: boolean;
  account_status: 'active' | 'registration_uncompleted' | 'inactive';
  business_developer: string | null;
  doc_files: Record<string, string>;
  doc_statuses: Record<string, string>;
}

export async function searchSupplierOrganizations(params: URLSearchParams): Promise<SupplierOrganizationsResult> {
  return apiGet(`/chef/supplier-organizations?${params}`);
}

export async function getSupplierOrganization(id: number): Promise<SupplierOrganizationDetail> {
  return apiGet(`/chef/supplier-organizations/${id}`);
}

export async function accessSupplierOrganization(id: number): Promise<{ token: string; user: AuthUser }> {
  return apiPost(`/chef/supplier-organizations/${id}/access`);
}

export async function accessSellerOrganization(id: number): Promise<{ token: string; user: AuthUser }> {
  return apiPost(`/chef/seller-organizations/${id}/access`);
}

export interface SupplierOrgFlagsPatchInput {
  account_status?: 'active' | 'registration_uncompleted' | 'inactive';
  allow_marketplace?: boolean;
  dropshipping_eligible?: boolean;
  account_manager?: string | null;
  business_developer?: string | null;
  doc_files?: Record<string, string>;
  doc_statuses?: Record<string, string>;
}

export async function updateSupplierOrganizationFlags(id: number, patch: SupplierOrgFlagsPatchInput): Promise<SupplierOrganizationDetail> {
  return apiPatch(`/chef/supplier-organizations/${id}/flags`, patch);
}

export async function updateSupplierOrganizationLabels(id: number, labels: string[]): Promise<SupplierOrganizationDetail> {
  return apiPatch(`/chef/supplier-organizations/${id}/labels`, { labels });
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  photo: string | null;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  return apiGet('/chef/team-members');
}

export type StockRefillStatus = 'Pending' | 'Confirmed' | 'Approved' | 'In preparation' | 'Ready' | 'Shipped' | 'Completed' | 'Rejected';

export interface StockRefillRequestItem {
  id: number;
  request_id: number;
  product_name: string;
  color: string | null;
  image_url: string | null;
  expected_incoming: number;
  supplier_stock: number;
  our_stock: number;
  period_consumption: number;
  qty_non_confirmed: number;
  qty_required_orders: number;
  qty_to_request: number;
  qty_picked: number;
  unit_price: number;
}

export interface StockRefillRequestItemInput {
  product_name: string;
  color?: string | null;
  image_url?: string | null;
  expected_incoming?: number;
  supplier_stock?: number;
  our_stock?: number;
  period_consumption?: number;
  qty_non_confirmed?: number;
  qty_required_orders?: number;
  qty_to_request?: number;
  qty_picked?: number;
  unit_price?: number;
}

export interface StockRefillBatchRef {
  position: number;
  batch_code: string;
  quantity: number;
}

export interface StockRefillBatchRef {
  position: number;
  batch_code: string;
  quantity: number;
}

export interface StockRefillRequest {
  id: number;
  supplier: string;
  products: number;
  storage_request: string | null;
  reservation: string | null;
  date: string;
  status: StockRefillStatus;
  items: StockRefillRequestItem[];
  batches?: StockRefillBatchRef[];
}

export interface BatchScanInfo {
  batch_code: string;
  product_name: string;
  color: string | null;
  supplier: string;
  request_id: number;
  quantity: number;
  locations: { inventory_name: string; quantity: number }[];
}

export interface StockRefillRequestsResult {
  rows: StockRefillRequest[];
  total: number;
  filters: { statuses: StockRefillStatus[] };
  page: number;
  per_page: number;
}

export interface SaveStockRefillRequestInput {
  supplier: string;
  products: number;
  storage_request?: string | null;
  reservation?: string | null;
  date?: string | null;
  status?: StockRefillStatus;
  items?: StockRefillRequestItemInput[];
}

export async function searchStockRefillRequests(params: URLSearchParams): Promise<StockRefillRequestsResult> {
  return apiGet(`/stocking/stock-refill-requests?${params}`);
}

export async function getStockRefillRequest(id: number): Promise<StockRefillRequest> {
  return apiGet(`/stocking/stock-refill-requests/${id}`);
}

export interface PickupListSupplier {
  supplier: string;
  request_count: number;
  total_qty_to_request: number;
  items: StockRefillRequestItem[];
}

export async function getStockRefillPickupList(): Promise<{ suppliers: PickupListSupplier[] }> {
  return apiGet('/stocking/stock-refill-pickup-list');
}

export async function createStockRefillRequest(input: SaveStockRefillRequestInput): Promise<StockRefillRequest> {
  return apiPost('/stocking/stock-refill-requests', input);
}

export async function updateStockRefillRequest(id: number, input: SaveStockRefillRequestInput): Promise<StockRefillRequest> {
  return apiPut(`/stocking/stock-refill-requests/${id}`, input);
}

export async function deleteStockRefillRequest(id: number): Promise<void> {
  await apiDelete(`/stocking/stock-refill-requests/${id}`);
}

export interface StorageRequest {
  id: number;
  gid: string;
  client: string;
  related_refill_id: number | null;
  failed_qc: number;
  products: number;
  discrepancies: string | null;
  status: 'Pending' | 'Confirmed';
  created_at: string;
}

export interface StorageRequestsResult {
  rows: StorageRequest[];
  total: number;
  page: number;
  per_page: number;
}

export async function listStorageRequests(params: URLSearchParams): Promise<StorageRequestsResult> {
  return apiGet(`/stocking/storage-requests?${params}`);
}

export async function getStorageRequest(id: number): Promise<StorageRequest> {
  return apiGet(`/stocking/storage-requests/${id}`);
}

export function batchUrl(code: string): string {
  return `${window.location.origin}/scan/batch/${encodeURIComponent(code)}`;
}

export async function getBatchByCode(code: string): Promise<BatchScanInfo> {
  return apiGet(`/batches/${encodeURIComponent(code)}`);
}

export interface PickSampleBatch {
  batch_code: string;
  quantity: number;
}

export interface PickRecord {
  inventory_name: string;
  inventory_code: string;
  batch_code: string | null;
  quantity: number;
}

export interface PickSample {
  inventory_id: number;
  inventory_name: string;
  inventory_code: string;
  available: number;
  batches: PickSampleBatch[];
}

export interface PickPlanItem {
  product_id: number;
  product_name: string;
  product_image: string | null;
  fournisseur_name: string;
  quantity: number;
  picked: number;
  remaining: number;
  samples: PickSample[];
  picks: PickRecord[];
}

export interface PickPlan {
  order_id: number;
  order_number: string;
  status: Order['status'];
  complete: boolean;
  coverable: boolean;
  items: PickPlanItem[];
}

export interface OrderPickabilityRow {
  order_id: number;
  status: Order['status'];
  coverable: boolean;
  picked: number;
  needed: number;
}

export async function listOrdersPickability(): Promise<OrderPickabilityRow[]> {
  return apiGet('/stocking/orders-pickability');
}

export async function listStockingWholesaleOrders(): Promise<Order[]> {
  return apiGet('/stocking/wholesale-orders');
}

export async function listCancelledOrders(): Promise<Order[]> {
  return apiGet('/stocking/cancelled-orders');
}

export interface StockReturnRow {
  order_id: number;
  order_number: string;
  customer_name: string | null;
  product_id: number;
  product_name: string;
  image_url: string | null;
  supplier_id: number;
  supplier_name: string;
  quantity: number;
  stored_qty: number;
  pending: number;
  created_at: string;
}

export async function listStockReturns(): Promise<StockReturnRow[]> {
  return apiGet('/stocking/stock-returns');
}

export async function storeStockReturns(supplierId: number, inventoryId: number): Promise<{ stored_units: number; products: number; inventory_name: string }> {
  return apiPost('/stocking/stock-returns/store', { supplier_id: supplierId, inventory_id: inventoryId });
}

export interface StockReturnScanResult {
  product_name: string;
  supplier_name: string;
  stored_units: number;
  remaining_pending: number;
  inventory_name: string;
}

export async function scanStockReturn(code: string, inventoryId: number): Promise<StockReturnScanResult> {
  return apiPost('/stocking/stock-returns/scan', { code, inventory_id: inventoryId });
}

export const SHIPMENT_ZONES = ['Tunis', 'Sousse', 'Sfax', 'Eljem'] as const;
export type ShipmentZone = (typeof SHIPMENT_ZONES)[number];

export interface StockShipmentItem {
  product_id: number;
  product_name: string;
  image_url: string | null;
  quantity: number;
}

export interface StockShipmentOrder {
  id: number;
  order_number: string;
  barcode: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  governorate: string | null;
  city: string | null;
  status: Order['status'];
  zone: ShipmentZone | null;
  auto_zone: ShipmentZone | null;
  zone_override: boolean;
  items: StockShipmentItem[];
  total_units: number;
  dropshipper_name: string | null;
  fournisseur_name: string | null;
}

export async function getStockShipments(): Promise<StockShipmentOrder[]> {
  return apiGet('/stocking/stock-shipments');
}

export async function setStockShipmentZone(orderId: number, zone: ShipmentZone | null): Promise<void> {
  await apiPost(`/stocking/stock-shipments/${orderId}/zone`, { zone });
}

export type OrderPickStatus = 'unconfirmed' | 'confirmed' | 'shipped' | 'cancelled' | 'return';

export const ZONE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Tunis:   { bg: 'bg-sky-100',    text: 'text-sky-700',    ring: 'ring-sky-300' },
  Sousse:  { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  Sfax:    { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300' },
  Eljem:   { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300' },
};
export const DEFAULT_ZONE_COLOR = { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-300' };

export interface OrderPickRow {
  id: number;
  order_id: number;
  order_number: string;
  barcode: string | null;
  dropshipper_name: string | null;
  destinator: string | null;
  destination: string | null;
  governorate: string | null;
  agence: ShipmentZone | null;
  delivery_company: string | null;
  delivery_status: string | null;
  total: number;
  created_at: string;
  arrive_at: string;
  status: OrderPickStatus;
  items: StockShipmentItem[];
}

export async function getOrderPicks(): Promise<OrderPickRow[]> {
  return apiGet('/stocking/picks');
}

export interface StockingDashboard {
  refill: {
    total: number;
    statusCounts: Record<string, number>;
    pickupSuppliers: number;
    totalQtyToRequest: number;
  };
  picks: Record<string, number> & { readyToConfirm: number };
  returns: { total: number; pendingUnits: number };
  storage: { total: number; statusCounts: Record<string, number>; quantity: number };
  delivery: { exchanges: number; delivered: number; returnsDelivered: number };
  flow: {
    confirmedValue: number;
    shippedValue: number;
    confirmed: number;
    shipped: number;
    returnCount: number;
  };
  byDropshipper: Array<{
    name: string;
    unconfirmed: number;
    confirmed: number;
    shipped: number;
    return: number;
    cancelled: number;
    value: number;
  }>;
  byDay: Array<{
    day: string;
    unconfirmed: number;
    confirmed: number;
    shipped: number;
    return: number;
    total: number;
    value: number;
  }>;
  recent: Array<{
    order_number: string;
    dropshipper_name: string | null;
    status: OrderPickStatus;
    total: number;
    created_at: string;
  }>;
}

export async function getStockingDashboard(): Promise<StockingDashboard> {
  return apiGet('/stocking/dashboard');
}

export async function createOrderPick(orderId: number): Promise<OrderPickRow> {
  return apiPost(`/stocking/picks/${orderId}`);
}

export async function scanOrderPickStatus(orderId: number): Promise<OrderPickRow> {
  return apiPost(`/stocking/picks/${orderId}/scan`);
}

export async function getOrderPickPlan(orderId: number): Promise<PickPlan> {
  return apiGet(`/stocking/orders/${orderId}/pick-plan`);
}

export async function scanOrderPick(orderId: number, productId: number, inventoryId: number, batchCode: string | null): Promise<PickPlan> {
  return apiPost(`/stocking/orders/${orderId}/pick-scan`, { product_id: productId, inventory_id: inventoryId, batch_code: batchCode });
}

export async function syncFirstDeliveryStatus(orderId: number): Promise<{ delivery_status: string | null; fd_state: number | null }> {
  return apiPost(`/integration/first-delivery/sync-status/${orderId}`);
}

export async function dispatchFirstDelivery(orderId: number): Promise<{ barCode: string | null; already_dispatched: boolean }> {
  return apiPost(`/integration/first-delivery/dispatch/${orderId}`);
}

export async function getDeliveryStatuses(): Promise<Record<string, string>> {
  return apiGet('/integration/delivery-statuses');
}

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  en_attente: 'Waiting',
  en_cours: 'In progress',
  livre: 'Delivered',
  echange: 'Exchange',
  retour_expediteur: 'Return to sender',
  supprime: 'Deleted',
  rtn_client_agence: 'Customer/agency return',
  au_magasin: 'At store',
  rtn_depôt: 'Warehouse return',
  a_verifier: 'Needs verification',
  retour_recu: 'Return received',
  rtn_definitif: 'Final return',
  demande_enlevement: 'Pickup request',
  enlevement_assigne: "Enlèvement assigné",
  en_cours_enlevement: "En cours d'enlèvement",
  enleve: 'Enlevé',
  enlevement_annule: "Enlèvement annulé",
  retour_assigne: 'Retour assigné',
  retour_en_cours: 'Retour en cours',
  retour_enleve: 'Retour enlevé',
  retour_annule: 'Retour annulé',
};

export interface CreateSupplierOrganizationInput {
  company_name: string;
  tax_id: string;
  company_description?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
}

export async function createSupplierOrganization(input: CreateSupplierOrganizationInput): Promise<SupplierOrganization> {
  return apiPost('/chef/supplier-organizations', input);
}

export interface SupplierFollowUpInput {
  meeting: string;
  tags?: string[];
  note?: string | null;
  scheduled_at?: string | null;
  attachments?: string[];
}

export interface SupplierFollowUpPatchInput extends Omit<Partial<SupplierFollowUpInput>, 'attachments'> {
  confirmed?: boolean;
  outcome?: string | null;
  attachments?: string[] | null;
}

export async function createSupplierFollowUp(id: number, input: SupplierFollowUpInput): Promise<SupplierOrganization> {
  return apiPost(`/chef/supplier-organizations/${id}/follow-up`, input);
}

export async function updateSupplierFollowUp(id: number, patch: SupplierFollowUpPatchInput): Promise<SupplierOrganization> {
  return apiPatch(`/chef/supplier-organizations/${id}/follow-up`, patch);
}

export async function getShipmentDetail(id: number): Promise<ShipmentDetail> {
  const r = await apiGet<ShipmentDetailResult>(`/chef/shipments/${id}`);
  return r.shipment;
}

export async function getReturnDetail(id: number): Promise<ReturnDetail> {
  return apiGet<ReturnDetail>(`/chef/returns/${id}`);
}

export async function getManifestDetail(id: number): Promise<ManifestDetail> {
  const r = await apiGet<{ manifest: ManifestDetail }>(`/chef/manifests/${id}`);
  return r.manifest;
}

export async function getManifestGroups(): Promise<ManifestGroup[]> {
  const r = await apiGet<{ groups: ManifestGroup[] }>('/chef/manifests/grouped');
  return r.groups;
}

export async function getManifestGroupDetail(supplierId: number, delivery: string): Promise<ManifestGroupDetail> {
  const r = await apiGet<ManifestGroupDetail>(`/chef/manifests/group/${supplierId}/${encodeURIComponent(delivery)}`);
  return r;
}

export function getManifestPdfUrl(supplierId: number, delivery: string): string {
  return `/api/chef/manifests/pdf/${supplierId}/${encodeURIComponent(delivery)}`;
}

export async function getSupplierConversations(): Promise<SupplierConversation[]> {
  const r = await apiGet<{ conversations: SupplierConversation[] }>('/chef/supplier-conversations');
  return r.conversations;
}

export async function getSupplierConversationMessages(convId: number): Promise<ChatMessage[]> {
  const r = await apiGet<{ messages: ChatMessage[] }>(`/chef/supplier-conversations/${convId}/messages`);
  return r.messages;
}

export async function updateChefReturn(
  id: number,
  patch: {
    approval_status?: ReturnApprovalStatus | null;
    delivery_type?: string | null;
    process_type?: string | null;
    carrier?: string | null;
    return_delivery_status?: ReturnDeliveryStatus | null;
    exchange_delivery_status?: ExchangeDeliveryStatus | null;
  }
): Promise<void> {
  return apiPatch(`/chef/returns/${id}`, patch);
}

export async function listReturnRequests(): Promise<ReturnRequest[]> {
  return apiGet<ReturnRequest[]>('/returns');
}

export async function getSellerNotifications(id: number, params: URLSearchParams): Promise<SellerNotificationResult> {
  return apiGet(`/chef/seller-organizations/${id}/notifications?${params}`);
}

export interface ProductSubscription {
  id: number;
  product_name: string;
  product_image: string | null;
  supplier_name: string;
  retailer_name: string;
  cost: number;
  price: number;
  my_price: number | null;
  offer_type: string;
  saved_at: string;
}

export interface SubscriptionPatch {
  price?: number | null;
  cost?: number | null;
  profit_fee?: number | null;
  allow_when_oos?: boolean;
  price_constraint?: boolean;
}

export async function getSubscriptionDetail(id: number): Promise<ProductSubscription> {
  return apiGet(`/chef/subscriptions/${id}`);
}

export async function updateSubscription(id: number, patch: SubscriptionPatch): Promise<ProductSubscription> {
  return apiPut(`/chef/subscriptions/${id}`, patch);
}

export interface ProductSubscriptionsResult {
  subscriptions: ProductSubscription[];
  total: number;
  page: number;
  per_page: number;
}

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

export type CatalogOfferType = 'dropshipping' | 'wholesale' | 'white_label';

export interface CollectionProduct {
  id: number;
  name: string;
  emoji: string;
  image_url: string | null;
  eligible_to_marketplace: boolean;
  offer_type: CatalogOfferType;
}

export interface CollectionProductItem extends CollectionProduct {
  added_by: string | null;
  added_at: string;
}

export interface CollectionDetail extends Collection {
  product_items: CollectionProductItem[];
}

export interface CollectionInput {
  title: string;
  description?: string | null;
  is_active?: boolean;
  marketplace_sort_rank?: number | null;
  product_ids?: number[];
}

export interface CollectionsResult {
  collections: Collection[];
  total: number;
}

export async function getCollections(): Promise<CollectionsResult> {
  return apiGet('/chef/collections');
}

export async function getCollectionDetail(id: number): Promise<CollectionDetail> {
  return apiGet(`/chef/collections/${id}`);
}

export async function getCollectionCatalog(): Promise<CollectionProduct[]> {
  return apiGet('/chef/collections/catalog');
}

export async function createCollection(input: CollectionInput): Promise<CollectionDetail> {
  return apiPost('/chef/collections', input);
}

export interface WarehouseOwnerOption {
  id: number;
  name: string;
  email: string;
  role: string;
}

export async function listSupplierWarehouses(): Promise<SupplierWarehouse[]> {
  return apiGet('/chef/warehouses');
}

export async function getWarehouseOwners(): Promise<WarehouseOwnerOption[]> {
  return apiGet('/chef/warehouse/owners');
}

export async function createSupplierWarehouse(input: CreateSupplierWarehouseInput): Promise<SupplierWarehouse> {
  return apiPost('/chef/warehouses', input);
}

export async function updateCollection(id: number, input: CollectionInput): Promise<CollectionDetail> {
  return apiPut(`/chef/collections/${id}`, input);
}

export async function addProductToCollection(collectionId: number, productId: number): Promise<CollectionDetail> {
  return apiPost(`/chef/collections/${collectionId}/products`, { product_id: productId });
}

export async function removeProductFromCollection(collectionId: number, productId: number): Promise<CollectionDetail> {
  return apiDelete(`/chef/collections/${collectionId}/products?product_id=${productId}`);
}

export type SupplierProductOffer = 'dropshipping' | 'wholesale' | 'white_label';
export type SupplierProductStatus = 'Active' | 'In Review' | 'Declined' | 'Inactive';
export type SupplierProductShipping = 'Can be shipped' | 'Cannot ship';

export interface SupplierProduct {
  id: number;
  gid: string;
  name: string;
  emoji: string;
  image_url: string | null;
  visible: boolean;
  offer_type: SupplierProductOffer[];
  status: SupplierProductStatus;
  shipping: SupplierProductShipping;
  product_labels: string[];
  collection_ids: number[];
  supplier_id: number;
  supplier_name: string;
  supplier_labels: string[];
  created_at: string;
}

export interface SupplierProductQuery {
  page: number;
  per_page: number;
  q?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  statuses?: string[];
  offers?: string[];
  visibility?: 'visible' | 'hidden';
  shipping?: string;
}

export interface SupplierProductsResult {
  rows: SupplierProduct[];
  total: number;
  filters: { statuses: string[]; offers: string[]; shippings: string[] };
  page: number;
  per_page: number;
}

export async function searchSupplierProducts(params: SupplierProductQuery): Promise<SupplierProductsResult> {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page));
  if (params.q) p.set('q', params.q);
  if (params.sort) p.set('sort', params.sort);
  if (params.dir) p.set('dir', params.dir);
  if (params.statuses?.length) p.set('statuses', params.statuses.join(','));
  if (params.offers?.length) p.set('offers', params.offers.join(','));
  if (params.visibility) p.set('visibility', params.visibility);
  if (params.shipping) p.set('shipping', params.shipping);
  return apiGet(`/chef/products?${p.toString()}`);
}

export async function getSupplierProduct(id: number): Promise<SupplierProduct> {
  return apiGet(`/chef/products/${id}`);
}

export async function getSupplierOrganizationProducts(
  id: number,
  params: { page: number; per_page: number; q?: string }
): Promise<{ rows: SupplierProduct[]; total: number; page: number; per_page: number }> {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page));
  if (params.q) p.set('q', params.q);
  return apiGet(`/chef/supplier-organizations/${id}/products?${p.toString()}`);
}

/* ── Support mirror of organization endpoints ─────────────────────────── */

export async function searchSellerOrganizations(params: URLSearchParams): Promise<SellerOrganizationsResult> {
  return apiGet(`/chef/seller-organizations?${params}`);
}

export async function searchSupportSellerOrganizations(params: URLSearchParams): Promise<SellerOrganizationsResult> {
  return apiGet(`/support/seller-organizations?${params}`);
}

export async function getSupportSellerOrganization(id: number): Promise<SellerOrganization> {
  return apiGet(`/support/seller-organizations/${id}`);
}

export async function updateSupportSellerOrganizationTags(id: number, tags: string[]): Promise<SellerOrganization> {
  return apiPatch(`/support/seller-organizations/${id}/tags`, { tags });
}

export async function patchSupportSellerOrganizationFlags(
  id: number,
  patch: { account_status?: string; allow_marketplace?: boolean; dropshipping_eligible?: boolean; doc_files?: Record<string, string>; doc_statuses?: Record<string, string> }
): Promise<SellerOrganization> {
  return apiPatch(`/support/seller-organizations/${id}/flags`, patch);
}

export async function updateSupportSellerOrganizationOnboarding(id: number, status: string): Promise<SellerOrganization> {
  return apiPatch(`/support/seller-organizations/${id}/onboarding`, { status });
}

export async function listSupportManagerStaffOptions(): Promise<ManagerStaffOption[]> {
  return apiGet('/support/seller-organizations-staff');
}

export async function updateSupportSellerOrganizationManagers(
  id: number,
  patch: { account_manager?: string | null; business_developer?: string | null }
): Promise<SellerOrganization> {
  return apiPatch(`/support/seller-organizations/${id}/managers`, patch);
}

export async function createSupportSellerFollowUp(id: number, input: SupplierFollowUpInput): Promise<SellerOrganization> {
  return apiPost(`/support/seller-organizations/${id}/follow-up`, input);
}

export async function updateSupportSellerFollowUp(id: number, patch: SupplierFollowUpPatchInput): Promise<SellerOrganization> {
  return apiPatch(`/support/seller-organizations/${id}/follow-up`, patch);
}

export async function getSupportSellerNotifications(id: number, params: URLSearchParams): Promise<SellerNotificationResult> {
  return apiGet(`/support/seller-organizations/${id}/notifications?${params}`);
}

export async function searchSupportSupplierOrganizations(params: URLSearchParams): Promise<SupplierOrganizationsResult> {
  return apiGet(`/support/supplier-organizations?${params}`);
}

export async function getSupportSupplierOrganization(id: number): Promise<SupplierOrganizationDetail> {
  return apiGet(`/support/supplier-organizations/${id}`);
}

export async function accessSupportSupplierOrganization(id: number): Promise<{ token: string; user: AuthUser }> {
  return apiPost(`/support/supplier-organizations/${id}/access`);
}

export async function accessSupportSellerOrganization(id: number): Promise<{ token: string; user: AuthUser }> {
  return apiPost(`/support/seller-organizations/${id}/access`);
}

export async function updateSupportSupplierOrganizationFlags(id: number, patch: SupplierOrgFlagsPatchInput): Promise<SupplierOrganizationDetail> {
  return apiPatch(`/support/supplier-organizations/${id}/flags`, patch);
}

export async function updateSupportSupplierOrganizationLabels(id: number, labels: string[]): Promise<SupplierOrganizationDetail> {
  return apiPatch(`/support/supplier-organizations/${id}/labels`, { labels });
}

export async function createSupportSupplierOrganization(input: CreateSupplierOrganizationInput): Promise<SupplierOrganization> {
  return apiPost('/support/supplier-organizations', input);
}

export async function createSupportSupplierFollowUp(id: number, input: SupplierFollowUpInput): Promise<SupplierOrganization> {
  return apiPost(`/support/supplier-organizations/${id}/follow-up`, input);
}

export async function updateSupportSupplierFollowUp(id: number, patch: SupplierFollowUpPatchInput): Promise<SupplierOrganization> {
  return apiPatch(`/support/supplier-organizations/${id}/follow-up`, patch);
}

export async function getSupportSupplierOrganizationProducts(
  id: number,
  params: { page: number; per_page: number; q?: string }
): Promise<{ rows: SupplierProduct[]; total: number; page: number; per_page: number }> {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page));
  if (params.q) p.set('q', params.q);
  return apiGet(`/support/supplier-organizations/${id}/products?${p.toString()}`);
}

export async function listSupportTeamMembers(): Promise<TeamMember[]> {
  return apiGet('/support/team-members');
}

export interface OrgApiBundle {
  searchSellerOrganizations: (params: URLSearchParams) => Promise<SellerOrganizationsResult>;
  getSellerOrganization: (id: number) => Promise<SellerOrganization>;
  updateSellerOrganizationTags: (id: number, tags: string[]) => Promise<SellerOrganization>;
  patchSellerOrganizationFlags: (id: number, patch: { account_status?: string; allow_marketplace?: boolean; dropshipping_eligible?: boolean; doc_files?: Record<string, string>; doc_statuses?: Record<string, string> }) => Promise<SellerOrganization>;
  updateSellerOrganizationOnboarding: (id: number, status: string) => Promise<SellerOrganization>;
  listManagerStaffOptions: () => Promise<ManagerStaffOption[]>;
  updateSellerOrganizationManagers: (id: number, patch: { account_manager?: string | null; business_developer?: string | null }) => Promise<SellerOrganization>;
  createSellerFollowUp: (id: number, input: SupplierFollowUpInput) => Promise<SellerOrganization>;
  updateSellerFollowUp: (id: number, patch: SupplierFollowUpPatchInput) => Promise<SellerOrganization>;
  getSellerNotifications: (id: number, params: URLSearchParams) => Promise<SellerNotificationResult>;
  searchSupplierOrganizations: (params: URLSearchParams) => Promise<SupplierOrganizationsResult>;
  getSupplierOrganization: (id: number) => Promise<SupplierOrganizationDetail>;
  accessSupplierOrganization: (id: number) => Promise<{ token: string; user: AuthUser }>;
  accessSellerOrganization: (id: number) => Promise<{ token: string; user: AuthUser }>;
  updateSupplierOrganizationFlags: (id: number, patch: SupplierOrgFlagsPatchInput) => Promise<SupplierOrganizationDetail>;
  updateSupplierOrganizationLabels: (id: number, labels: string[]) => Promise<SupplierOrganizationDetail>;
  createSupplierOrganization: (input: CreateSupplierOrganizationInput) => Promise<SupplierOrganization>;
  createSupplierFollowUp: (id: number, input: SupplierFollowUpInput) => Promise<SupplierOrganization>;
  updateSupplierFollowUp: (id: number, patch: SupplierFollowUpPatchInput) => Promise<SupplierOrganization>;
  getSupplierOrganizationProducts: (id: number, params: { page: number; per_page: number; q?: string }) => Promise<{ rows: SupplierProduct[]; total: number; page: number; per_page: number }>;
  listTeamMembers: () => Promise<TeamMember[]>;
}

export const chefOrgApi: OrgApiBundle = {
  searchSellerOrganizations,
  getSellerOrganization,
  updateSellerOrganizationTags,
  patchSellerOrganizationFlags,
  updateSellerOrganizationOnboarding,
  listManagerStaffOptions,
  updateSellerOrganizationManagers,
  createSellerFollowUp,
  updateSellerFollowUp,
  getSellerNotifications,
  searchSupplierOrganizations,
  getSupplierOrganization,
  accessSupplierOrganization,
  accessSellerOrganization,
  updateSupplierOrganizationFlags,
  updateSupplierOrganizationLabels,
  createSupplierOrganization,
  createSupplierFollowUp,
  updateSupplierFollowUp,
  getSupplierOrganizationProducts,
  listTeamMembers,
};

export const supportOrgApi: OrgApiBundle = {
  searchSellerOrganizations: searchSupportSellerOrganizations,
  getSellerOrganization: getSupportSellerOrganization,
  updateSellerOrganizationTags: updateSupportSellerOrganizationTags,
  patchSellerOrganizationFlags: patchSupportSellerOrganizationFlags,
  updateSellerOrganizationOnboarding: updateSupportSellerOrganizationOnboarding,
  listManagerStaffOptions: listSupportManagerStaffOptions,
  updateSellerOrganizationManagers: updateSupportSellerOrganizationManagers,
  createSellerFollowUp: createSupportSellerFollowUp,
  updateSellerFollowUp: updateSupportSellerFollowUp,
  getSellerNotifications: getSupportSellerNotifications,
  searchSupplierOrganizations: searchSupportSupplierOrganizations,
  getSupplierOrganization: getSupportSupplierOrganization,
  accessSupplierOrganization: accessSupportSupplierOrganization,
  accessSellerOrganization: accessSupportSellerOrganization,
  updateSupplierOrganizationFlags: updateSupportSupplierOrganizationFlags,
  updateSupplierOrganizationLabels: updateSupportSupplierOrganizationLabels,
  createSupplierOrganization: createSupportSupplierOrganization,
  createSupplierFollowUp: createSupportSupplierFollowUp,
  updateSupplierFollowUp: updateSupportSupplierFollowUp,
  getSupplierOrganizationProducts: getSupportSupplierOrganizationProducts,
  listTeamMembers: listSupportTeamMembers,
};

export interface SupplierProductVariation {
  emoji: string;
  variant: string;
  stock: number;
  price: number;
  vat_pct: number;
  weight_g: number;
  dimensions: string;
  recommended_selling_price: number;
}

export interface SupplierProductFulfiller {
  name: string;
  warehouse: string;
  quantity: number;
}

export interface SupplierProductDeclineReason {
  reason: string;
  note: string | null;
}

export interface SupplierProductStock {
  warehouses: { name: string; brought: number; in_orders: number; in_warehouse: number }[];
  movements: { direction: 'in' | 'out'; warehouse: string; label: string; qty: number; at: string }[];
}

export interface SupplierProductDetail extends SupplierProduct {
  offer_types: SupplierProductOffer[];
  description: string | null;
  images: string[];
  videos: string[];
  video_url: string | null;
  marketplace_price: number;
  supplier_price: number;
  product_value: number | null;
  wholesale: { min: number; max: number } | null;
  categories: string[];
  platform_commission_pct: number;
  tags: string[];
  fulfillers: SupplierProductFulfiller[];
  weight_g: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  vat_pct: number;
  media_count: number;
  real_video: boolean;
  real_image: boolean;
  updated_at: string;
  activated_at: string | null;
  activated_by: string | null;
  decline_reasons: SupplierProductDeclineReason[] | null;
  variations: SupplierProductVariation[];
  service_user_score: number;
  recommended_selling_price: number;
  stock: SupplierProductStock;
}

export async function getSupplierProductDetail(id: number): Promise<SupplierProductDetail> {
  return apiGet(`/chef/products/${id}`);
}

export async function getProductSupplierOrg(id: number): Promise<SupplierOrganization | null> {
  return apiGet(`/chef/products/${id}/supplier-org`);
}

export interface CreateChefTicketInput {
  author_name: string;
  owner_names: string[];
  subject: string;
  description: string;
  department: string;
  priority: 'urgent' | 'high' | 'medium';
  related_to: string | null;
}

export async function createChefTicket(input: CreateChefTicketInput): Promise<ChefTicket> {
  return apiPost('/chef/tickets', input);
}

export async function updateChefTicket(id: number, patch: { status?: 'resolved' | 'unresolved'; priority?: 'urgent' | 'high' | 'medium' }): Promise<ChefTicket> {
  return apiPatch(`/chef/tickets/${id}`, patch);
}

export async function createStockingTicket(input: CreateChefTicketInput): Promise<ChefTicket> {
  return apiPost('/stocking/tickets', input);
}

export async function updateStockingTicket(id: number, patch: { status?: 'resolved' | 'unresolved'; priority?: 'urgent' | 'high' | 'medium' }): Promise<ChefTicket> {
  return apiPatch(`/stocking/tickets/${id}`, patch);
}

export async function createSupportTicket(input: CreateChefTicketInput): Promise<ChefTicket> {
  return apiPost('/support/tickets', input);
}

export async function updateSupportTicket(id: number, patch: { status?: 'resolved' | 'unresolved'; priority?: 'urgent' | 'high' | 'medium' }): Promise<ChefTicket> {
  return apiPatch(`/support/tickets/${id}`, patch);
}

export type ModerateStatus = 'approved' | 'refused' | 'hidden' | 'pending';

export async function moderateChefProduct(
  id: number,
  status: ModerateStatus,
  note?: string | null,
): Promise<{ id: number; status: ModerateStatus }> {
  return apiPost(`/chef/products/${id}/moderate`, { status, note: note ?? null });
}

export interface ChefProductPatch {
  name?: string;
  description?: string | null;
  price?: number;
  offers?: SupplierProductOffer[];
  image_url?: string | null;
  video_url?: string | null;
  images?: string[];
  videos?: string[];
}

export async function updateChefProduct(id: number, patch: ChefProductPatch): Promise<SupplierProductDetail> {
  return apiPatch(`/chef/products/${id}`, patch);
}

export interface BinCatalogItem {
  id: number;
  title: string;
  dims: number[];
  image: string | null;
}

export interface BinInventoryRow {
  id: number;
  bin_id: number | null;
  bin_title: string;
  dims: number[];
  image: string | null;
  organization: { name: string; code: string };
  warehouse: string;
  available_qty: number;
}

export interface BinsInventoryResult {
  rows: BinInventoryRow[];
  total: number;
  page: number;
  per_page: number;
  warehouses: string[];
}

export async function getBinInventories(params: {
  page: number;
  per_page: number;
  q?: string;
  qte_min?: number;
  qte_max?: number;
}): Promise<BinsInventoryResult> {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page));
  if (params.q) p.set('q', params.q);
  if (params.qte_min != null) p.set('qte_min', String(params.qte_min));
  if (params.qte_max != null) p.set('qte_max', String(params.qte_max));
  return apiGet(`/chef/bins?${p.toString()}`);
}

export async function getBinsCatalog(): Promise<{ catalog: BinCatalogItem[]; warehouses: string[] }> {
  return apiGet('/chef/bins/catalog');
}

export type LeadSource = 'organic' | 'manual' | 'import' | 'referral' | 'paid' | 'other' | 'social_media' | 'directory' | 'event' | 'competition_data';
export type LeadType = 'retailer' | 'supplier' | 'unknown' | 'retailer_supplier';
export type LeadStatus = 'New' | 'Contacted' | 'Trial' | 'Closed Won' | 'Closed Lost' | 'No Answer' | 'Opt Out';

export interface LeadFollowUp {
  agent: string;
  avatar: string | null;
  type: string | null;
  at: string | null;
  confirmed: boolean;
  note: string | null;
  history: number;
}

export interface SalesAgent {
  name: string;
  avatar: string | null;
}

export interface Lead {
  id: number;
  gid: string;
  name: string;
  phone_full: string;
  phone_masked: string;
  email: string | null;
  link: string | null;
  link2: string | null;
  link3: string | null;
  review: string | null;
  location: string | null;
  source: LeadSource;
  type: LeadType;
  status: LeadStatus;
  est_mv: number | null;
  organization: { name: string; code: string; kind: LeadType } | null;
  has_order: boolean;
  has_withdrawal: boolean;
  orders_30d: number;
  labels: string[];
  sales_agent: SalesAgent | null;
  created_by: string | null;
  follow_up: LeadFollowUp | null;
  notes_count: number;
  last_submitted_at: string;
  created_at: string;
  last_follow_up_at: string | null;
}

export interface LeadsResult {
  rows: Lead[];
  total: number;
  page: number;
  per_page: number;
}

export async function searchLeads(params: {
  page: number;
  per_page: number;
  q?: string;
  sort?: string;
  dir?: string;
  source?: string;
  type?: string;
  status?: string;
  location?: string;
  has_order?: string;
}): Promise<LeadsResult> {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page));
  if (params.q) p.set('q', params.q);
  if (params.sort) p.set('sort', params.sort);
  if (params.dir) p.set('dir', params.dir);
  if (params.source) p.set('source', params.source);
  if (params.type) p.set('type', params.type);
  if (params.status) p.set('status', params.status);
  if (params.location) p.set('location', params.location);
  if (params.has_order) p.set('has_order', params.has_order);
  return apiGet(`/chef/leads?${p.toString()}`);
}

export interface LeadsOptions {
  sources: LeadSource[];
  types: LeadType[];
  statuses: LeadStatus[];
  locations: string[];
  agents: SalesAgent[];
  countries: { id: number; name: string; dial: string; code: string }[];
  total: number;
}

export async function getLeadsOptions(): Promise<LeadsOptions> {
  return apiGet('/chef/leads/options');
}

export type PackingBinType = 'box' | 'flatpolybag' | 'crate' | 'container' | 'pallet' | 'vehicle';

export interface PackingBin {
  id: number;
  name: string;
  reference: string;
  price: number;
  cost: number;
  type: PackingBinType;
  created_at: string;
  image: string | null;
  active: boolean;
}

export interface PackingBinsResult {
  rows: PackingBin[];
  total: number;
  page: number;
  per_page: number;
}

export async function searchPackingBins(params: { page: number; per_page: number; q?: string }): Promise<PackingBinsResult> {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page));
  if (params.q) p.set('q', params.q);
  return apiGet(`/chef/packing/bins?${p.toString()}`);
}

export interface PackingBinTypeOption {
  value: PackingBinType;
  label: string;
}

export async function getPackingBinOptions(): Promise<{ types: PackingBinTypeOption[] }> {
  return apiGet('/chef/packing/bins/options');
}

export async function createPackingBin(input: { name: string; reference?: string | null; price?: number; cost?: number; type: PackingBinType; image?: string | null; active?: boolean }): Promise<PackingBin> {
  return apiPost('/chef/packing/bins', input);
}

export async function getPackingBin(id: number): Promise<PackingBin> {
  return apiGet(`/chef/packing/bins/${id}`);
}

export async function updatePackingBin(id: number, input: { name?: string; reference?: string | null; price?: number; cost?: number; type?: PackingBinType; image?: string | null; active?: boolean }): Promise<PackingBin> {
  return apiPost(`/chef/packing/bins/${id}`, input);
}

export async function deletePackingBin(id: number): Promise<{ deleted: boolean }> {
  return apiDelete(`/chef/packing/bins/${id}`);
}

export type FindProductType = 'dropshipping' | 'wholesale' | 'oem';

export interface FindProduct {
  id: number;
  uuid: string;
  name: string;
  description: string;
  image: string | null;
  type: FindProductType;
  in_stock: boolean;
  quantity: number;
  price: number;
  collections: string[];
  hierarchicalCategories: string | null;
  category: string;
  rating: number;
  shipper_express: boolean;
  up_to_date_stocks: boolean;
  high_rating: boolean;
  reliable_fulfillment: boolean;
  activated_at: string;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface FindProductsResult {
  hits: FindProduct[];
  total: number;
  page: number;
  per_page: number;
  ms: number;
  facets: {
    productType: FacetValue[];
    inStock: FacetValue[];
    shipperExpress: FacetValue[];
    upToDateStocks: FacetValue[];
    highRating: FacetValue[];
    reliableFulfillment: FacetValue[];
    collections: FacetValue[];
    categories: FacetValue[];
    price: { min: number; max: number };
    rating: { min: number; max: number };
  };
}

export interface FindProductsParams {
  page: number;
  per_page: number;
  q?: string;
  sort?: string;
  type?: FindProductType;
  in_stock?: 'true' | 'false';
  category?: string;
  collections?: string;
  shipper_express?: 'true' | 'false';
  high_rating?: 'true' | 'false';
  reliable_fulfillment?: 'true' | 'false';
  price_min?: number;
  price_max?: number;
  rating_min?: number;
  rating_max?: number;
  quantity_min?: number;
  quantity_max?: number;
}

export async function searchFindProducts(params: FindProductsParams): Promise<FindProductsResult> {
  return apiGet(`/chef/find-products?${findProductsQueryString(params)}`);
}

export async function getFindProductDetail(uuid: string): Promise<SupplierProductDetail> {
  return apiGet(`/chef/find-products/${uuid}`);
}

export async function supportSearchFindProducts(params: FindProductsParams): Promise<FindProductsResult> {
  return apiGet(`/support/find-products?${findProductsQueryString(params)}`);
}

export async function getSupportFindProductDetail(uuid: string): Promise<SupplierProductDetail> {
  return apiGet(`/support/find-products/${uuid}`);
}

export async function getSupportProductSupplierOrg(id: number): Promise<SupplierOrganization | null> {
  return apiGet(`/support/products/${id}/supplier-org`);
}

export async function getSupportCollections(): Promise<CollectionsResult> {
  return apiGet('/support/collections');
}

function findProductsQueryString(params: FindProductsParams): string {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page));
  if (params.q) p.set('q', params.q);
  if (params.sort) p.set('sort', params.sort);
  if (params.type) p.set('type', params.type);
  if (params.in_stock) p.set('in_stock', params.in_stock);
  if (params.category) p.set('category', params.category);
  if (params.collections) p.set('collections', params.collections);
  if (params.shipper_express) p.set('shipper_express', params.shipper_express);
  if (params.high_rating) p.set('high_rating', params.high_rating);
  if (params.reliable_fulfillment) p.set('reliable_fulfillment', params.reliable_fulfillment);
  if (params.price_min != null) p.set('price_min', String(params.price_min));
  if (params.price_max != null) p.set('price_max', String(params.price_max));
  if (params.rating_min != null) p.set('rating_min', String(params.rating_min));
  if (params.rating_max != null) p.set('rating_max', String(params.rating_max));
  if (params.quantity_min != null) p.set('quantity_min', String(params.quantity_min));
  if (params.quantity_max != null) p.set('quantity_max', String(params.quantity_max));
  return p.toString();
}

export const SHIPMENT_ORDER_TYPES = [
  'Dropshipping',
  'Wholesale order',
  'Reservation order',
  'Wholesale & reservation orders',
  'Fulfillment',
  'Of wholesale bought products',
  'Of reserved products',
  'Confirmation orders',
  'Exchanges',
  'Non-COD orders',
  'Late Fulfillment',
  'Delivery Verification',
  'Delivery Verification - Claims',
  'From Integration',
] as const;

export interface ProductUpdate {
  id: number;
  product_id: number;
  changed_field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

/** An invoice generated from a delivered commande (derived from the order). */
export interface Invoice {
  id: number;
  invoice_number: string;
  order_number: string;
  delivered_at: string;
  customer_name: string | null;
  city: string | null;
  governorate: string | null;
  payment_method: string | null;
  payment_status: 'unpaid' | 'paid';
  quantity: number;
  total: number;
  commission: number;
  items: { product_id: number; product_name: string; quantity: number; price: number; cost: number }[];
}

export type SavedOfferType = 'dropshipping' | 'wholesale' | 'fulfillment';

export interface SavedProduct {
  id: number;
  saved_at: string;
  my_price: number | null;
  offer_type: SavedOfferType;
  product: Product;
  updates: ProductUpdate[];
}

export interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  dropshipper_id: number;
  dropshipper_name: string;
  type: 'retour' | 'echange';
  reason: string;
  attachments: string[];
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  reply: string | null;
  created_at: string;
}

export interface StockRequestItem {
  product_id: number;
  product_name: string;
  quantity: number;
  house_available: number;
}

export interface AppNotification {
  id: number;
  user_id: number;
  type: 'stock_request' | 'new_product';
  title: string;
  body: string;
  product_id: number | null;
  image_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export type ScanAction = 'confirm' | 'shipping' | 'retour';

export interface CreateOrderResponse {
  data: Order;
  requestedFromSupplier: StockRequestItem[];
}

export async function scanOrder(code: string, action: ScanAction): Promise<Order> {
  return apiPost<Order>('/chef/scan', { code, action });
}

export interface FulfillmentItem {
  product_id: number;
  product_name: string;
  image_url: string | null;
  demanded: number;
  house: number;
  missing: number;
}

export interface FulfillmentGroup {
  fournisseur_id: number;
  fournisseur_name: string;
  total_demand: number;
  total_house: number;
  total_missing: number;
  items: FulfillmentItem[];
}

export interface Inventory {
  id: number;
  code: string;
  name: string;
  location: string | null;
  capacity: number;
  used: number;
  item_count: number;
  created_at: string;
}

export interface InventoryItem {
  product_id: number;
  product_name: string;
  image_url: string | null;
  quantity: number;
}

export interface InventoryDetail extends Inventory {
  items: InventoryItem[];
}

export interface SupplierWarehouse {
  id: number;
  fournisseur_id: number | null;
  owner_name: string | null;
  name: string;
  phone1: string;
  phone2: string;
  country: string;
  location: string;
  address1: string;
  address2: string;
  created_at: string;
}

export interface CreateSupplierWarehouseInput {
  fournisseur_id?: number | null;
  name: string;
  phone1?: string;
  phone2?: string;
  country?: string;
  location?: string;
  address1?: string;
  address2?: string;
}

export interface FulfillmentAllocationDetail {
  inventory_id: number;
  inventory_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
}

export interface FulfillmentAllocationResult {
  allocations: FulfillmentAllocationDetail[];
  leftover: { product_id: number; product_name: string; quantity: number }[];
}

export function inventoryUrl(code: string): string {
  return `${window.location.origin}/inv/${code}`;
}

export const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Béja', 'Jendouba', 'Le Kef',
  'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès',
  'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

export const SERVICE_TYPES = ['Order', 'Payment', 'Delivery', 'Product', 'Return / Exchange', 'Technical support', 'Other'];

export interface SupplierFinanceRow {
  id: number;
  name: string;
  email: string;
  total_orders: number;
  total_products: number;
  earned: number;
  paid: number;
  owed: number;
}

export interface DropshipperFinanceRow {
  id: number;
  name: string;
  email: string;
  total_orders: number;
  total_sales: number;
  profit: number;
  paid: number;
  owed: number;
}

export interface PlatformCommissionRow {
  id: number;
  order_number: string;
  dropshipper_id: number;
  dropshipper_name: string;
  total: number;
  commission: number;
  delivered_at: string | null;
}

export interface PlatformEarnings {
  total: number;
  orders: PlatformCommissionRow[];
}

export interface Payout {
  id: number;
  recipient_id: number;
  recipient_name: string;
  recipient_role: 'seller' | 'customer';
  amount: number;
  period: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  notes: string | null;
  method: 'manual' | 'flouci' | 'bank' | 'd17' | null;
  flouci_payment_id: string | null;
  flouci_link: string | null;
  flouci_status: string | null;
  flouci_tracking_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export function getMyConfirmationStatus(): Promise<ServiceInscription | null> {
  return apiGet('/orders/confirmation-service/status');
}

export function applyConfirmationService(): Promise<ServiceInscription> {
  return apiPost('/orders/confirmation-service/apply');
}

export function confirmServiceInscription(id: number): Promise<ServiceInscription> {
  return apiPost(`/chef/service-inscriptions/${id}/confirm`);
}

export function listSupportServices(): Promise<ServiceInscription[]> {
  return apiGet('/support/services');
}

export function getSupportServiceInscription(id: number): Promise<ServiceInscription> {
  return apiGet(`/support/services/${id}`);
}

export function listSupportServiceDraftOrders(inscriptionId: number): Promise<Order[]> {
  return apiGet(`/support/services/${inscriptionId}/drafts`);
}

export function listSupportServiceCommandes(inscriptionId: number): Promise<Order[]> {
  return apiGet(`/support/services/${inscriptionId}/commandes`);
}

export function listStaffDropshippers(): Promise<AuthUser[]> {
  return apiGet('/staff/dropshippers');
}

export function getStaffDropshipperProducts(dropshipperId: number): Promise<SavedProduct[]> {
  return apiGet(`/staff/dropshippers/${dropshipperId}/products`);
}

export function sendSupportServiceDraftToChef(orderId: number): Promise<Order> {
  return apiPost(`/support/services/drafts/${orderId}/send-to-chef`);
}

export interface DashboardData {
  totals: Record<string, number>;
  revenueByDay?: { day: string; value: number }[];
  statusCounts?: Record<string, number>;
  recentOrders?: Order[];
  lowStock?: { id: number; name: string; stock: number; image_url?: string | null; fournisseur_name?: string }[];
}

export interface Conversation {
  id: number;
  type: 'team' | 'staff' | 'product';
  title: string;
  participants: { id: number; name: string; role: string; photo: string | null }[];
  last_message: { sender_id: number; sender_name: string; body: string; image_url: string | null; created_at: string } | null;
  unread: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  body: string;
  image_url: string | null;
  created_at: string;
}

const baseURL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL });

const UPLOADS_ORIGIN = new URL(baseURL, typeof location !== 'undefined' ? location.origin : 'http://localhost').origin;

function absolutizeUploads(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('/uploads/') && !value.startsWith('http')) return `${UPLOADS_ORIGIN}${value}`;
    return value;
  }
  if (Array.isArray(value)) return value.map(absolutizeUploads);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      (value as Record<string, unknown>)[key] = absolutizeUploads((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('d42_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object') absolutizeUploads(res.data);
    return res;
  },
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('d42_token');
      localStorage.removeItem('d42_user');
      if (!location.pathname.includes('/login')) location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export async function apiGet<T>(url: string): Promise<T> {
  const res = await api.get(url);
  return res.data.data as T;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post(url, body);
  return res.data.data as T;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.patch(url, body);
  return res.data.data as T;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put(url, body);
  return res.data.data as T;
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await api.delete(url);
  return res.data.data as T;
}

export async function apiPostRaw<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post(url, body);
  return res.data as T;
}

export async function apiUpload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return (res.data.data as { url: string }).url;
}

export async function apiUploadVideo(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post('/upload/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return (res.data.data as { url: string }).url;
}

export async function updateMe(patch: { name?: string; photo?: string | null }): Promise<AuthUser> {
  const res = await api.patch('/auth/me', patch);
  return res.data.data as AuthUser;
}

export interface SupplierOrgEligibility {
  allow_marketplace: boolean;
  dropshipping_eligible: boolean;
  account_status: string;
  labels: string[];
}

export async function getMySupplierOrg(): Promise<SupplierOrgEligibility | null> {
  return apiGet('/products/my-supplier-org');
}

export function apiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return data?.error ?? data?.message ?? 'Something went wrong';
}

export const money = (n: number | string) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0);

export const dateFmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Dashboard Types ────────────────────────────────────────────

export type DashboardPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface OverviewData {
  period: { start: string; end: string };
  totals: { revenue: number; cost: number; profit: number; commission: number; orders: number; paid: number; delivered: number; cancelled: number; unpaid: number };
  revenueByDay: { day: string; revenue: number; profit: number; orders: number }[];
  revenueByWeek: { day: string; revenue: number; profit: number; orders: number }[];
  revenueByMonth: { month: string; revenue: number; profit: number; orders: number }[];
}

export interface PerformanceData {
  period: { start: string; end: string };
  totals: { orders: number; revenue: number; profit: number; avgOrderValue: number; avgProfit: number; conversionRate: number };
  byStatus: Record<string, number>;
  byType: Record<string, { count: number; revenue: number; profit: number }>;
  byDay: { day: string; count: number; revenue: number }[];
}

export interface ProductsDashboardData {
  period: { start: string; end: string };
  products: { id: number; name: string; image: string | null; revenue: number; profit: number; qty: number; orders: number }[];
}

export interface SupplierDashboardData {
  period: { start: string; end: string };
  suppliers: { id: number; name: string; revenue: number; profit: number; orders: number; items: number }[];
  selected: { id: number; name: string; revenue: number; profit: number; orders: number; items: number; byDay: { day: string; revenue: number; profit: number; orders: number }[] } | null;
}

export interface SellerDashboardData {
  period: { start: string; end: string };
  sellers: { id: number; name: string; revenue: number; profit: number; orders: number; items: number }[];
  selected: { id: number; name: string; revenue: number; profit: number; orders: number; items: number; byDay: { day: string; revenue: number; profit: number; orders: number }[] } | null;
}

export async function getOverview(period: string): Promise<OverviewData> {
  return apiGet(`/chef/overview?period=${period}`);
}
export async function getPerformanceDashboard(period: string): Promise<PerformanceData> {
  return apiGet(`/chef/performance-dashboard?period=${period}`);
}
export async function getProductsDashboard(period: string): Promise<ProductsDashboardData> {
  return apiGet(`/chef/products-dashboard?period=${period}`);
}
export async function getSupplierDashboard(period: string, supplierId?: number): Promise<SupplierDashboardData> {
  const q = `period=${period}${supplierId ? `&supplier_id=${supplierId}` : ''}`;
  return apiGet(`/chef/supplier-incubation-dashboard?${q}`);
}
export async function getSellerDashboard(period: string, sellerId?: number): Promise<SellerDashboardData> {
  const q = `period=${period}${sellerId ? `&seller_id=${sellerId}` : ''}`;
  return apiGet(`/chef/seller-incubation-dashboard?${q}`);
}

export const timeFmt = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export async function ensureSupplierChat(supplierId: number): Promise<number> {
  const res = await api.post('/chat/ensure-supplier', { supplier_id: supplierId });
  return res.data.data.id;
}

export interface ConfirmateurPendingOrder {
  id: number;
  order_number: string;
  dropshipper_name: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  item_count: number;
}

export interface ConfirmateurDashboard {
  total_confirmed: number;
  today_confirmed: number;
  unique_confirmateurs: number;
  unique_dropshippers: number;
  by_confirmateur: { name: string; count: number }[];
  recent: { id: number; order_number: string; dropshipper_name: string; customer_name: string; total: number; confirmed_by_name: string; confirmed_at: string }[];
}

export interface ConfirmateurMyDashboard {
  my_confirmed: number;
  my_today: number;
  recent: { id: number; order_number: string; dropshipper_name: string; customer_name: string; total: number; confirmed_at: string }[];
}

export async function getConfirmateurPending(): Promise<ConfirmateurPendingOrder[]> {
  return apiGet('/confirmateur/pending');
}

export async function confirmateurConfirm(orderId: number): Promise<Order> {
  const res = await api.post(`/confirmateur/confirm/${orderId}`);
  return res.data.data;
}

export async function getConfirmateurDashboard(): Promise<ConfirmateurDashboard> {
  return apiGet('/confirmateur/dashboard');
}

export async function getConfirmateurMyDashboard(): Promise<ConfirmateurMyDashboard> {
  return apiGet('/confirmateur/my-dashboard');
}
