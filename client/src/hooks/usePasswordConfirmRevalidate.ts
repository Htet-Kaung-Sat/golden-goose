import { useEffect, useRef } from "react";

type TriggerFn = (name?: string) => Promise<boolean>;

/**
 * Re-validates a dependent password field when the source field changes.
 * Use when confirm_password (or similar) must match another field (e.g. new_password):
 * when the user fixes the source field, the confirm field's match error updates immediately.
 *
 * @param sourceValue - Current value of the source field (e.g. from watch("new_password"))
 * @param confirmFieldName - Name of the field to re-validate (e.g. "confirm_password")
 * @param trigger - useForm's trigger function
 */
export function usePasswordConfirmRevalidate(
  sourceValue: unknown,
  confirmFieldName: string,
  trigger: TriggerFn,
) {
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    // Always re-validate when source changes (including when cleared e.g. via Ctrl+X)
    // so dependent field errors (e.g. "must not equal password") update immediately.
    void trigger(confirmFieldName);
  }, [sourceValue, confirmFieldName, trigger]);
}
