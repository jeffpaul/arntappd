import "server-only";
import { NextResponse } from "next/server";
import type { ApiError, ErrorCode } from "@/lib/types";

/** An error that is safe to show the user. Never carries provider URLs or bodies. */
export class AppError extends Error {
  constructor(public code: ErrorCode, message: string, public status = 400) {
    super(message);
  }
}

export function errorResponse(error: unknown): NextResponse<ApiError> {
  if (error instanceof AppError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  // Messages from our own code and fetch never include provider URLs or keys.
  console.error("Unexpected error:", error instanceof Error ? `${error.name}: ${error.message}` : typeof error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
