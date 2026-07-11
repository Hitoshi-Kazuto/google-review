import { RefreshCw, Send, MessageSquare } from "lucide-react";

const GOOGLE_MAX = 4096;

export default function ReviewEditor({
  drafts,
  selectedDraftId,
  text,
  stars,
  generating,
  onDraftSelect,
  onTextChange,
  onRegenerate,
  onPostToGoogle,
  onPrivateFeedback,
}) {
  const charCount = text.length;
  const toneHint =
    stars >= 4
      ? "Sounds enthusiastic — feel free to tweak!"
      : stars === 3
        ? "Balanced tone — edit as you like."
        : "Constructive tone — honest feedback.";

  return (
    <>
      <p className="subtitle">{toneHint}</p>

      {drafts.length > 1 && (
        <>
          <h2>Pick a draft</h2>
          <div className="draft-list">
            {drafts.map((draft) => (
              <button
                key={draft.draft_id}
                type="button"
                className={`draft-option ${draft.draft_id === selectedDraftId ? "selected" : ""}`}
                onClick={() => onDraftSelect(draft)}
              >
                {draft.text}
              </button>
            ))}
          </div>
        </>
      )}

      <h2>Edit your review</h2>
      <textarea
        className="review-editor"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        maxLength={GOOGLE_MAX}
        placeholder="Your review…"
      />
      <div className={`char-count ${charCount > 3500 ? "warn" : ""}`}>
        {charCount} / {GOOGLE_MAX}
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={onRegenerate}
        disabled={generating}
        style={{ marginTop: 0, marginBottom: 10 }}
      >
        <RefreshCw size={18} className={generating ? "spin-icon" : ""} />
        {generating ? "Regenerating…" : "Regenerate this draft"}
      </button>

      <div className="spacer" />

      {stars <= 2 ? (
        <>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onPrivateFeedback}
            disabled={!text.trim()}
          >
            <MessageSquare size={18} />
            Send private feedback
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onPostToGoogle}
            disabled={!text.trim()}
          >
            <Send size={18} />
            Post to Google anyway
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-google"
            onClick={onPostToGoogle}
            disabled={!text.trim()}
          >
            <Send size={18} />
            Post to Google
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onPrivateFeedback}
            disabled={!text.trim()}
          >
            <MessageSquare size={18} />
            Send private feedback instead
          </button>
        </>
      )}
    </>
  );
}
