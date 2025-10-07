-- NFT Service System for service activation and management
-- This creates tables for service activation and admin-member communication

BEGIN;

-- Service activation table
CREATE TABLE IF NOT EXISTS public.nft_service_activations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  buyer_wallet character varying NOT NULL,
  nft_purchase_id uuid NOT NULL,
  nft_id uuid NOT NULL,
  nft_type text NOT NULL CHECK (nft_type IN ('advertisement', 'merchant')),
  service_code character varying UNIQUE,
  activation_form_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ActiveMember', 'in_progress', 'completed', 'cancelled')),
  admin_notes text,
  service_start_date timestamp with time zone,
  service_end_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT nft_service_activations_pkey PRIMARY KEY (id),
  CONSTRAINT nft_service_activations_buyer_wallet_fkey FOREIGN KEY (buyer_wallet) REFERENCES public.users(wallet_address),
  CONSTRAINT nft_service_activations_nft_purchase_id_fkey FOREIGN KEY (nft_purchase_id) REFERENCES public.nft_purchases(id)
);

-- Service messages table for admin-member communication
CREATE TABLE IF NOT EXISTS public.service_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  service_activation_id uuid NOT NULL,
  sender_wallet character varying NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'member')),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'form_request', 'file_upload', 'status_update')),
  message_content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_messages_pkey PRIMARY KEY (id),
  CONSTRAINT service_messages_service_activation_id_fkey FOREIGN KEY (service_activation_id) REFERENCES public.nft_service_activations(id),
  CONSTRAINT service_messages_sender_wallet_fkey FOREIGN KEY (sender_wallet) REFERENCES public.users(wallet_address)
);

-- Service progress tracking
CREATE TABLE IF NOT EXISTS public.service_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  service_activation_id uuid NOT NULL,
  step_name text NOT NULL,
  step_description text,
  step_order integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_progress_pkey PRIMARY KEY (id),
  CONSTRAINT service_progress_service_activation_id_fkey FOREIGN KEY (service_activation_id) REFERENCES public.nft_service_activations(id),
  CONSTRAINT service_progress_unique_step UNIQUE (service_activation_id, step_order)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nft_service_activations_buyer_wallet ON public.nft_service_activations(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_nft_service_activations_status ON public.nft_service_activations(status);
CREATE INDEX IF NOT EXISTS idx_service_messages_service_activation_id ON public.service_messages(service_activation_id);
CREATE INDEX IF NOT EXISTS idx_service_messages_sender_wallet ON public.service_messages(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_service_progress_service_activation_id ON public.service_progress(service_activation_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.nft_service_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service activations
CREATE POLICY "Users can view their own service activations" ON public.nft_service_activations
  FOR SELECT USING (buyer_wallet = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can create service activations for their purchases" ON public.nft_service_activations
  FOR INSERT WITH CHECK (buyer_wallet = auth.jwt() ->> 'wallet_address');

CREATE POLICY "Users can update their own service activations" ON public.nft_service_activations
  FOR UPDATE USING (buyer_wallet = auth.jwt() ->> 'wallet_address');

-- RLS Policies for service messages
CREATE POLICY "Users can view messages for their services" ON public.service_messages
  FOR SELECT USING (
    sender_wallet = auth.jwt() ->> 'wallet_address' OR
    EXISTS (
      SELECT 1 FROM public.nft_service_activations nsa 
      WHERE nsa.id = service_activation_id 
      AND nsa.buyer_wallet = auth.jwt() ->> 'wallet_address'
    )
  );

CREATE POLICY "Users can send messages for their services" ON public.service_messages
  FOR INSERT WITH CHECK (
    sender_wallet = auth.jwt() ->> 'wallet_address' AND
    (
      sender_type = 'member' OR 
      (sender_type = 'admin' AND EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.wallet_address = auth.jwt() ->> 'wallet_address' 
        AND (u.role = 'admin' OR u.is_admin = true)
      ))
    )
  );

-- RLS Policies for service progress
CREATE POLICY "Users can view progress for their services" ON public.service_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nft_service_activations nsa 
      WHERE nsa.id = service_activation_id 
      AND nsa.buyer_wallet = auth.jwt() ->> 'wallet_address'
    )
  );

-- Function to generate unique service codes
CREATE OR REPLACE FUNCTION generate_service_code(nft_type text, nft_id uuid)
RETURNS text AS $$
DECLARE
  code_prefix text;
  random_suffix text;
  final_code text;
BEGIN
  -- Set prefix based on NFT type
  CASE nft_type
    WHEN 'advertisement' THEN code_prefix := 'AD';
    WHEN 'merchant' THEN code_prefix := 'SV';
    ELSE code_prefix := 'GN';
  END CASE;
  
  -- Generate random suffix
  random_suffix := upper(substring(md5(random()::text || nft_id::text || now()::text) from 1 for 8));
  
  -- Combine prefix and suffix
  final_code := code_prefix || '-' || random_suffix;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create service activation when NFT is purchased
CREATE OR REPLACE FUNCTION create_service_activation()
RETURNS trigger AS $$
DECLARE
  generated_code text;
BEGIN
  -- Generate unique service code
  generated_code := generate_service_code(NEW.nft_type, NEW.nft_id);
  
  -- Create service activation record
  INSERT INTO public.nft_service_activations (
    buyer_wallet,
    nft_purchase_id,
    nft_id,
    nft_type,
    service_code,
    status
  ) VALUES (
    NEW.buyer_wallet,
    NEW.id,
    NEW.nft_id,
    NEW.nft_type,
    generated_code,
    'pending'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create service activation
DROP TRIGGER IF EXISTS trigger_create_service_activation ON public.nft_purchases;
CREATE TRIGGER trigger_create_service_activation
  AFTER INSERT ON public.nft_purchases
  FOR EACH ROW
  EXECUTE FUNCTION create_service_activation();

-- Function to update service activation timestamp
CREATE OR REPLACE FUNCTION update_service_activation_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamps
DROP TRIGGER IF EXISTS trigger_update_service_activation_timestamp ON public.nft_service_activations;
CREATE TRIGGER trigger_update_service_activation_timestamp
  BEFORE UPDATE ON public.nft_service_activations
  FOR EACH ROW
  EXECUTE FUNCTION update_service_activation_timestamp();

DROP TRIGGER IF EXISTS trigger_update_service_progress_timestamp ON public.service_progress;
CREATE TRIGGER trigger_update_service_progress_timestamp
  BEFORE UPDATE ON public.service_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_service_activation_timestamp();

COMMIT;

-- Verify tables were created
SELECT 
  'Service system tables created:' as info,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'nft_service_activations') as service_activations,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'service_messages') as service_messages,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'service_progress') as service_progress;