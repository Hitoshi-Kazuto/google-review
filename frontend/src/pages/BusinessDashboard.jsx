import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getBusiness, getAnalytics, updateBusiness, getPrivateFeedback } from "../api.js";
import { clearBusinessAuth, getBusinessAuth } from "../auth.js";
import Header from "../components/Header.jsx";
import { Copy, QrCode, BarChart3, MessageSquare, Tag, X } from "lucide-react";

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
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [keywordMsg, setKeywordMsg] = useState(null);
  const [privateFeedbacks, setPrivateFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    const auth = getBusinessAuth();
    if (!auth || auth.businessId !== businessId) {
      navigate("/business/login", { replace: true });
      return;
    }

    Promise.all([getBusiness(businessId), getAnalytics(businessId)])
      .then(([biz, stats]) => {
        setBusiness(biz);
        setKeywords(biz.tag_options);
        setAnalytics(stats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    setFeedbackLoading(true);
    getPrivateFeedback(businessId)
      .then((data) => setPrivateFeedbacks(data.feedbacks || []))
      .catch(() => setPrivateFeedbacks([]))
      .finally(() => setFeedbackLoading(false));
  }, [businessId, navigate]);

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
      <Header 
        showLogout={true}
        onLogout={() => {
          clearBusinessAuth();
          navigate("/business/login", { replace: true });
        }}
        businessName={business.name}
      />
      <div className="page-content">
      <h1>{business.name}</h1>
      <p className="subtitle">Business dashboard</p>

      <div className="qr-section">
        <h2>
          <QrCode size={20} className="inline-icon" />
          Your QR code
        </h2>
        <p className="form-hint">Print this and place it at your front desk</p>
        <QRCodeSVG value={business.qr_url} size={180} level="M" />
        <div className="link-copy">
          <input readOnly value={business.qr_url} />
          <button type="button" onClick={copyLink}>
            <Copy size={16} />
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
            <h2>
              <BarChart3 size={20} className="inline-icon" />
              Star distribution
            </h2>
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
              <h2>
                <BarChart3 size={20} className="inline-icon" />
                Recent activity
              </h2>
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

      {!feedbackLoading && privateFeedbacks.length > 0 && (
        <div className="card">
          <h2>
            <MessageSquare size={20} className="inline-icon" />
            Private feedback
          </h2>
          <p className="form-hint">Feedback submitted directly from customers.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            {privateFeedbacks.map((fb) => (
              <div
                key={fb.id}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "var(--secondary-bg)",
                  borderLeft: `4px solid var(--${fb.stars >= 4 ? "success" : "warning"})`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                  <span>{"★".repeat(fb.stars)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {new Date(fb.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.4" }}>{fb.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <h2>
          <Tag size={20} className="inline-icon" />
          Keywords
        </h2>
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
                <X size={14} />
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
    </div>
  );
}
