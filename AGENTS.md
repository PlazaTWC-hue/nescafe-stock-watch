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

- Encode layout order across 32-character JSON values and decode on both reads and realtime events, because the shared stock validator limits every cell value.
- Serialize layout writes and protect pending changes from refresh/realtime responses so stale data cannot overwrite local edits.
