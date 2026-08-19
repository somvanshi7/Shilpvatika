// Shilpvatika Quote — Constants

export const BRAND = {
  name: 'Shilpvatika',
  tagline: 'Interior Design & Wood Works',
  phone: '+91 98765 43210',
  email: 'hello@shilpvatika.com',
  address: '42 Industrial Area, Phase-2, Gurugram, Haryana',
  website: 'https://shilpvatika.com',
  logoUrl: '/logo-shilpvatika.png',
};

export const PROJECT_TYPES = [
  'Modular Kitchen',
  'Wardrobes & Storage',
  'TV Units',
  'Bookshelves',
  'Pooja Room',
  'Study Tables',
  'Home Office',
  'False Ceiling',
  'Wall Panelling',
  'Crockery Units',
  'Full Home Interior',
  'Other',
];

export const UNIT_OPTIONS = [
  'Sq.ft',
  'R.ft',
  'Pcs',
  'Set',
  'Lot',
  'Nos',
];

export const CITIES = [
  'Delhi',
  'Gurugram',
  'Noida',
  'Faridabad',
  'Ghaziabad',
  'Lucknow',
  'Other',
];

export const GST_RATE = 0.18;

export const DEFAULT_VALIDITY_DAYS = 30;

export const TERMS_AND_CONDITIONS = [
  'This quotation is valid for the period mentioned above from the date of issue.',
  'Prices are inclusive of material, labour, and installation unless specified otherwise.',
  'GST @ 18% is applicable on the total amount.',
  'A booking advance of 40% is required to confirm the order. Balance 30% before material procurement and 30% on completion.',
  'Delivery timelines start from the date of design approval and advance payment.',
  'Any changes to the approved design after work has commenced may attract additional charges.',
  'Warranty: 5 years on manufacturing defects and hardware. Does not cover damage from misuse, water, or pests.',
  'Transportation and installation within city limits are included. Outstation charges apply separately.',
];

export const QUOTE_STATUSES = {
  PROCESSING: 'processing',
  READY: 'ready',
  EXPIRED: 'expired',
  ERROR: 'error',
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
