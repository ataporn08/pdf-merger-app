# PDF Merger App

A modern web-based PDF merging application built with React and Vite.

## Features

- 🎨 Beautiful dark-themed UI with glassmorphism effects
- 📁 Merge multiple PDF files into one
- 🔄 Group-based PDF organization
- 🖥️ Portable standalone HTML version included
- ⚡ Fast and responsive design

## Tech Stack

This application is built using:

- **React** - UI framework
- **Vite** - Build tool with HMR and Fast Refresh
- **pdf-lib** - PDF manipulation library
- **ESLint** - Code linting

## Quick Start

### Running the Application

Simply double-click `START_APP.bat` or run:

```bash
npm install
npm run dev
```

### Portable Version

For a server-less experience, open `PDF_Folder_Merger_Portable.html` directly in your browser.

## Development

Currently, two official Vite plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh
