import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Precastipedia" className="h-8 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link to="/documents" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Documents</Link>
          <Link to="/analyze" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Analyze</Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link to="/upload">
                <Button size="sm">Upload Document</Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>Log Out</Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
              <Link to="/signup"><Button size="sm">Sign Up</Button></Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-card p-4 space-y-3">
          <Link to="/" className="block text-sm font-medium" onClick={() => setMobileOpen(false)}>Home</Link>
          <Link to="/documents" className="block text-sm font-medium" onClick={() => setMobileOpen(false)}>Documents</Link>
          <Link to="/analyze" className="block text-sm font-medium" onClick={() => setMobileOpen(false)}>Analyze</Link>
          <Link to="/about" className="block text-sm font-medium" onClick={() => setMobileOpen(false)}>About</Link>
          {user ? (
            <>
              <Link to="/upload" onClick={() => setMobileOpen(false)}><Button size="sm" className="w-full">Upload</Button></Link>
              <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>Log Out</Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)}><Button variant="ghost" size="sm" className="w-full">Log In</Button></Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)}><Button size="sm" className="w-full">Sign Up</Button></Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
