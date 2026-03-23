import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

// GET all users
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST create user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Check if email exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const user = await db.user.create({
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        role: (data.role as UserRole) || UserRole.AGENT,
        active: data.active ?? true,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
