import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="brand-footer">
      <div className="brand-container">
        <div className="footer-grid">
          <div className="footer-about">
            <Link to="/" aria-label="CERTIVERXIA home">
              <BrandLogo imageClassName="w-56 h-auto" />
            </Link>
            <p>
              Real achievements. Verifiable trust.
              <br />
              Connecting institutions, learners, and opportunity through secure
              digital credentials.
            </p>
            <span className="footer-signature">
              <span className="status-dot" /> Built for confidence.
            </span>
          </div>
          <div>
            <h2>Platform</h2>
            <Link to="/verify">Verify a certificate</Link>
            <Link to="/register">For institutions</Link>
            <Link to="/login">Sign in to your account</Link>
          </div>
          <div>
            <h2>Discover</h2>
            <a href="/#platform">Our platform</a>
            <a href="/#how-it-works">How it works</a>
            <Link to="/verify">QR verification</Link>
          </div>
          <div>
            <h2>Contact</h2>
            <a href="tel:+94787896876">078 789 6876</a>
            <a href="mailto:info@certiverxia.com">info@certiverxia.com</a>
            <p>
              Mary&apos;s Road
              <br />
              Colombo
            </p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} CERTIVERXIA. All rights reserved.</p>
          <nav aria-label="Legal" className="footer-legal-links">
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </nav>
          <p>Designed and developed by Nabeela Isham.</p>
        </div>
      </div>
    </footer>
  );
}
