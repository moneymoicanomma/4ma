import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAdminDefaultRedirectPathForRole } from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { getServerEnv } from "@/lib/server/env";

export const metadata: Metadata = {
  title: "Admin | Money Moicano MMA",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  const env = getServerEnv();
  const identity = await requireAdminSessionIdentity("/admin", env);

  redirect(getAdminDefaultRedirectPathForRole(identity.role));
}
