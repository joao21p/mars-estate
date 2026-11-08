<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Mock data and async fetchers live in src/data/ (no backend yet); swap them for API calls later without touching components.
- Keep the textured Mars scene in a lazily imported client-only exploration module; DOM region controls provide keyboard access and a fallback when WebGL is unavailable.
- Use existing Embla carousel primitives for property discovery and keep regional associations and filtering logic in src/data/ so presentation stays reusable.
