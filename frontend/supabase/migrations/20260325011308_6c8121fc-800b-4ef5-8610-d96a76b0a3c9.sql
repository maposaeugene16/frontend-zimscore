
-- Allow admins to read all files in kyc-documents bucket
CREATE POLICY "Admins can read all KYC documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.has_role(auth.uid(), 'admin')
);
