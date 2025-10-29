import { NextRequest, NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import {
  type UpdateTrademarkPaymentInput,
  isPaymentStatus,
  validatePaymentAmounts,
  getPaymentStageLabel,
} from "@/types/trademark";
import { autoTransitionOnPaymentComplete } from "@/lib/payments/automation";
import { sendQuoteNotification, sendPaymentConfirmedNotification } from "@/lib/email/notifications";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * GET /api/admin/payments/:id
 * Get a single payment record by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminContext();
    const adminClient = createAdminClient();

    const params = "then" in context.params ? await context.params : context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const { data: payment, error } = await adminClient
      .from("trademark_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error in GET /api/admin/payments/:id:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/payments/:id
 * Update a payment record
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminContext();
    const adminClient = createAdminClient();

    const params = "then" in context.params ? await context.params : context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateTrademarkPaymentInput;

    // Validate payment status if provided
    if (body.paymentStatus && !isPaymentStatus(body.paymentStatus)) {
      return NextResponse.json(
        {
          error: "Invalid payment_status. Must be one of: not_requested, quote_sent, unpaid, partial, paid, overdue, refund_requested, refunded"
        },
        { status: 400 }
      );
    }

    // Get current payment with application data for email notifications
    const { data: currentPayment, error: fetchError } = await adminClient
      .from("trademark_payments")
      .select(`
        *,
        trademark_applications!inner (
          id,
          brand_name,
          management_number,
          applicant_name,
          applicant_email
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError || !currentPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const application = Array.isArray(currentPayment.trademark_applications)
      ? currentPayment.trademark_applications[0]
      : currentPayment.trademark_applications;

    // Validate amounts
    const newAmount = body.amount !== undefined ? body.amount : currentPayment.amount;
    const newPaidAmount = body.paidAmount !== undefined ? body.paidAmount : currentPayment.paid_amount;

    const validation = validatePaymentAmounts(newAmount, newPaidAmount);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.paymentStatus !== undefined) updateData.payment_status = body.paymentStatus;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.paidAmount !== undefined) updateData.paid_amount = body.paidAmount;
    if (body.quoteSentAt !== undefined) updateData.quote_sent_at = body.quoteSentAt;
    if (body.dueAt !== undefined) updateData.due_at = body.dueAt;
    if (body.paidAt !== undefined) updateData.paid_at = body.paidAt;
    if (body.remitterName !== undefined) updateData.remitter_name = body.remitterName;
    if (body.paymentMethod !== undefined) updateData.payment_method = body.paymentMethod;
    if (body.transactionReference !== undefined) updateData.transaction_reference = body.transactionReference;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.metadata !== undefined) updateData.metadata = body.metadata;

    // Auto-set paid_at when status changes to paid
    if (body.paymentStatus === "paid" && !body.paidAt) {
      updateData.paid_at = new Date().toISOString();
    }

    // Auto-set quote_sent_at when status changes to quote_sent
    if (body.paymentStatus === "quote_sent" && !body.quoteSentAt) {
      updateData.quote_sent_at = new Date().toISOString();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // Update payment
    const { data: payment, error: updateError } = await adminClient
      .from("trademark_payments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to update payment:", updateError);
      return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
    }

    // Auto-transition application status if payment was completed
    const wasNotPaid = currentPayment.payment_status !== "paid";
    const isNowPaid = payment.payment_status === "paid";

    if (wasNotPaid && isNowPaid) {
      // Trigger auto-transition
      const result = await autoTransitionOnPaymentComplete(
        adminClient,
        payment.application_id,
        payment.payment_stage,
        null // TODO: Get user ID from session
      );

      if (result.success) {
        console.log(`Auto-transitioned application ${payment.application_id} to ${result.newStatus}`);
      } else {
        console.warn(`Failed to auto-transition: ${result.error}`);
        // Don't fail the entire request, just log the warning
      }

      // Send payment confirmed email notification
      if (application && application.applicant_email) {
        try {
          await sendPaymentConfirmedNotification({
            applicantName: application.applicant_name || "고객님",
            applicantEmail: application.applicant_email,
            brandName: application.brand_name,
            paymentStage: payment.payment_stage,
            paymentStageLabel: getPaymentStageLabel(payment.payment_stage),
            paidAmount: payment.paid_amount || 0,
            currency: payment.currency || "KRW",
            paidAt: payment.paid_at || new Date().toISOString(),
            remitterName: payment.remitter_name,
            managementNumber: application.management_number,
          });
          console.log(`Sent payment confirmed email to ${application.applicant_email}`);
        } catch (emailError) {
          console.error("Failed to send payment confirmed email:", emailError);
          // Don't fail the entire request
        }
      }
    }

    // Send quote email notification if status changed to quote_sent
    const wasNotQuoteSent = currentPayment.payment_status !== "quote_sent";
    const isNowQuoteSent = payment.payment_status === "quote_sent";

    if (wasNotQuoteSent && isNowQuoteSent) {
      if (application && application.applicant_email) {
        try {
          await sendQuoteNotification({
            applicantName: application.applicant_name || "고객님",
            applicantEmail: application.applicant_email,
            brandName: application.brand_name,
            paymentStage: payment.payment_stage,
            paymentStageLabel: getPaymentStageLabel(payment.payment_stage),
            amount: payment.amount || 0,
            currency: payment.currency || "KRW",
            dueDate: payment.due_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            quoteSentAt: payment.quote_sent_at || new Date().toISOString(),
            managementNumber: application.management_number,
          });
          console.log(`Sent quote email to ${application.applicant_email}`);
        } catch (emailError) {
          console.error("Failed to send quote email:", emailError);
          // Don't fail the entire request
        }
      }
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error in PATCH /api/admin/payments/:id:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/payments/:id
 * Delete a payment record
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdminContext();
    const adminClient = createAdminClient();

    const params = "then" in context.params ? await context.params : context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    const { error } = await adminClient
      .from("trademark_payments")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Failed to delete payment:", error);
      return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/payments/:id:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
