"use client";

import React, { useMemo } from "react";

/** Sandboxed preview of an HTML email body. */
export function EmailHtmlFrame({
  html,
  title = "Email preview",
}: {
  html: string;
  title?: string;
}) {
  const srcDoc = useMemo(() => {
    const body = html?.trim()
      ? html
      : "<p style=\"font-family:system-ui;color:#666\">No HTML body stored for this message.</p>";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title.replace(/"/g, "")}</title></head><body style="margin:16px;background:#fff">${body}</body></html>`;
  }, [html, title]);

  return (
    <iframe
      title={title}
      sandbox=""
      className="w-full min-h-[420px] h-[70vh] border border-line bg-white"
      srcDoc={srcDoc}
    />
  );
}
