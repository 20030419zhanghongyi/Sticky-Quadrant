# Sticky Quadrant（便签四象限）

<p align="center">
  <img width="625" height="182" alt="Sticky Quadrant" src="https://github.com/user-attachments/assets/42c96eb6-c64d-4577-8299-65361e205934" />
</p>

Sticky Quadrant is a lightweight Windows desktop task manager built with **Electron + React + Vite**.

Its core interaction model is simple:

- a compact sticky-note widget stays in the **top-right corner** of your desktop
- one click expands it into a **full-screen four-quadrant workspace**
- tasks can be **created, dragged, ranked, deleted, and persisted locally**

This repository is primarily a **desktop application repository**, not a normal web-only project.

---

## Why Sticky Quadrant

Most to-do tools are good at storing tasks, but bad at helping you **see priorities at a glance** while you work.

Sticky Quadrant is designed around a three-step interaction loop:

**Reminder → Focus → Decision**

- **Reminder**: a compact sticky widget remains visible on the desktop
- **Focus**: tasks stay within view while you work
- **Decision**: switch into the quadrant workspace to sort tasks by urgency and importance

The goal is not to become a heavy project-management system, but to be a small, always-available prioritization tool for daily work.

---

## Core Features

- **Compact sticky-note widget** in the top-right corner
- **Full-screen four-quadrant workspace**
- **Drag-and-drop task cards**
- **Urgency / importance based prioritization**
- **Local persistence**
- **Desktop-first workflow**
- **Windows packaging support**
- **GitHub Pages showcase + GitHub Actions release automation**

---

## Screenshots

### 1. Compact sticky widget
Top-right desktop sticky note for low-friction task visibility.

<p align="center">
  <img width="1280" height="800" alt="Compact sticky widget" src="https://github.com/user-attachments/assets/55ff79d9-80d9-4099-b089-d79d76762dd7" />
</p>

### 2. Full-screen quadrant workspace
A focused workspace for sorting tasks into urgency / importance quadrants.

<p align="center">
  <img width="1280" height="800" alt="Quadrant workspace" src="https://github.com/user-attachments/assets/f3b0cddc-074d-4f68-acb0-f61bac0bf659" />
</p>

---

## Access Points

- **Online showcase page**  
  `https://20030419zhanghongyi.github.io/Sticky-Quadrant/`

- **Latest Windows release**  
  `https://github.com/20030419zhanghongyi/Sticky-Quadrant/releases/latest`

- **Repository**  
  `https://github.com/20030419zhanghongyi/Sticky-Quadrant`

---

## Tech Stack

- **Electron**
- **React**
- **Vite**
- **TypeScript**
- **electron-builder**

---

## Local Development

### 1. Install dependencies

```powershell
npm ci
2. Run the app in development mode
npm run dev
Other useful commands
npm run dev:renderer
npm run start
Build and Packaging
Build the renderer
npm run build:renderer
Build Windows artifacts
npm run pack:win
Optional packaging commands
npm run pack:win:nsis
npm run pack:win:portable
Output directory
release/
Current Windows artifacts
Sticky-Quadrant-Setup-<version>-x64.exe
Sticky-Quadrant-Portable-<version>-x64.exe
Delivery Model

This project uses a split delivery model:

GitHub Pages hosts the static showcase page from docs/
GitHub Actions builds Windows artifacts when a version tag is pushed
GitHub Releases hosts downloadable Windows builds

Important:
The GitHub Pages site is only a showcase page, not the production runtime of the desktop application.

Release Automation

Tag pushes matching v* trigger the automated Windows release workflow.

Example:

git tag v0.1.0
git push origin v0.1.0

The release workflow will:

Install dependencies
Build the renderer
Package the Electron app for Windows
Create or update the GitHub Release
Upload the generated .exe files
Repository Structure
.
├─ electron/              # Electron main process and preload bridge
├─ src/                   # React renderer source
├─ docs/                  # GitHub Pages showcase site
├─ .github/workflows/     # Release and Pages automation
├─ release/               # Local packaged outputs
├─ build/icons/           # Packaging icon assets
├─ package.json
└─ README.md
Notes
This is a desktop-first project.
The GitHub Pages site is for presentation and download guidance only.
The current release flow does not include Windows code signing.
If placeholder screenshots are still present in the showcase, they should be replaced with real product captures later.
Roadmap

Planned / possible future improvements:

better task editing flow
improved visual consistency across all UI states
keyboard shortcuts for fast task creation
smoother state transitions between sticky mode and quadrant mode
richer persistence and recovery
optional themes / customization
Author

Zhang Hongyi

Email: 20030419zhanghongyi@gmail.com
GitHub: https://github.com/20030419zhanghongyi
Additional Documentation
DEPLOYMENT.md
RELEASE_SUMMARY.md

然后你现在这样处理冲突最省事：

```bash
git checkout --theirs README.md

别用这个了，因为我要你用新内容直接覆盖。
你现在直接：

用我上面这版内容覆盖 README.md
保存
执行：
git add README.md
git rebase --continue

如果 rebase 顺利结束，再继续：

git push origin main
git tag v0.1.0
git push origin v0.1.0

如果你愿意，我下一条可以直接继续帮你写一版 更像开源项目首页、会更容易拿 star 的 README 文案风格。

给我一个完整的，可以一次粘贴的md格式的readme
Thought for 4s
# Sticky Quadrant（便签四象限）

<p align="center">
  <img width="625" height="182" alt="Sticky Quadrant" src="https://github.com/user-attachments/assets/42c96eb6-c64d-4577-8299-65361e205934" />
</p>

<p align="center">
  A lightweight desktop task manager that combines a sticky-note widget with a full-screen urgency/importance quadrant workspace.
</p>

---

## Overview

Sticky Quadrant is a lightweight **Windows desktop task management tool** built with **Electron + React + Vite**.

It is designed around a simple interaction flow:

- a compact sticky-note widget stays in the **top-right corner**
- one click expands it into a **full-screen four-quadrant workspace**
- tasks can be **created, dragged, ranked, deleted, and stored locally**

This repository is primarily a **desktop application repository**, not a typical web-only project.

---

## Why Sticky Quadrant

Most to-do tools are good at collecting tasks, but not great at helping you **see priorities instantly while working**.

Sticky Quadrant focuses on a small but useful loop:

**Reminder → Focus → Decision**

- **Reminder**: a compact sticky widget remains visible on the desktop
- **Focus**: tasks stay within sight during work
- **Decision**: switch into the quadrant workspace to sort tasks by urgency and importance

The goal is not to become a heavy project-management platform.  
The goal is to be a **small, always-available prioritization tool** for daily work.

---

## Core Features

- Compact sticky-note widget in the top-right corner
- Full-screen urgency/importance quadrant workspace
- Drag-and-drop task cards
- Visual priority sorting
- Local persistence
- Desktop-first interaction model
- Windows installer and portable executable packaging
- GitHub Pages showcase + GitHub Actions release automation

---

## Screenshots

### 1. Compact sticky widget

Top-right desktop sticky note for low-friction task visibility.

<p align="center">
  <img width="1280" height="800" alt="Compact sticky widget" src="https://github.com/user-attachments/assets/55ff79d9-80d9-4099-b089-d79d76762dd7" />
</p>

### 2. Full-screen quadrant workspace

A focused workspace for sorting tasks into urgency / importance quadrants.

<p align="center">
  <img width="1280" height="800" alt="Quadrant workspace" src="https://github.com/user-attachments/assets/f3b0cddc-074d-4f68-acb0-f61bac0bf659" />
</p>

### 3. Expanded workspace / in-context working state

The task panel stays visible while you work, making prioritization easier without losing context.

<p align="center">
  <img width="1280" height="800" alt="Expanded workspace" src="https://github.com/user-attachments/assets/f3b0cddc-074d-4f68-acb0-f61bac0bf659" />
</p>

---

## Access Points

- **Online showcase page**  
  `https://20030419zhanghongyi.github.io/Sticky-Quadrant/`

- **Latest Windows release**  
  `https://github.com/20030419zhanghongyi/Sticky-Quadrant/releases/latest`

- **Repository**  
  `https://github.com/20030419zhanghongyi/Sticky-Quadrant`

---

## Tech Stack

- **Electron**
- **React**
- **Vite**
- **TypeScript**
- **electron-builder**

---

## Local Development

### 1. Install dependencies

```powershell
npm ci
2. Run the app in development mode
npm run dev
Other useful commands
npm run dev:renderer
npm run start
Build and Packaging
Build the renderer
npm run build:renderer
Build Windows artifacts
npm run pack:win
Optional packaging commands
npm run pack:win:nsis
npm run pack:win:portable
Output directory
release/
Current Windows artifacts
Sticky-Quadrant-Setup-<version>-x64.exe
Sticky-Quadrant-Portable-<version>-x64.exe
Delivery Model

This project uses a split delivery model:

GitHub Pages hosts the static showcase page from docs/
GitHub Actions builds Windows artifacts when a version tag is pushed
GitHub Releases hosts downloadable Windows builds

Important:
The GitHub Pages site is only a showcase page, not the production runtime of the desktop application.

Release Automation

Tag pushes matching v* trigger the automated Windows release workflow.

Example:

git tag v0.1.0
git push origin v0.1.0

The release workflow will:

Install dependencies
Build the renderer
Package the Electron app for Windows
Create or update the GitHub Release
Upload the generated .exe files
Repository Structure
.
├─ .github/workflows/     # GitHub Actions for Pages and Windows release
├─ docs/                  # GitHub Pages showcase site
├─ electron/              # Electron main process and preload bridge
├─ src/                   # React renderer source
├─ release/               # Local packaged outputs
├─ build/icons/           # Packaging icon assets
├─ package.json
└─ README.md
Notes
This is a desktop-first project.
The GitHub Pages site is for presentation and download guidance only.
The current release flow does not include Windows code signing.
If placeholder screenshots are still present in the showcase, they should be replaced with real product captures later.
Roadmap

Possible future improvements:

better task editing flow
improved visual consistency across all UI states
keyboard shortcuts for fast task creation
smoother transitions between sticky mode and quadrant mode
richer persistence and recovery
optional themes and customization
Author

Zhang Hongyi

Email: 20030419zhanghongyi@gmail.com
GitHub: https://github.com/20030419zhanghongyi
Additional Documentation
DEPLOYMENT.md
RELEASE_SUMMARY.md