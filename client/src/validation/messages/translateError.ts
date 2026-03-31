import { TFunction } from "i18next";
import { FieldError } from "react-hook-form";

export const translateError = (
  t: TFunction,
  fieldKey: string,
  error?: FieldError
): string | undefined => {
  if (!error?.message) return;
  const [key, rawParams] = error.message.split(":");
  if (rawParams?.includes(",")) {
    const [field1, field2] = rawParams.split(",");
    return t(key, {
      field1: t(field1),
      field2: t(field2),
    });
  }
  return t(key, {
    field: t(fieldKey),
    len: rawParams,
    min: rawParams,
    max: rawParams,
    sizeMB: rawParams,
    format: rawParams,
    types: rawParams,
    date: rawParams,
  });
};
