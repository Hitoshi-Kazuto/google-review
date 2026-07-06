import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getBusiness, getAnalytics, updateBusiness } from "../api.js";

function StarBar({ stars, count, max }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="star-bar-row">
      <span className="star-bar-label">{stars}★</span>
      <div className="star-bar-track">
        <div className="star-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="star-bar-count">{count}</span>
    </div>
  );
}

function badgeClass(type) {
  if (type === "posted_to_google") return "badge badge-posted";
  if (type === "private_feedback" || type === "sent_private_feedback")
    return "badge badge-private";
  return "badge badge-draft";
}

function badgeLabel(type) {
  if (type === "posted_to_google") return "Posted";
  if (type === "private_feedback" || type === "sent_private_feedback")
    return "Private";
  return "Draft";
}

export default function BusinessDashboard() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [keywordMsg, setKeywordMsg] = useState(null);

  useEffect(() => {
    Promise.all([getBusiness(businessId), getAnalytics(businessId)])
      .then(([biz, stats]) => {
        setBusiness(biz);
        setKeywords(biz.tag_options);
        setAnalytics(stats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [businessId]);

  function addKeyword() {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) {
      setKeywordMsg("Keyword already exists");
      return;
    }
    setKeywords((prev) => [...prev, trimmed]);
    setNewKeyword("");
    setKeywordMsg(null);
  }

  function removeKeyword(tag) {
    setKeywords((prev) => prev.filter((k) => k !== tag));
  }

  async function saveKeywords() {
    setSavingKeywords(true);
    setKeywordMsg(null);
    try {
      const updated = await updateBusiness(businessId, { tag_options: keywords });
      setBusiness(updated);
      setKeywords(updated.tag_options);
      setKeywordMsg("Saved!");
      setTimeout(() => setKeywordMsg(null), 2000);
    } catch (err) {
      setKeywordMsg(err.message);
    } finally {
      setSavingKeywords(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(business.qr_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="page page-center">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="page page-center">
        <h1>Error</h1>
        <p className="subtitle">{error}</p>
      </div>
    );
  }

  const maxStarCount = analytics
    ? Math.max(...Object.values(analytics.star_distribution), 1)
    : 1;

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← Home
      </Link>
      <h1>{business.name}</h1>
      <p className="subtitle">Business dashboard</p>

      <div className="qr-section">
        <h2>Your QR code</h2>
        <p className="form-hint">Print this and place it at your front desk</p>
        <QRCodeSVG value={business.qr_url} size={180} level="M" />
        <div className="link-copy">
          <input readOnly value={business.qr_url} />
          <button type="button" onClick={copyLink}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {analytics && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{analytics.total_reviews_generated}</div>
              <div className="stat-label">Reviews generated</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.posted_to_google}</div>
              <div className="stat-label">Posted to Google</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{analytics.sent_private_feedback}</div>
              <div className="stat-label">Private feedback</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {analytics.average_stars ?? "—"}
              </div>
              <div className="stat-label">Avg. stars</div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <h2>Star distribution</h2>
            {[5, 4, 3, 2, 1].map((s) => (
              <StarBar
                key={s}
                stars={s}
                count={analytics.star_distribution[s] || 0}
                max={maxStarCount}
              />
            ))}
          </div>

          {analytics.recent_activity.length > 0 && (
            <div className="card">
              <h2>Recent activity</h2>
              <ul className="activity-list">
                {analytics.recent_activity.map((item, i) => (
                  <li key={i} className="activity-item">
                    <span>
                      {"★".repeat(item.stars)}{" "}
                      <span className={badgeClass(item.type)}>
                        {badgeLabel(item.type)}
                      </span>
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Keywords</h2>
        <p className="form-hint" style={{ marginBottom: 12 }}>
          Customers see these when leaving a review. AI also suggests extras based on their rating.
        </p>

        <div className="tags-grid" style={{ margin: "0 0 12px" }}>
          {keywords.map((tag) => (
            <span key={tag} className="tag-chip selected keyword-editable">
              {tag}
              <button
                type="button"
                className="keyword-remove"
                onClick={() => removeKeyword(tag)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          {keywords.length === 0 && (
            <p className="form-hint">No keywords yet — add some below.</p>
          )}
        </div>

        <div className="keyword-add-row">
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add keyword…"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
          />
          <button type="button" onClick={addKeyword}>
            Add
          </button>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 12 }}
          onClick={saveKeywords}
          disabled={savingKeywords}
        >
          {savingKeywords ? "Saving…" : "Save keywords"}
        </button>
        {keywordMsg && (
          <p
            className="form-hint"
            style={{
              marginTop: 8,
              color: keywordMsg === "Saved!" ? "var(--success)" : "var(--danger)",
            }}
          >
            {keywordMsg}
          </p>
        )}
      </div>
    </div>
  );
}
