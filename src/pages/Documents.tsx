import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, FileText, Calendar, ChevronRight } from "lucide-react";

const CATEGORIES = ["Design Guides", "Standards & Codes", "Manufacturer Resources", "Research Papers"];

const CATEGORY_DIRECTORY: Record<string, string[]> = {
  "Design Guides": [
    "PCI Design Handbook",
    "Connection Design",
    "Structural Design",
    "Architectural Precast",
    "Hollow Core Slabs",
    "Double Tees",
    "Wall Panels",
    "Columns & Beams",
    "Parking Structures",
    "Bridge Design",
    "Seismic Design",
    "Fire Resistance",
  ],
  "Standards & Codes": [
    "ACI Standards",
    "PCI Standards",
    "ASTM Standards",
    "IBC Building Code",
    "ASCE Load Standards",
    "AWS Welding Codes",
    "Tolerances & QC",
    "Environmental Standards",
    "Safety Regulations",
    "Testing Procedures",
  ],
  "Manufacturer Resources": [
    "Product Catalogs",
    "Technical Data Sheets",
    "Load Tables",
    "Connection Hardware",
    "Prestressing Strand",
    "Concrete Mix Designs",
    "Forming Systems",
    "Lifting & Handling",
    "Erection Guides",
    "Maintenance & Repair",
  ],
  "Research Papers": [
    "Structural Performance",
    "Material Science",
    "Durability & Sustainability",
    "High Performance Concrete",
    "UHPC Research",
    "FRP Reinforcement",
    "Thermal Performance",
    "Acoustics",
    "Blast Resistance",
    "Innovation & Technology",
    "Case Studies",
  ],
};

const Documents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const activeCategory = searchParams.get("category");
  const [tab, setTab] = useState<string>(activeCategory ? "categories" : "overview");

  useEffect(() => {
    fetchDocuments();
  }, [searchParams]);

  const fetchDocuments = async () => {
    setLoading(true);
    let query = supabase.from("documents").select("*").order("created_at", { ascending: false });

    const cat = searchParams.get("category");
    if (cat) query = query.eq("category", cat);

    const searchTerm = searchParams.get("search");
    if (searchTerm) query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

    const { data } = await query;
    setDocuments(data ?? []);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (search.trim()) params.set("search", search.trim());
    else params.delete("search");
    setSearchParams(params);
  };

  const selectCategory = (cat: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (!cat) params.delete("category");
    else params.set("category", cat);
    setSearchParams(params);
    setTab("categories");
  };

  // Group documents by category for overview
  const grouped = CATEGORIES.reduce<Record<string, any[]>>((acc, cat) => {
    acc[cat] = documents.filter((d) => d.category === cat);
    return acc;
  }, {});

  const isFiltered = !!searchParams.get("search") || !!activeCategory;

  return (
    <main className="flex-1">
      {/* Header */}
      <div className="container pt-10 pb-6">
        <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">Documents</h1>
        <p className="text-muted-foreground mb-6">Get started with the community's uploads</p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "overview") selectCategory(null); }}>
          <TabsList className="bg-transparent border-b rounded-none w-full justify-start gap-4 px-0 h-auto pb-0">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-3"
            >
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            {loading ? (
              <p className="text-muted-foreground text-center py-12">Loading documents...</p>
            ) : documents.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-12">
                {CATEGORIES.map((cat) => {
                  const catDocs = grouped[cat];
                  if (!catDocs || catDocs.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold font-serif">Trending in {cat}</h2>
                        <button
                          onClick={() => selectCategory(cat)}
                          className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          View More <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <ScrollArea className="w-full">
                        <div className="flex gap-5 pb-4">
                          {catDocs.slice(0, 8).map((doc) => (
                            <DocumentCard key={doc.id} doc={doc} />
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
              {Object.entries(CATEGORY_DIRECTORY).map(([cat, subcats]) => (
                <div key={cat}>
                  <h3 className="font-bold font-serif text-lg mb-3 border-b pb-2 border-border">{cat}</h3>
                  <ul className="space-y-1.5">
                    {subcats.map((sub) => (
                      <li key={sub}>
                        <Link
                          to={`/documents?category=${encodeURIComponent(cat)}&search=${encodeURIComponent(sub)}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {sub}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

const DocumentCard = ({ doc }: { doc: any }) => (
  <Link to={`/documents/${doc.id}`} className="group w-[160px] shrink-0">
    <div className="relative bg-muted rounded-lg border overflow-hidden aspect-[3/4] flex items-center justify-center mb-2 group-hover:shadow-md transition-shadow">
      <Badge className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 bg-destructive text-destructive-foreground">PDF</Badge>
      <FileText className="h-10 w-10 text-muted-foreground/50" />
    </div>
    <h3 className="text-sm font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">{doc.title}</h3>
    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <Calendar className="h-3 w-3" />
      {new Date(doc.created_at).toLocaleDateString()}
    </p>
  </Link>
);

const EmptyState = () => (
  <div className="text-center py-16">
    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-semibold mb-2">No documents found</h3>
    <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
  </div>
);

export default Documents;
