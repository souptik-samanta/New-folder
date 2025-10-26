import './style.css'
import React from "react";
import { createRoot } from "react-dom/client";
import BarcodeMaker3x5 from "./BarcodeMaker3x5";

function mountBarcodeMaker() {
  let appEl = document.querySelector<HTMLDivElement>('#app')!;
  if (!appEl) {
    // create a fallback mount node if #app is not present
    appEl = document.createElement('div') as HTMLDivElement;
    appEl.id = 'app';
    document.body.appendChild(appEl);
  }

  // Mount only the barcode maker (no step counter or logos)
  createRoot(appEl).render(React.createElement(BarcodeMaker3x5));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountBarcodeMaker);
} else {
  mountBarcodeMaker();
}
