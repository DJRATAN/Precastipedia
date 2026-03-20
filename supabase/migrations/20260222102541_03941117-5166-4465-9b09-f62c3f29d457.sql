
-- Drop the old restrictive insert policy
DROP POLICY "Contributors and admins can insert documents" ON public.documents;

-- Allow any authenticated user to insert documents
CREATE POLICY "Authenticated users can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);
