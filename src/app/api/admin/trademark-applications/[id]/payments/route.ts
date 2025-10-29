import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * GET /api/admin/trademark-applications/:id/payments
 * Get all payments for a trademark application
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminContext();
    const adminClient = createAdminClient();

    const params = "then" in context.params ? await context.params : context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const { data: payments, error } = await adminClient
      .from("trademark_payments")
      .select("*")
      .eq("application_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch payments:", error);
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }

    return NextResponse.json(payments || []);
  } catch (error) {
    console.error("Error in GET /api/admin/trademark-applications/:id/payments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
