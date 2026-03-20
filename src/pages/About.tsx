import { Building2, BookOpen, Users, Shield } from "lucide-react";

const About = () => (
  <main className="flex-1">
    <section className="bg-muted py-16">
      <div className="container text-center max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold font-serif mb-4">About Precastipedia</h1>
        <p className="text-lg text-muted-foreground">
          Precastipedia is a centralized knowledge platform built for the precast and prestressed concrete industry. 
          Our mission is to make critical design resources, standards, and research easily accessible to engineers, 
          manufacturers, and students.
        </p>
      </div>
    </section>
    <section className="container py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
        {[
          { icon: Building2, title: "Industry Focus", text: "Dedicated exclusively to precast and prestressed concrete — no noise, just the resources you need." },
          { icon: BookOpen, title: "Curated Library", text: "Design guides, standards, manufacturer catalogs, and research papers organized and searchable." },
          { icon: Users, title: "Community Driven", text: "Contributors from across the industry share knowledge to advance best practices." },
          { icon: Shield, title: "Quality Content", text: "All uploads are reviewed to maintain the integrity and relevance of our knowledge base." },
        ].map((item) => (
          <div key={item.title} className="flex gap-4">
            <div className="shrink-0 rounded-lg bg-accent p-3 h-fit">
              <item.icon className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  </main>
);

export default About;
