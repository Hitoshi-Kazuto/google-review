import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginBusiness } from "../api.js";
import { saveBusinessAuth } from "../auth.js";

export default function BusinessLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [businessId, setBusinessId] = useState(location.state?.businessId || "");
  const [loginCode, setLoginCode] = useState(location.state?.loginCode || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.state?.businessId) setBusinessId(location.state.businessId);
    if (location.state?.loginCode) setLoginCode(location.state.loginCode);
  }, [location.state]);

//   function handleDemoLogin() {
//     setBusinessId("biz_demo");
//     setLoginCode("BIZ-DEMO1");
//     setError(null);
//   }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const biz = await loginBusiness({
        business_id: businessId.trim(),
        login_code: loginCode.trim(),
      });
      saveBusinessAuth(biz.id, biz.login_code || loginCode.trim());
      navigate(`/business/${biz.id}`);
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
      <h1>Business login</h1>
      <p className="subtitle">
        Use the credentials issued when you registered your business to view analytics.
      </p>
      {/* <button type="button" className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={handleDemoLogin}>
        Use demo business account
      </button> */}

      {location.state?.businessId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Your credentials</h2>
          <p className="form-hint" style={{ marginBottom: 12 }}>
            Save these details. You’ll need them each time you sign in.
          </p>
          <div className="credential-box">
            <strong>Business ID</strong>
            <div>{location.state.businessId}</div>
          </div>
          <div className="credential-box">
            <strong>Login code</strong>
            <div>{location.state.loginCode}</div>
          </div>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="business-id">Business ID</label>
          <input
            id="business-id"
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            placeholder="biz_abc123"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-code">Login code</label>
          <input
            id="login-code"
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value)}
            placeholder="BIZ-ABC123"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="subtitle" style={{ marginTop: 16 }}>
        New here? <Link to="/business/register" className="nav-link">Register your business</Link>
      </p>
    </div>
  );
}
