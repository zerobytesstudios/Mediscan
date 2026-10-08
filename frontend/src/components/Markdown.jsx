/**
 * Minimal markdown renderer for AI responses (headings, bold, lists).
 * Avoids adding a heavy dependency for a small MVP requirement.
 */
function renderInline(text, keyPrefix) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`${keyPrefix}-b-${index++}`} className="font-semibold text-slate-900">
        {match[0].slice(2, -2)}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function Markdown({ content }) {
  if (!content) return null;
  const lines = content.split('\n');
  const blocks = [];
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${key}`} className="my-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item, `${key}-${index}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(index);
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(index);
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#+\s*/, '');
      const Tag = level <= 2 ? 'h4' : 'h5';
      blocks.push(
        <Tag
          key={index}
          className="mt-5 mb-2 text-base font-semibold text-slate-900 first:mt-0"
        >
          {renderInline(text, `h-${index}`)}
        </Tag>
      );
      return;
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      flushList(index);
      blocks.push(
        <h4 key={index} className="mt-5 mb-2 text-base font-semibold text-slate-900 first:mt-0">
          {renderInline(trimmed.replace(/^#+\s*/, ''), `h-${index}`)}
        </h4>
      );
      return;
    }

    if (/^([-*•]|\d+\.)\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^([-*•]|\d+\.)\s+/, ''));
      return;
    }

    flushList(index);
    blocks.push(
      <p key={index} className="my-2 text-sm leading-relaxed text-slate-700">
        {renderInline(trimmed, `p-${index}`)}
      </p>
    );
  });

  flushList('last');

  return <div>{blocks}</div>;
}
