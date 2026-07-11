import { Link } from "react-router-dom";
import { Home, LogOut } from "lucide-react";
import logo from "../public/logo.png";

export default function Header({ showLogout = false, onLogout = null, businessName = null }) {
  return (
    <header className="app-header">
      <Link to="/" className="header-brand">
        <img src={logo} alt="Reviewदो Logo" className="header-logo" />
        <span className="header-brand-text">Reviewदो</span>
      </Link>
      
      <div className="header-actions">
        {businessName && (
          <span className="header-business-name">{businessName}</span>
        )}
        
        {showLogout && onLogout && (
          <button 
            type="button" 
            className="header-logout-btn"
            onClick={onLogout}
            aria-label="Sign out"
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        )}
        
        {!showLogout && (
          <Link to="/" className="header-home-btn" aria-label="Home">
            <Home size={20} />
          </Link>
        )}
      </div>
    </header>
  );
}
