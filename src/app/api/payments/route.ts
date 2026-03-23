import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PaymentMethod, InvoiceStatus } from "@prisma/client";

// GET all payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const invoiceId = searchParams.get("invoiceId");

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (invoiceId) where.invoiceId = invoiceId;

    const payments = await db.payment.findMany({
      where,
      orderBy: {
        paymentDate: "desc",
      },
      include: {
        client: true,
        invoice: true,
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST create payment
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const payment = await db.payment.create({
      data: {
        clientId: data.clientId,
        invoiceId: data.invoiceId,
        amount: parseFloat(data.amount),
        currency: data.currency || "MAD",
        method: (data.method as PaymentMethod) || PaymentMethod.ESPECES,
        reference: data.reference,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        notes: data.notes,
      },
      include: {
        client: true,
        invoice: true,
      },
    });

    // If payment is for an invoice, check if it's fully paid
    if (data.invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: data.invoiceId },
        include: {
          payments: true,
        },
      });

      if (invoice) {
        const totalPaid = invoice.payments.reduce(
          (sum, p) => sum + p.amount,
          0
        );

        if (totalPaid >= invoice.total) {
          await db.invoice.update({
            where: { id: data.invoiceId },
            data: {
              status: InvoiceStatus.PAID,
              paidDate: new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
