import { Star } from "lucide-react";

export default function StarSelector({ value, onChange }) {
  return (
    <div className="stars-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-btn ${n <= value ? "active" : ""}`}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star 
            size={32} 
            fill={n <= value ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  );
}
