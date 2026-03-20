import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { FileSearch, Upload, Loader2, FileText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const Analyze = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: analyses, refetch } = useQuery({
    queryKey: ["user-analyses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_analyses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: (query) => {
      const rows = query.state.data as Array<{ status: string }> | undefined;
      const hasActiveAnalyses = rows?.some((row) => row.status === "analyzing" || row.status === "pending");
      return hasActiveAnalyses ? 3000 : false;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });

  if (!user) {
    return (
      <main className="flex-1 container py-12 text-center">
        <p className="text-muted-foreground">Please log in to analyze documents.</p>
      </main>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-analyses")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: analysis, error: insertError } = await supabase
        .from("user_analyses")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_url: filePath,  // Store just the relative path, not full URL
          file_type: fileExt || "pdf",
          status: "analyzing",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Fire-and-forget: trigger AI analysis in background
      const { data: session } = await supabase.auth.getSession();
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.session?.access_token}`,
          },
          body: JSON.stringify({
            action: "analyze",
            analysisId: analysis.id,
            filePath: filePath,
            fileName: file.name,
          }),
        }
      ).catch(console.error); // fire and forget

      toast({ title: "Analysis started", description: "Your document is being analyzed. You'll see results shortly." });
      setFile(null);
      refetch();
      navigate(`/analyze/${analysis.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("user_analyses").delete().eq("id", id);
    refetch();
  };

  return (
    <main className="flex-1 container py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-serif">Document Analysis</h1>
          <p className="text-muted-foreground mt-1">Upload a PDF or document to get AI-powered summary, key points, and Q&A</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Upload for Analysis
            </CardTitle>
            <CardDescription>Upload a PDF or text document to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="analysis-file">Document File</Label>
                <Input
                  id="analysis-file"
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>
              <Button type="submit" disabled={uploading || !file} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                {uploading ? "Analyzing..." : "Analyze"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {analyses && analyses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold font-serif">Your Analyses</h2>
            <div className="grid gap-3">
              {analyses.map((a: any) => (
                <Card key={a.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between py-4">
                    <Link to={`/analyze/${a.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.file_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {a.status === "completed" ? "Analysis complete" : a.status === "analyzing" ? "Analyzing..." : "Pending"} · {new Date(a.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Analyze;
