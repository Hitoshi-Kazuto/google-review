import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page page-center">
      <div>
        <div className="logo-circle">★</div>
        <h1>Review Funnel</h1>
        <p className="subtitle">
          Help customers share great reviews on Google — powered by AI drafts.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Link to="/r/biz_demo" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Try customer flow (demo)
          </Link>
          <Link
            to="/business/login"
            className="btn btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Business login
          </Link>
          <Link
            to="/business/login"
            className="btn btn-secondary"
            style={{ textDecoration: "none" }}
            state={{ businessId: "biz_demo", loginCode: "BIZ-DEMO1" }}
          >
            Try demo business login
          </Link>
          <Link
            to="/business/register"
            className="btn btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Register your business
          </Link>
        </div>
      </div>
    </div>
  );
}
