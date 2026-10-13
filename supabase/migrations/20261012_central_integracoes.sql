-- ==============================================================================
-- VEND+ — MIGRAÇÃO IDEMPOTENTE: CENTRAL DE INTEGRAÇÕES OFICIAIS & DROPSHIPPING
-- Compatível com Supabase / PostgreSQL 14+
-- ==============================================================================

-- 1. TABELA DE CONECTORES DE INTEGRAÇÕES OFICIAIS
CREATE TABLE IF NOT EXISTS public.vendplus_integrations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'nao_configurado',
    official_api_docs TEXT,
    credentials_encrypted JSONB DEFAULT '{}'::jsonb,
    affiliate_tag VARCHAR(100),
    last_tested_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    products_count INT DEFAULT 0,
    authorized_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE LOGS DE AUDITORIA E SINCRONIZAÇÃO
CREATE TABLE IF NOT EXISTS public.vendplus_integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id VARCHAR(50) NOT NULL REFERENCES public.vendplus_integrations(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'error', 'sync', 'test', 'oauth'
    message TEXT NOT NULL,
    status_code VARCHAR(20),
    items_found INT DEFAULT 0,
    items_saved INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE FORNECEDORES DE DROPSHIPPING HOMOLOGADOS
CREATE TABLE IF NOT EXISTS public.vendplus_suppliers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    cnpj VARCHAR(25) NOT NULL UNIQUE,
    contact_email VARCHAR(120) NOT NULL,
    contact_phone VARCHAR(30),
    category VARCHAR(80) DEFAULT 'Geral',
    status VARCHAR(30) NOT NULL DEFAULT 'pendente_aprovacao', -- 'pendente_aprovacao', 'homologado', 'rejeitado', 'suspenso'
    sla_delivery_days INT DEFAULT 5,
    default_margin_percent NUMERIC(5, 2) DEFAULT 25.00,
    shipping_origin VARCHAR(120),
    contract_ref TEXT,
    return_policy TEXT,
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE PRODUTOS VEND+ (MULTICANAL & MULTICATEGORIA)
CREATE TABLE IF NOT EXISTS public.vendplus_products (
    id VARCHAR(100) PRIMARY KEY,
    original_id VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL,
    original_price NUMERIC(12, 2),
    currency VARCHAR(10) DEFAULT 'BRL',
    category VARCHAR(80) NOT NULL,
    brand VARCHAR(100),
    image_url TEXT NOT NULL,
    additional_images TEXT[] DEFAULT '{}',
    source VARCHAR(50) NOT NULL, -- 'mercadolivre', 'shopee', 'amazon', 'tiktok', 'dropship_supplier', 'proprio_vendplus'
    source_name VARCHAR(100) NOT NULL,
    origin_type VARCHAR(30) NOT NULL DEFAULT 'afiliado', -- 'proprio', 'dropship', 'afiliado'
    original_url TEXT,
    affiliate_url TEXT,
    available BOOLEAN DEFAULT true,
    stock INT,
    seller_name VARCHAR(100),
    supplier_id VARCHAR(100) REFERENCES public.vendplus_suppliers(id) ON DELETE SET NULL,
    cost_price NUMERIC(12, 2),
    margin_percent NUMERIC(5, 2),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_product_source_original UNIQUE (source, original_id)
);

-- 5. TABELA DE RASTREAMENTO DE CLIQUES DE AFILIADOS
CREATE TABLE IF NOT EXISTS public.vendplus_affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(100) NOT NULL REFERENCES public.vendplus_products(id) ON DELETE CASCADE,
    product_title TEXT NOT NULL,
    source VARCHAR(50) NOT NULL,
    user_agent TEXT,
    destination_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE PEDIDOS DE DROPSHIPPING E CHECKOUT NATIVO
CREATE TABLE IF NOT EXISTS public.vendplus_orders (
    id VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_cpf VARCHAR(20) NOT NULL,
    shipping_address JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL,
    supplier_id VARCHAR(100) REFERENCES public.vendplus_suppliers(id),
    status VARCHAR(50) NOT NULL DEFAULT 'aguardando_pagamento',
    mercado_pago_payment_id VARCHAR(100),
    mercado_pago_status VARCHAR(50),
    tracking_code VARCHAR(100),
    confirmation_code VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARA OTIMIZAÇÃO DE BUSCA E PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vendplus_prod_category ON public.vendplus_products(category);
CREATE INDEX IF NOT EXISTS idx_vendplus_prod_source ON public.vendplus_products(source);
CREATE INDEX IF NOT EXISTS idx_vendplus_prod_origin ON public.vendplus_products(origin_type);
CREATE INDEX IF NOT EXISTS idx_vendplus_prod_available ON public.vendplus_products(available);
CREATE INDEX IF NOT EXISTS idx_vendplus_orders_status ON public.vendplus_orders(status);
CREATE INDEX IF NOT EXISTS idx_vendplus_suppliers_cnpj ON public.vendplus_suppliers(cnpj);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.vendplus_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendplus_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendplus_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendplus_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendplus_affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendplus_orders ENABLE ROW LEVEL SECURITY;

-- Produtos públicos disponíveis para leitura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Produtos visíveis publicamente'
    ) THEN
        CREATE POLICY "Produtos visíveis publicamente" 
        ON public.vendplus_products FOR SELECT 
        USING (available = true);
    END IF;
END $$;

-- Acesso administrativo exclusivo para Master Owner
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Acesso administrativo exclusivo Master Owner'
    ) THEN
        CREATE POLICY "Acesso administrativo exclusivo Master Owner" 
        ON public.vendplus_integrations FOR ALL 
        USING (auth.jwt() ->> 'role' = 'service_role' OR auth.jwt() ->> 'email' = current_setting('request.jwt.claim.email', true));
    END IF;
END $$;
