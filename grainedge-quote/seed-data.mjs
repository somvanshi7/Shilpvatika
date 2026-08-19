import { getStore } from '@netlify/blobs';

// Note: To run this locally with Netlify Blobs, you need to be linked to a Netlify site
// OR use a local directory for blobs if testing outside of Netlify Dev.
// For this script, we'll assume it's run via `netlify dev --exec node seed-data.mjs`

const SAMPLE_DATA = [
  {
    clientName: 'Rahul Sharma',
    company: 'Resident, Sector 45',
    email: 'rahul.s@example.com',
    phone: '+91 98765 11111',
    projectType: 'Modular Kitchen',
    scopeSummary: 'L-shaped acrylic finish modular kitchen with tandem drawers and tall unit.',
    lineItems: [
      { description: 'Base Cabinets (BWP Plywood)', qty: 150, unit: 'Sq.ft', rate: 1200 },
      { description: 'Wall Cabinets', qty: 80, unit: 'Sq.ft', rate: 1000 },
      { description: 'Tall Unit', qty: 1, unit: 'Set', rate: 25000 },
      { description: 'Tandem Drawers (Hettich)', qty: 6, unit: 'Nos', rate: 4500 },
      { description: 'Acrylic Shutters', qty: 230, unit: 'Sq.ft', rate: 450 },
      { description: 'Quartz Countertop', qty: 55, unit: 'Sq.ft', rate: 1100 },
      { description: 'Kitchen Sink (Franke)', qty: 1, unit: 'Nos', rate: 12000 },
      { description: 'Installation & Transport', qty: 1, unit: 'Lot', rate: 15000 }
    ],
    status: 'ready'
  },
  {
    clientName: 'Priya Patel',
    company: 'Dwarka Apartments',
    email: 'priya.p@example.com',
    phone: '+91 98765 22222',
    projectType: 'Full Home Interior',
    scopeSummary: 'Complete interior work for 3BHK including kitchen, 3 wardrobes, TV unit, and false ceiling.',
    lineItems: [
      { description: 'Modular Kitchen Complete', qty: 1, unit: 'Lot', rate: 350000 },
      { description: 'Master Bedroom Wardrobe (Sliding)', qty: 120, unit: 'Sq.ft', rate: 1500 },
      { description: 'Guest Bedroom Wardrobe', qty: 90, unit: 'Sq.ft', rate: 1300 },
      { description: 'Kids Bedroom Wardrobe', qty: 80, unit: 'Sq.ft', rate: 1300 },
      { description: 'Living Room TV Unit', qty: 60, unit: 'Sq.ft', rate: 1800 },
      { description: 'False Ceiling (Gypsum)', qty: 1100, unit: 'Sq.ft', rate: 110 },
      { description: 'Cove Lighting & Electricals', qty: 1, unit: 'Lot', rate: 45000 },
      { description: 'Painting (Asian Paints Royale)', qty: 3500, unit: 'Sq.ft', rate: 28 },
      { description: 'Deep Cleaning Post Work', qty: 1, unit: 'Lot', rate: 8000 }
    ],
    status: 'ready'
  },
  {
    clientName: 'Vikram Singh',
    company: '',
    email: 'vikram.s@example.com',
    phone: '+91 98765 33333',
    projectType: 'Wardrobes & Storage',
    scopeSummary: 'Walk-in wardrobe for master bedroom with fluted glass shutters and profile lighting.',
    lineItems: [
      { description: 'Wardrobe Carcass (HDHMR)', qty: 220, unit: 'Sq.ft', rate: 950 },
      { description: 'Fluted Glass Shutters with Alu Profile', qty: 180, unit: 'Sq.ft', rate: 1800 },
      { description: 'Internal Drawer Units', qty: 8, unit: 'Nos', rate: 3500 },
      { description: 'Profile Sensor Lighting', qty: 45, unit: 'R.ft', rate: 450 },
      { description: 'Accessories (Tie/Belt organizer, Pull-down hanger)', qty: 1, unit: 'Set', rate: 15000 }
    ],
    status: 'ready'
  },
  {
    clientName: 'Ananya Desai',
    company: '',
    email: 'ananya.d@example.com',
    phone: '+91 98765 44444',
    projectType: 'TV Units',
    scopeSummary: 'Living room TV unit with louvers and marble-finish laminate back-panel.',
    lineItems: [
      { description: 'Back Panelling (Marble Finish Laminate)', qty: 80, unit: 'Sq.ft', rate: 850 },
      { description: 'Charcoal Louvers Panelling', qty: 40, unit: 'Sq.ft', rate: 950 },
      { description: 'Floating TV Console (PU Polish)', qty: 12, unit: 'R.ft', rate: 3500 },
      { description: 'LED Strip Lighting (Warm White)', qty: 30, unit: 'R.ft', rate: 250 }
    ],
    status: 'processing'
  },
  {
    clientName: 'Dr. Ramesh Gupta',
    company: 'Gupta Clinic',
    email: 'ramesh.g@example.com',
    phone: '+91 98765 55555',
    projectType: 'Home Office',
    scopeSummary: 'Custom study table with overhead bookshelf and filing cabinets for home clinic.',
    lineItems: [
      { description: 'L-Shaped Study Table (Veneer Finish)', qty: 18, unit: 'R.ft', rate: 4500 },
      { description: 'Overhead Bookshelf (Open & Closed)', qty: 60, unit: 'Sq.ft', rate: 1200 },
      { description: 'Filing Cabinets (Lockable)', qty: 2, unit: 'Nos', rate: 8500 },
      { description: 'Pin-board / Soft-board Fabric Panel', qty: 24, unit: 'Sq.ft', rate: 400 },
      { description: 'Cable Management System', qty: 1, unit: 'Lot', rate: 2500 },
      { description: 'Installation', qty: 1, unit: 'Lot', rate: 6000 }
    ],
    status: 'ready'
  }
];

async function seedData() {
  console.log('Starting data seed...');
  
  // Note: To use Blobs locally outside of Netlify Dev, you need to set NETLIFY_SITE_ID and NETLIFY_API_TOKEN
  // or use the local context setup. This is a simplified script meant to be run inside the Netlify Dev environment.
  
  try {
    const store = getStore({ name: 'grainedge-quotes', consistency: 'strong' });
    
    // We will dynamically import slug generation to ensure it runs correctly
    const crypto = await import('crypto');
    
    for (const [index, data] of SAMPLE_DATA.entries()) {
      // Generate deterministic slugs for seeding so they don't pile up
      const dateStr = '20260806';
      const idStr = `TEST${String(index + 1).padStart(2, '0')}`;
      const slug = `GRD-${dateStr}-${idStr}`;
      
      let subtotal = 0;
      const items = data.lineItems.map(item => {
        const amount = item.qty * item.rate;
        subtotal += amount;
        return { ...item, amount };
      });
      
      const gstAmount = subtotal * 0.18;
      const total = subtotal + gstAmount;
      
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const metadata = {
        slug,
        clientName: data.clientName,
        company: data.company,
        email: data.email,
        phone: data.phone,
        projectType: data.projectType,
        scopeSummary: data.scopeSummary,
        lineItems: items,
        subtotal,
        gstAmount,
        total,
        gstRate: 0.18,
        status: data.status,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        pdf_url: data.status === 'ready' ? `/api/download-pdf?slug=${slug}` : null
      };
      
      await store.setJSON(`${slug}/metadata`, metadata);
      console.log(`Seeded: ${slug} (${data.clientName})`);
    }
    
    console.log('Seed complete! 5 records added.');
  } catch (error) {
    console.error('Seed failed:', error);
    console.log('Note: To run this script locally, you must run it through the Netlify CLI:');
    console.log('npx netlify dev --exec node seed-data.mjs');
  }
}

seedData();
