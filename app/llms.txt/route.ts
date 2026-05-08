import { getBlogLlmsIndex } from "@/lib/server/blog";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await getBlogLlmsIndex(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
