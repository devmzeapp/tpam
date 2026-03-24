import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { InvoiceType, InvoiceStatus, ServiceStatus } from "@prisma/client";

// Generate invoice number
async function generateInvoiceNumber(type: InvoiceType): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = type === InvoiceType.PRO_FORMA ? "PF" : "FAC";

  const lastInvoice = await db.invoice.findFirst({
    where: {
      number: {
        startsWith: prefix,
      },
      issueDate: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    orderBy: {
      number: "desc",
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.number.split("-")[1]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}-${nextNumber.toString().padStart(3, "0")}-${year}`;
}

// GET all invoices
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status as InvoiceStatus;
    if (type) where.type = type as InvoiceType;

    const invoices = await db.invoice.findMany({
      where,
      orderBy: {
        issueDate: "desc",
      },
      include: {
        client: true,
        items: {
          include: {
            service: {
              include: {
                vehicle: true,
                driver: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        payments: true,
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST create invoice
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const type = (data.type as InvoiceType) || InvoiceType.FINALE;
    const number = await generateInvoiceNumber(type);

    // Calculate totals
    let subtotal = 0;
    const items = data.items || [];

    for (const item of items) {
      subtotal += item.unitPrice * item.quantity;
    }

    const taxRate = data.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Get the first admin user as default creator if not provided
    let createdById = data.createdById;
    if (!createdById) {
      const adminUser = await db.user.findFirst({
        where: { role: "ADMIN" },
      });
      if (!adminUser) {
        return NextResponse.json(
          { error: "No admin user found. Please run /api/init first." },
          { status: 500 }
        );
      }
      createdById = adminUser.id;
    }

    const invoice = await db.invoice.create({
      data: {
        number,
        clientId: data.clientId,
        createdById: createdById,
        type,
        status: InvoiceStatus.DRAFT,
        issueDate: new Date(),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency: data.currency || "MAD",
        notes: data.notes,
        terms: data.terms,
        items: {
          create: items.map((item: { serviceId: string; description: string; quantity: number; unitPrice: number }) => ({
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.unitPrice * item.quantity,
          })),
        },
      },
      include: {
        client: true,
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    // Update service status
    if (type === InvoiceType.FINALE) {
      for (const item of items) {
        await db.service.update({
          where: { id: item.serviceId },
          data: { status: ServiceStatus.FACTUREE },
        });
      }
    } else if (type === InvoiceType.PRO_FORMA) {
      for (const item of items) {
        await db.service.update({
          where: { id: item.serviceId },
          data: { status: ServiceStatus.PRO_FORMA },
        });
      }
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
