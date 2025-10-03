import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">TrustCircle</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Building trusted communities through local services and connections.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Browse Services
                </Link>
              </li>
              <li>
                <Link to="/services/create" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  List a Service
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Community</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/community" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Community Posts
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Events
                </Link>
              </li>
              <li>
                <Link to="/trust-score" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Trust Score
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-smooth">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; 2024 TrustCircle. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;