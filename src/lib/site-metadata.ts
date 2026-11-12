import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const SITE_TITLE = "Mars Estate | Explore o impossível";
export const SITE_DESCRIPTION =
  "Explore Marte em uma plataforma fictícia de portfólio: descubra regiões, compare terrenos e simule reservas. Sem compra ou propriedade real.";
export const SOCIAL_IMAGE = "/social/mars-estate.png";

// Start removes the server implementation from client bundles. No domain or env
// changes are needed for local preview; validate the public request URL behind a proxy.
const siteOrigin = createIsomorphicFn()
  .server(() => new URL(getRequest().url).origin)
  .client(() => window.location.origin);

export function siteMetadata(title = SITE_TITLE, description = SITE_DESCRIPTION, pathname = "/") {
  const origin = siteOrigin();
  const image = new URL(SOCIAL_IMAGE, origin).href;
  const url = new URL(pathname, origin).href;
  const alt =
    "Mars Estate — Explore o impossível. Símbolo de Marte em cobre sobre fundo escuro. Projeto fictício de portfólio.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:site_name", content: "Mars Estate" },
    { property: "og:locale", content: "pt_BR" },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: alt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: alt },
  ];
}
