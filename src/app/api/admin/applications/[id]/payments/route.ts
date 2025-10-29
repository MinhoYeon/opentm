import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * GET /api/admin/applications/:id/payments
 * Get all payment records for a specific trademark application
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminContext();
    const adminClient = createAdminClient();

    const params = "then" in context.params ? await context.params : context.params;
    const { id: applicationId } = params;

    if (!applicationId) {
      return NextResponse.json(
        { error: "Application ID is required" },
        { status: 400 }
      );
    }

    // Verify application exists
    const { data: application, error: appError } = await adminClient
      .from("trademark_applications")
      .select("id, brand_name, status")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Get all payments for this application, ordered by stage
    const { data: payments, error: paymentsError } = await adminClient
      .from("trademark_payments")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    if (paymentsError) {
      console.error("Failed to fetch payments:", paymentsError);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    // Calculate summary
    const summary = {
      totalAmount: 0,
      totalPaid: 0,
      hasOverdue: false,
      allPaid: true,
      paymentCount: payments?.length || 0,
    };

    if (payments && payments.length > 0) {
      for (const payment of payments) {
        const amount = payment.amount || 0;
        const paidAmount = payment.paid_amount || 0;

        summary.totalAmount += amount;
        summary.totalPaid += paidAmount;

        if (payment.payment_status === "overdue") {
          summary.hasOverdue = true;
        }

        if (payment.payment_status !== "paid" && payment.payment_status !== "refunded") {
          summary.allPaid = false;
        }
      }
    }

    return NextResponse.json({
      application: {
        id: application.id,
        brandName: application.brand_name,
        status: application.status,
      },
      payments: payments || [],
      summary,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/applications/:id/payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
