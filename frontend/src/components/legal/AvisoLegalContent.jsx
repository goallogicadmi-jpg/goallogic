import avisoLegalContent, {
  avisoLegalContactSection,
  SUPPORT_EMAIL,
} from '../../content/avisoLegalContent';
import './avisoLegal.css';

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function parseMarkdown(content) {
  const lines = content.trim().split('\n');
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

const legalBlocks = parseMarkdown(avisoLegalContent);

export default function AvisoLegalContent({ variant = 'page' }) {
  const className =
    variant === 'modal' ? 'aviso-legal aviso-legal--modal' : 'aviso-legal aviso-legal--page';

  return (
    <article className={className}>
      {legalBlocks.map((block, blockIndex) => {
        if (block.type === 'h1') {
          return (
            <h1 key={`h1-${blockIndex}`} className="aviso-legal__title">
              {renderInline(block.text)}
            </h1>
          );
        }

        if (block.type === 'h2') {
          return (
            <h2 key={`h2-${blockIndex}`} className="aviso-legal__section-title">
              {renderInline(block.text)}
            </h2>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={`ul-${blockIndex}`} className="aviso-legal__list">
              {block.items.map((item) => (
                <li key={item.slice(0, 40)} className="aviso-legal__list-item">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${blockIndex}`} className="aviso-legal__paragraph">
            {renderInline(block.text)}
          </p>
        );
      })}
      {variant === 'page' ? (
        <section className="aviso-legal__section">
          <h2 className="aviso-legal__section-title">{avisoLegalContactSection.title}</h2>
          <p className="aviso-legal__paragraph">
            {avisoLegalContactSection.text}{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="aviso-legal__email-link">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      ) : null}
    </article>
  );
}
