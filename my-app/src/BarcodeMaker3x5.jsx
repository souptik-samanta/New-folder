import React, { useRef, useState, useEffect } from "react";
// 3x5cm Barcode Generator Webapp (single-file React component)
// Uses `jsbarcode` (npm package) to render barcodes into an SVG,
// then rasterizes the SVG to a downloadable PNG sized for printing.

// Installation notes (if running locally):
// npm install jsbarcode

import JsBarcode from "jsbarcode";

export default function BarcodeMaker3x5() {
  const svgRef = useRef(null);
  const [value, setValue] = useState("ABC-12345");
  const [format, setFormat] = useState("CODE128");
  const [dpi, setDpi] = useState(300); // print DPI used for PNG export
  const [includeText, setIncludeText] = useState(true);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");

  // Physical size (cm)
  const widthCm = 5;
  const heightCm = 3;

  // regenerate barcode SVG whenever inputs change
  useEffect(() => {
    renderBarcode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, format, includeText]);

  function renderBarcode() {
    setError("");
    if (!svgRef.current) return;
    try {
      // Clear previous svg children
      while (svgRef.current.firstChild) svgRef.current.removeChild(svgRef.current.firstChild);

      // Create a fresh <svg> element for JsBarcode to populate
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgRef.current.appendChild(svg);

      JsBarcode(svg, value || " ", {
        format: format,
        displayValue: includeText,
        width: 2, // module width in px (JsBarcode px units -- we rasterize later)
        height: 60, // visual height in px for svg (will scale when rasterizing)
        margin: 8,
        fontSize: 14,
      });
    } catch (e) {
      console.error(e);
      setError("Unable to render barcode with the current settings.");
    }
  }

  async function exportPNG() {
    setError("");
    if (!svgRef.current) {
      setError("No barcode to export.");
      return;
    }

    // Get the inner svg element (created by JsBarcode)
    const svgEl = svgRef.current.querySelector("svg");
    if (!svgEl) {
      setError("SVG not found.");
      return;
    }

    // Compute pixel size for desired physical size and DPI
    const pxPerCm = dpi / 2.54; // 1 inch = 2.54 cm
    const w = Math.round(widthCm * pxPerCm);
    const h = Math.round(heightCm * pxPerCm);

    // Inline svg to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
      const img = new Image();
      // Ensure proper CORS handling
      img.crossOrigin = "anonymous";
      const imgLoad = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });
      img.src = url;
      await imgLoad;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      // white background for printing
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the SVG image onto the canvas, scaled to fit while preserving aspect ratio
      // We want the barcode centered and with a small padding
      const pad = Math.round(Math.min(w, h) * 0.04);
      const drawW = w - pad * 2;
      const drawH = h - pad * 2;

      // compute scale to fit svg image into drawW/drawH
      const scale = Math.min(drawW / img.width, drawH / img.height);
      const finalW = Math.round(img.width * scale);
      const finalH = Math.round(img.height * scale);
      const dx = Math.round((w - finalW) / 2);
      const dy = Math.round((h - finalH) / 2);

      ctx.drawImage(img, dx, dy, finalW, finalH);

      // Create PNG blob and downloadable URL
      const pngBlob = await new Promise((res) => canvas.toBlob(res, "image/png", 1));
      const pngUrl = URL.createObjectURL(pngBlob);
      setDownloadUrl(pngUrl);

      // revoke temp svg url
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("Export failed. Try reducing DPI or changing the barcode format.");
      URL.revokeObjectURL(url);
    }
  }

  function handleDownload() {
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${value || "barcode"}_${widthCm}x${heightCm}cm.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="min-h-screen py-8 px-6 bg-gray-50 flex items-start justify-center">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">3&nbsp;×&nbsp;5 cm Barcode Maker</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">ID / Data</label>
            <input
              className="mt-1 block w-full rounded p-2 border"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter tracking ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Barcode Format</label>
            <select
              className="mt-1 block w-full rounded p-2 border"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option>CODE128</option>
              <option>EAN13</option>
              <option>UPC</option>
              <option>CODE39</option>
              <option>ITF</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">DPI (for export)</label>
            <input
              type="number"
              min={72}
              max={1200}
              className="mt-1 block w-full rounded p-2 border"
              value={dpi}
              onChange={(e) => setDpi(Number(e.target.value))}
            />
            <p className="text-xs text-gray-500 mt-1">300 DPI is recommended for good print quality.</p>
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-medium">Options</label>
            <div className="flex items-center gap-4 mt-1">
              <label className="inline-flex items-center">
                <input type="checkbox" className="mr-2" checked={includeText} onChange={(e) => setIncludeText(e.target.checked)} />
                Show human-readable text
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            <button
              onClick={renderBarcode}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:opacity-90"
            >
              Render
            </button>

            <button
              onClick={async () => { await exportPNG(); }}
              className="px-4 py-2 rounded border"
            >
              Export PNG ({widthCm}×{heightCm}cm)
            </button>

            {downloadUrl && (
              <button onClick={handleDownload} className="px-4 py-2 rounded bg-green-600 text-white">Download</button>
            )}

            <button
              onClick={() => window.print()}
              className="ml-auto px-4 py-2 rounded border"
            >
              Print (browser)
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-600 mb-2">Preview (on-screen size uses CSS cm units so it appears at about 5×3 cm on most displays):</p>

          <div className="border rounded p-4 inline-block" style={{ width: `${widthCm}cm`, height: `${heightCm}cm` }}>
            <div ref={svgRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
          </div>

          <p className="text-xs text-gray-500 mt-2">If the barcode looks too thin or thick when printed, adjust the module width or choose a different format. For guaranteed scanability, prefer CODE128 for arbitrary alphanumeric IDs.</p>
        </div>

        <div className="mt-6 text-sm text-gray-700">
          <strong>Notes:</strong>
          <ul className="list-disc ml-5 mt-2">
            <li>On-screen preview uses CSS <code>cm</code> so it approximates the real-world size on many displays — but exact on-screen size depends on screen DPI settings.</li>
            <li>The exported PNG will be rasterized at the DPI you choose (default 300 DPI) and sized to exactly 5×3 cm when printed at that DPI.</li>
            <li>Some barcode scanners are picky about quiet-zones and margins. If scans fail, increase the margin in the code (JsBarcode "margin" option).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
