import { Fragment } from 'react';

import { useT } from './LocaleContext.jsx';

/**
 * A translated string with React nodes in some of its holes.
 *
 * design/SCREENS.md emphasises particular terms inside running copy — "baris
 * bertanda **terukur**", "klausa di atas adalah **draft untuk ditinjau
 * manusia**". Splitting those into three keys per sentence would leave the
 * translator assembling grammar out of fragments, and English does not put the
 * emphasised term in the same place Indonesian does.
 *
 * So the whole sentence stays one message with `{named}` holes, and the caller
 * says what goes in them:
 *
 *   <Rich k="kb.docsNote" values={{ indexed: <strong>{t('kb.indexIndexed')}</strong> }} />
 *
 * A hole with no value renders as the literal `{name}`, the same visible failure
 * `interpolate` gives for plain strings.
 */
export function Rich({ k, values = {}, as: Tag = Fragment, ...rest }) {
  const t = useT();
  const parts = splitTemplate(t(k));

  const children = parts.map((part, index) =>
    part.name === null ? (
      part.text
    ) : (
      <Fragment key={`${part.name}-${index}`}>
        {Object.prototype.hasOwnProperty.call(values, part.name) ? values[part.name] : `{${part.name}}`}
      </Fragment>
    ),
  );

  return Tag === Fragment ? <>{children}</> : <Tag {...rest}>{children}</Tag>;
}

/**
 * `"a {x} b"` → `[{text:'a '}, {name:'x'}, {text:' b'}]`.
 *
 * Exported for its own test: the interesting cases are a hole at the very start,
 * two adjacent holes, and a brace that is not a hole.
 */
export function splitTemplate(template) {
  const parts = [];
  const pattern = /\{(\w+)\}/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(template)) !== null) {
    if (match.index > cursor) {
      parts.push({ text: template.slice(cursor, match.index), name: null });
    }
    parts.push({ text: null, name: match[1] });
    cursor = match.index + match[0].length;
  }

  if (cursor < template.length) parts.push({ text: template.slice(cursor), name: null });

  return parts;
}
