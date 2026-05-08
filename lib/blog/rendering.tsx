import type { BlogContentBlock } from "@/lib/contracts/blog";

export function getBlogSafeHref(value: string | null | undefined) {
  const href = value?.trim();

  if (!href) {
    return null;
  }

  if (href.startsWith("/") && !href.startsWith("//")) {
    return href;
  }

  try {
    const url = new URL(href);

    if (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "mailto:" ||
      url.protocol === "tel:"
    ) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

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
          const href = getBlogSafeHref(block.url);

          return (
            <p key={block.id}>
              {href ? (
                <a href={href} rel={getSafeExternalRel(href)}>
                  {block.title || href}
                </a>
              ) : (
                block.title || block.url
              )}
            </p>
          );
        }

        const href = getBlogSafeHref(block.url);

        return (
          <p key={block.id}>
            {href ? (
              <a href={href} rel={getSafeExternalRel(href)}>
                {block.label}
              </a>
            ) : (
              block.label
            )}
          </p>
        );
      })}
    </>
  );
}
