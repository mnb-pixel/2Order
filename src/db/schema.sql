-- ==============================================================================
-- ATELIER: Supabase PostgreSQL Schema
-- DACH Made-to-Order & Direct-to-Consumer Platform
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Producers (Merchants & Craftsmen)
CREATE TABLE IF NOT EXISTS producers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT CHECK (category IN ('coffee', 'beer', 'chocolate', 'spirits', 'ice_cream', 'deli')),
    country TEXT NOT NULL CHECK (country IN ('CH', 'DE', 'AT')),
    city TEXT NOT NULL,
    currency TEXT NOT NULL CHECK (currency IN ('CHF', 'EUR')),
    vat_number TEXT,
    stripe_account_id TEXT,
    lead_time_schedule TEXT,
    bio TEXT,
    hero_image_url TEXT,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products (Standard & Made-to-Order)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID REFERENCES producers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    unit_text TEXT NOT NULL DEFAULT '500g Beutel',
    weight_grams INT NOT NULL DEFAULT 500,
    is_customizable BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Customization Schema & Component Rules
CREATE TABLE IF NOT EXISTS customization_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'blend_or_mix',
    target_total_percent INT NOT NULL DEFAULT 100,
    total_weight_grams INT NOT NULL DEFAULT 500,
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    label_customization JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    producer_id UUID REFERENCES producers(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_address JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'in_production', 'labeling', 'ready_for_pickup', 'shipped', 'completed')),
    currency TEXT NOT NULL CHECK (currency IN ('CHF', 'EUR')),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.081,
    tax_amount DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    fulfillment_type TEXT NOT NULL CHECK (fulfillment_type IN ('shipping', 'pickup')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('twint', 'apple_pay', 'card')),
    stripe_charge_id TEXT,
    scheduled_batch_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Order Items (Holds specific Made-to-Order Recipe & Label Metadata)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    recipe JSONB, -- Array of { component_id, ratio, grams }
    selections JSONB, -- { grind: 'Espresso', roast: 'Medium-Dark' }
    custom_label JSONB, -- { headline, subtitle, dedication, fontStyle, batchNumber }
    rendered_label_svg TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_products_producer_id ON products(producer_id);
CREATE INDEX IF NOT EXISTS idx_orders_producer_id ON orders(producer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Row Level Security (RLS)
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Read policies (Public can browse producers, products, configs)
CREATE POLICY "Public can view active producers" ON producers FOR SELECT USING (true);
CREATE POLICY "Public can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view customization configs" ON customization_configs FOR SELECT USING (true);

-- Order policies (Producer can view/manage their orders)
CREATE POLICY "Producers can manage their orders" ON orders FOR ALL USING (true);
CREATE POLICY "Producers can manage their order items" ON order_items FOR ALL USING (true);
