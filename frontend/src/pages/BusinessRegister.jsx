import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerBusiness } from "../api.js";

export default function BusinessRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const tag_options = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const biz = await registerBusiness({
        name,
        google_review_url: googleReviewUrl,
        tag_options,
        logo_url: logoUrl,
      });
      navigate(`/business/login`, {
        state: {
          businessId: biz.id,
          loginCode: biz.login_code,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Back
      </Link>
      <h1>Register your business</h1>
      <p className="subtitle">
        Set up your QR code and review keywords for AI-generated drafts.
      </p>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="name">Business name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cafe Luna"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="google-url">Google review URL</label>
          <input
            id="google-url"
            value={googleReviewUrl}
            onChange={(e) => setGoogleReviewUrl(e.target.value)}
            placeholder="https://search.google.com/local/writereview?placeid=..."
            required
          />
          <p className="form-hint">
            From Google Business Profile → Ask for reviews → copy link. For testing, a placeholder URL like https://example.com/review is fine.
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="keywords">Review keywords (comma-separated)</label>
          <textarea
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Fast service, Friendly staff, Clean space, Great food"
            rows={3}
          />
          <p className="form-hint">
            Customers can tap these when leaving a review for better AI drafts
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="logo">Logo URL (optional)</label>
          <input
            id="logo"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create & get QR code"}
        </button>
      </form>
    </div>
  );
}
