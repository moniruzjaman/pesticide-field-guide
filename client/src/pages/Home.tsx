import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  GitBranch,
  Info,
  Layers3,
  Menu,
  RotateCcw,
  Search,
  ShieldCheck,
  Sprout,
  Store,
  Tractor,
  Users,
  X,
} from "lucide-react";
import { useLocation } from "wouter";

import { products, type CatalogProduct } from "@/data/products";
import { seedOrLoadCatalog } from "@/lib/catalogDb";

type Product = CatalogProduct;
type Section = "overview" | "products" | "rotation" | "model" | "source";
type Scheme = "All systems" | "IRAC" | "FRAC" | "HRAC" | "Unmapped";

type MoaGroup = {
  code: string;
  scheme: "IRAC" | "FRAC" | "HRAC";
  name: string;
  count: number;
  risk: string;
  partners: string;
  accent: "terracotta" | "blue" | "green";
};

const moaMeta: Record<string, Pick<MoaGroup, "name" | "risk" | "partners">> = {
  "IRAC 1A": { name: "Carbamates", risk: "High", partners: "3A · 4A · 6" },
  "IRAC 1B": { name: "Organophosphates", risk: "High", partners: "3A · 4A · 6 · 28" },
  "IRAC 3A": { name: "Pyrethroids, Pyrethrins", risk: "High", partners: "1B · 4A · 6" },
  "IRAC 4A": { name: "Neonicotinoids", risk: "Medium", partners: "1A · 6 · 28" },
  "IRAC 6": { name: "Avermectins, Milbemycins", risk: "Medium", partners: "1B · 3A · 28" },
  "IRAC 24A": { name: "Inorganic phosphides", risk: "Medium", partners: "1B · 3A · non-chemical" },
  "FRAC 1": { name: "MBC fungicides", risk: "High", partners: "M3 · 7 · 11" },
  "FRAC 2": { name: "Dicarboximides", risk: "Medium", partners: "M3 · M5 · 7" },
  "FRAC 3": { name: "DMI-fungicides", risk: "High", partners: "M3 · M5 · 7" },
  "FRAC M3": { name: "Dithiocarbamates", risk: "Low", partners: "3 · 7 · 11" },
  "HRAC 9": { name: "EPSP synthase inhibitors", risk: "Medium", partners: "14 · 15 · cultivation" },
  "HRAC 14": { name: "PPO inhibitors", risk: "Medium", partners: "9 · 15 · cultivation" },
  "HRAC 15": { name: "Long-chain fatty acid inhibitors", risk: "Medium", partners: "9 · 14 · cultivation" },
};

const fieldMap = [
  ["products", "One row per registered product entry", "productId · trade · ingredient · reg"],
  ["product_recommendations", "One row per crop–pest–dose relationship", "crop · pest · dosage"],
  ["moa_groups", "Controlled resistance lookup", "moaCode · scheme · risk"],
  ["product_moa", "Many-to-many mapping bridge", "productId · moaCodes · mappingStatus"],
] as const;

const schemeLabels: Record<Scheme, string> = {
  "All systems": "All systems",
  IRAC: "IRAC / insect",
  FRAC: "FRAC / fungi",
  HRAC: "HRAC / weeds",
  Unmapped: "Unmapped rows",
};

function splitValues(value: string) {
  return value.split(" · ").map((item) => item.trim()).filter(Boolean);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function buildMoaGroups(catalog: Product[]): MoaGroup[] {
  const codes = Array.from(new Set(catalog.flatMap((product) => product.moaCodes))).filter(Boolean);
  return codes
    .map((code) => {
      const scheme = code.startsWith("IRAC") ? "IRAC" : code.startsWith("FRAC") ? "FRAC" : "HRAC";
      const meta = moaMeta[code] ?? {
        name: "Controlled group",
        risk: "Review guidance",
        partners: "See source notes",
      };
      return {
        code,
        scheme,
        count: catalog.filter((product) => product.moaCodes.includes(code)).length,
        accent: scheme === "IRAC" ? "terracotta" : scheme === "FRAC" ? "blue" : "green",
        ...meta,
      } satisfies MoaGroup;
    })
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

function Stat({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="stat-block">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function sectionFromPath(pathname: string): Section {
  const path = pathname.replace(/\/$/, "");
  if (path === "/products") return "products";
  if (path === "/rotation") return "rotation";
  if (path === "/model") return "model";
  if (path === "/source") return "source";
  return "overview";
}

export default function Home() {
  const [location, setLocation] = useLocation();
  const active = sectionFromPath(location);
  const [query, setQuery] = useState("");
  const [scheme, setScheme] = useState<Scheme>("All systems");
  const [cropFilter, setCropFilter] = useState("All crops");
  const [pestFilter, setPestFilter] = useState("All pests");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [selected, setSelected] = useState<Product | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [page, setPage] = useState(1);
  const bn = language === "bn";
  const pageSize = 50;

  useEffect(() => {
    seedOrLoadCatalog(products)
      .then((saved) => {
        setCatalog(saved);
        setCatalogReady(true);
      })
      .catch(() => setCatalogReady(true));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, scheme, cropFilter, pestFilter, categoryFilter]);

  const copy = bn
    ? {
        overview: "সারসংক্ষেপ",
        products: "পণ্য খুঁজুন",
        rotation: "MoA ঘূর্ণন",
        model: "ডেটা মডেল",
        source: "উৎস নোট",
        eyebrow: "কৃষি সম্প্রসারণ কর্মকর্তাদের জন্য ব্যবহারিক রেফারেন্স",
        heroA: "পরের",
        heroB: "মোড অফ অ্যাকশন বেছে নিন।",
        heroLede: "নিবন্ধিত কীটনাশক, প্রতিরোধ ব্যবস্থাপনা গ্রুপ এবং ঘূর্ণন-সঙ্গীর মাঠ-উপযোগী সূচি—শেষ স্প্রের পরের সিদ্ধান্তের জন্য সাজানো।",
        finder: "পণ্য খুঁজুন",
        readRotation: "ঘূর্ণন গাইড পড়ুন",
        fieldNote: "মাঠ নোট ০১",
        sameTarget: "ভিন্ন গ্রুপ। একই লক্ষ্য।",
        rotationRec: "ঘূর্ণনই সুপারিশ।",
        approved: "ক্যাটালগ রো",
        mapped: "MoA-তে ম্যাপ করা",
        groups: "MoA গ্রুপ",
        coverage: "ফসল / পোকা লিংক",
        logic: "মাঠের যুক্তি",
        guideAround: "গাইডটি সাজানো হয়েছে",
        nextSpray: "পরের স্প্রেকে ঘিরে।",
        seePartners: "ঘূর্ণন-সঙ্গী দেখুন",
        atGlance: "এক নজরে",
        startGroups: "যে গ্রুপগুলো মাঠের সিদ্ধান্তকে প্রভাবিত করে, সেখান থেকে শুরু করুন।",
        viewGroups: "সব গ্রুপ দেখুন",
        productTitle: "একটি নিবন্ধিত পণ্য খুঁজুন।",
        productDesc: "বাণিজ্যিক নাম, সক্রিয় উপাদান, ফসল, পোকা বা নিবন্ধন নম্বর দিয়ে খুঁজুন।",
        rotationTitle: "গ্রুপ বদলান।",
        rotationDesc: "শেষ স্প্রের গ্রুপটিকে বাদ দেওয়ার নিয়ম হিসেবে নিন। তারপর একই লক্ষ্য পূরণ করে এমন অন্য গ্রুপ বেছে নিন।",
        modelTitle: "সংযোগযোগ্য একটি মাঠ-গাইড।",
        modelDesc: "v2 schema-র product, recommendation, MoA lookup এবং mapping bridge—সবকিছু একই সিদ্ধান্ত-প্রবাহে যুক্ত।",
        sourceTitle: "প্রতিটি সিদ্ধান্তের উৎস জানুন।",
        sourceDesc: "এই গাইডটি কোন ডেটা ধরে, কোন অংশ ম্যাপ করা, আর কোথায় আপনাকে লেবেল যাচাই করতে হবে—সেটি এক জায়গায় দেখুন।",
        personaKicker: "যাদের জন্য এই গাইড",
        personaTitle: "একই তথ্য। ভিন্ন প্রয়োজন।",
        personaOfficerTitle: "সম্প্রসারণ কর্মকর্তা",
        personaOfficerDesc: "মাঠ পরিদর্শনের সময় দ্রুত যাচাই করুন — নিবন্ধন নম্বর, বৈধ মাত্রা এবং প্রতিরোধ এড়াতে সঠিক ঘূর্ণন-সঙ্গী গ্রুপ। কৃষককে ভুল সুপারিশ দেওয়ার ঝুঁকি কমান।",
        personaRetailerTitle: "খুচরা বিক্রেতা ও ডিলার",
        personaRetailerDesc: "বিক্রির আগে নিশ্চিত হোন পণ্যটি নিবন্ধিত কিনা। কৃষককে একই মোড অফ অ্যাকশন বারবার বিক্রি করা এড়িয়ে দোকানে প্রতিরোধ-বান্ধব ঘূর্ণন-সঙ্গী মজুদ রাখুন।",
        personaFarmerTitle: "কৃষক",
        personaFarmerDesc: "ফসল ও পোকার নাম লিখে সহজে খুঁজুন। স্প্রে করার আগে নিরাপদ মাত্রা ও ফসল তোলার পূর্বের অপেক্ষার সময় (PHI) দেখে নিন — একই ওষুধ বারবার ব্যবহার এড়ান।",
      }
    : {
        overview: "Overview",
        products: "Product finder",
        rotation: "MoA rotation",
        model: "Data model",
        source: "Source notes",
        eyebrow: "A practical reference for agricultural extension officers",
        heroA: "Choose the next",
        heroB: "mode of action.",
        heroLede: "A field-ready index of registered pesticide entries, resistance groups, and rotation partners—organized around the decision after the last spray.",
        finder: "Open product finder",
        readRotation: "Read rotation guide",
        fieldNote: "FIELD NOTE 01",
        sameTarget: "Different group. Same target.",
        rotationRec: "Rotation is the recommendation.",
        approved: "catalog rows",
        mapped: "mapped to MoA",
        groups: "MoA groups",
        coverage: "crop / pest links",
        logic: "FIELD LOGIC",
        guideAround: "The guide is organized around the",
        nextSpray: "next spray.",
        seePartners: "See rotation partners",
        atGlance: "AT A GLANCE",
        startGroups: "Start with the groups that shape the field decision.",
        viewGroups: "View all groups",
        productTitle: "Find a registered product entry.",
        productDesc: "Search by trade name, active ingredient, crop, pest, registration number, or MoA code.",
        rotationTitle: "Change the group.",
        rotationDesc: "Treat the last spray group as an exclusion rule. Then choose another group that still targets the same pest.",
        modelTitle: "A field guide you can connect.",
        modelDesc: "The v2 schema connects product, recommendation, MoA lookup, and mapping bridge into one decision flow.",
        sourceTitle: "Trace every decision.",
        sourceDesc: "See what this guide is built from, which mappings are authoritative, and where the current label still matters.",
        personaKicker: "Who this is for",
        personaTitle: "Same data. Different job to do.",
        personaOfficerTitle: "Extension Officer",
        personaOfficerDesc: "Verify registration, legal dosage, and the right rotation partner in seconds during a field visit — before you recommend anything.",
        personaRetailerTitle: "Retailer & Dealer",
        personaRetailerDesc: "Confirm a product is registered before you sell it. Stock rotation-friendly partners instead of moving the same mode of action every season.",
        personaFarmerTitle: "Farmer",
        personaFarmerDesc: "Search by crop and pest. Check the safe dose and pre-harvest interval before you spray — and avoid using the same chemical again and again.",
      };

  const moaGroups = useMemo(() => buildMoaGroups(catalog), [catalog]);
  const stats = useMemo(() => {
    const mappedRows = catalog.filter((product) => product.mappingStatus === "mapped" || product.moaCodes.length > 0).length;
    const cropCount = new Set(catalog.flatMap((product) => splitValues(product.crop))).size;
    const pestCount = new Set(catalog.flatMap((product) => splitValues(product.pest))).size;
    return {
      rows: catalog.length,
      mappedRows,
      mappedPercent: catalog.length ? ((mappedRows / catalog.length) * 100).toFixed(1) : "0.0",
      groupCount: moaGroups.length,
      coverage: cropCount + pestCount,
      cropCount,
      pestCount,
    };
  }, [catalog, moaGroups.length]);

  const cropOptions = useMemo(
    () => ["All crops", ...Array.from(new Set(catalog.flatMap((product) => splitValues(product.crop)))).sort()],
    [catalog],
  );
  const pestOptions = useMemo(
    () => ["All pests", ...Array.from(new Set(catalog.flatMap((product) => splitValues(product.pest)))).sort()],
    [catalog],
  );
  const categoryOptions = useMemo(
    () => ["All categories", ...Array.from(new Set(catalog.map((product) => product.category).filter(Boolean))).sort()],
    [catalog],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return catalog.filter((product) => {
      const searchable = [
        product.productId,
        product.trade,
        product.ingredient,
        product.reg,
        product.holder,
        product.crop,
        product.pest,
        product.dosage,
        product.moa,
        ...product.moaCodes,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (scheme === "All systems" || (scheme === "Unmapped" ? product.mappingStatus === "unmapped" : product.moaCodes.some((code) => code.startsWith(scheme)))) &&
        (cropFilter === "All crops" || splitValues(product.crop).includes(cropFilter)) &&
        (pestFilter === "All pests" || splitValues(product.pest).includes(pestFilter)) &&
        (categoryFilter === "All categories" || product.category === categoryFilter)
      );
    });
  }, [catalog, query, scheme, cropFilter, pestFilter, categoryFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  const clearFilters = () => {
    setQuery("");
    setScheme("All systems");
    setCropFilter("All crops");
    setPestFilter("All pests");
    setCategoryFilter("All categories");
  };

  const navigate = (target: Section) => {
    setLocation(target === "overview" ? "/" : `/${target}`);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openRotationForGroup = (group: MoaGroup) => {
    setScheme(group.scheme);
    navigate("rotation");
  };

  const openProductsForGroup = (group: MoaGroup) => {
    setScheme(group.scheme);
    navigate("products");
  };

  const openMappedRows = () => {
    setScheme("All systems");
    setQuery("");
    navigate("products");
  };

  const downloadSchema = () => {
    const schema = {
      schemaVersion: "v2",
      name: "agrichem-pro-field-guide",
      generatedAt: new Date().toISOString(),
      tables: fieldMap.map(([table, role, fields]) => ({ table, role, fields: fields.split(" · ") })),
      productFields: ["productId", "trade", "ingredient", "category", "reg", "holder", "crop", "pest", "dosage", "moa", "moaCodes", "moaScheme", "mappingStatus", "mappingConfidence", "mappingSources", "sourceVersion", "sourceDate", "tone"],
    };
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agrichem-field-guide-v2-schema.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const renderFooter = () => (
    <footer id="source-note">
      <div className="footer-main">
        <div>
          <div className="brand-lockup footer-brand">
            <div className="brand-mark"><img className="brand-logo-image" src="/manus-storage/agrichem-pro-logo_5c407210.png" alt="AgriChem Pro logo" /></div>
            <div><div className="brand-name">FIELD / GUIDE</div><div className="brand-sub">A working reference, not a label.</div></div>
          </div>
          <p>Built for agricultural extension work — where the safest recommendation is the one you can trace.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => navigate("source")}>Source notes</button>
          <button onClick={() => navigate("model")}>Data model</button>
          <span>v2 · 2026 edition</span>
        </div>
      </div>
      <div className="footer-disclaimer">
        <FileText size={14} />
        <span>This guide is educational and not a regulatory document. Verify current registration status, label directions, dosage, PHI, REI, PPE, and local legal requirements with the pesticide authority.</span>
      </div>
    </footer>
  );

  return (
    <div className="site-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => navigate("overview")} aria-label="Go to overview">
          <div className="brand-mark"><img className="brand-logo-image" src="/manus-storage/agrichem-pro-logo_5c407210.png" alt="AgriChem Pro logo" /></div>
          <div><div className="brand-name">FIELD / GUIDE</div><div className="brand-sub">Resistance management series · v2</div></div>
        </button>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation"><Menu size={20} /></button>
        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`}>
          {([["overview", copy.overview], ["products", copy.products], ["rotation", copy.rotation], ["model", copy.model]] as [Section, string][]).map(([id, label]) => (
            <button key={id} className={active === id ? "active" : ""} onClick={() => navigate(id)}>{label}</button>
          ))}
          <button className={`nav-cta ${active === "source" ? "active" : ""}`} onClick={() => navigate("source")}>{copy.source} <ArrowUpRight size={14} /></button>
          <button className="language-toggle" onClick={() => setLanguage(bn ? "en" : "bn")} aria-label="Toggle language">{bn ? "EN" : "বাংলা"}</button>
        </nav>
      </header>

      {active === "overview" && (
        <main>
          <section className="hero-section">
            <div className="hero-copy">
              <div className="eyebrow"><span className="eyebrow-dot" /> {copy.eyebrow}</div>
              <h1>{copy.heroA}<br /><em>{copy.heroB}</em></h1>
              <p className="hero-lede">{copy.heroLede}</p>
              <div className="hero-actions">
                <button className="button-primary" onClick={() => navigate("products")}>{copy.finder} <ArrowUpRight size={16} /></button>
                <button className="button-text" onClick={() => navigate("rotation")}>{copy.readRotation} <BookOpen size={15} /></button>
              </div>
              <div className="hero-note"><ShieldCheck size={16} /><span>Always verify the current label, registration status, PHI, REI, and PPE before recommending.</span></div>
            </div>
            <div className="hero-visual" aria-label="Rice field detail">
              <div className="hero-image" />
              <div className="hero-caption"><span>{copy.fieldNote}</span><strong>{copy.sameTarget}</strong><small>{copy.rotationRec}</small></div>
              <div className="hero-stamp"><span>IRAC</span><b>FRAC</b><i>HRAC</i></div>
            </div>
          </section>
          <section className="stats-band">
            <button className="stat-block stat-button" onClick={openMappedRows}><Stat value={formatNumber(stats.rows)} label={copy.approved} detail="live v2 catalog entries" /></button>
            <button className="stat-block stat-button" onClick={openMappedRows}><Stat value={`${stats.mappedPercent}%`} label={copy.mapped} detail={`${formatNumber(stats.mappedRows)} entries with mapping links`} /></button>
            <button className="stat-block stat-button" onClick={() => navigate("rotation")}><Stat value={formatNumber(stats.groupCount)} label={copy.groups} detail="IRAC · FRAC · HRAC" /></button>
            <button className="stat-block stat-button" onClick={() => navigate("products")}><Stat value={formatNumber(stats.coverage)} label={copy.coverage} detail={`${stats.cropCount} crops · ${stats.pestCount} pests`} /></button>
          </section>
          <section className="content-section persona-section">
            <div className="section-heading"><div><span className="section-kicker">{copy.personaKicker}</span><h2>{copy.personaTitle}</h2></div></div>
            <div className="persona-grid">
              <div className="persona-card officer"><div className="persona-icon"><Users size={18} /></div><h3>{copy.personaOfficerTitle}</h3><p>{copy.personaOfficerDesc}</p></div>
              <div className="persona-card retailer"><div className="persona-icon"><Store size={18} /></div><h3>{copy.personaRetailerTitle}</h3><p>{copy.personaRetailerDesc}</p></div>
              <div className="persona-card farmer"><div className="persona-icon"><Tractor size={18} /></div><h3>{copy.personaFarmerTitle}</h3><p>{copy.personaFarmerDesc}</p></div>
            </div>
          </section>
          <section className="content-section split-section">
            <div className="section-intro">
              <span className="section-kicker">{copy.logic}</span>
              <h2>{copy.guideAround} <em>{copy.nextSpray}</em></h2>
              <p>Products are not the starting point. The starting point is the mode of action used last, the pest you still need to control, and a partner group that breaks the resistance cycle.</p>
              <button className="button-outline" onClick={() => navigate("rotation")}>{copy.seePartners} <ArrowUpRight size={15} /></button>
            </div>
            <div className="logic-card">
              <div className="logic-step"><span>01</span><div><b>Identify</b><p>Record the product and every MoA code attached to the v2 row.</p></div></div>
              <div className="logic-line" />
              <div className="logic-step"><span>02</span><div><b>Separate</b><p>Exclude the previous group from the next spray.</p></div></div>
              <div className="logic-line" />
              <div className="logic-step"><span>03</span><div><b>Rotate</b><p>Select a different group targeting the same pest.</p></div></div>
            </div>
          </section>
          <section className="content-section moa-preview">
            <div className="section-heading"><div><span className="section-kicker">{copy.atGlance}</span><h2>{copy.startGroups}</h2></div><button className="button-text" onClick={() => navigate("rotation")}>{copy.viewGroups} <ArrowUpRight size={15} /></button></div>
            <div className="moa-grid">{moaGroups.slice(0, 4).map((group) => <MoaCard key={group.code} group={group} onClick={() => openRotationForGroup(group)} />)}</div>
          </section>
        </main>
      )}

      {active === "products" && (
        <main className="workspace-page">
          <div className="page-heading"><div><span className="section-kicker">PRODUCT INDEX / V2 CATALOG</span><h1>{copy.productTitle}</h1><p>{copy.productDesc}</p></div><div className="page-heading-mark"><Database size={22} /><span>v2 schema<br />{catalogReady ? "database ready" : "loading catalog"}</span></div></div>
          <div className="notice-bar"><CircleAlert size={16} /><span>{formatNumber(stats.rows)} catalog rows loaded. {formatNumber(stats.mappedRows)} have IRAC, FRAC, or HRAC links; unmatched rows remain visible instead of being inferred.</span><button onClick={clearFilters}><RotateCcw size={14} /> Clear all filters</button></div>
          <div className="finder-toolbar"><div className="search-wrap"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, AI, holder, crop, pest, MoA…" /></div><span className="result-count">{formatNumber(filteredProducts.length)} matching · page {page} / {pageCount}</span></div>
          <div className="advanced-filter-row">
            <div className="filter-select"><Sprout size={15} /><select value={cropFilter} onChange={(event) => setCropFilter(event.target.value)}>{cropOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div>
            <div className="filter-select"><Activity size={15} /><select value={pestFilter} onChange={(event) => setPestFilter(event.target.value)}>{pestOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div>
            <div className="filter-select"><Filter size={15} /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{categoryOptions.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={15} /></div>
            <div className="filter-select"><GitBranch size={15} /><select value={scheme} onChange={(event) => setScheme(event.target.value as Scheme)}>{Object.entries(schemeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={15} /></div>
          </div>
          <div className="active-filter-strip"><span>Filters / ফিল্টার</span>{[cropFilter, pestFilter, categoryFilter, scheme].filter((value) => !value.startsWith("All")).map((filter) => <button key={filter} onClick={() => filter === cropFilter ? setCropFilter("All crops") : filter === pestFilter ? setPestFilter("All pests") : filter === categoryFilter ? setCategoryFilter("All categories") : setScheme("All systems")}>{filter} <X size={12} /></button>)}{[cropFilter, pestFilter, categoryFilter, scheme].every((value) => value.startsWith("All")) && <em>No filters applied</em>}</div>
          <div className="product-table-wrap"><table className="product-table"><thead><tr><th>Product / active ingredient</th><th>Category</th><th>Registered</th><th>Crop / target</th><th>Dosage</th><th>MoA</th><th /></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.productId} onClick={() => setSelected(product)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelected(product); }}><td><div className="product-name">{product.trade || "Unnamed entry"}</div><div className="product-ai">{product.ingredient || "Active ingredient not provided"} · {product.productId}</div></td><td><Badge tone={product.tone}>{product.category || "Uncategorised"}</Badge></td><td className="mono">{product.reg || "—"}</td><td><div className="crop-text">{product.crop || "—"}</div><div className="pest-text">{product.pest || "Target not provided"}</div></td><td className="mono dosage">{product.dosage || "—"}</td><td><Badge tone={product.tone}>{product.moa}</Badge></td><td><ArrowUpRight className="row-arrow" size={16} /></td></tr>)}</tbody></table>{filteredProducts.length === 0 && <div className="empty-state"><Search size={28} /><h3>No matching rows</h3><p>Try a trade name, pest, crop, holder, or MoA code.</p></div>}</div>
          {filteredProducts.length > 0 && <div className="pagination-row"><span>Showing {formatNumber((page - 1) * pageSize + 1)}–{formatNumber(Math.min(page * pageSize, filteredProducts.length))} of {formatNumber(filteredProducts.length)}</span><div><button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ArrowLeft size={14} /> Previous</button><button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next <ArrowUpRight size={14} /></button></div></div>}
        </main>
      )}

      {active === "rotation" && (
        <main className="workspace-page">
          <div className="page-heading"><div><span className="section-kicker">RESISTANCE MANAGEMENT / ROTATION MAP</span><h1>{copy.rotationTitle}</h1><p>{copy.rotationDesc}</p></div><div className="rotation-callout"><span>RULE OF THUMB</span><strong>Never apply<br />the same MoA twice.</strong></div></div>
          <div className="rotation-tabs">{(["All systems", "IRAC", "FRAC", "HRAC"] as Scheme[]).map((value) => <button key={value} className={scheme === value ? "active" : ""} onClick={() => setScheme(value)}>{schemeLabels[value]}</button>)}</div>
          <div className="rotation-grid">{moaGroups.filter((group) => scheme === "All systems" || group.scheme === scheme).map((group) => <MoaCard key={group.code} group={group} expanded onClick={() => openProductsForGroup(group)} />)}</div>
          <div className="rotation-footer"><Activity size={18} /><div><b>High-risk groups need a partner, not a repeat.</b><p>Use the product finder from any group card to see the v2 entries behind the group. Verify current label directions and local resistance guidance before field use.</p></div></div>
        </main>
      )}

      {active === "model" && (
        <main className="workspace-page">
          <div className="page-heading"><div><span className="section-kicker">CONNECTION LAYER / DATA MODEL</span><h1>{copy.modelTitle}</h1><p>{copy.modelDesc}</p></div><button className="button-primary download-button" onClick={downloadSchema}><Download size={15} /> Download v2 schema</button></div>
          <div className="model-hero"><div className="model-hero-icon"><GitBranch size={22} /></div><div><span className="section-kicker">RECOMMENDED SHAPE</span><h2>One product. Many recommendations.<br /><em>One controlled lookup.</em></h2></div></div>
          <div className="model-table"><div className="model-table-head"><span>TABLE</span><span>ROLE</span><span>KEY FIELDS</span><span /></div>{fieldMap.map(([table, role, fields], index) => <button className="model-row" key={table} onClick={() => table === "moa_groups" || table === "product_moa" ? navigate("rotation") : navigate("products")}><div><span className={`table-index index-${index + 1}`}>0{index + 1}</span><b>{table}</b></div><span>{role}</span><code>{fields}</code><ArrowUpRight size={15} /></button>)}</div>
          <div className="quality-grid"><div className="quality-card"><Check size={17} /><div><b>Quality gates</b><p>Reject duplicate registration numbers, missing trade names, invalid MoA codes, and dosage values without units. The finder surfaces gaps instead of hiding them.</p></div></div><div className="quality-card warning"><CircleAlert size={17} /><div><b>Do not infer</b><p>Keep unmatched products. Never infer approval, safety, or label directions from a product name alone.</p></div></div></div>
          <button className="cross-link" onClick={() => navigate("source")}><Info size={15} /> Read the source and mapping notes <ArrowUpRight size={14} /></button>
        </main>
      )}

      {active === "source" && (
        <main className="workspace-page">
          <div className="page-heading"><div><span className="section-kicker">TRACEABILITY / SOURCE NOTES</span><h1>{copy.sourceTitle}</h1><p>{copy.sourceDesc}</p></div><div className="page-heading-mark"><Layers3 size={22} /><span>v2 trace<br />{formatNumber(stats.mappedRows)} mapped rows</span></div></div>
          <div className="source-grid">
            <article className="source-card source-card-featured"><div className="source-card-icon"><Database size={19} /></div><span className="section-kicker">CATALOG LAYER</span><h2>Registered pesticide entries</h2><p>{formatNumber(stats.rows)} v2 rows preserve product, holder, crop, target, dosage, and registration details. The catalog stays searchable even when a row has no authoritative MoA match.</p><button className="button-outline" onClick={() => navigate("products")}>Browse catalog <ArrowUpRight size={15} /></button></article>
            <article className="source-card"><div className="source-card-icon"><GitBranch size={19} /></div><span className="section-kicker">MAPPING LAYER</span><h2>IRAC · FRAC · HRAC</h2><p>{formatNumber(stats.mappedRows)} rows carry one or more controlled MoA codes with mapping confidence, source version, and source date fields.</p><button className="button-text" onClick={() => navigate("rotation")}>Open rotation map <ArrowUpRight size={15} /></button></article>
            <article className="source-card"><div className="source-card-icon"><ShieldCheck size={19} /></div><span className="section-kicker">FIELD CHECK</span><h2>What still needs verification</h2><p>Current registration status, product label, dosage, PHI, REI, PPE, and local legal requirements must be checked before making a recommendation.</p><a className="button-text" href="https://irac-online.org/mode-of-action/" target="_blank" rel="noreferrer">View mapping reference <ExternalLink size={14} /></a></article>
          </div>
          <div className="source-note-panel"><FileText size={18} /><div><b>Traceability is a feature, not a footnote.</b><p>Each v2 row can retain its `mappingStatus`, `mappingConfidence`, `mappingSources`, `sourceVersion`, and `sourceDate`. When those fields are empty, the interface labels the row as unmapped instead of guessing.</p></div></div>
        </main>
      )}

      {renderFooter()}

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><div className="product-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button><span className="section-kicker">PRODUCT DETAIL / V2 ROW</span><h2>{selected.trade || "Unnamed entry"}</h2><p className="modal-subtitle">{selected.ingredient || "Active ingredient not provided"} · {selected.category || "Uncategorised"} · {selected.productId}</p><div className="modal-grid"><div><span>Registration</span><b>{selected.reg || "—"}</b></div><div><span>Mode of action</span><b>{selected.moa}</b><small className="mapping-detail">{selected.mappingStatus} · {selected.mappingConfidence} confidence</small></div><div><span>Crop</span><b>{selected.crop || "—"}</b></div><div><span>Target</span><b>{selected.pest || "—"}</b></div><div><span>Dosage</span><b>{selected.dosage || "—"}</b></div><div><span>Registration holder</span><b>{selected.holder || "—"}</b></div><div><span>Source version</span><b>{selected.sourceVersion || "Not mapped"}</b></div><div><span>Source date</span><b>{selected.sourceDate || "—"}</b></div></div><div className="modal-note"><ShieldCheck size={16} /><span>{selected.mappingSources.length ? `Mapping source: ${selected.mappingSources.join(" · ")}` : "No authoritative MoA mapping is attached to this row yet."} Check the current product label before field use.</span></div></div></div>}
    </div>
  );
}

function MoaCard({ group, onClick, expanded = false }: { group: MoaGroup; onClick?: () => void; expanded?: boolean }) {
  return (
    <button className={`moa-card ${expanded ? "expanded" : ""}`} onClick={onClick} style={{ "--card-accent": group.accent === "terracotta" ? "#bd6244" : group.accent === "blue" ? "#527d8c" : "#5f7a54" } as CSSProperties}>
      <div className="moa-top"><Badge tone={group.accent}>{group.code}</Badge><span>{formatNumber(group.count)} entries <ArrowUpRight size={13} /></span></div>
      <h3>{group.name}</h3>
      <div className="moa-meta"><span>Resistance risk <b>{group.risk}</b></span><span>Rotate with <b>{group.partners}</b></span></div>
      <div className="moa-bar"><span style={{ width: `${Math.min(100, Math.round(group.count / 9))}%` }} /></div>
      <small className="moa-card-link">Open linked product rows</small>
    </button>
  );
}

export { Home };
