-- ============================================================
-- SHILPVATIKA UNIFIED PLATFORM — Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- 1. Admin profiles (synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'Admin' CHECK (role IN ('Admin', 'Owner')),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  father_name TEXT DEFAULT '',
  id_proof_type TEXT DEFAULT 'Aadhaar',
  id_proof_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('Carpenter', 'Labor', 'Painter', 'Design Expert', 'Other')),
  day_pay INTEGER NOT NULL DEFAULT 0,
  variable_pay BOOLEAN DEFAULT false,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  present TEXT DEFAULT 'N' CHECK (present IN ('Y', 'N')),
  notes TEXT DEFAULT '',
  recorded_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);

-- 4. Transactions (Ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Advance', 'PaydayPayment', 'Adjustment', 'Deduction', 'Credit', 'PaydayDeduction')),
  amount INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  balance_after INTEGER DEFAULT 0,
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- 5. Payout Requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date_requested DATE NOT NULL DEFAULT CURRENT_DATE,
  amount INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Paid')),
  paid_on_tx_id TEXT,
  actioned_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Quotes
CREATE TABLE IF NOT EXISTS quotes (
  slug TEXT PRIMARY KEY,
  client_name TEXT DEFAULT '',
  company TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  project_type TEXT DEFAULT '',
  scope_summary TEXT DEFAULT '',
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 7. Invoices (Billing Module)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  quote_slug TEXT REFERENCES quotes(slug),
  client_name TEXT DEFAULT '',
  client_address TEXT DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  labour_charges NUMERIC DEFAULT 0,
  other_charges_label TEXT DEFAULT '',
  other_charges NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  advance_deposit NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  amount_in_words TEXT DEFAULT '',
  payment_method TEXT DEFAULT '',
  bank_transaction_id TEXT DEFAULT '',
  cheque_number TEXT DEFAULT '',
  payment_status TEXT DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partial', 'Paid')),
  payment_policy TEXT DEFAULT 'Payment is due by the date mentioned above.',
  notes TEXT DEFAULT '',
  billed_by UUID REFERENCES admins(id),
  billed_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Payments (supports multiple partial payments per invoice)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('Cash', 'Bank Transfer', 'Cheque')),
  bank_transaction_id TEXT DEFAULT '',
  cheque_number TEXT DEFAULT '',
  cheque_date DATE,
  notes TEXT DEFAULT '',
  received_by UUID REFERENCES admins(id),
  received_by_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor UUID REFERENCES admins(id),
  actor_name TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT DEFAULT '',
  entity_id TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- 10. Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Contact form submissions from website
CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  city text NOT NULL,
  message text,
  walkin_demo boolean DEFAULT false,
  status text DEFAULT 'New', -- New, Contacted, Resolved
  notes text
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert contact messages" ON contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can view and manage contact messages" ON contact_messages FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('company_name', '"Shilpvatika Interiors & Woodworks"'),
  ('company_address', '"Sector 88, Near RPS Auria, Faridabad, Haryana, 121002"'),
  ('company_email', '"support@shilpvatika.com"'),
  ('company_phone', '9695169313'),
  ('owner_name', '"Munesh Kumar Sharma"'),
  ('default_day_pay', '{"Carpenter": 1000, "Labor": 700, "Painter": 800, "Design Expert": 1500, "Other": 500}'),
  ('currency_symbol', '"₹"')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY — Only authenticated admins can access
-- ============================================================

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything (they must exist in the admins table)
CREATE POLICY "Admins full access" ON admins FOR ALL USING (auth.uid() = id);
CREATE POLICY "Admins full access" ON employees FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON attendance FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON transactions FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON payout_requests FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON quotes FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON invoices FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON payments FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON audit_logs FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
CREATE POLICY "Admins full access" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM admins WHERE id = auth.uid()));
