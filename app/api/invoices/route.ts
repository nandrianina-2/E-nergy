import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/lib/models";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "";
    const submeterIdParam = searchParams.get("submeterId") || "";
    const period = searchParams.get("period") || "";

    const query: Record<string, unknown> = {};

    if (session.user.role !== "admin") {
      if (!session.user.submeterId) {
        return NextResponse.json({
          invoices: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query.submeterId = session.user.submeterId;
    } else if (submeterIdParam) {
      query.submeterId = submeterIdParam;
    }

    if (status) query.paymentStatus = status;
    if (period) query.period = period;

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate("submeterId", "code label")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
