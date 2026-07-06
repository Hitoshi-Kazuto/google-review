import { Routes, Route } from "react-router-dom";
import ReviewFlow from "./pages/ReviewFlow.jsx";
import BusinessRegister from "./pages/BusinessRegister.jsx";
import BusinessDashboard from "./pages/BusinessDashboard.jsx";
import Home from "./pages/Home.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/r/:businessId" element={<ReviewFlow />} />
      <Route path="/business/register" element={<BusinessRegister />} />
      <Route path="/business/:businessId" element={<BusinessDashboard />} />
    </Routes>
  );
}
