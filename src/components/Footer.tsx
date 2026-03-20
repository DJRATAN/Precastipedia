import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="border-t bg-card mt-auto">
    <div className="container py-12">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="mb-3">
            <img src={logo} alt="Precastipedia" className="h-24 w-auto" />
          </div>
        </div>

        {/* About */}
        <div>
          <h4 className="font-semibold text-sm mb-3">About</h4>
          <div className="space-y-2">
            <Link to="/about" className="block text-sm text-muted-foreground hover:text-foreground">About Us</Link>
            <Link to="/documents" className="block text-sm text-muted-foreground hover:text-foreground">Library</Link>
            <Link to="/analyze" className="block text-sm text-muted-foreground hover:text-foreground">AI Analysis</Link>
          </div>
        </div>

        {/* Support */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Support</h4>
          <div className="space-y-2">
            <Link to="/" className="block text-sm text-muted-foreground hover:text-foreground">Help / FAQ</Link>
            <Link to="/signup" className="block text-sm text-muted-foreground hover:text-foreground">Create Account</Link>
            <Link to="/upload" className="block text-sm text-muted-foreground hover:text-foreground">Upload Docs</Link>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Categories</h4>
          <div className="space-y-2">
            <Link to="/documents?category=Design+Guides" className="block text-sm text-muted-foreground hover:text-foreground">Design Guides</Link>
            <Link to="/documents?category=Standards+%26+Codes" className="block text-sm text-muted-foreground hover:text-foreground">Standards & Codes</Link>
            <Link to="/documents?category=Manufacturer+Resources" className="block text-sm text-muted-foreground hover:text-foreground">Manufacturer Resources</Link>
            <Link to="/documents?category=Research+Papers" className="block text-sm text-muted-foreground hover:text-foreground">Research Papers</Link>
          </div>
        </div>

        {/* Legal */}
        <div>
          <h4 className="font-semibold text-sm mb-3">Legal</h4>
          <div className="space-y-2">
            <span className="block text-sm text-muted-foreground">Terms of Service</span>
            <span className="block text-sm text-muted-foreground">Privacy Policy</span>
            <span className="block text-sm text-muted-foreground">Copyright</span>
          </div>
        </div>
      </div>

      <div className="border-t mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>© {new Date().getFullYear()} Precastipedia. All rights reserved.</span>
        <span>Never ending precast knowledge</span>
      </div>
    </div>
  </footer>
);

export default Footer;
