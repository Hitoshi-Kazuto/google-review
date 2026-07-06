export default function TagSelector({
  options,
  suggested = [],
  suggestedLoading = false,
  selected,
  onToggle,
}) {
  const hasOptions = options?.length > 0;
  const hasSuggested = suggested.length > 0;

  return (
    <>
      {hasOptions && (
        <>
          <p className="tag-section-label">From the business</p>
          <div className="tags-grid">
            {options.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${selected.includes(tag) ? "selected" : ""}`}
                onClick={() => onToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </>
      )}

      {(suggestedLoading || hasSuggested) && (
        <>
          <p className="tag-section-label">
            {suggestedLoading ? "Finding more ideas…" : "Suggested for you"}
          </p>
          {suggestedLoading ? (
            <div className="tags-loading">
              <div className="spinner" style={{ width: 24, height: 24 }} />
            </div>
          ) : (
            <div className="tags-grid">
              {suggested.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-chip tag-chip-suggested ${selected.includes(tag) ? "selected" : ""}`}
                  onClick={() => onToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {!hasOptions && !suggestedLoading && !hasSuggested && (
        <p className="subtitle">No tags yet — tap below to continue.</p>
      )}
    </>
  );
}
