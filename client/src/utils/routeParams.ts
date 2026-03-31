import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Validates route parameters before use in API calls.
 * Prevents NaN, negative numbers, and excessively large values from crafted URLs.
 */

const MAX_SAFE_ID = Number.MAX_SAFE_INTEGER;

/**
 * Parses a string as a positive integer within safe bounds.
 * @param value - Raw param value from useParams()
 * @returns The parsed number, or null if invalid
 */
export function parsePositiveInt(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = parseInt(value, 10);
  if (
    Number.isNaN(parsed) ||
    parsed < 1 ||
    parsed > MAX_SAFE_ID ||
    !Number.isInteger(parsed)
  ) {
    return null;
  }
  return parsed;
}

type UseValidatedIdParamOptions = {
  /** If false, undefined id is valid (create mode). Default true for detail pages. */
  required?: boolean;
};

/**
 * Returns a validated id param and redirects to fallbackPath if invalid.
 * @param fallbackPath - Where to redirect when param is invalid (e.g. "/admin/cameras")
 * @param options - { required: false } for form pages where id is optional (create vs edit)
 */
export function useValidatedIdParam(
  fallbackPath: string,
  options: UseValidatedIdParamOptions = {},
): number | null {
  const { required = true } = options;
  const { id } = useParams();
  const navigate = useNavigate();
  const validated = parsePositiveInt(id);

  useEffect(() => {
    const shouldRedirect =
      required && validated === null ? true : id !== undefined && validated === null;
    if (shouldRedirect) {
      navigate(fallbackPath, { replace: true });
    }
  }, [id, validated, required, fallbackPath, navigate]);

  return validated;
}
