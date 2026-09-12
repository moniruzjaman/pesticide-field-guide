import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  Database,
  Download,
  FileText,
  Filter,
  GitBranch,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  Sprout,
  X,
} from "lucide-react";

import { products, type CatalogProduct } from "@/data/products";

type Product = CatalogProduct;

type MoaGroup = {
  code: string;
  scheme: "IRAC" | "FRAC" | "HRAC";
  name: string;
  count: number;
  risk: string;
  partners: string;
  accent: string;
};

const moaGroups: MoaGroup[] = [
  { code: "IRAC 1B", scheme: "IRAC", name: "Organophosphates", count: 890, risk: "High", partners: "3A · 4A · 6 · 28", accent: "terracotta" },
  { code: "IRAC 3A", scheme: "IRAC", name: "Pyrethroids, Pyrethrins", count: 573, risk: "High", partners: "1B · 4A · 6", accent: "terracotta" },
  { code: "IRAC 4A", scheme: "IRAC", name: "Neonicotinoids", count: 210, risk: "Medium", partners: "1B · 6 · 28", accent: "terracotta" },
  { code: "FRAC 3", scheme: "FRAC", name: "DMI-fungicides", count: 182, risk: "High", partners: "M3 · M5 · 7", accent: "blue" },
  { code: "FRAC M3", scheme: "FRAC", name: "Dithiocarbamates", count: 124, risk: "Low", partners: "3 · 7 · 11", accent: "blue" },
  { code: "HRAC B", scheme: "HRAC", name: "Sulfonylureas", count: 96, risk: "High", partners: "G · K3 · non-chemical", accent: "green" },
  { code: "HRAC G", scheme: "HRAC", name: "EPSP synthase inhibitors", count: 44, risk: "Medium", partners: "B · K3 · cultivation", accent: "green" },
];

const fieldMap = [
  ["products", "One row per registered product", "product_id · trade_name · registration_no"],
  ["product_recommendations", "One row per crop–pest–dose", "crop · target_pest · dosage_rate"],
  ["moa_groups", "Controlled resistance lookup", "moa_code · risk_level · rotation_guidance"],
  ["product_moa", "Many-to-many mapping bridge", "product_id · moa_code · mapping_status"],
];

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return <div className="stat-block"><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-detail">{detail}</div></div>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export default function Home() {
  const [active, setActive] = useState("overview");
  const [query, setQuery] = useState("");
  const [scheme, setScheme] = useState("All systems");
  const [cropFilter, setCropFilter] = useState("All crops");
  const [pestFilter, setPestFilter] = useState("All pests");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [selected, setSelected] = useState<Product | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const bn = language === "bn";
  const copy = bn ? {
    overview: "সারসংক্ষেপ", products: "পণ্য খুঁজুন", rotation: "MoA ঘূর্ণন", model: "ডেটা মডেল", source: "উৎস নোট",
    eyebrow: "কৃষি সম্প্রসারণ কর্মকর্তাদের জন্য ব্যবহারিক রেফারেন্স", heroA: "পরের", heroB: "মোড অফ অ্যাকশন বেছে নিন।",
    heroLede: "নিবন্ধিত কীটনাশক, প্রতিরোধ ব্যবস্থাপনা গ্রুপ এবং ঘূর্ণন-সঙ্গীর মাঠ-উপযোগী সূচি—শেষ স্প্রের পরের সিদ্ধান্তের জন্য সাজানো।",
    finder: "পণ্য খুঁজুন", readRotation: "ঘূর্ণন গাইড পড়ুন", fieldNote: "মাঠ নোট ০১", sameTarget: "ভিন্ন গ্রুপ। একই লক্ষ্য।", rotationRec: "ঘূর্ণনই সুপারিশ।",
    approved: "অনুমোদিত পণ্য", mapped: "MoA-তে ম্যাপ করা", groups: "MoA গ্রুপ", rule: "সিদ্ধান্তের নিয়ম", never: "একই গ্রুপ পুনরাবৃত্তি নয়",
    logic: "মাঠের যুক্তি", guideAround: "গাইডটি সাজানো হয়েছে", nextSpray: "পরের স্প্রেকে ঘিরে।", seePartners: "ঘূর্ণন-সঙ্গী দেখুন",
    atGlance: "এক নজরে", startGroups: "যে গ্রুপগুলো মাঠের সিদ্ধান্তকে প্রভাবিত করে, সেখান থেকে শুরু করুন।", viewGroups: "সব গ্রুপ দেখুন",
    productTitle: "একটি নিবন্ধিত পণ্য খুঁজুন।", productDesc: "বাণিজ্যিক নাম, সক্রিয় উপাদান, ফসল, পোকা বা নিবন্ধন নম্বর দিয়ে খুঁজুন।",
    rotationTitle: "গ্রুপ বদলান।", rotationDesc: "শেষ স্প্রের গ্রুপটিকে বাদ দেওয়ার নিয়ম হিসেবে নিন। তারপর একই লক্ষ্য পূরণ করে এমন অন্য গ্রুপ বেছে নিন।",
    modelTitle: "সংযোগযোগ্য একটি মাঠ-গাইড।", modelDesc: "ওয়াইড CSV-এর সহজতা রাখুন, আর ভেতরের ডেটাবেসকে রাখুন নরমালাইজড ও অডিটযোগ্য।",
  } : {
    overview: "Overview", products: "Product finder", rotation: "MoA rotation", model: "Data model", source: "Source notes",
    eyebrow: "{copy.eyebrow}", heroA: "Choose the next", heroB: "mode of action.",
    heroLede: "{copy.heroLede}",
    finder: "Open product finder", readRotation: "Read rotation guide", fieldNote: "FIELD NOTE 01", sameTarget: "Different group. Same target.", rotationRec: "Rotation is the recommendation.",
    approved: "approved products", mapped: "mapped to MoA", groups: "MoA groups", rule: "decision rule", never: "never repeat a group",
    logic: "{copy.logic}", guideAround: "The guide is organized around the", nextSpray: "next spray.", seePartners: "See rotation partners",
    atGlance: "{copy.atGlance}", startGroups: "{copy.startGroups}", viewGroups: "View all groups",
    productTitle: "{copy.productTitle}", productDesc: "{copy.productDesc}",
    rotationTitle: "{copy.rotationTitle}", rotationDesc: "{copy.rotationDesc}",
    modelTitle: "{copy.modelTitle}", modelDesc: "{copy.modelDesc}",
  };

  const cropOptions = useMemo(() => ["All crops", ...Array.from(new Set(products.flatMap((p) => p.crop.split(" · ")).filter(Boolean)).values()).sort()], []);
  const pestOptions = useMemo(() => ["All pests", ...Array.from(new Set(products.flatMap((p) => p.pest.split(" · ")).filter(Boolean)).values()).sort()], []);
  const categoryOptions = useMemo(() => ["All categories", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)).values()).sort()], []);
  const filteredProducts = useMemo(() => products.filter((p) => {
    const q = query.toLowerCase();
    return (!q || [p.trade, p.ingredient, p.reg, p.crop, p.pest, p.moa].join(" ").toLowerCase().includes(q)) &&
      (scheme === "All systems" || p.moa.startsWith(scheme)) &&
      (cropFilter === "All crops" || p.crop.split(" · ").includes(cropFilter)) &&
      (pestFilter === "All pests" || p.pest.split(" · ").includes(pestFilter)) &&
      (categoryFilter === "All categories" || p.category === categoryFilter);
  }), [query, scheme, cropFilter, pestFilter, categoryFilter]);
  const clearFilters = () => { setQuery(""); setScheme("All systems"); setCropFilter("All crops"); setPestFilter("All pests"); setCategoryFilter("All categories"); };

  const navigate = (target: string) => { setActive(target); setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="brand-lockup" onClick={() => navigate("overview")} role="button" tabIndex={0}>
          <div className="brand-mark"><Sprout size={19} strokeWidth={1.8} /></div>
          <div><div className="brand-name">FIELD / GUIDE</div><div className="brand-sub">Resistance management series · 2026</div></div>
        </div>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation"><Menu size={20} /></button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`}>
          {[["overview", copy.overview], ["products", copy.products], ["rotation", copy.rotation], ["model", copy.model]].map(([id, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => navigate(id)}>{label}</button>)}
          <button className="nav-cta" onClick={() => document.getElementById("source-note")?.scrollIntoView({ behavior: "smooth" })}>{copy.source} <ArrowUpRight size={14} /></button>
            <button className="language-toggle" onClick={() => setLanguage(bn ? "en" : "bn")} aria-label="Toggle language">{bn ? "EN" : "বাংলা"}</button>
      </nav>
      </header>

      {active === "overview" && <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> {copy.eyebrow}</div>
            <h1>{copy.heroA}<br /><em>{copy.heroB}</em></h1>
            <p className="hero-lede">{copy.heroLede}</p>
            <div className="hero-actions"><button className="button-primary" onClick={() => navigate("products")}>{copy.finder} <ArrowUpRight size={16} /></button><button className="button-text" onClick={() => navigate("rotation")}>{copy.readRotation} <BookOpen size={15} /></button></div>
            <div className="hero-note"><ShieldCheck size={16} /><span>Always verify the current label, registration status, PHI, REI, and PPE before recommending.</span></div>
          </div>
          <div className="hero-visual" aria-label="Rice field detail">
            <div className="hero-image" />
            <div className="hero-caption"><span>{copy.fieldNote}</span><strong>{copy.sameTarget}</strong><small>{copy.rotationRec}</small></div>
            <div className="hero-stamp"><span>IRAC</span><b>FRAC</b><i>HRAC</i></div>
          </div>
        </section>
        <section className="stats-band"><Stat value="4,475" label="approved products" detail="underlying source statement" /><Stat value="97.5%" label="mapped to MoA" detail="4,361 products classified" /><Stat value="45" label="MoA groups" detail="IRAC · FRAC · HRAC" /><Stat value="01" label="decision rule" detail="never repeat a group" /></section>
        <section className="content-section split-section">
          <div className="section-intro"><span className="section-kicker">{copy.logic}</span><h2>{copy.guideAround} <em>{copy.nextSpray}</em></h2><p>Products are not the starting point. The starting point is the mode of action used last, the pest you still need to control, and a partner group that breaks the resistance cycle.</p><button className="button-outline" onClick={() => navigate("rotation")}>{copy.seePartners} <ArrowUpRight size={15} /></button></div>
          <div className="logic-card"><div className="logic-step"><span>01</span><div><b>Identify</b><p>Record the product and its MoA code.</p></div></div><div className="logic-line" /><div className="logic-step"><span>02</span><div><b>Separate</b><p>Exclude the previous group from the next spray.</p></div></div><div className="logic-line" /><div className="logic-step"><span>03</span><div><b>Rotate</b><p>Select a different group targeting the same pest.</p></div></div></div>
        </section>
        <section className="content-section moa-preview"><div className="section-heading"><div><span className="section-kicker">{copy.atGlance}</span><h2>{copy.startGroups}</h2></div><button className="button-text" onClick={() => navigate("rotation")}>{copy.viewGroups} <ArrowUpRight size={15} /></button></div><div className="moa-grid">{moaGroups.slice(0, 4).map((g) => <MoaCard key={g.code} group={g} onClick={() => navigate("rotation")} />)}</div></section>
      </main>}

      {active === "products" && <main className="workspace-page"><div className="page-heading"><div><span className="section-kicker">PRODUCT INDEX / SAMPLE DATA</span><h1>{copy.productTitle}</h1><p>{copy.productDesc}</p></div><div className="page-heading-mark"><Database size={22} /><span>CSV-ready<br />structure</span></div></div><div className="notice-bar"><CircleAlert size={16} /><span>Full approved-pesticide CSV loaded: 4,475 rows. MoA is shown as Unmapped because this source file does not include IRAC, FRAC, or HRAC codes.</span><button onClick={clearFilters}><RotateCcw size={14} /> Clear all filters</button></div><div className="finder-toolbar"><div className="search-wrap"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search trade name, AI, crop, pest…" /></div><span className="result-count">{filteredProducts.length} visible rows</span></div><div className="advanced-filter-row"><div className="filter-select"><Sprout size={15} /><select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>{cropOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div><div className="filter-select"><Activity size={15} /><select value={pestFilter} onChange={(e) => setPestFilter(e.target.value)}>{pestOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div><div className="filter-select"><Filter size={15} /><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div><div className="filter-select"><GitBranch size={15} /><select value={scheme} onChange={(e) => setScheme(e.target.value)}><option>All systems</option><option>IRAC</option><option>FRAC</option><option>HRAC</option><option>Unmapped</option></select><ChevronDown size={15} /></div></div><div className="active-filter-strip"><span>Filters / ফিল্টার</span>{[cropFilter, pestFilter, categoryFilter, scheme].filter((x) => !x.startsWith("All")).map((filter) => <button key={filter} onClick={() => filter === cropFilter ? setCropFilter("All crops") : filter === pestFilter ? setPestFilter("All pests") : filter === categoryFilter ? setCategoryFilter("All categories") : setScheme("All systems")}>{filter} <X size={12} /></button>)}{[cropFilter, pestFilter, categoryFilter, scheme].every((x) => x.startsWith("All")) && <em>No filters applied</em>}</div><div className="product-table-wrap"><table className="product-table"><thead><tr><th>Product / active ingredient</th><th>Category</th><th>Registered</th><th>Crop / target</th><th>Dosage</th><th>MoA</th><th /></tr></thead><tbody>{filteredProducts.map((p) => <tr key={p.reg + p.trade} onClick={() => setSelected(p)}><td><div className="product-name">{p.trade}</div><div className="product-ai">{p.ingredient}</div></td><td><Badge tone={p.tone}>{p.category}</Badge></td><td className="mono">{p.reg}</td><td><div className="crop-text">{p.crop}</div><div className="pest-text">{p.pest}</div></td><td className="mono dosage">{p.dosage}</td><td><Badge tone={p.tone}>{p.moa}</Badge></td><td><ArrowUpRight className="row-arrow" size={16} /></td></tr>)}</tbody></table>{filteredProducts.length === 0 && <div className="empty-state"><Search size={28} /><h3>No matching rows</h3><p>Try a trade name, pest, crop, or MoA code.</p></div>}</div></main>}

      {active === "rotation" && <main className="workspace-page"><div className="page-heading"><div><span className="section-kicker">RESISTANCE MANAGEMENT / ROTATION MAP</span><h1>{copy.rotationTitle}</h1><p>{copy.rotationDesc}</p></div><div className="rotation-callout"><span>RULE OF THUMB</span><strong>Never apply<br />the same MoA twice.</strong></div></div><div className="rotation-tabs"><button className={scheme === "All systems" ? "active" : ""} onClick={() => setScheme("All systems")}>All systems</button><button className={scheme === "IRAC" ? "active" : ""} onClick={() => setScheme("IRAC")}>IRAC / insect</button><button className={scheme === "FRAC" ? "active" : ""} onClick={() => setScheme("FRAC")}>FRAC / fungi</button><button className={scheme === "HRAC" ? "active" : ""} onClick={() => setScheme("HRAC")}>HRAC / weeds</button></div><div className="rotation-grid">{moaGroups.filter((g) => scheme === "All systems" || g.scheme === scheme).map((g) => <MoaCard key={g.code} group={g} expanded />)}</div><div className="rotation-footer"><Activity size={18} /><div><b>High-risk groups need a partner, not a repeat.</b><p>For FRAC 1 and FRAC 11, no more than one third of total seasonal sprays should come from the same group. Alternate with a multi-site protectant or a different single-site MoA.</p></div></div></main>}

      {active === "model" && <main className="workspace-page"><div className="page-heading"><div><span className="section-kicker">CONNECTION LAYER / DATA MODEL</span><h1>{copy.modelTitle}</h1><p>{copy.modelDesc}</p></div><button className="button-primary download-button"><Download size={15} /> Download schema</button></div><div className="model-hero"><div className="model-hero-icon"><GitBranch size={22} /></div><div><span className="section-kicker">RECOMMENDED SHAPE</span><h2>One product. Many recommendations.<br /><em>One controlled lookup.</em></h2></div></div><div className="model-table"><div className="model-table-head"><span>TABLE</span><span>ROLE</span><span>KEY FIELDS</span></div>{fieldMap.map(([table, role, fields], i) => <div className="model-row" key={table}><div><span className={`table-index index-${i + 1}`}>0{i + 1}</span><b>{table}</b></div><span>{role}</span><code>{fields}</code><ArrowUpRight size={15} /></div>)}</div><div className="quality-grid"><div className="quality-card"><Check size={17} /><div><b>Quality gates</b><p>Reject duplicate registration numbers, missing trade names, invalid MoA codes, and dosage values without units.</p></div></div><div className="quality-card warning"><CircleAlert size={17} /><div><b>Do not infer</b><p>Keep unmatched products. Never infer approval, safety, or label directions from a product name alone.</p></div></div></div></main>}

      <footer id="source-note"><div className="footer-main"><div><div className="brand-lockup footer-brand"><div className="brand-mark"><Sprout size={19} /></div><div><div className="brand-name">FIELD / GUIDE</div><div className="brand-sub">A working reference, not a label.</div></div></div><p>Built for agricultural extension work — where the safest recommendation is the one you can trace.</p></div><div className="footer-links"><span>Source notes</span><span>Data model</span><span>2026 edition</span></div></div><div className="footer-disclaimer"><FileText size={14} /><span>This guide is educational and not a regulatory document. Verify current registration status, label directions, dosage, PHI, REI, PPE, and local legal requirements with the pesticide authority.</span></div></footer>

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="product-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button><span className="section-kicker">PRODUCT DETAIL / SAMPLE ROW</span><h2>{selected.trade}</h2><p className="modal-subtitle">{selected.ingredient} · {selected.category}</p><div className="modal-grid"><div><span>Registration</span><b>{selected.reg}</b></div><div><span>Mode of action</span><b>{selected.moa}</b></div><div><span>Crop</span><b>{selected.crop}</b></div><div><span>Target</span><b>{selected.pest}</b></div><div><span>Dosage</span><b>{selected.dosage}</b></div><div><span>Status</span><b><Badge tone="green">Example only</Badge></b></div></div><div className="modal-note"><ShieldCheck size={16} /><span>Check the current product label before field use. This row is an example from the connection pack, not a live regulatory decision.</span></div></div></div>}
    </div>
  );
}

function MoaCard({ group, onClick, expanded = false }: { group: MoaGroup; onClick?: () => void; expanded?: boolean }) {
  return <button className={`moa-card ${expanded ? "expanded" : ""}`} onClick={onClick} style={{ "--card-accent": group.accent === "terracotta" ? "#bd6244" : group.accent === "blue" ? "#527d8c" : "#5f7a54" } as CSSProperties}><div className="moa-top"><Badge tone={group.accent}>{group.code}</Badge><span>{group.count} products <ArrowUpRight size={13} /></span></div><h3>{group.name}</h3><div className="moa-meta"><span>Resistance risk <b>{group.risk}</b></span><span>Rotate with <b>{group.partners}</b></span></div><div className="moa-bar"><span style={{ width: `${Math.min(100, Math.round(group.count / 9))}%` }} /></div></button>;
}

export { Home };
