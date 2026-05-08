import type { BlogContentBlock } from "@/lib/contracts/blog";

function getSafeExternalRel(url: string) {
  return url.startsWith("http") ? "noreferrer" : undefined;
}

export function BlogBlocks({ blocks }: Readonly<{ blocks: readonly BlogContentBlock[] }>) {
  return (
    <>
      {blocks.map((block) => {
        if (block.type === "paragraph") {
          return <p key={block.id}>{block.text}</p>;
        }

        if (block.type === "heading") {
          return block.level === 3 ? <h3 key={block.id}>{block.text}</h3> : <h2 key={block.id}>{block.text}</h2>;
        }

        if (block.type === "list") {
          const children = block.items.map((item) => <li key={`${block.id}-${item}`}>{item}</li>);

          return block.style === "ordered" ? <ol key={block.id}>{children}</ol> : <ul key={block.id}>{children}</ul>;
        }

        if (block.type === "quote") {
          return (
            <blockquote key={block.id}>
              <p>{block.text}</p>
              {block.cite ? <cite>{block.cite}</cite> : null}
            </blockquote>
          );
        }

        if (block.type === "image") {
          return (
            <figure key={block.id}>
              {block.url ? <img alt={block.altText} loading="lazy" src={block.url} /> : null}
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          );
        }

        if (block.type === "embed") {
          return (
            <p key={block.id}>
              <a href={block.url} rel={getSafeExternalRel(block.url)}>
                {block.title || block.url}
              </a>
            </p>
          );
        }

        return (
          <p key={block.id}>
            <a href={block.url} rel={getSafeExternalRel(block.url)}>
              {block.label}
            </a>
          </p>
        );
      })}
    </>
  );
}
