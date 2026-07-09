import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginBusiness } from "../api.js";
import { saveBusinessAuth } from "../auth.js";

export default function BusinessLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location.state?.email) setEmail(location.state.email);
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
        email: email.trim().toLowerCase(),
        password,
      });
      saveBusinessAuth(biz.id, biz.token);
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

      {location.state?.email && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2>Account ready</h2>
          <p className="form-hint" style={{ marginBottom: 12 }}>
            Use the email and password you created when you registered.
          </p>
          <div className="credential-box">
            <strong>Email</strong>
            <div>{location.state.email}</div>
          </div>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@business.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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
