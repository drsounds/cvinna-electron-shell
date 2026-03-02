# Cvinna.se – Electron-app

En enkel Electron-app som visar [cvinna.se](https://www.cvinna.se) i ett fönster.

## Krav

- Node.js (t.ex. v18 eller senare)
- npm

## Installation

```bash
cd cvinna-electron
npm install
```

## Köra appen

```bash
npm start
```

För utveckling med öppen DevTools:

```bash
npm run dev
```

## Projektstruktur

- `main.js` – Electron main process, skapar fönstret och laddar cvinna.se
- `package.json` – beroenden och skript

Lägg gärna till en `icon.png` i projektmappen om du vill ha en egen app-ikon.
