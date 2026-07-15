# Harsh | PhD Student - Quantum Computing

A professional, immersive research portfolio website showcasing work in Quantum Error Correction and Measurement-Based Quantum Computing.

<img src="website-source/public/images/headshot.webp" alt="Website Preview" width="300">

## 🌐 Live Website
[harshqec.github.io](https://harshqec.github.io/)

## ✨ Key Features
- **Immersive Visuals**: High-definition architectural hero video background with dynamic glassmorphism overlays.
- **Progressive Scroll Experience**: Sophisticated CSS-based background transitions that darken as the user scrolls, creating a sense of "diving deep" into the quantum realm.
- **Dynamic Content**: Sections for Research Spotlight, Latest Lab Updates, Interactive Lab simulations, and Academic Events.
- **Modern Tech Stack**: Built with high-performance tools for smooth animations and a premium feel.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop viewing.

## 🛠 Tech Stack
- **Framework**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [GSAP](https://greensock.com/gsap/) (GreenSock Animation Platform)
- **Deployment**: [GitHub Pages](https://pages.github.com/)

## 📁 Project Structure
The repository is organized into two main branches:

### `source` Branch (Current)
Contains the raw source code and assets:
- `website-source/`: The React + Vite project directory.
  - `src/sections/`: Individual website sections (About, Research, Contact, etc.).
  - `tailwind.config.js`: Custom color palette and design tokens.
- `hero-video.mp4`: The main cinematic background video.

### `main` Branch
Contains the production-ready compiled code. This is what serves the live website.

## 🚀 Local Development

To run this project locally, follow these steps:

1. **Clone the repository**:
   ```bash
   git clone -b source https://github.com/harshqec/harshqec.github.io.git
   ```

2. **Navigate to the source folder**:
   ```bash
   cd website-source
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The site will be available at `http://localhost:5173`.

## 📦 Deployment Process
Deployment follows a "Source-to-Main" strategy:
1. Make changes in the `source` branch.
2. Build the production bundle: `npm run build`.
3. The contents of the `dist/` folder are then pushed to the root of the `main` branch to update the live site.

## 👤 Contact
**Harsh**  
PhD Student @ IISER Bhopal  
Quantum Computing | Measurement-Based QC | Error Correction

---
*Built with precision and a passion for the quantum world.*
