import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import {
  type CreateTrademarkPaymentInput,
  isPaymentStage,
  validatePaymentAmounts,
} from "@/types/trademark";

/**
 * POST /api/admin/payments
 * Create a new payment record for a trademark application
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminContext();
    const adminClient = createAdminClient();

    const body = (await request.json()) as CreateTrademarkPaymentInput;

    // Validate required fields
    if (!body.applicationId) {
      return NextResponse.json(
        { error: "application_id is required" },
        { status: 400 }
      );
    }

    if (!body.paymentStage || !isPaymentStage(body.paymentStage)) {
      return NextResponse.json(
        { error: "Invalid payment_stage. Must be filing, office_action, or registration" },
        { status: 400 }
      );
    }

    // Validate amounts if provided
    if (body.amount !== undefined && body.amount !== null) {
      const validation = validatePaymentAmounts(body.amount, 0);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    // Check if application exists
    const { data: application, error: appError } = await adminClient
      .from("trademark_applications")
      .select("id")
      .eq("id", body.applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check if payment already exists for this stage
    const { data: existing, error: existingError } = await adminClient
      .from("trademark_payments")
      .select("id")
      .eq("application_id", body.applicationId)
      .eq("payment_stage", body.paymentStage)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Payment record already exists for this stage" },
        { status: 409 }
      );
    }

    // Create payment record
    const { data: payment, error: insertError } = await adminClient
      .from("trademark_payments")
      .insert({
        application_id: body.applicationId,
        payment_stage: body.paymentStage,
        payment_status: "not_requested",
        amount: body.amount || null,
        paid_amount: 0,
        currency: body.currency || "KRW",
        due_at: body.dueAt || null,
        notes: body.notes || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create payment:", insertError);
      return NextResponse.json(
        { error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
