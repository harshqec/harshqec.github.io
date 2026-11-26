# Harsh's Quantum Computing Portfolio

The source code for [harshqec.github.io](https://harshqec.github.io/), a research portfolio about quantum computing, quantum error correction, and measurement-based quantum computing.

<img src="https://raw.githubusercontent.com/harshqec/harshqec.github.io/source/website-source/public/images/headshot.webp" alt="Portrait of Harsh" width="180">

## Explore the website

Visitors can learn about Harsh's background and research, browse academic events and lab updates, read the blog, and try interactive quantum-computing simulations in the Lab section. The site is responsive and includes project and event detail pages.

The portfolio brings these areas together:

- Research highlights and academic updates
- Events, workshops, and related detail pages
- Blog posts and interactive quantum-lab simulations
- A video-led landing page with animated, responsive navigation

## Technology

- React and TypeScript
- Vite
- Tailwind CSS
- GSAP animations
- GitHub Pages

## Repository branches

This repository uses separate branches for source code and the live website:

- **`source`** contains the React/Vite project in `website-source/`. Make code and content changes on this branch.
- **`main`** contains the built static website served by GitHub Pages. Do not edit the deployed files by hand; regenerate them from `source`.

## Project layout

```text
website-source/
  public/       Static assets copied into the production build
  src/
    sections/   Main portfolio sections
    pages/      Main page and event/lab detail pages
  package.json
  vite.config.ts
```

## Run locally

Clone the repository and install the website dependencies:

```bash
git clone --branch source https://github.com/harshqec/harshqec.github.io.git
cd harshqec.github.io/website-source
npm ci
npm run dev
```

Vite prints the local development URL in the terminal. To check a production build, run:

```bash
npm run build
```

This runs the TypeScript build and creates the static site in `website-source/dist/`. You can optionally run `npm run lint` to check the source.

## Change and commit workflow

1. Make and test changes on the `source` branch.
2. Stage only the files for the change and create a short, imperative commit message:

   ```bash
   git add website-source/src/sections/Events.tsx
   git commit -m "Update events section"
   ```

   Existing commits use concise messages such as `Fix section viewport and event marker tracking`. Keep source changes on `source`; do not commit generated `dist/` output there.
3. Push the source changes:

   ```bash
   git push origin source
   ```

## Build and publish to `main`

After the source change is ready, build it and publish the generated files to the root of `main`. Run these commands from the repository root on `source`:

```bash
git fetch origin
git worktree add --detach ../harshqec-pages origin/main

cd website-source
npm ci
npm run build
cd ..

rsync -a --delete --exclude='.git' --exclude='README.md' website-source/dist/ ../harshqec-pages/
git -C ../harshqec-pages add -A
git -C ../harshqec-pages commit -m "Deploy <short description>"
git -C ../harshqec-pages push origin HEAD:main
git worktree remove ../harshqec-pages
```

The worktree keeps the deployment checkout separate from the source branch. `rsync` mirrors the build output (including removing obsolete hashed assets) while preserving the `main` branch's README and Git metadata. If the build produces no file changes, there is nothing to commit or push to `main`.

## About Harsh

Harsh is a PhD student at IISER Bhopal working in quantum computing, including quantum error correction and measurement-based quantum computing. The website is a public overview of his research interests, academic activities, and projects.
