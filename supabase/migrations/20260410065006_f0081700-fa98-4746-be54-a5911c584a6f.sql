
-- Create ecocash_statements table
CREATE TABLE public.ecocash_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_reason TEXT,
  confidence NUMERIC,
  extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ecocash_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own statements"
ON public.ecocash_statements FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own statements"
ON public.ecocash_statements FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own statements"
ON public.ecocash_statements FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all statements"
ON public.ecocash_statements FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('ecocash-statements', 'ecocash-statements', false);

-- Storage policies
CREATE POLICY "Users can upload own ecocash statements"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ecocash-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own ecocash statements"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ecocash-statements' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own ecocash statements"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ecocash-statements' AND auth.uid()::text = (storage.foldername(name))[1]);
