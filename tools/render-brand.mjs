/* Renders the brand assets from docs/brand/icon.svg. */
import { chromium } from "playwright";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const brand = resolve(root, "docs/brand");
mkdirSync(brand, { recursive: true });

const icon = readFileSync(resolve(brand, "icon.svg"), "utf8");
const candidate = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(candidate) ? { executablePath: candidate } : {});

const shoot = async (html, width, height, file, scale = 1) => {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  await page.setContent(html);
  await page.screenshot({ path: resolve(brand, file), omitBackground: true });
  await page.close();
};

const bare = (size) =>
  `<body style="margin:0"><div style="width:${size}px;height:${size}px">${icon}</div></body>`;

for (const size of [512, 256, 128, 64, 32]) {
  await shoot(bare(size), size, size, size === 32 ? "favicon-32.png" : `icon-${size}.png`);
}

const font =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'DejaVu Sans',Helvetica,Arial,sans-serif";

// horizontal wordmark, transparent background, one variant per theme
const wordmark = (title, subtitle) => `<body style="margin:0">
     <div style="display:flex;align-items:center;gap:28px;height:220px;padding:0 8px;font-family:${font}">
       <div style="width:180px;height:180px;flex:none">${icon}</div>
       <div>
         <div style="font-size:58px;font-weight:800;letter-spacing:-1.5px;line-height:1.05;color:${title}">
           Heat Pump <span style="color:#e35d3f">Flow</span> Card
         </div>
         <div style="font-size:23px;color:${subtitle};margin-top:8px">
           An animated hydraulic scheme for Home&nbsp;Assistant
         </div>
       </div>
     </div>
   </body>`;

await shoot(wordmark("#0f2136", "#5b6b7d"), 1000, 220, "logo.png", 2);
await shoot(wordmark("#e8f1fa", "#93a7ba"), 1000, 220, "logo-dark.png", 2);

// the same wordmark on its own plate. Markdown renderers that drop <picture>
// cannot switch per theme, so the READMEs use this one: it stays readable on a
// light and on a dark page alike.
const plate = `<body style="margin:0">
     <div style="width:1000px;height:220px;box-sizing:border-box;border-radius:30px;
                 background:linear-gradient(135deg,#12283e,#060d15);
                 display:flex;align-items:center;gap:28px;padding:0 46px;font-family:${font}">
       <div style="width:172px;height:172px;flex:none">${icon}</div>
       <div>
         <div style="font-size:56px;font-weight:800;letter-spacing:-1.5px;line-height:1.05;color:#e8f1fa">
           Heat Pump <span style="color:#ff7a5c">Flow</span> Card
         </div>
         <div style="font-size:22px;color:#9db4c8;margin-top:8px">
           An animated hydraulic scheme for Home&nbsp;Assistant
         </div>
       </div>
     </div>
   </body>`;

await shoot(plate, 1000, 220, "logo-plate.png", 2);

// GitHub social preview
await shoot(
  `<body style="margin:0">
     <div style="width:1280px;height:640px;background:linear-gradient(135deg,#12283e,#060d15);
                 color:#e8f1fa;font-family:${font};display:flex;align-items:center;gap:64px;
                 padding:0 92px;box-sizing:border-box;position:relative;overflow:hidden">
       <svg width="1280" height="640" viewBox="0 0 1280 640"
            style="position:absolute;inset:0;opacity:.22">
         <g fill="none" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
           <path d="M-40 96 H 176 Q 216 96 216 136 V 300" stroke="#ef4444"/>
           <path d="M-40 176 H 96 Q 136 176 136 216 V 470 Q 136 510 176 510 H 460"
                 stroke="#38bdf8"/>
           <path d="M1320 150 H 1150 Q 1110 150 1110 190 V 560 H 700" stroke="#fbbf24"/>
         </g>
         <g fill="#ffffff" opacity=".5">
           <circle cx="216" cy="230" r="6"/><circle cx="136" cy="330" r="6"/>
           <circle cx="1110" cy="330" r="6"/><circle cx="900" cy="560" r="6"/>
         </g>
       </svg>
       <div style="width:296px;height:296px;flex:none;position:relative">${icon}</div>
       <div style="position:relative;max-width:640px">
         <div style="font-size:78px;font-weight:800;letter-spacing:-2.5px;line-height:1.0">
           Heat Pump<br /><span style="color:#ff7a5c">Flow</span> Card
         </div>
         <div style="font-size:28px;color:#9db4c8;margin-top:26px;line-height:1.4">
           Heat pump, tanks, PV, solar thermal and up to seven heating circuits —
           animated, and operable by tapping.
         </div>
         <div style="margin-top:30px;font-size:22px;color:#6f88a0">
           github.com/Xerolux/heatpump-flow-card
         </div>
       </div>
     </div>
   </body>`,
  1280,
  640,
  "social-preview.png"
);

await browser.close();
console.log("brand assets written to docs/brand");
