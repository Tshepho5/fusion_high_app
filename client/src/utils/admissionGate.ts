export function intakeClosed(control?: { is_locked?: boolean; effectively_closed?: boolean } | null) {
  if (!control) return false;
  if (typeof control.effectively_closed === 'boolean') return control.effectively_closed;
  return Boolean(control.is_locked);
}

export function intakeReason(control: { public_reason?: string; locked_reason?: string } | null | undefined, fallback: string) {
  return control?.public_reason || control?.locked_reason || fallback;
}
