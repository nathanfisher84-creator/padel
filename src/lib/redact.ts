/**
 * Silently strips contact details from user-generated free text so the
 * coaching relationship stays on PadelPro. Emails (incl. "at"/"dot"
 * obfuscation), phone numbers, links, bare domains, @handles and named
 * social handles (IG: …, telegram …) are replaced with `[hidden]`.
 *
 * Applied on write to every free-text field a coach or player can publish or
 * send — coach profiles (bio, headline, credentials), written feedback, and
 * review comments.
 *
 * This is best-effort deterrence, not a guarantee: text is normalized (NFKC,
 * so full-width/Unicode digits and letters are folded to ASCII first) and the
 * common obfuscations are handled, but a determined user can still smuggle a
 * contact detail through. Redaction is silent — we mask rather than reject.
 */

const MASK = "[hidden]";

// name@host.tld
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// obfuscated email: "carlos at gmail dot com", "carlos(at)gmail(dot)com"
const OBFUSCATED_EMAIL =
  /[a-z0-9._%+-]+\s*(?:@|\(?\s*at\s*\)?|\[\s*at\s*\])\s*[a-z0-9.-]+\s*(?:\.|\(?\s*dot\s*\)?|\[\s*dot\s*\])\s*[a-z]{2,}/gi;
// http(s):// or www. links (run before bare-domain / handle passes)
const URL = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;
// bare domains like "coachdirect.io" — common self-promo vector
const DOMAIN =
  /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|io|co|es|fr|de|it|pt|uk|eu|me|app|club|academy|coach|tv|info|biz|online|site|link|xyz|gg|to|social|page)\b/gi;
// @handle for socials (avoid matching inside emails/paths via lookbehind)
const HANDLE = /(?<![\w./@])@[a-z0-9._]{2,}/gi;
// a run of digits/separators that resolves to a real phone number
const PHONE_CANDIDATE = /\+?\d[\d\s().\-]{6,}\d/g;
// named social handle: "IG: coach_carlos", "telegram @x", "whatsapp johnpadel"
const SOCIAL =
  /\b(?:instagram|insta|ig|snapchat|snap|tiktok|telegram|whatsapp|whats\s?app|facebook|fb|messenger|signal)\b[\s:@.-]*(@?[a-z0-9][a-z0-9._]*)/gi;

/** Mask any contact details found in `input`. Safe on empty strings. */
export function redactContact(input: string): string {
  if (!input) return input;

  // Fold full-width / compatibility characters to ASCII (NFKC), then fold
  // non-ASCII digit scripts (Arabic-Indic, Devanagari, Bengali, full-width)
  // so a phone number written in them is still caught.
  let out = input.normalize("NFKC");
  out = out.replace(
    /[٠-٩۰-۹०-९০-৯０-９]/g,
    (d) => {
      const cp = d.codePointAt(0)!;
      for (const base of [0x0660, 0x06f0, 0x0966, 0x09e6, 0xff10]) {
        if (cp >= base && cp <= base + 9) return String(cp - base);
      }
      return d;
    }
  );

  out = out.replace(EMAIL, MASK);
  out = out.replace(OBFUSCATED_EMAIL, MASK);
  out = out.replace(URL, MASK);
  out = out.replace(DOMAIN, MASK);
  // Only treat a digit run as a phone number if it carries enough digits —
  // keeps year ranges ("2019-2024") and short scores from being masked.
  out = out.replace(PHONE_CANDIDATE, (m) =>
    m.replace(/\D/g, "").length >= 9 ? MASK : m
  );
  out = out.replace(SOCIAL, (m, handle: string) => {
    const h = handle.replace(/^@/, "");
    // Redact only when it really looks like a handle, not "instagram is fun".
    const looksLikeHandle =
      handle.startsWith("@") || /[._\d]/.test(h) || h.length >= 4;
    return looksLikeHandle ? MASK : m;
  });
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
