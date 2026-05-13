"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type KeyboardEvent,
  startTransition,
  useEffect,
  useMemo,
  useState
} from "react";

import type {
  BlogContentBlock,
  BlogPostDetail,
  BlogPostSavePayload,
  BlogPostStatus
} from "@/lib/contracts/blog";
import { normalizeBlogSlug, validateBlogPostForPublish } from "@/lib/contracts/blog";

import styles from "./blog-post-editor.module.css";

type BlogPostEditorProps = {
  initialPost: BlogPostDetail;
  tagSuggestions: Array<{ name: string; slug: string; count: number }>;
};

type BlogPostMutationResponse =
  | {
      ok: true;
      post: BlogPostDetail;
    }
  | {
      ok: false;
      message: string;
    };

type BlogPostDeleteResponse =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

type BlogUploadResponse =
  | {
      ok: true;
      upload: {
        mediaId: string;
        uploadUrl: string;
        publicUrl: string | null;
      };
    }
  | {
      ok: false;
      message: string;
    };

type Notice = {
  message: string;
  tone: "neutral" | "success" | "error";
};

type AutosavePayload = {
  version: 1;
  savedAt: number;
  baseUpdatedAt: string;
  draft: BlogPostSavePayload;
};

const acceptedImageTypes = "image/jpeg,image/png,image/webp";
const blockAddOptions: Array<{ type: BlogContentBlock["type"]; label: string }> = [
  { type: "paragraph", label: "Paragrafo" },
  { type: "heading", label: "H2" },
  { type: "list", label: "Lista" },
  { type: "quote", label: "Citação" },
  { type: "image", label: "Imagem" },
  { type: "embed", label: "Embed" },
  { type: "button", label: "Botao" }
];
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short"
});

function formatDate(value: string | null) {
  if (!value) {
    return "Nao publicado";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Data indefinida" : dateFormatter.format(date);
}

function createDraftFromPost(post: BlogPostDetail): BlogPostSavePayload {
  return {
    title: post.title,
    slug: post.slug,
    description: post.description,
    authorName: post.authorName,
    coverMediaId: post.coverMediaId,
    coverAltText: post.coverAltText,
    coverCaption: post.coverCaption,
    isFeatured: post.isFeatured,
    contentBlocks: post.contentBlocks,
    tags: post.tags.map((tag) => tag.name),
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    canonicalUrlOverride: post.canonicalUrlOverride,
    noindex: post.noindex,
    internalKeywords: post.internalKeywords,
    socialTitle: post.socialTitle,
    socialDescription: post.socialDescription,
    socialMediaId: post.socialMediaId
  };
}

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function shouldUseAutomaticSlug(post: Pick<BlogPostDetail, "slug" | "title">) {
  return post.slug.startsWith("rascunho-") || post.slug === normalizeBlogSlug(post.title);
}

function getBlockId() {
  return globalThis.crypto?.randomUUID?.() ?? `block-${Date.now()}`;
}

function createBlock(type: BlogContentBlock["type"]): BlogContentBlock {
  const id = getBlockId();

  if (type === "heading") {
    return { id, type, level: 2, text: "Novo intertitulo" };
  }

  if (type === "list") {
    return { id, type, style: "unordered", items: ["Novo item"] };
  }

  if (type === "quote") {
    return { id, type, text: "Citação do post" };
  }

  if (type === "image") {
    return { id, type, mediaId: "", url: "", altText: "", caption: "" };
  }

  if (type === "embed") {
    return { id, type, provider: "youtube", url: "", title: "" };
  }

  if (type === "button") {
    return { id, type, label: "Abrir link", url: "" };
  }

  return { id, type: "paragraph", text: "Novo paragrafo." };
}

function getBlockLabel(block: BlogContentBlock) {
  if (block.type === "heading") {
    return `H${block.level}`;
  }

  if (block.type === "list") {
    return block.style === "ordered" ? "Lista ordenada" : "Lista";
  }

  if (block.type === "embed") {
    return block.provider === "instagram" ? "Instagram" : "YouTube";
  }

  const labels: Record<BlogContentBlock["type"], string> = {
    paragraph: "Paragrafo",
    heading: "Intertitulo",
    list: "Lista",
    quote: "Citação",
    image: "Imagem",
    embed: "Embed",
    button: "Botao"
  };

  return labels[block.type];
}

function getFileAltText(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function getAutosaveKey(postId: string) {
  return `mmmma-blog-draft:${postId}`;
}

async function readJsonResponse<TPayload>(response: Response): Promise<TPayload | null> {
  return response.json().catch(() => null) as Promise<TPayload | null>;
}

function getResponseErrorMessage(
  payload: { ok: false; message: string } | null,
  fallback: string
) {
  return payload?.message || fallback;
}

export function BlogPostEditor({
  initialPost,
  tagSuggestions
}: Readonly<BlogPostEditorProps>) {
  const router = useRouter();
  const [currentPost, setCurrentPost] = useState(initialPost);
  const [draft, setDraft] = useState<BlogPostSavePayload>(() => createDraftFromPost(initialPost));
  const [isSlugAutomatic, setIsSlugAutomatic] = useState(() => shouldUseAutomaticSlug(initialPost));
  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [notice, setNotice] = useState<Notice>({
    tone: "neutral",
    message: "Rascunho carregado."
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAutosaveReady, setIsAutosaveReady] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(initialPost.coverUrl);
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const autosaveKey = getAutosaveKey(initialPost.id);
  const suggestedTags = useMemo(() => {
    const used = new Set(draft.tags.map(normalizeKey));

    return tagSuggestions.filter((tag) => !used.has(normalizeKey(tag.name))).slice(0, 12);
  }, [draft.tags, tagSuggestions]);
  const statusLabel = currentPost.status === "published" ? "Publicado" : "Rascunho";
  const wordCount = useMemo(() => {
    const text = draft.contentBlocks
      .flatMap((block) => {
        if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") {
          return block.text;
        }

        if (block.type === "list") {
          return block.items.join(" ");
        }

        return "";
      })
      .join(" ");

    return text.trim().match(/\S+/g)?.length ?? 0;
  }, [draft.contentBlocks]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(autosaveKey);

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AutosavePayload>;

        if (parsed.version === 1 && parsed.draft) {
          if (!parsed.baseUpdatedAt || parsed.baseUpdatedAt !== initialPost.updatedAt) {
            setNotice({
              tone: "neutral",
              message: "Autosave local ignorado porque o post no servidor foi atualizado depois."
            });
            return;
          }

          setDraft(parsed.draft);
          setIsSlugAutomatic(shouldUseAutomaticSlug(parsed.draft));
          setNotice({
            tone: "neutral",
            message: `Autosave local recuperado em ${formatDate(new Date(parsed.savedAt ?? Date.now()).toISOString())}.`
          });
        }
      }
    } catch {
      setNotice({ tone: "neutral", message: "Rascunho carregado." });
    } finally {
      setIsAutosaveReady(true);
    }
  }, [autosaveKey]);

  useEffect(() => {
    if (!isAutosaveReady) {
      return;
    }

    try {
      const payload: AutosavePayload = {
        version: 1,
        draft,
        baseUpdatedAt: currentPost.updatedAt,
        savedAt: Date.now()
      };

      window.localStorage.setItem(autosaveKey, JSON.stringify(payload));
    } catch {
      // Autosave is a convenience layer; API persistence remains authoritative.
    }
  }, [autosaveKey, currentPost.updatedAt, draft, isAutosaveReady]);

  function updateDraft(patch: Partial<BlogPostSavePayload>) {
    setDraft((current) => ({
      ...current,
      ...patch
    }));
  }

  function updateTitle(title: string) {
    setDraft((current) => ({
      ...current,
      title,
      slug: isSlugAutomatic ? normalizeBlogSlug(title) : current.slug
    }));
  }

  function updateSlug(slug: string) {
    setIsSlugAutomatic(false);
    updateDraft({ slug: normalizeBlogSlug(slug) });
  }

  function setBlocks(updater: (blocks: BlogContentBlock[]) => BlogContentBlock[]) {
    setDraft((current) => ({
      ...current,
      contentBlocks: updater(current.contentBlocks)
    }));
  }

  function updateBlock(blockId: string, updater: (block: BlogContentBlock) => BlogContentBlock) {
    setBlocks((blocks) => blocks.map((block) => (block.id === blockId ? updater(block) : block)));
  }

  function addBlock(type: BlogContentBlock["type"]) {
    setBlocks((blocks) => [...blocks, createBlock(type)]);
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setBlocks((blocks) => {
      const index = blocks.findIndex((block) => block.id === blockId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) {
        return blocks;
      }

      const nextBlocks = [...blocks];
      const [block] = nextBlocks.splice(index, 1);
      nextBlocks.splice(nextIndex, 0, block);

      return nextBlocks;
    });
  }

  function removeBlock(blockId: string) {
    setBlocks((blocks) => blocks.filter((block) => block.id !== blockId));
  }

  function addTag(name: string) {
    const normalizedName = name.trim().replace(/\s+/g, " ");

    if (!normalizedName) {
      return;
    }

    setDraft((current) => {
      const used = new Set(current.tags.map(normalizeKey));

      if (used.has(normalizeKey(normalizedName))) {
        return current;
      }

      return {
        ...current,
        tags: [...current.tags, normalizedName]
      };
    });
    setTagInput("");
  }

  function removeTag(name: string) {
    setDraft((current) => ({
      ...current,
      tags: current.tags.filter((tag) => normalizeKey(tag) !== normalizeKey(name))
    }));
  }

  function addKeyword(name: string) {
    const normalizedName = name.trim().replace(/\s+/g, " ");

    if (!normalizedName) {
      return;
    }

    setDraft((current) => {
      const used = new Set(current.internalKeywords.map(normalizeKey));

      if (used.has(normalizeKey(normalizedName))) {
        return current;
      }

      return {
        ...current,
        internalKeywords: [...current.internalKeywords, normalizedName]
      };
    });
    setKeywordInput("");
  }

  function removeKeyword(name: string) {
    setDraft((current) => ({
      ...current,
      internalKeywords: current.internalKeywords.filter((keyword) => normalizeKey(keyword) !== normalizeKey(name))
    }));
  }

  function handleTokenKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    value: string,
    onAdd: (value: string) => void
  ) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      onAdd(value);
    }
  }

  async function uploadImage(file: File, scope: string) {
    const response = await fetch("/api/admin/blog/uploads", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        byteSize: file.size,
        scope
      }),
      cache: "no-store"
    });
    const payload = await readJsonResponse<BlogUploadResponse>(response);

    if (!response.ok) {
      throw new Error(
        getResponseErrorMessage(
          payload && !payload.ok ? payload : null,
          "Nao foi possivel preparar o upload."
        )
      );
    }

    if (!payload) {
      throw new Error("Nao foi possivel preparar o upload.");
    }

    if (!payload.ok) {
      throw new Error(payload.message);
    }

    let uploadResponse: Response;

    try {
      uploadResponse = await fetch(payload.upload.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type
        },
        body: file
      });
    } catch {
      throw new Error("Nao foi possivel enviar a imagem para o R2. Verifique o CORS do bucket.");
    }

    if (!uploadResponse.ok) {
      throw new Error("Nao foi possivel enviar a imagem para o R2.");
    }

    return payload.upload;
  }

  async function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice({ tone: "neutral", message: "Enviando imagem de capa..." });

    try {
      const upload = await uploadImage(file, draft.slug || currentPost.id);
      const previewUrl = upload.publicUrl ?? URL.createObjectURL(file);
      setCoverPreviewUrl(previewUrl);
      updateDraft({
        coverMediaId: upload.mediaId,
        coverAltText: draft.coverAltText || getFileAltText(file.name)
      });
      setNotice({ tone: "success", message: "Imagem de capa enviada." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel enviar a capa."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBlockImageUpload(blockId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || isSaving) {
      return;
    }

    setUploadingBlockId(blockId);
    setNotice({ tone: "neutral", message: "Enviando imagem do corpo..." });

    try {
      const upload = await uploadImage(file, draft.slug || currentPost.id);
      const fallbackPreviewUrl = upload.publicUrl ?? URL.createObjectURL(file);

      updateBlock(blockId, (block) =>
        block.type === "image"
          ? {
              ...block,
              mediaId: upload.mediaId,
              url: fallbackPreviewUrl,
              altText: block.altText || getFileAltText(file.name)
            }
          : block
      );
      setNotice({ tone: "success", message: "Imagem do corpo enviada." });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel enviar a imagem."
      });
    } finally {
      setUploadingBlockId(null);
    }
  }

  async function persistDraft(silent = false) {
    const response = await fetch(`/api/admin/blog/posts/${initialPost.id}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(draft),
      cache: "no-store"
    });
    const payload = await readJsonResponse<BlogPostMutationResponse>(response);

    if (!response.ok) {
      throw new Error(
        getResponseErrorMessage(
          payload && !payload.ok ? payload : null,
          "Nao foi possivel salvar o post."
        )
      );
    }

    if (!payload) {
      throw new Error("Nao foi possivel salvar o post.");
    }

    if (!payload.ok) {
      throw new Error(payload.message);
    }

    setCurrentPost(payload.post);
    setDraft(createDraftFromPost(payload.post));
    setIsSlugAutomatic(shouldUseAutomaticSlug(payload.post));
    setCoverPreviewUrl(payload.post.coverUrl);
    window.localStorage.removeItem(autosaveKey);

    if (!silent) {
      setNotice({ tone: "success", message: "Post salvo." });
    }

    startTransition(() => {
      router.refresh();
    });

    return payload.post;
  }

  async function savePost() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice({ tone: "neutral", message: "Salvando post..." });

    try {
      await persistDraft();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel salvar o post."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function runPostAction(action: "publish" | "unpublish") {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice({
      tone: "neutral",
      message: action === "publish" ? "Salvando e publicando..." : "Despublicando post..."
    });

    try {
      if (action === "publish") {
        const validation = validateBlogPostForPublish({
          title: draft.title,
          slug: draft.slug,
          description: draft.description,
          authorName: draft.authorName,
          coverMediaId: draft.coverMediaId,
          coverAltText: draft.coverAltText,
          contentBlocks: draft.contentBlocks,
          tags: draft.tags
        });

        if (!validation.ok) {
          throw new Error(validation.message);
        }

        await persistDraft(true);
      }

      const response = await fetch(`/api/admin/blog/posts/${initialPost.id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action }),
        cache: "no-store"
      });
      const payload = await readJsonResponse<BlogPostMutationResponse>(response);

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(
            payload && !payload.ok ? payload : null,
            "Nao foi possivel atualizar o post."
          )
        );
      }

      if (!payload) {
        throw new Error("Nao foi possivel atualizar o post.");
      }

      if (!payload.ok) {
        throw new Error(payload.message);
      }

      setCurrentPost(payload.post);
      setDraft(createDraftFromPost(payload.post));
      setIsSlugAutomatic(shouldUseAutomaticSlug(payload.post));
      setCoverPreviewUrl(payload.post.coverUrl);
      window.localStorage.removeItem(autosaveKey);
      setNotice({
        tone: "success",
        message: action === "publish" ? "Post publicado." : "Post voltou para rascunho."
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel atualizar o post."
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deletePost() {
    if (isSaving) {
      return;
    }

    const confirmed = window.confirm(
      currentPost.status === "published"
        ? "Excluir este post publicado? Ele sairá do blog imediatamente."
        : "Excluir este rascunho?"
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setNotice({ tone: "neutral", message: "Excluindo post..." });

    try {
      const response = await fetch(`/api/admin/blog/posts/${initialPost.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      });
      const payload = await readJsonResponse<BlogPostDeleteResponse>(response);

      if (!response.ok) {
        throw new Error(
          getResponseErrorMessage(
            payload && !payload.ok ? payload : null,
            "Nao foi possivel excluir o post."
          )
        );
      }

      if (!payload) {
        throw new Error("Nao foi possivel excluir o post.");
      }

      if (!payload.ok) {
        throw new Error(payload.message);
      }

      window.localStorage.removeItem(autosaveKey);
      router.push("/admin/blog");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Nao foi possivel excluir o post."
      });
      setIsSaving(false);
    }
  }

  function renderBlockEditor(block: BlogContentBlock, index: number) {
    return (
      <article className={styles.block} key={block.id}>
        <div className={styles.blockHeader}>
          <span>{getBlockLabel(block)}</span>
          <div className={styles.blockActions}>
            <button disabled={index === 0} onClick={() => moveBlock(block.id, -1)} type="button">
              Subir
            </button>
            <button
              disabled={index === draft.contentBlocks.length - 1}
              onClick={() => moveBlock(block.id, 1)}
              type="button"
            >
              Descer
            </button>
            <button onClick={() => removeBlock(block.id)} type="button">
              Remover
            </button>
          </div>
        </div>

        {block.type === "paragraph" ? (
          <label className={styles.field}>
            <span>Texto</span>
            <textarea
              onChange={(event) =>
                updateBlock(block.id, (current) =>
                  current.type === "paragraph" ? { ...current, text: event.target.value } : current
                )
              }
              value={block.text}
            />
          </label>
        ) : null}

        {block.type === "heading" ? (
          <div className={styles.inlineGrid}>
            <label className={styles.field}>
              <span>Nivel</span>
              <select
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "heading"
                      ? { ...current, level: Number(event.target.value) === 3 ? 3 : 2 }
                      : current
                  )
                }
                value={block.level}
              >
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>Texto</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "heading" ? { ...current, text: event.target.value } : current
                  )
                }
                value={block.text}
              />
            </label>
          </div>
        ) : null}

        {block.type === "list" ? (
          <div className={styles.blockStack}>
            <label className={styles.field}>
              <span>Estilo</span>
              <select
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "list"
                      ? {
                          ...current,
                          style: event.target.value === "ordered" ? "ordered" : "unordered"
                        }
                      : current
                  )
                }
                value={block.style}
              >
                <option value="unordered">Lista simples</option>
                <option value="ordered">Lista numerada</option>
              </select>
            </label>
            {block.items.map((item, itemIndex) => (
              <div className={styles.listItemRow} key={`${block.id}-${itemIndex}`}>
                <input
                  onChange={(event) =>
                    updateBlock(block.id, (current) =>
                      current.type === "list"
                        ? {
                            ...current,
                            items: current.items.map((currentItem, currentIndex) =>
                              currentIndex === itemIndex ? event.target.value : currentItem
                            )
                          }
                        : current
                    )
                  }
                  value={item}
                />
                <button
                  onClick={() =>
                    updateBlock(block.id, (current) =>
                      current.type === "list"
                        ? {
                            ...current,
                            items: current.items.filter((_, currentIndex) => currentIndex !== itemIndex)
                          }
                        : current
                    )
                  }
                  type="button"
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              className={styles.secondaryButton}
              onClick={() =>
                updateBlock(block.id, (current) =>
                  current.type === "list" ? { ...current, items: [...current.items, "Novo item"] } : current
                )
              }
              type="button"
            >
              Adicionar item
            </button>
          </div>
        ) : null}

        {block.type === "quote" ? (
          <div className={styles.blockStack}>
            <label className={styles.field}>
              <span>Texto</span>
              <textarea
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "quote" ? { ...current, text: event.target.value } : current
                  )
                }
                value={block.text}
              />
            </label>
            <label className={styles.field}>
              <span>Credito</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "quote" ? { ...current, cite: event.target.value } : current
                  )
                }
                value={block.cite ?? ""}
              />
            </label>
          </div>
        ) : null}

        {block.type === "image" ? (
          <div className={styles.blockStack}>
            {block.url ? (
              <div className={styles.imagePreview}>
                <img alt={block.altText || "Imagem do post"} src={block.url} />
              </div>
            ) : null}
            <label className={styles.fileField}>
              <span>{uploadingBlockId === block.id ? "Enviando" : "Upload"}</span>
              <input
                accept={acceptedImageTypes}
                disabled={uploadingBlockId === block.id}
                onChange={(event) => handleBlockImageUpload(block.id, event)}
                type="file"
              />
            </label>
            <label className={styles.field}>
              <span>URL</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "image" ? { ...current, url: event.target.value } : current
                  )
                }
                value={block.url}
              />
            </label>
            <label className={styles.field}>
              <span>Alt text</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "image" ? { ...current, altText: event.target.value } : current
                  )
                }
                value={block.altText}
              />
            </label>
            <label className={styles.field}>
              <span>Legenda</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "image" ? { ...current, caption: event.target.value } : current
                  )
                }
                value={block.caption ?? ""}
              />
            </label>
          </div>
        ) : null}

        {block.type === "embed" ? (
          <div className={styles.inlineGrid}>
            <label className={styles.field}>
              <span>Fonte</span>
              <select
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "embed"
                      ? {
                          ...current,
                          provider: event.target.value === "instagram" ? "instagram" : "youtube"
                        }
                      : current
                  )
                }
                value={block.provider}
              >
                <option value="youtube">YouTube</option>
                <option value="instagram">Instagram</option>
              </select>
            </label>
            <label className={styles.field}>
              <span>URL</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "embed" ? { ...current, url: event.target.value } : current
                  )
                }
                value={block.url}
              />
            </label>
            <label className={`${styles.field} ${styles.fieldWide}`}>
              <span>Titulo</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "embed" ? { ...current, title: event.target.value } : current
                  )
                }
                value={block.title ?? ""}
              />
            </label>
          </div>
        ) : null}

        {block.type === "button" ? (
          <div className={styles.inlineGrid}>
            <label className={styles.field}>
              <span>Label</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "button" ? { ...current, label: event.target.value } : current
                  )
                }
                value={block.label}
              />
            </label>
            <label className={styles.field}>
              <span>URL</span>
              <input
                onChange={(event) =>
                  updateBlock(block.id, (current) =>
                    current.type === "button" ? { ...current, url: event.target.value } : current
                  )
                }
                value={block.url}
              />
            </label>
          </div>
        ) : null}
      </article>
    );
  }

  function renderPreviewBlock(block: BlogContentBlock) {
    if (block.type === "paragraph") {
      return <p key={block.id}>{block.text}</p>;
    }

    if (block.type === "heading") {
      return block.level === 3 ? <h3 key={block.id}>{block.text}</h3> : <h2 key={block.id}>{block.text}</h2>;
    }

    if (block.type === "list") {
      const items = block.items.map((item, index) => <li key={`${block.id}-${index}`}>{item}</li>);

      return block.style === "ordered" ? <ol key={block.id}>{items}</ol> : <ul key={block.id}>{items}</ul>;
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
          {block.url ? <img alt={block.altText} src={block.url} /> : null}
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }

    if (block.type === "embed") {
      return (
        <div className={styles.previewEmbed} key={block.id}>
          <span>{block.provider}</span>
          <strong>{block.title || block.url || "Embed sem título"}</strong>
        </div>
      );
    }

    if (block.type === "button") {
      return (
        <a className={styles.previewLink} href={block.url || "#"} key={block.id}>
          {block.label || "Abrir link"}
        </a>
      );
    }

    return null;
  }

  return (
    <section className={styles.editorShell}>
      <div className={styles.editorHeader}>
        <div>
          <Link className={styles.backLink} href="/admin/blog">
            Voltar
          </Link>
          <h1>{draft.title || "Novo post"}</h1>
          <p>{draft.description || "Descricao pendente."}</p>
        </div>

        <div className={styles.headerActions}>
          <span className={`${styles.status} ${styles[`status-${currentPost.status}`]}`}>
            {statusLabel}
          </span>
          {currentPost.status === "published" ? (
            <Link className={styles.ghostButton} href={`/blog/${currentPost.slug}`} target="_blank" rel="noreferrer">
              Publico
            </Link>
          ) : null}
          <button className={styles.ghostButton} onClick={() => setIsPreviewOpen(true)} type="button">
            Preview
          </button>
          <button className={styles.secondaryButton} disabled={isSaving} onClick={savePost} type="button">
            {isSaving ? "Salvando" : "Salvar"}
          </button>
          {currentPost.status === "published" ? (
            <button
              className={styles.secondaryButton}
              disabled={isSaving}
              onClick={() => runPostAction("unpublish")}
              type="button"
            >
              Despublicar
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              disabled={isSaving}
              onClick={() => runPostAction("publish")}
              type="button"
            >
              Publicar
            </button>
          )}
          <button className={styles.dangerButton} disabled={isSaving} onClick={deletePost} type="button">
            Excluir
          </button>
        </div>
      </div>

      <p
        aria-live={notice.tone === "error" ? "assertive" : "polite"}
        className={`${styles.notice} ${styles[`notice-${notice.tone}`]}`}
        role={notice.tone === "error" ? "alert" : "status"}
      >
        {notice.message}
      </p>

      <div className={styles.editorLayout}>
        <aside className={styles.toolPanel} aria-label="Adicionar blocos">
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Blocos</span>
              <span className={styles.counter}>{draft.contentBlocks.length}</span>
            </div>

            <div className={styles.blockMenu}>
              {blockAddOptions.map((option) => (
                <button key={option.type} onClick={() => addBlock(option.type)} type="button">
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className={styles.editorMain}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Materia</span>
              <strong>{wordCount} palavras</strong>
            </div>

            <div className={styles.formGrid}>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Titulo</span>
                <input
                  onChange={(event) => updateTitle(event.target.value)}
                  value={draft.title}
                />
              </label>
              <label className={styles.field}>
                <span>Slug</span>
                <input onChange={(event) => updateSlug(event.target.value)} value={draft.slug} />
              </label>
              <label className={styles.field}>
                <span>Autor</span>
                <input
                  onChange={(event) => updateDraft({ authorName: event.target.value })}
                  value={draft.authorName}
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Descricao</span>
                <textarea
                  onChange={(event) => updateDraft({ description: event.target.value })}
                  value={draft.description}
                />
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Capa</span>
              <label className={styles.fileField}>
                <span>Upload</span>
                <input accept={acceptedImageTypes} onChange={handleCoverUpload} type="file" />
              </label>
            </div>

            <div className={styles.coverGrid}>
              <div className={styles.coverPreview}>
                {coverPreviewUrl ? <img alt={draft.coverAltText || draft.title} src={coverPreviewUrl} /> : null}
              </div>
              <div className={styles.blockStack}>
                <label className={styles.field}>
                  <span>Alt text</span>
                  <input
                    onChange={(event) => updateDraft({ coverAltText: event.target.value })}
                    value={draft.coverAltText ?? ""}
                  />
                </label>
                <label className={styles.field}>
                  <span>Legenda</span>
                  <input
                    onChange={(event) => updateDraft({ coverCaption: event.target.value })}
                    value={draft.coverCaption ?? ""}
                  />
                </label>
                <label className={styles.checkboxField}>
                  <input
                    checked={draft.isFeatured}
                    onChange={(event) => updateDraft({ isFeatured: event.target.checked })}
                    type="checkbox"
                  />
                  <span>Post em destaque</span>
                </label>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Tags</span>
              <span className={styles.counter}>{draft.tags.length}/12</span>
            </div>

            <div className={styles.tokenInputRow}>
              <input
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => handleTokenKeyDown(event, tagInput, addTag)}
                placeholder="Adicionar tag"
                value={tagInput}
              />
              <button className={styles.secondaryButton} onClick={() => addTag(tagInput)} type="button">
                Adicionar
              </button>
            </div>

            <div className={styles.tokenList}>
              {draft.tags.map((tag) => (
                <button key={tag} onClick={() => removeTag(tag)} type="button">
                  {tag}
                </button>
              ))}
            </div>

            {suggestedTags.length ? (
              <div className={styles.suggestionRail}>
                {suggestedTags.map((tag) => (
                  <button key={tag.slug} onClick={() => addTag(tag.name)} type="button">
                    {tag.name}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Corpo</span>
              <span className={styles.counter}>{draft.contentBlocks.length}</span>
            </div>

            <div className={styles.blockList}>
              {draft.contentBlocks.map((block, index) => renderBlockEditor(block, index))}
            </div>
          </section>
        </div>

        <aside className={styles.seoPanel}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Publicacao</span>
              <span className={`${styles.status} ${styles[`status-${currentPost.status}`]}`}>
                {statusLabel}
              </span>
            </div>
            <dl className={styles.publishFacts}>
              <div>
                <dt>Atualizado</dt>
                <dd>{formatDate(currentPost.updatedAt)}</dd>
              </div>
              <div>
                <dt>Publicado</dt>
                <dd>{formatDate(currentPost.publishedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>SEO</span>
            </div>
            <div className={styles.blockStack}>
              <label className={styles.field}>
                <span>SEO title</span>
                <input
                  onChange={(event) => updateDraft({ seoTitle: event.target.value })}
                  value={draft.seoTitle ?? ""}
                />
              </label>
              <label className={styles.field}>
                <span>SEO description</span>
                <textarea
                  onChange={(event) => updateDraft({ seoDescription: event.target.value })}
                  value={draft.seoDescription ?? ""}
                />
              </label>
              <label className={styles.field}>
                <span>Canonical</span>
                <input
                  onChange={(event) => updateDraft({ canonicalUrlOverride: event.target.value })}
                  value={draft.canonicalUrlOverride ?? ""}
                />
              </label>
              <label className={styles.checkboxField}>
                <input
                  checked={draft.noindex}
                  onChange={(event) => updateDraft({ noindex: event.target.checked })}
                  type="checkbox"
                />
                <span>Noindex</span>
              </label>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>LLM</span>
              <span className={styles.counter}>{draft.internalKeywords.length}</span>
            </div>
            <div className={styles.tokenInputRow}>
              <input
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => handleTokenKeyDown(event, keywordInput, addKeyword)}
                placeholder="Keyword interna"
                value={keywordInput}
              />
              <button className={styles.secondaryButton} onClick={() => addKeyword(keywordInput)} type="button">
                Add
              </button>
            </div>
            <div className={styles.tokenList}>
              {draft.internalKeywords.map((keyword) => (
                <button key={keyword} onClick={() => removeKeyword(keyword)} type="button">
                  {keyword}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Social</span>
            </div>
            <div className={styles.blockStack}>
              <label className={styles.field}>
                <span>Titulo social</span>
                <input
                  onChange={(event) => updateDraft({ socialTitle: event.target.value })}
                  value={draft.socialTitle ?? ""}
                />
              </label>
              <label className={styles.field}>
                <span>Descricao social</span>
                <textarea
                  onChange={(event) => updateDraft({ socialDescription: event.target.value })}
                  value={draft.socialDescription ?? ""}
                />
              </label>
            </div>
          </section>
        </aside>
      </div>

      {isPreviewOpen ? (
        <div className={styles.previewOverlay} role="dialog" aria-modal="true" aria-label="Preview do post">
          <div className={styles.previewShell}>
            <div className={styles.previewTopbar}>
              <span className={styles.kicker}>Preview</span>
              <button className={styles.previewClose} onClick={() => setIsPreviewOpen(false)} type="button">
                Fechar
              </button>
            </div>

            <article className={styles.previewArticle}>
              <header className={styles.previewHero}>
                <div className={styles.previewTags}>
                  {draft.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <h1>{draft.title || "Novo post"}</h1>
                <p>{draft.description || "Descrição pendente."}</p>
                <div className={styles.previewMeta}>
                  <span>{draft.authorName || "Equipe Money Moicano MMA"}</span>
                  <span>{wordCount} palavras</span>
                </div>
              </header>

              {coverPreviewUrl ? (
                <figure className={styles.previewCover}>
                  <img alt={draft.coverAltText || draft.title} src={coverPreviewUrl} />
                  {draft.coverCaption ? <figcaption>{draft.coverCaption}</figcaption> : null}
                </figure>
              ) : null}

              <div className={styles.previewBody}>
                {draft.contentBlocks.length ? (
                  draft.contentBlocks.map(renderPreviewBlock)
                ) : (
                  <p>O corpo do post ainda está vazio.</p>
                )}
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
