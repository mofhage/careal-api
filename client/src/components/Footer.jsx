// Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Careal_logo from "../assets/images/Careal_logo.jpeg";
import './Footer.css';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <div className="footer-container">
      <div className="footer-links">
        <div className="footer-link-wrapper">
          <div className="footer-link-items">
            <h2>Company</h2>
            <Link to="/about">About Us</Link>
            <Link to="/services">How It Works</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-use">Terms of Use</Link>
          </div>
          <div className="footer-link-items">
            <h2>Support</h2>
            <Link to="/contact">Contact Us</Link>
            <Link to="/contact">Help Center</Link>
            <Link to="/contact">Sponsorships</Link>
          </div>
        </div>
        <div className="footer-link-wrapper">
          <div className="footer-link-items">
            <h2>Social</h2>
            <a href="https://www.linkedin.com/in/michaelbassey" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://www.instagram.com/devcareal/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://www.facebook.com/profile.php?id=61582834841134" target="_blank" rel="noopener noreferrer">Facebook</a>
            <a href="https://www.youtube.com/@Careal-h6t" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a href="https://x.com/devcareal" target="_blank" rel="noopener noreferrer">Twitter / X</a>
          </div>
        </div>
      </div>

      <section className="social-media">
        <div className="social-media-wrap">
          <div className="footer-logo">
            <Link to="/" className="social-logo">
              CAREAL
              <img src={Careal_logo} alt="Careal logo" style={{ width: 40, height: 40 }} />
            </Link>
          </div>

          <small className="website-rights">© {year} CAREAL. All rights reserved.</small>

          <div className="social-icons">
            <a className="social-icon-link linkedin"
              href="https://www.linkedin.com/in/michaelbassey"
              target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i className="fab fa-linkedin" />
            </a>
            <a className="social-icon-link instagram"
              href="https://www.instagram.com/devcareal/"
              target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram" />
            </a>
            <a className="social-icon-link facebook"
              href="https://www.facebook.com/profile.php?id=61582834841134"
              target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook-f" />
            </a>
            <a className="social-icon-link youtube"
              href="https://www.youtube.com/@Careal-h6t"
              target="_blank" rel="noopener noreferrer" aria-label="YouTube">
              <i className="fab fa-youtube" />
            </a>
            <a className="social-icon-link twitter"
              href="https://x.com/devcareal"
              target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <i className="fab fa-twitter" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Footer;
