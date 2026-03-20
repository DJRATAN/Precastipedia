import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Upload as UploadIcon, FileText, Trash2, ChevronDown, ChevronUp, Loader2, Search, Megaphone, Code, FileUp, Facebook, Linkedin, Mail, Code2, Copy, Check } from "lucide-react";

const CATEGORIES = ["Design Guides", "Standards & Codes", "Manufacturer Resources", "Research Papers"];

type FileEntry = {
  id: string;
  file: File;
  title: string;
  description: string;
  category: string;
  allowDownload: boolean;
  advancedOpen: boolean;
  status: "idle" | "uploading" | "done" | "error";
  docId?: string;
  docUrl?: string;
};

const benefits = [
  { icon: FileUp, title: "Upload documents", subtitle: "easily, for free" },
  { icon: Search, title: "Amplify reach with", subtitle: "search engine indexing" },
  { icon: Megaphone, title: "Share with engineers", subtitle: "around the world" },
  { icon: Code, title: "Embed content directly", subtitle: "on your website" },
];

const testimonials = [
  { quote: "Since discovering Precastipedia, it's the only platform I use to share technical documents. It's fast, easy, and reaches the right audience.", name: "James M." },
  { quote: "I keep coming back because I know the content is high-quality and relevant to our industry. It helps me stay current.", name: "Sarah K." },
  { quote: "I use Precastipedia because it's the best place to find precast concrete resources and share them with a global audience.", name: "Ahmed R." },
];

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  if (!user) {
    return (
      <main className="flex-1 container py-12 text-center">
        <p className="text-muted-foreground">Please log in to upload documents.</p>
      </main>
    );
  }

  const addFiles = (files: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(files)
      .filter((f) => f.type === "application/pdf")
      .map((f) => ({
        id: crypto.randomUUID(),
        file: f,
        title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        description: "",
        category: "",
        allowDownload: true,
        advancedOpen: false,
        status: "idle" as const,
      }));
    if (newEntries.length === 0) {
      toast({ title: "Only PDF files are supported", variant: "destructive" });
      return;
    }
    setEntries((prev) => [...prev, ...newEntries]);
  };

  const updateEntry = (id: string, updates: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmitAll = async () => {
    const pending = entries.filter((e) => e.status === "idle");
    if (pending.some((e) => !e.category)) {
      toast({ title: "Please select a category for all documents", variant: "destructive" });
      return;
    }

    for (const entry of pending) {
      updateEntry(entry.id, { status: "uploading" });

      try {
        const fileExt = entry.file.name.split(".").pop();
        const filePath = `${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, entry.file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

        const { data: docData, error: insertError } = await supabase.from("documents").insert({
          title: entry.title,
          description: entry.description,
          category: entry.category,
          file_url: urlData.publicUrl,
          file_name: entry.file.name,
          uploaded_by: user.id,
        }).select("id").single();
        if (insertError) throw insertError;

        // Auto-trigger AI analysis
        const analysisFilePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        await supabase.storage.from("user-analyses").upload(analysisFilePath, entry.file);

        const { data: analysis } = await supabase
          .from("user_analyses")
          .insert({
            user_id: user.id,
            file_name: entry.file.name,
            file_url: analysisFilePath,
            file_type: fileExt || "pdf",
            status: "analyzing",
          })
          .select()
          .single();

        if (analysis) {
          const { data: session } = await supabase.auth.getSession();
          try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.session?.access_token}`,
              },
              body: JSON.stringify({
                action: "analyze",
                analysisId: analysis.id,
                filePath: analysisFilePath,
                fileName: entry.file.name,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
              console.error("Analysis failed:", errorData);
              toast({ 
                title: "Analysis failed", 
                description: errorData.error || "Could not analyze document", 
                variant: "destructive" 
              });
            }
          } catch (err) {
            console.error("Edge function error:", err);
            toast({ 
              title: "Analysis error", 
              description: "Could not start document analysis", 
              variant: "destructive" 
            });
          }
        }

        const shareUrl = `${window.location.origin}/documents/${docData.id}`;
        updateEntry(entry.id, { status: "done", docId: docData.id, docUrl: shareUrl });
      } catch (err: any) {
        console.error(err);
        updateEntry(entry.id, { status: "error" });
        toast({ title: `Failed: ${entry.title}`, description: err.message, variant: "destructive" });
      }
    }
  };

  const hasEntries = entries.length > 0;
  const hasIdle = entries.some((e) => e.status === "idle");
  const isUploading = entries.some((e) => e.status === "uploading");

  return (
    <main className="flex-1">
      {/* Info banner */}
      {hasEntries && (
        <div className="bg-muted border-b">
          <div className="container py-4 max-w-4xl">
            <h2 className="font-bold text-sm mb-1">Make your document easy to find</h2>
            <p className="text-sm text-muted-foreground">
              Adding more details helps others find the information they need in your upload. Boost your views by writing a clear, detailed title and description.
            </p>
          </div>
        </div>
      )}

      <div className="container py-10 max-w-4xl mx-auto">
        {/* Initial upload or document entries */}
        {!hasEntries ? (
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold font-serif mb-3">Contribute to the collection</h1>
            <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
              Someone out there is searching for your document. Share knowledge with a global audience of engineers.
            </p>
          </div>
        ) : null}

        {/* Document entries */}
        <div className="space-y-8">
          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-lg bg-card p-6">
              <div className="flex gap-6">
                {/* PDF thumbnail */}
                <div className="shrink-0 w-[100px]">
                  <div className="bg-muted rounded border aspect-[3/4] flex flex-col items-center justify-center relative">
                    <span className="absolute top-1.5 left-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">PDF</span>
                    <FileText className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  {entry.status === "uploading" && (
                    <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                    </p>
                  )}
                </div>

                {/* Done state: share card */}
                {entry.status === "done" ? (
                  <ShareCard entry={entry} />
                ) : (
                  /* Edit form */
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label className="text-sm">Title <span className="text-muted-foreground">(Required)</span></Label>
                      <Input
                        value={entry.title}
                        onChange={(e) => updateEntry(entry.id, { title: e.target.value })}
                        disabled={entry.status !== "idle"}
                        maxLength={100}
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-muted-foreground">Imagine you're searching for this document. What keywords would you use?</p>
                        <span className="text-xs text-muted-foreground">{entry.title.length}/100</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Description</Label>
                      <Textarea
                        value={entry.description}
                        onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                        disabled={entry.status !== "idle"}
                        rows={3}
                        maxLength={500}
                        placeholder="Provide a quick summary: What is this document about? Where did it originate? Who might find this information useful?"
                      />
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-muted-foreground">A few sentences to help others discover this resource.</p>
                        <span className="text-xs text-muted-foreground">{entry.description.length}/500</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Category <span className="text-muted-foreground">(Required)</span></Label>
                      <Select
                        value={entry.category}
                        onValueChange={(v) => updateEntry(entry.id, { category: v })}
                        disabled={entry.status !== "idle"}
                      >
                        <SelectTrigger className="w-full sm:w-[280px]">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Advanced Settings */}
                    <Collapsible open={entry.advancedOpen} onOpenChange={(o) => updateEntry(entry.id, { advancedOpen: o })}>
                      <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        {entry.advancedOpen ? "Hide" : "Show"} Advanced Settings
                        {entry.advancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3">
                        <div className="flex items-start gap-6">
                          <div>
                            <p className="text-sm font-medium mb-2">Allow people to</p>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`dl-${entry.id}`}
                                checked={entry.allowDownload}
                                onCheckedChange={(v) => updateEntry(entry.id, { allowDownload: !!v })}
                                disabled={entry.status !== "idle"}
                              />
                              <label htmlFor={`dl-${entry.id}`} className="text-sm">Download the document</label>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Actions */}
                    {entry.status === "idle" && (
                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.id)} className="gap-1 text-muted-foreground">
                          <Trash2 className="h-4 w-4" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Upload zone */}
        <div
          className={`mt-8 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => (hasEntries ? additionalInputRef : fileInputRef).current?.click()}
        >
          <Button type="button" variant="outline" className="font-medium">
            {hasEntries ? "Upload additional documents" : "Select documents to upload"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">or drag &amp; drop</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
          <input
            ref={additionalInputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">Supported file types: pdf</p>

        {/* Submit all */}
        {hasIdle && (
          <div className="flex justify-end mt-6">
            <Button onClick={handleSubmitAll} disabled={isUploading} size="lg" className="gap-2 font-semibold px-8">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
              {isUploading ? "Submitting..." : `Submit ${entries.filter((e) => e.status === "idle").length} document${entries.filter((e) => e.status === "idle").length > 1 ? "s" : ""}`}
            </Button>
          </div>
        )}

        {/* Copyright notice */}
        <div className="mt-8 bg-muted rounded-lg p-4 text-xs text-muted-foreground text-center">
          We take intellectual property rights very seriously. If you did not create a work yourself and are unsure whether it is copyrighted, please do not upload it.
        </div>
      </div>

      {/* Benefits */}
      <section className="bg-muted py-14">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {benefits.map((b) => (
              <div key={b.title} className="flex flex-col items-center gap-3">
                <div className="rounded-full p-3 bg-card border">
                  <b.icon className="h-7 w-7 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{b.title}</p>
                  <p className="text-sm text-muted-foreground">{b.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold font-serif mb-10">What our contributors are saying</h2>
        <div className="space-y-10">
          {testimonials.map((t, i) => (
            <div key={i}>
              <blockquote className="text-lg italic text-foreground/90 leading-relaxed">"{t.quote}"</blockquote>
              <p className="text-sm text-muted-foreground mt-3">{t.name}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

const ShareCard = ({ entry }: { entry: FileEntry }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = entry.docUrl || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(entry.title);

  return (
    <div className="flex-1 space-y-4">
      <h3 className="font-bold text-sm">Share it!</h3>
      <div className="flex gap-2">
        <Input value={shareUrl} readOnly className="text-sm bg-muted" />
        <Button variant="outline" size="icon" onClick={handleCopy} title="Copy link">
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Link to={`/documents/${entry.docId}`}>
          <Button className="font-semibold">View</Button>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Facebook className="h-5 w-5" />
          <span className="text-xs">Facebook</span>
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Linkedin className="h-5 w-5" />
          <span className="text-xs">LinkedIn</span>
        </a>
        <a
          href={`mailto:?subject=${encodedTitle}&body=Check out this document: ${encodedUrl}`}
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Mail className="h-5 w-5" />
          <span className="text-xs">Email</span>
        </a>
        <button
          onClick={handleCopy}
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Code2 className="h-5 w-5" />
          <span className="text-xs">Embed</span>
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        View all of{" "}
        <Link to="/documents" className="underline hover:text-foreground">your uploads</Link>
        {" "}to make changes to{" "}
        <Link to={`/documents/${entry.docId}`} className="underline hover:text-foreground">this document</Link>
      </p>
    </div>
  );
};

export default Upload;

