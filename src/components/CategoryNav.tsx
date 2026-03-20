import { Link, useSearchParams } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const categories = [
  "Design Guides",
  "Standards & Codes",
  "Manufacturer Resources",
  "Research Papers",
  "All Documents",
];

const CategoryNav = () => {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get("category");

  return (
    <div className="border-b bg-card">
      <div className="container">
        <ScrollArea className="w-full whitespace-nowrap">
          <nav className="flex items-center gap-6 py-2.5">
            {categories.map((cat) => {
              const isAll = cat === "All Documents";
              const href = isAll ? "/documents" : `/documents?category=${encodeURIComponent(cat)}`;
              const isActive = isAll ? !activeCategory : activeCategory === cat;

              return (
                <Link
                  key={cat}
                  to={href}
                  className={`text-sm font-medium transition-colors whitespace-nowrap pb-1 border-b-2 ${
                    isActive
                      ? "text-foreground border-primary"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </nav>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};

export default CategoryNav;
