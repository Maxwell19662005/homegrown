// Business rules in one place. Have your attorney review the food rules before launch.

export const BUYER_SERVICE_FEE_CENTS = 75; // charged to the buyer per order
export const SELLER_COMMISSION = 0.1; // 10% of the item price, taken from the seller
export const CANCEL_CUTOFF_HOURS = 2; // buyers can cancel for free until this long before pickup
export const PAYMENT_HOLD_MINUTES = 30; // unpaid reservations release their stock after this
export const AUTO_SUSPEND_AFTER_UPHELD_REPORTS = 3;

export type SellerType = 'grower' | 'baker' | 'farm' | 'plants';
export type Category = 'produce' | 'baked' | 'plants' | 'farm' | 'eggs';

export const CATEGORIES: Record<Category, { label: string; bg: string; ink: string }> = {
  produce: { label: 'Produce', bg: '#FBE3D7', ink: '#B23A0A' },
  baked: { label: 'Baked', bg: '#F5E9D3', ink: '#7A4E0E' },
  plants: { label: 'Plants', bg: '#E3EFE6', ink: '#1F6F43' },
  farm: { label: 'Farm boxes', bg: '#E2ECF5', ink: '#1E5A8A' },
  eggs: { label: 'Eggs & honey', bg: '#FFF1C9', ink: '#7A5C00' },
};

export const SELLER_TYPES: Record<
  SellerType,
  { title: string; sub: string; setup: string; categories: Category[]; needsReview: boolean }
> = {
  grower: {
    title: 'Backyard grower',
    sub: 'Vegetables, herbs, fruit or honey from your yard or rooftop',
    setup: 'About 5 minutes to set up',
    categories: ['produce', 'eggs'],
    needsReview: false,
  },
  baker: {
    title: 'Home baker',
    sub: 'Breads, cookies, jams and other shelf-stable treats from your kitchen',
    setup: 'Kitchen verification, about 2 days',
    categories: ['baked'],
    needsReview: true,
  },
  farm: {
    title: 'Local farm',
    sub: 'Farm boxes and produce dropped at neighborhood pickup points',
    setup: 'About 15 minutes to set up',
    categories: ['farm', 'produce', 'eggs'],
    needsReview: false,
  },
  plants: {
    title: 'Plants & seedlings',
    sub: 'Seedlings, herbs and houseplants you started yourself',
    setup: 'Registration check, about 2 days',
    categories: ['plants'],
    needsReview: true,
  },
};

export type RequirementKind = 'phone' | 'check' | 'upload' | 'photos' | 'signature' | 'text' | 'payout';
export type Requirement = { key: string; title: string; detail: string; kind: RequirementKind; photos?: number };

const payout: Requirement = { key: 'payout', title: 'Set up payouts', detail: 'Where your earnings get deposited', kind: 'payout' };
const phone: Requirement = { key: 'phone', title: 'Add your phone number', detail: 'So buyers and our team can reach you about pickups', kind: 'phone' };

export const REQUIREMENTS: Record<SellerType, Requirement[]> = {
  grower: [
    phone,
    { key: 'own', title: 'Confirm you grew it yourself', detail: 'Reselling store-bought produce isn’t allowed', kind: 'check' },
    payout,
  ],
  baker: [
    { key: 'reg', title: 'NY Home Processor registration', detail: 'Upload your certificate from NY Agriculture & Markets', kind: 'upload' },
    { key: 'cert', title: 'Food handler certificate', detail: 'ServSafe or equivalent, about $15 online', kind: 'upload' },
    { key: 'photos', title: '6 kitchen photos', detail: 'Stove, counters, fridge interior, sink, food storage, packaging area', kind: 'photos', photos: 6 },
    { key: 'self', title: 'Food safety self-certification', detail: 'No pets in prep areas, proper storage temperatures, separate cutting boards, no pests', kind: 'signature' },
    phone,
    payout,
  ],
  farm: [
    { key: 'farm', title: 'Farm name and location', detail: 'Shown on your profile, e.g. “Little Creek Farm, Columbia County”', kind: 'text' },
    { key: 'points', title: 'Pickup points you serve', detail: 'Where buyers collect, e.g. “Ridgewood: Sat 9–12 outside 123 Example Ave”', kind: 'text' },
    phone,
    payout,
  ],
  plants: [
    phone,
    { key: 'nursery', title: 'NY Plant Grower registration', detail: 'Upload your registration certificate from NY Agriculture & Markets (form PI-69)', kind: 'upload' },
    payout,
  ],
};

export const ALLERGENS = ['Wheat', 'Milk', 'Eggs', 'Peanuts', 'Tree nuts', 'Soy', 'Sesame', 'Fish', 'Shellfish'];

// Words that suggest a baked listing needs refrigeration and falls outside NY's home-processor rules.
// Starter list only: have your attorney finalize it.
// NY's Home Processor exemption excludes chocolate items.
export const CHOCOLATE_TERMS = ['chocolate', 'cocoa', 'cacao', 'fudge', 'brownie', 'truffle'];

// Egg sales are paused until NY's small-flock rules (licensing, carton labels) are confirmed.
// Set to true once your attorney or NY Agriculture & Markets confirms what sellers need.
export const ALLOW_EGG_LISTINGS = false;

// Honey is exempt from NY's food-processing license only when it's pure honey from the seller's own hives.
export const HONEY_ADDITIVE_TERMS = ['infused', 'flavored', 'flavoured', 'spiced', 'creamed with', 'whipped with'];

// Where buyers and sellers can reach you. Set SUPPORT_EMAIL on your host.
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || '';

export const PROHIBITED_BAKED_TERMS = [
  'cheesecake', 'custard', 'cream pie', 'whipped cream', 'cream cheese', 'meringue', 'flan', 'tres leches',
  'meat', 'chicken', 'beef', 'pork', 'fish', 'sushi', 'empanada',
];
