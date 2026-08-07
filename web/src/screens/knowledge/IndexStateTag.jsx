import { useT } from '../../i18n/index.js';

/** The index states the store returns, mapped to their dictionary keys. */
const INDEX_LABEL_KEYS = {
  indexed: 'kb.indexIndexed',
  diproses: 'kb.indexProcessing',
  'menunggu-tinjauan': 'kb.indexAwaitingReview',
  dikecualikan: 'kb.indexExcluded',
  antre: 'kb.indexQueued',
};

/**
 * One document's index state, as the table and the content panel both show it.
 *
 * `retrievable` decides the styling rather than the state name, because the
 * label alone would let "menunggu tinjauan" read as searchable. An unmapped
 * state falls back to the raw value: a store that invents a sixth state should
 * show it, not vanish it.
 */
export function IndexStateTag({ state, retrievable = false }) {
  const t = useT();

  return (
    <span className={`tag ${retrievable ? 'tag-accent' : 'tag-outline'}`}>
      {INDEX_LABEL_KEYS[state] ? t(INDEX_LABEL_KEYS[state]) : state}
    </span>
  );
}
