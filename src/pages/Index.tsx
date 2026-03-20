import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen, FileText, Factory, FlaskConical, Search, Users,
  FileArchive, Upload, CheckCircle, Sparkles, Shield, MessageSquare,
} from "lucide-react";
import { useState } from "react";

const categories = [
  { name: "Design Guides", icon: BookOpen, description: "Engineering design manuals and handbooks", count: "120+ docs" },
  { name: "Standards & Codes", icon: FileText, description: "Industry standards and building codes", count: "85+ docs" },
  { name: "Manufacturer Resources", icon: Factory, description: "Product catalogs and technical data", count: "200+ docs" },
  { name: "Research Papers", icon: FlaskConical, description: "Academic and industry research", count: "95+ docs" },
];

const stats = [
  { label: "Documents", value: "500+", icon: FileArchive },
  { label: "Manufacturers", value: "50+", icon: Factory },
  { label: "Contributors", value: "120+", icon: Users },
];

const features = [
  { icon: Sparkles, title: "AI-Powered Analysis", description: "Upload any PDF and get instant AI summaries, key points, and extracted content." },
  { icon: MessageSquare, title: "Interactive Q&A", description: "Chat with your documents — ask questions and get answers grounded in the content." },
  { icon: Shield, title: "Secure & Private", description: "Your personal analyses are private and protected. Only you can access your uploads." },
  { icon: Search, title: "Full-Text Search", description: "Find any document instantly with powerful full-text search across our entire library." },
];

const faqs = [
  { q: "What is Precastipedia?", a: "Precastipedia is a centralized knowledge platform for the precast and prestressed concrete industry. It provides access to design guides, standards, manufacturer resources, and research papers, along with AI-powered document analysis." },
  { q: "Do I need an account to browse documents?", a: "No — anyone can browse and view documents in our library. However, you need a free account to upload documents and use the AI analysis features." },
  { q: "Can I upload and share documents?", a: "Yes! Any registered user can upload PDF documents to share with the community. Your uploads are categorized and made searchable for all users." },
  { q: "How does AI document analysis work?", a: "When you upload a document for analysis, our AI reads the full content and generates a comprehensive summary, extracts key points, and enables an interactive Q&A chat where you can ask specific questions about the document." },
  { q: "What file formats are supported?", a: "Currently we support PDF files for both the document library and AI analysis. Support for additional formats is planned." },
  { q: "Is my analyzed content private?", a: "Yes. Documents uploaded for personal AI analysis are stored in your private space. Only you can view your analyses and chat history. Documents shared to the public library are visible to everyone." },
  { q: "Is Precastipedia free to use?", a: "Yes — browsing the document library, uploading resources, and using AI analysis are all free. We believe knowledge should be accessible to everyone in the industry." },
];

const Index = () => {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/documents?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-24 md:py-36">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>
        <div className="container relative text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 font-serif">
            Get to the source.
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Specialized knowledge on precast &amp; prestressed concrete, and answers you won't find anywhere else. Welcome to the industry's knowledge hub.
          </p>
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="What are you curious about?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 bg-card border-0 h-14 text-base rounded-lg"
              />
            </div>
            <Button type="submit" size="lg" variant="secondary" className="h-14 px-8 rounded-lg font-semibold">
              Search
            </Button>
          </form>
        </div>
      </section>

      {/* Category Browsing — Scribd style */}
      <section className="container py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 font-serif">
          You've seen it all, now understand it all.
        </h2>
        <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
          Make sense of everything with information on precast concrete, curated by a global community of engineers.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Link key={cat.name} to={`/documents?category=${encodeURIComponent(cat.name)}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer h-full group border-2 hover:border-primary/30">
                <CardContent className="p-6 flex flex-col items-start gap-3">
                  <div className="rounded-lg p-3 bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <cat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.count}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/documents" className="text-primary font-medium hover:underline text-sm">
            Explore all categories →
          </Link>
        </div>
      </section>

      {/* Features / Value Prop — like Scribd's "Knowledge isn't free" */}
      <section className="bg-muted py-20">
        <div className="container max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold font-serif mb-3">
              Knowledge isn't free. Except when it is.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Precastipedia gives you access to the industry's best resources and AI-powered tools — completely free.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {features.map((feat) => (
              <div key={feat.title} className="flex items-start gap-4">
                <div className="shrink-0 rounded-full p-2.5 bg-primary/10">
                  <feat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 bg-card rounded-xl border p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif font-bold text-xl mb-1">Free access</h3>
              <ul className="space-y-2 mt-3">
                {[
                  "500+ documents and specialty resources",
                  "Access guides, standards, research & more",
                  "AI-powered document analysis",
                  "Interactive Q&A with your documents",
                  "Share knowledge with a global community",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <Link to="/signup">
                <Button size="lg" className="px-10 font-semibold">
                  Sign up free
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-2">No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-14">
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2">
                <s.icon className="h-8 w-8 text-primary" />
                <span className="text-3xl font-bold font-serif">{s.value}</span>
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upload CTA — Scribd's "Share the wealth" */}
      <section className="bg-muted py-20">
        <div className="container text-center max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 font-serif">
            Share the wealth [of knowledge].
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Someone out there is searching for your document. Upload for free, reach a global audience of engineers, and get cited directly on our website.
          </p>
          <div className="flex justify-center mb-4">
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-card p-10 w-full max-w-sm flex flex-col items-center gap-3">
              <Upload className="h-10 w-10 text-primary" />
              <p className="text-sm text-muted-foreground">PDFs, design guides, research papers</p>
            </div>
          </div>
          <Link to="/upload">
            <Button size="lg" className="font-semibold">Upload documents</Button>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-20 max-w-3xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2 font-serif">FAQ</h2>
        <p className="text-muted-foreground text-center mb-10">
          If you've got questions about Precastipedia, you've come to the right place.
        </p>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </main>
  );
};

export default Index;
