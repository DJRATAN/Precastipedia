
-- Table for personal document uploads with AI analysis
CREATE TABLE public.user_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  summary TEXT,
  key_points JSONB,
  extracted_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
ON public.user_analyses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
ON public.user_analyses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
ON public.user_analyses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
ON public.user_analyses FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_analyses_updated_at
BEFORE UPDATE ON public.user_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Chat messages for Q&A with documents
CREATE TABLE public.analysis_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.user_analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
ON public.analysis_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
ON public.analysis_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Storage bucket for user analysis uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('user-analyses', 'user-analyses', false);

CREATE POLICY "Users can upload own analysis files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-analyses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own analysis files"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-analyses' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own analysis files"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-analyses' AND auth.uid()::text = (storage.foldername(name))[1]);
