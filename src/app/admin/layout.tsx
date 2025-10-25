import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireAdminContext } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireAdminContext();
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect(`/login?redirect=${encodeURIComponent("/admin/trademarks")}`);
      }
      if (error.status === 403) {
        redirect("/");
      }
    }
    throw error;
  }

  return <>{children}</>;
}
