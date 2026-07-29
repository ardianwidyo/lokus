import { useEffect, useRef } from 'react';

/** Stars as text, per design/UI-GUIDELINES.md "Kartu review". */
export function Stars({ rating }) {
  return (
    <span className="stars" aria-label={`${rating} dari 5 bintang`}>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  );
}

/**
 * The 320px list. Rows are real buttons in a listbox, so the keyboard shortcuts
 * the footer advertises (↑ ↓ ⏎ E) are the same affordance screen readers get,
 * rather than a mouse-only list with key handlers bolted on.
 */
export function ReviewList({ rows, selectedId, onSelect, onApprove, onEdit }) {
  const listRef = useRef(null);
  const selectedIndex = rows.findIndex((row) => row.id === selectedId);

  useEffect(() => {
    const node = listRef.current?.querySelector('[aria-selected="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const handleKeyDown = (event) => {
    if (rows.length === 0) return;

    const move = (delta) => {
      event.preventDefault();
      const next = (selectedIndex + delta + rows.length) % rows.length;
      onSelect(rows[next].id);
    };

    switch (event.key) {
      case 'ArrowDown':
        return move(1);
      case 'ArrowUp':
        return move(-1);
      case 'Enter':
        event.preventDefault();
        return onApprove?.(selectedId);
      case 'e':
      case 'E':
        event.preventDefault();
        return onEdit?.(selectedId);
      default:
        return undefined;
    }
  };

  return (
    <ul
      className="review-list"
      role="listbox"
      aria-label="Daftar review"
      tabIndex={0}
      ref={listRef}
      onKeyDown={handleKeyDown}
    >
      {rows.map((row) => (
        <li key={row.id} role="none">
          <button
            type="button"
            role="option"
            aria-selected={row.id === selectedId}
            className={`review-row${row.id === selectedId ? ' is-active' : ''}${
              row.rating >= 5 ? ' is-resolved' : ''
            }`}
            onClick={() => onSelect(row.id)}
            tabIndex={-1}
          >
            <span className="review-row-top">
              <Stars rating={row.rating} />
              <span className="review-row-time">{row.relative}</span>
            </span>
            <span className="review-row-outlet">{row.outletName}</span>
            <span className="review-row-snippet">{row.text}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
