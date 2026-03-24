import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Create tables using raw SQL
    await db.$executeRawUnsafe(`
      -- Create enum types
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT', 'COMPTABLE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "ServiceStatus" AS ENUM ('NON_DECLAREE', 'PRO_FORMA', 'FACTUREE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "ServiceType" AS ENUM ('TRANSFERT', 'EXCURSION', 'LOCATION', 'TRANSPORT', 'AUTRE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "InvoiceType" AS ENUM ('PRO_FORMA', 'FINALE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      DO $$ BEGIN
        CREATE TYPE "PaymentMethod" AS ENUM ('ESPECES', 'VIREMENT', 'CHEQUE', 'CARTE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      
      -- Users table
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "role" "UserRole" NOT NULL DEFAULT 'AGENT',
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "User_pkey" PRIMARY KEY ("id")
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
      
      -- Vehicles table
      CREATE TABLE IF NOT EXISTS "Vehicle" (
        "id" TEXT NOT NULL,
        "brand" TEXT NOT NULL,
        "model" TEXT NOT NULL,
        "registration" TEXT NOT NULL,
        "capacity" INTEGER NOT NULL,
        "type" TEXT,
        "status" TEXT NOT NULL DEFAULT 'available',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_registration_key" ON "Vehicle"("registration");
      
      -- Drivers table
      CREATE TABLE IF NOT EXISTS "Driver" (
        "id" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "email" TEXT,
        "licenseNumber" TEXT,
        "available" BOOLEAN NOT NULL DEFAULT true,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
      );
      
      -- Clients table
      CREATE TABLE IF NOT EXISTS "Client" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "contactName" TEXT,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT,
        "city" TEXT,
        "ice" TEXT,
        "cnss" TEXT,
        "if" TEXT,
        "rc" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
      );
      
      -- Services table
      CREATE TABLE IF NOT EXISTS "Service" (
        "id" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "vehicleId" TEXT NOT NULL,
        "driverId" TEXT NOT NULL,
        "createdById" TEXT NOT NULL,
        "type" "ServiceType" NOT NULL DEFAULT 'TRANSFERT',
        "description" TEXT,
        "date" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3),
        "departurePlace" TEXT NOT NULL,
        "arrivalPlace" TEXT NOT NULL,
        "passengerCount" INTEGER NOT NULL DEFAULT 1,
        "passengerNames" TEXT,
        "price" DOUBLE PRECISION NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'MAD',
        "status" "ServiceStatus" NOT NULL DEFAULT 'NON_DECLAREE',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
      );
      
      -- Invoices table
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT NOT NULL,
        "number" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "createdById" TEXT NOT NULL,
        "type" "InvoiceType" NOT NULL DEFAULT 'FINALE',
        "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
        "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dueDate" TIMESTAMP(3),
        "paidDate" TIMESTAMP(3),
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "currency" TEXT NOT NULL DEFAULT 'MAD',
        "notes" TEXT,
        "terms" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key" ON "Invoice"("number");
      
      -- InvoiceItems table
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id" TEXT NOT NULL,
        "invoiceId" TEXT NOT NULL,
        "serviceId" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "unitPrice" DOUBLE PRECISION NOT NULL,
        "total" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
      );
      
      -- Payments table
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "invoiceId" TEXT,
        "amount" DOUBLE PRECISION NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'MAD',
        "method" "PaymentMethod" NOT NULL DEFAULT 'ESPECES',
        "reference" TEXT,
        "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
      );
      
      -- Manifests table
      CREATE TABLE IF NOT EXISTS "Manifest" (
        "id" TEXT NOT NULL,
        "serviceId" TEXT NOT NULL,
        "vehicleId" TEXT NOT NULL,
        "driverId" TEXT NOT NULL,
        "createdById" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "departurePlace" TEXT NOT NULL,
        "arrivalPlace" TEXT NOT NULL,
        "departureTime" TEXT,
        "arrivalTime" TEXT,
        "passengerCount" INTEGER NOT NULL DEFAULT 1,
        "passengerList" TEXT,
        "remarks" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Manifest_pkey" PRIMARY KEY ("id")
      );
      
      -- Settings table
      CREATE TABLE IF NOT EXISTS "Setting" (
        "id" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
      );
      
      CREATE UNIQUE INDEX IF NOT EXISTS "Setting_key_key" ON "Setting"("key");
    `);

    return NextResponse.json({
      success: true,
      message: "Database tables created successfully! ✅",
      nextStep: "Now visit /api/init to seed the initial data",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create database tables",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
