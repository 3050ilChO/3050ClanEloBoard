function normalizeLogoFilename(input) {
  if (!input) return "";
  let s = String(input).trim();
  if (!s) return "";
  // If it's a URL, keep as-is (logo candidates will normalize extension/casing)
  if (/^https?:\/\//i.test(s)) return s;
  // basename
  s = s.split(/[\\/]/).pop();
  s = s.replace(/\s+/g, "");
  const lower = s.toLowerCase();
  // convert common extensions to .png for consistency with repo assets
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return lower.replace(/\.jpe?g$/i, ".png");
  if (lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif") || lower.endsWith(".svg")) return lower;
  // if it's like "jd" or "JD.", strip trailing dots
  const cleaned = lower.replace(/\.+$/g, "");
  return cleaned + ".png";
}

// Team logo helper:
// - normalizes filenames (JD.png -> jd.png)
// - tries both folder casings (s10team / s10Team) to avoid case-sensitive hosting issues
function setLogoImgSrcWithFallback(img, logoValue, folder) {
  const primary = folder || "s10team";
  const candidates = buildLogoCandidates(logoValue, primary);
  if (!candidates.length) return;

  let i = 0;
  img.src = candidates[i];

  img.onerror = () => {
    i += 1;
    if (i >= candidates.length) return;
    img.src = candidates[i];
  };
}

function buildLogoCandidates(logoValue, folder) {
  const primary = folder || "s10team";
  const altFolder = (primary === "s10team") ? "s10Team" : (primary === "s10Team" ? "s10team" : primary);
  const raw = (logoValue ?? "").toString().trim();
  if (!raw) return [];

  const unique = new Set();
  const push = (u) => {
    if (!u) return;
    const s = String(u);
    if (!unique.has(s)) unique.add(s);
  };

  const isUrl = /^https?:\/\//i.test(raw);
  if (isUrl) {
    push(raw);
    push(raw.replace(/\/s10team\//g, "/s10Team/").replace(/\/s10Team\//g, "/s10team/"));

    const png1 = raw.replace(/\.jpe?g(\?.*)?$/i, ".png$1");
    push(png1);
    push(png1.replace(/\/s10team\//g, "/s10Team/").replace(/\/s10Team\//g, "/s10team/"));

    try {
      const u = new URL(raw);
      const parts = u.pathname.split("/");
      const base = parts.pop() || "";
      const lowerBase = base.toLowerCase().replace(/\.jpe?g$/i, ".png");
      parts.push(lowerBase);
      u.pathname = parts.join("/");
      push(u.toString());
      push(u.toString().replace(/\/s10team\//g, "/s10Team/").replace(/\/s10Team\//g, "/s10team/"));
    } catch (e) {}

    return Array.from(unique);
  }

  if (raw.includes("/")) {
    const normalizedRel = raw.replace(/\.jpe?g$/i, ".png");
    push(normalizedRel);
    push(normalizedRel.replace(/^s10team\//i, "s10Team/").replace(/^s10Team\//i, "s10team/"));
    return Array.from(unique);
  }

  const normalized = normalizeLogoFilename(raw);
  push(resolveLogoPath(normalized, primary));
  push(resolveLogoPath(normalized, altFolder));

  const jpg = normalized.replace(/\.png$/i, ".jpg");
  if (jpg !== normalized) {
    push(resolveLogoPath(jpg, primary));
    push(resolveLogoPath(jpg, altFolder));
  }

  return Array.from(unique);
}

function resolveLogoPath(raw, defaultFolder) {
  const s = (raw ?? "").toString().trim();
  if (!s) return "";
  // keep full URLs and data URIs as-is
  if (/^(https?:)?\/\//i.test(s) || /^data:image\//i.test(s)) return s;
  // if already a relative path like "hof/xxx.png", keep it
  if (s.includes("/")) return s;
  // otherwise assume it's a filename and prepend folder (e.g., "jd.png" -> "s10team/jd.png")
  return defaultFolder ? `${defaultFolder.replace(/\/$/,"")}/${s}` : s;
}