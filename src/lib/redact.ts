/**
 * Silently strips contact details from user-generated free text so the
 * coaching relationship stays on PadelPro. Emails, phone numbers, links,
 * bare domains and @handles are replaced with `[hidden]`.
 *
 * This is applied on write for every free-text field a coach or player can
 * publish or send — coach profiles (bio, headline, credentials), written
 * feedback, and review comments — so the platform can't be used to hand off
 * a WhatsApp number or email and take the relationship off-platform.
 *
 * Redaction is intentionally silent: we don't reject the submission, we just
 * mask the contact details, so an honest mention isn't a hard error.
 */

const MASK = "[hidden]";

// name@host.tld
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// http(s):// or www. links (run before bare-domain / handle passes)
const URL = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;
// bare domains like "coachdirect.io" — common self-promo vector
const DOMAIN =
  /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|io|co|es|fr|de|it|pt|uk|eu|me|app|club|academy|coach|tv|info|biz|online|site|link)\b/gi;
// @handle for socials (avoid matching inside emails/paths via lookbehind)
const HANDLE = /(?<![\w./@])@[a-z0-9._]{2,}/gi;
// a run of digits/separators that resolves to a real phone number
const PHONE_CANDIDATE = /\+?\d[\d\s().\-]{6,}\d/g;

/** Mask any contact details found in `input`. Safe on empty strings. */
export function redactContact(input: string): string {
  if (!input) return input;

  let out = input;
  out = out.replace(EMAIL, MASK);
  out = out.replace(URL, MASK);
  out = out.replace(DOMAIN, MASK);
  // Only treat a digit run as a phone number if it carries enough digits —
  // keeps year ranges ("2019-2024") and short scores from being masked.
  out = out.replace(PHONE_CANDIDATE, (m) =>
    m.replace(/\D/g, "").length >= 9 ? MASK : m
  );
  out = out.replace(HANDLE, MASK);

  // Collapse "[hidden] [hidden]" runs left by adjacent matches.
  out = out.replace(/(?:\[hidden\][\s,]*){2,}/g, `${MASK} `);
  return out.trim();
}

/** Nullable convenience: redact when present, preserve null/empty as null. */
export function redactMaybe(
  input: string | null | undefined
): string | null {
  if (input == null) return null;
  const cleaned = redactContact(input);
  return cleaned.length ? cleaned : null;
}
