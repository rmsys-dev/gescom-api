import type { ZodIssue } from "zod";
import type { ApiErrorDetails } from "./api-error-response.js";

export type RequestSegment = "body" | "params" | "query";

export const mapZodIssuePath = (
  issue: ZodIssue,
  segment?: RequestSegment,
): string => {
  if (segment) {
    if (!issue.path.length) {
      return segment;
    }

    return `${segment}.${issue.path.join(".")}`;
  }

  if (!issue.path.length) {
    return "request";
  }

  return issue.path.join(".");
};

export const mapZodIssuesToDetails = (
  issues: ZodIssue[],
  segment?: RequestSegment,
): ApiErrorDetails =>
  issues.map((issue) => ({
    path: mapZodIssuePath(issue, segment),
    message: issue.message,
  }));
