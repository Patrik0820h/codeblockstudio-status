# CodeBlock Studio Status

A self-hosted, self-checking status page for [CodeBlock Studio](https://www.codeblockstudio.hu), free and independent of the infrastructure it monitors.

## How it works

- `.github/workflows/check.yml` runs every 5 minutes on GitHub's own infrastructure, calling `scripts/check.mjs`.
- `scripts/check.mjs` pings each service listed in `data/history.json` and appends the result (up/down + response time), pruning anything older than 90 days.
- The workflow commits the updated `data/history.json` back to this repo.
- `index.html` (served by GitHub Pages) fetches `data/history.json` and renders the live status page, current status + a 90-day uptime bar per service.

Deliberately kept in its own small, public repository, separate from the main (private) CodeBlock Studio codebase — none of this content is sensitive, and GitHub Pages requires a public repo on the free plan.

## Setup (one-time)

1. Push this repo to GitHub as a **public** repository.
2. Repo → Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Repo → Settings → Pages → Custom domain: `status.codeblockstudio.hu` (the `CNAME` file here already has this, GitHub should pick it up automatically).
4. At whichever DNS provider hosts `codeblockstudio.hu`, add a CNAME record: Name `status`, Value `<your-github-username>.github.io`.
5. Repo → Settings → Actions → General → Workflow permissions: set to **Read and write permissions**, so the scheduled workflow can commit `data/history.json` back.
6. Repo → Actions → "Status check" → Run workflow, to trigger the first check manually rather than waiting up to 5 minutes.
