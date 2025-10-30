import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function jsonNoStore<T>(data: T, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Pragma", "no-cache");
  return response;
}

export function errorToResponse(error: unknown) {
  if (error instanceof AppError) {
    return jsonNoStore(
      {
        error: error.code,
        message: error.message,
      },
      { status: error.statusCode }
    );
  }

  console.error("Unhandled error", error);
  return jsonNoStore(
    {
      error: "INTERNAL_ERROR",
      message: "Something went wrong",
    },
    { status: 500 }
  );
}
