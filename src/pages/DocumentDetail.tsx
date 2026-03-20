import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Calendar, User } from "lucide-react";

const DocumentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      const { data } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
      setDoc(data);
      setLoading(false);
    };
    fetchDoc();
  }, [id]);

  if (loading) return <main className="flex-1 container py-12"><p className="text-muted-foreground">Loading...</p></main>;
  if (!doc) return <main className="flex-1 container py-12"><p>Document not found.</p></main>;

  return (
    <main className="flex-1 container py-8">
      <Link to="/documents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Documents
      </Link>

      <div className="max-w-3xl">
        <Badge variant="secondary" className="mb-3">{doc.category}</Badge>
        <h1 className="text-3xl font-bold font-serif mb-4">{doc.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(doc.created_at).toLocaleDateString()}</span>
          {doc.file_name && <span className="flex items-center gap-1"><User className="h-4 w-4" />{doc.file_name}</span>}
        </div>

        {doc.description && (
          <div className="prose prose-slate max-w-none mb-8">
            <p className="text-foreground">{doc.description}</p>
          </div>
        )}

        {doc.file_url && (
          <div className="space-y-4">
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2"><Download className="h-4 w-4" /> Download PDF</Button>
            </a>
            <div className="border rounded-lg overflow-hidden bg-muted" style={{ height: "80vh" }}>
              <iframe src={doc.file_url} className="w-full h-full" title={doc.title} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default DocumentDetail;
