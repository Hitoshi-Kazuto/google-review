import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  getBusiness,
  generateReview,
  regenerateReview,
  reviewAction,
  sendPrivateFeedback,
  getSuggestedTags,
  mockGenerateReview,
  mockSuggestedTags,
} from "../api.js";
import StarSelector from "../components/StarSelector.jsx";
import TagSelector from "../components/TagSelector.jsx";
import ReviewEditor from "../components/ReviewEditor.jsx";
import Toast from "../components/Toast.jsx";

const STEPS = ["rate", "tags", "generating", "edit", "done"];

export default function ReviewFlow() {
  const { businessId } = useParams();
  const [step, setStep] = useState("rate");
  const [business, setBusiness] = useState(null);
  const [stars, setStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [usedMock, setUsedMock] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  useEffect(() => {
    getBusiness(businessId)
      .then(setBusiness)
      .catch(() => setError("Business not found"))
      .finally(() => setLoading(false));
  }, [businessId]);

  useEffect(() => {
    if (step !== "tags" || !business || !stars) return;

    setSuggestedLoading(true);
    setSuggestedTags([]);

    getSuggestedTags(businessId, stars)
      .then((data) => setSuggestedTags(data.suggested))
      .catch(() =>
        mockSuggestedTags(stars, business.tag_options).then((data) =>
          setSuggestedTags(data.suggested)
        )
      )
      .finally(() => setSuggestedLoading(false));
  }, [step, business, businessId, stars]);

  const stepIndex = STEPS.indexOf(step);

  function handleStarSelect(value) {
    setStars(value);
    setStep("tags");
  }

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleGenerate() {
    setStep("generating");
    setGenerating(true);
    setError(null);

    try {
      const result = await generateReview(businessId, stars, selectedTags);
      setDrafts(result.drafts);
      setSelectedDraftId(result.drafts[0].draft_id);
      setReviewText(result.drafts[0].text);
      setUsedMock(false);
      setStep("edit");
    } catch {
      const mock = await mockGenerateReview(business.name, stars, selectedTags);
      setDrafts(mock.drafts);
      setSelectedDraftId(mock.drafts[0].draft_id);
      setReviewText(mock.drafts[0].text);
      setUsedMock(true);
      setStep("edit");
    } finally {
      setGenerating(false);
    }
  }

  function handleDraftSelect(draft) {
    setSelectedDraftId(draft.draft_id);
    setReviewText(draft.text);
  }

  async function handleRegenerate() {
    if (usedMock || !selectedDraftId) return;
    setGenerating(true);
    try {
      const result = await regenerateReview(selectedDraftId);
      setReviewText(result.text);
      setDrafts((prev) =>
        prev.map((d) =>
          d.draft_id === selectedDraftId ? { ...d, text: result.text } : d
        )
      );
    } catch (err) {
      setToast(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handlePostToGoogle() {
    try {
      await navigator.clipboard.writeText(reviewText);
    } catch {
      /* clipboard may fail on some browsers */
    }

    if (selectedDraftId) {
      try {
        await reviewAction(selectedDraftId, reviewText, "posted_to_google");
      } catch (err) {
        console.error("Failed to log review action:", err);
        /* analytics optional */
      }
    }

    setToast("Copied! Paste it in Google Reviews");
    window.open(business.google_review_url, "_blank");
    setStep("done");
  }

  async function handlePrivateFeedback() {
    if (selectedDraftId) {
      try {
        await reviewAction(selectedDraftId, reviewText, "sent_private_feedback");
      } catch (err) {
        console.error("Failed to log private feedback action:", err);
        /* fall through */
      }
    }

    try {
      await sendPrivateFeedback(businessId, stars, reviewText);
    } catch (err) {
      console.error("Failed to send private feedback:", err);
      /* still show success to customer */
    }

    setStep("done");
  }

  if (loading) {
    return (
      <div className="page page-center">
        <div className="loading">
          <div className="spinner" />
          <p className="subtitle">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="page page-center">
        <h1>Not found</h1>
        <p className="subtitle">{error || "This business doesn't exist."}</p>
      </div>
    );
  }

  const initial = business.name.charAt(0).toUpperCase();

  return (
    <div className="page">
      <div className="page-content">
      <div className="step-indicator">
        {STEPS.filter((s) => s !== "generating").map((s, i) => (
          <div
            key={s}
            className={`step-dot ${i <= Math.min(stepIndex, 3) ? "active" : ""}`}
          />
        ))}
      </div>

      <div className="logo-circle">
        {business.logo_url ? (
          <img src={business.logo_url} alt={business.name} />
        ) : (
          initial
        )}
      </div>
      <h1>{business.name}</h1>

      {step === "rate" && (
        <>
          <p className="subtitle">How was your visit?</p>
          <StarSelector value={stars} onChange={handleStarSelect} />
        </>
      )}

      {step === "tags" && (
        <>
          <p className="subtitle">Anything stand out? (optional)</p>
          <TagSelector
            options={business.tag_options}
            suggested={suggestedTags}
            suggestedLoading={suggestedLoading}
            selected={selectedTags}
            onToggle={toggleTag}
          />
          <div className="spacer" />
          <button className="btn btn-primary" onClick={handleGenerate}>
            Generate my review
          </button>
          <button className="btn btn-secondary" onClick={() => setStep("rate")}>
            Back
          </button>
        </>
      )}

      {step === "generating" && (
        <div className="loading">
          <div className="spinner" />
          <p className="subtitle">Writing your review…</p>
        </div>
      )}

      {step === "edit" && (
        <>
          <ReviewEditor
            drafts={drafts}
            selectedDraftId={selectedDraftId}
            text={reviewText}
            stars={stars}
            generating={generating}
            onDraftSelect={handleDraftSelect}
            onTextChange={setReviewText}
            onRegenerate={handleRegenerate}
            onPostToGoogle={handlePostToGoogle}
            onPrivateFeedback={handlePrivateFeedback}
          />
        </>
      )}

      {step === "done" && (
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h2>Thank you!</h2>
          <p className="subtitle">Your feedback means a lot.</p>
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
}
