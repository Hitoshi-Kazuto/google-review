import { Link } from "react-router-dom";
import logo from "../public/logo.png";

const FEATURES = [
  {
    icon: "✦",
    title: "AI review drafts",
    description:
      "Customers pick what they loved — our AI turns their feedback into polished, ready-to-post Google reviews in seconds.",
  },
  {
    icon: "◈",
    title: "Smart feedback routing",
    description:
      "Five-star experiences go to Google. Lower ratings are captured privately so you can respond before they become public.",
  },
  {
    icon: "⬡",
    title: "QR codes & share links",
    description:
      "Print a QR code for your counter or share a link by text. Every touchpoint becomes an opportunity for a review.",
  },
  {
    icon: "▣",
    title: "Real-time analytics",
    description:
      "Track ratings, review drafts, and customer sentiment from a simple dashboard built for busy owners.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Register your business",
    description: "Add your name, Google review link, and the highlights you want customers to mention.",
  },
  {
    num: "02",
    title: "Share with customers",
    description: "Display your QR code in-store or send your unique link after a great visit.",
  },
  {
    num: "03",
    title: "Watch reviews grow",
    description: "Customers rate, pick tags, and post — with AI doing the heavy lifting on the writing.",
  },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          {/* <span className="landing-logo">R</span> */}
          <img src={logo} alt="ReviewDo Logo" className="landing-logo" />
          ReviewDo
        </Link>
        <nav className="landing-nav">
          <Link to="/business/login" className="landing-nav-link">
            Log in
          </Link>
          <Link to="/business/register" className="btn btn-primary btn-sm">
            Get started
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-badge">For local businesses</div>
        <h1 className="hero-title">
          More Google reviews.
          <br />
          <span className="hero-accent">Less effort.</span>
        </h1>
        <p className="hero-subtitle">
          ReviewDo gives your customers a guided, AI-assisted path to leave authentic Google
          reviews — while routing private feedback straight to you.
        </p>
        <div className="hero-actions">
          <Link to="/business/register" className="btn btn-primary">
            Register your business
          </Link>
          <Link to="/business/login" className="btn btn-secondary">
            Business login
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <div className="section-header">
          <p className="section-eyebrow">Why ReviewDo</p>
          <h2>Everything you need to grow your online reputation</h2>
          <p className="section-desc">
            Stop hoping customers remember to review you. ReviewDo makes it effortless for them
            and measurable for you.
          </p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-alt">
        <div className="section-header">
          <p className="section-eyebrow">How it works</p>
          <h2>Up and running in minutes</h2>
        </div>
        <div className="steps-grid">
          {STEPS.map((s) => (
            <div key={s.num} className="step-card">
              <span className="step-num">{s.num}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="cta-banner">
          <h2>Ready to turn visits into reviews?</h2>
          <p>
            Join businesses using ReviewDo to build trust, rank higher on Google, and hear from
            customers before problems go public.
          </p>
          <Link to="/business/register" className="btn btn-primary btn-light">
            Get started — it&apos;s free
          </Link>
        </div>
      </section>

      <section className="landing-section demo-section">
        <div className="section-header">
          <p className="section-eyebrow">Try it yourself</p>
          <h2>Explore the demo</h2>
          <p className="section-desc">
            See ReviewDo from both sides — experience the customer review flow or log into a
            sample business dashboard.
          </p>
        </div>
        <div className="demo-grid">
          <div className="demo-card">
            <h3>Customer experience</h3>
            <p>Walk through the review flow as a customer visiting Cafe Luna, our demo business.</p>
            <Link to="/r/biz_demo" className="btn btn-primary">
              Try customer flow
            </Link>
          </div>
          <div className="demo-card">
            <h3>Business dashboard</h3>
            <p>Sign in to the demo account and explore analytics, QR codes, and review activity.</p>
            <Link
              to="/business/login"
              className="btn btn-secondary"
              state={{ businessId: "biz_demo", loginCode: "BIZ-DEMO1" }}
            >
              Try demo login
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/" className="landing-brand">
          <span className="landing-logo">R</span>
          ReviewDo
        </Link>
        <p className="landing-footer-copy">
          AI-powered Google review collection for local businesses.
        </p>
      </footer>
    </div>
  );
}
