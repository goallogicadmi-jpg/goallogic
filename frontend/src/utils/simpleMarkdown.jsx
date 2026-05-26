/** Renderizado ligero de markdown (títulos, listas, negrita). */

export function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function parseMarkdown(content) {
  const lines = String(content || '').trim().split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() });
      index += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
      index += 1;
      continue;
    }
    if (line.startsWith('- ')) {
      const items = [];
      while (index < lines.length && lines[index].trim().startsWith('- ')) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    blocks.push({ type: 'p', text: line });
    index += 1;
  }
  return blocks;
}

export function SimpleMarkdown({ content, className = 'simple-markdown' }) {
  const blocks = parseMarkdown(content);
  if (!blocks.length) return null;

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        if (block.type === 'h1') {
          return (
            <h3 key={`h1-${blockIndex}`} className="simple-markdown__h1">
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.type === 'h2') {
          return (
            <h4 key={`h2-${blockIndex}`} className="simple-markdown__h2">
              {renderInline(block.text)}
            </h4>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={`ul-${blockIndex}`} className="simple-markdown__ul">
              {block.items.map((item) => (
                <li key={item.slice(0, 40)}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${blockIndex}`} className="simple-markdown__p">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
