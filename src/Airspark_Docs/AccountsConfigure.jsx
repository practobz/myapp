import { useState, useEffect } from "react";
// ─── HOOK ─────────────────────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}
// ─── NAV STRUCTURE ────────────────────────────────────────────────────────────

const LEFT_NAV = [
  { id: "before-you-start", label: "Before You Start" },
  { id: "create-facebook-page", label: "Create a Facebook Page" },
  { id: "convert-instagram", label: "Convert Instagram Account" },
  { id: "link-instagram-facebook", label: "Link Instagram to Facebook" },
  { id: "connect-to-portal", label: "Connect to AirSpark Portal" },
  { id: "quick-reference", label: "Quick Reference" },
];

const RIGHT_NAV = [
  { id: "before-you-start", label: "Before You Start" },
  { id: "create-facebook-page", label: "Create a Facebook Page" },
  { id: "convert-instagram", label: "Convert Instagram Account" },
  { id: "link-instagram-facebook", label: "Link Instagram to Facebook" },
  { id: "connect-to-portal", label: "Connect to AirSpark Portal" },
  { id: "quick-reference", label: "Quick Reference" },
];

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

const ChevronRight = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const WarningIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const TipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
  </svg>
);

// Platform badge
const PlatformBadge = ({ platform }) => {
  const map = {
    facebook: { bg: "#e7f3ff", color: "#1877f2", label: "Facebook" },
    instagram: { bg: "#fce4f8", color: "#c13584", label: "Instagram" },
    portal: { bg: "#e8f5e9", color: "#1b873f", label: "AirSpark Portal" },
  };
  const s = map[platform] || map.portal;
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      background: s.bg, color: s.color, fontSize: 12, fontWeight: 600,
    }}>{s.label}</span>
  );
};

// Step component with number badge
const Step = ({ number, children, platform }) => (
  <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
    <div style={{
      flexShrink: 0, width: 30, height: 30, borderRadius: "50%",
      background: "#1877f2", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 14, marginTop: 2,
    }}>{number}</div>
    <div style={{ flex: 1, paddingTop: 4 }}>
      {platform && <div style={{ marginBottom: 8 }}><PlatformBadge platform={platform} /></div>}
      <div style={{ color: "#1c1e21", fontSize: 15, lineHeight: 1.7 }}>{children}</div>
    </div>
  </div>
);

// Success callout
const Success = ({ children }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "#e8f5e9", border: "1px solid #81c784",
    borderRadius: 8, padding: "12px 16px", margin: "16px 0",
  }}>
    <span style={{ color: "#2e7d32", marginTop: 1, flexShrink: 0 }}><CheckIcon /></span>
    <span style={{ color: "#1b5e20", fontSize: 14, lineHeight: 1.6 }}>{children}</span>
  </div>
);

// Warning callout
const Warning = ({ title, children }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "#fff8e1", border: "1px solid #ffcc02",
    borderLeft: "4px solid #f9a825",
    borderRadius: 8, padding: "14px 16px", margin: "20px 0",
  }}>
    <span style={{ color: "#f57f17", marginTop: 1, flexShrink: 0 }}><WarningIcon /></span>
    <div>
      {title && <div style={{ fontWeight: 700, color: "#e65100", fontSize: 14, marginBottom: 4 }}>{title}</div>}
      <div style={{ color: "#7f4e00", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </div>
  </div>
);

// Info callout
const Info = ({ title, children }) => (
  <div style={{
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "#e7f3ff", borderLeft: "4px solid #1877f2",
    borderRadius: 8, padding: "14px 16px", margin: "20px 0",
  }}>
    <span style={{ color: "#1877f2", marginTop: 1, flexShrink: 0 }}><InfoIcon /></span>
    <div>
      {title && <div style={{ fontWeight: 700, color: "#0d47a1", fontSize: 14, marginBottom: 4 }}>{title}</div>}
      <div style={{ color: "#1a3a6b", fontSize: 14, lineHeight: 1.6 }}>{children}</div>
    </div>
  </div>
);

// Navigation path display (breadcrumb-style path in steps)
const NavPath = ({ steps }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 4,
    background: "#f0f2f5", borderRadius: 6, padding: "6px 12px",
    fontSize: 13, margin: "8px 0", fontFamily: "monospace",
  }}>
    {steps.map((s, i) => (
      <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ color: "#1877f2", fontWeight: 600 }}>{s}</span>
        {i < steps.length - 1 && <span style={{ color: "#bcc0c4" }}>→</span>}
      </span>
    ))}
  </div>
);

// Sub-bullet list
const SubList = ({ items }) => (
  <ul style={{ margin: "10px 0 10px 8px", padding: 0, listStyle: "none" }}>
    {items.map((item, i) => (
      <li key={i} style={{ display: "flex", gap: 10, marginBottom: 8, color: "#444950", fontSize: 14 }}>
        <span style={{ color: "#1877f2", marginTop: 6, fontSize: 8, flexShrink: 0 }}>●</span>
        <span style={{ lineHeight: 1.6 }}>{item}</span>
      </li>
    ))}
  </ul>
);

// Section headings
const H2 = ({ id, children }) => (
  <h2 id={id} style={{
    fontSize: 22, fontWeight: 700, color: "#1c1e21",
    margin: "44px 0 14px", paddingTop: 8, scrollMarginTop: 72,
    borderBottom: "2px solid #e4e6e8", paddingBottom: 10,
  }}>{children}</h2>
);

const H3 = ({ children }) => (
  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1c1e21", margin: "24px 0 10px" }}>{children}</h3>
);

const P = ({ children }) => (
  <p style={{ color: "#606770", lineHeight: 1.75, margin: "10px 0", fontSize: 15 }}>{children}</p>
);

const Divider = () => <hr style={{ border: "none", borderTop: "1px solid #e4e6e8", margin: "36px 0" }} />;

// Table
const Table = ({ headers, rows }) => (
  <div style={{ overflowX: "auto", margin: "20px 0", border: "1px solid #e4e6e8", borderRadius: 8 }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: "#f0f2f5", borderBottom: "1px solid #e4e6e8" }}>
          {headers.map((h) => (
            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, color: "#1c1e21", fontSize: 13 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #e4e6e8" : "none", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "12px 16px", color: j === 0 ? "#1c1e21" : "#606770", fontWeight: j === 0 ? 600 : 400, verticalAlign: "top" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Part header — numbered section divider
const PartHeader = ({ number, title, platform }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 14,
    background: "linear-gradient(135deg, #f0f2f5, #e7f3ff)",
    border: "1px solid #d8e4f0", borderRadius: 10,
    padding: "16px 20px", margin: "36px 0 24px",
  }}>
    <div style={{
      width: 38, height: 38, borderRadius: "50%",
      background: "#1877f2", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: 16, flexShrink: 0,
    }}>{number}</div>
    <div>
      <div style={{ fontSize: 11, color: "#8a8d91", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Part {number}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1c1e21" }}>{title}</div>
    </div>
    {platform && <div style={{ marginLeft: "auto" }}><PlatformBadge platform={platform} /></div>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AccountsConfigure({ onBack }) {
  const [activeId, setActiveId] = useState("before-you-start");
  const [helpfulVote, setHelpfulVote] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width < 1024;

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActiveId(e.target.id); });
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    document.querySelectorAll("section[id]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const goto = (id) => {
    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif", background: "#fff", minHeight: "100vh" }}>

      {/* ── TOP HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#fff", borderBottom: "1px solid #e4e6e8",
        minHeight: 60, display: "flex", alignItems: "center",
        padding: isMobile ? "0 12px" : "0 24px", gap: isMobile ? 8 : 16,
      }}>
        {/* Logo / Back */}
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
        >
          <img
            src="/logoAirspark.png"
            alt="AirSpark Logo"
            style={{ height: isMobile ? 48 : 85, width: "auto", display: "block" }}
          />
        </button>

        {/* Breadcrumb — hidden on mobile */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#606770" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "#606770", cursor: "pointer", padding: 0, fontSize: 13 }}>Docs</button>
            <ChevronRight />
            <span style={{ color: "#1c1e21", fontWeight: 500 }}>Accounts &amp; Configuration</span>
          </div>
        )}

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexShrink: 0 }}>
          {!isMobile && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#f0f2f5", border: "1px solid #e4e6e8",
              borderRadius: 6, padding: "7px 12px", width: 180,
            }}>
              <span style={{ color: "#8a8d91" }}><SearchIcon /></span>
              <span style={{ fontSize: 14, color: "#8a8d91" }}>Search...</span>
            </div>
          )}
          <a
            href="https://airspark.storage.googleapis.com/index.html#/customer/login"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: isMobile ? "7px 12px" : "7px 16px", borderRadius: 6,
              background: "#1877f2", color: "#fff",
              fontSize: isMobile ? 13 : 14, fontWeight: 600, textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {isMobile ? "Portal" : "Open Portal"}
            {!isMobile && <ExternalIcon />}
          </a>
        </div>
      </header>

      {/* ── THREE-COLUMN LAYOUT ── */}
      <div style={{ display: "flex" }}>

        {/* LEFT NAV — hidden on mobile */}
        {!isMobile && (
          <aside style={{
            width: 220, flexShrink: 0, position: "sticky", top: 60,
            maxHeight: "calc(100vh - 60px)", overflowY: "auto",
            padding: "24px 0", borderRight: "1px solid #e4e6e8",
          }}>
            <div style={{ fontWeight: 700, color: "#1c1e21", fontSize: 13, padding: "0 20px 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              On This Page
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {LEFT_NAV.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => goto(item.id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 20px", fontSize: 14,
                      background: "none", border: "none", cursor: "pointer",
                      borderLeft: activeId === item.id ? "3px solid #1877f2" : "3px solid transparent",
                      color: activeId === item.id ? "#1877f2" : "#606770",
                      fontWeight: activeId === item.id ? 600 : 400,
                      transition: "all 0.15s",
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* Related docs */}
            <div style={{ padding: "24px 20px 0", borderTop: "1px solid #e4e6e8", marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8a8d91", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Related</div>
              {[
                { label: "Facebook Integration", href: "#" },
                { label: "Instagram Integration", href: "#" },
                { label: "ROI Analytics", href: "#" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{ display: "block", fontSize: 13, color: "#1877f2", marginBottom: 8, textDecoration: "none" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </aside>
        )}

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? "20px 16px 48px" : "36px 48px 60px" }}>

          {/* Mobile table of contents */}
          {isMobile && (
            <div style={{ marginBottom: 24 }}>
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "10px 16px", borderRadius: 6, border: "1px solid #e4e6e8",
                  background: "#f0f2f5", color: "#1c1e21", fontSize: 14,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                <span>☰</span>
                Contents
                <span style={{ marginLeft: "auto", display: "inline-block", transform: mobileNavOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
              </button>
              {mobileNavOpen && (
                <div style={{
                  border: "1px solid #e4e6e8", borderTop: "none",
                  borderRadius: "0 0 6px 6px", background: "#fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}>
                  {LEFT_NAV.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => goto(item.id)}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "10px 16px", fontSize: 14, background: "none", border: "none",
                        borderBottom: "1px solid #e4e6e8", cursor: "pointer",
                        borderLeft: activeId === item.id ? "3px solid #1877f2" : "3px solid transparent",
                        color: activeId === item.id ? "#1877f2" : "#606770",
                        fontWeight: activeId === item.id ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Page title */}
          <div style={{ marginBottom: 8 }}>
            <PlatformBadge platform="portal" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1c1e21", margin: "12px 0 8px" }}>
            Accounts & Configuration Guide
          </h1>
          <P>
            This guide walks you through creating a Facebook Business Page, converting your Instagram to a Business account, linking both together, and finally connecting them to the AirSpark Customer Portal.
          </P>

          <Divider />

          {/* ── BEFORE YOU START ── */}
          <section id="before-you-start">
            <H2 id="before-you-start">⚠️ Before You Start</H2>
            <P>Please read these requirements carefully before proceeding. Skipping these steps is the most common reason integrations fail.</P>

            <Warning title="Facebook Posting Requirement">
              You must have a <strong>Facebook Page</strong>, not a personal Facebook account. Personal accounts <strong>cannot</strong> be used for business posting or analytics. A Page is a separate entity you create and manage from your personal account.
            </Warning>

            <Warning title="Instagram Posting Requirement">
              Your Instagram account must be a <strong>Business or Creator account</strong> AND it must be <strong>linked to your Facebook Page</strong>. A standalone personal Instagram account cannot be connected to the AirSpark portal.
            </Warning>

            <Info title="What you'll need">
              <SubList items={[
                "A personal Facebook account (to create and manage your Page)",
                "A Facebook Business Page (you'll create this below if you don't have one)",
                "An Instagram account (Business or Creator type)",
                "Admin access to your AirSpark Customer Portal",
              ]} />
            </Info>
          </section>

          <Divider />

          {/* ── PART 1: CREATE FACEBOOK PAGE ── */}
          <section id="create-facebook-page">
            <PartHeader number="1" title="Create a Facebook Page" platform="facebook" />

            <P>A Facebook Page represents your business on Facebook. It is separate from your personal profile and is required for all business posting and analytics.</P>

            <H3>Step-by-Step Instructions</H3>

            <Step number={1} platform="facebook">
              <strong>Log in to Facebook</strong>
              <br />
              Go to <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: "#1877f2" }}>facebook.com</a> and sign in with your <strong>personal Facebook account</strong>.
              <Info title="Note">
                You need a personal account to create and manage a Page. Your personal profile information will not be visible on the business Page.
              </Info>
            </Step>

            <Step number={2} platform="facebook">
              <strong>Navigate to Page Creation</strong>
              <br />
              Follow this path on Facebook:
              <br />
              <NavPath steps={["Menu (≡) icon", "Pages", "+ Create new Page"]} />
            </Step>

            <Step number={3} platform="facebook">
              <strong>Fill in Your Page Details</strong>
              <SubList items={[
                <span><strong>Page name</strong> — Enter your business name exactly as you want it to appear</span>,
                <span><strong>Category</strong> — Select the most relevant category (e.g. "Marketing Agency", "Local Business", "Brand")</span>,
                <span><strong>Description</strong> — Write a short description of your business (recommended)</span>,
              ]} />
              Click <strong>Create Page</strong> when done.
            </Step>

            <Step number={4} platform="facebook">
              <strong>Complete Your Page Setup</strong>
              <SubList items={[
                "Upload a Profile Picture (your business logo, ideally square)",
                "Upload a Cover Photo (1640 × 856 px recommended)",
                "Add your Website URL, Phone Number, Address, and Business Hours",
              ]} />
              Click <strong>Save</strong> after each section.
            </Step>

            <Success>
              Your Facebook Page is now created and ready to use. You can find it anytime via <strong>Menu → Pages</strong>.
            </Success>
          </section>

          <Divider />

          {/* ── PART 2: CONVERT INSTAGRAM ── */}
          <section id="convert-instagram">
            <PartHeader number="2" title="Convert Instagram to Business/Creator Account" platform="instagram" />

            <P>Your Instagram account must be a Business or Creator account before it can be linked to Facebook or connected to the AirSpark portal. Personal accounts are not supported.</P>

            <Warning title="Already a Business/Creator account?">
              If your Instagram is already a Business or Creator account, skip this part and go directly to Part 3 — Link Instagram to Facebook.
            </Warning>

            <H3>Step-by-Step Instructions</H3>

            <Step number={1} platform="instagram">
              <strong>Open the Instagram App</strong>
              <br />
              Go to your profile → tap the <strong>three lines (≡)</strong> in the top right corner → tap <strong>Settings and Privacy</strong>
            </Step>

            <Step number={2} platform="instagram">
              <strong>Switch Account Type</strong>
              <br />
              Follow this path:
              <NavPath steps={["Settings and Privacy", "Account type and tools", "Switch to Professional Account"]} />
            </Step>

            <Step number={3} platform="instagram">
              <strong>Choose Account Type</strong>
              <SubList items={[
                <span><strong>Business</strong> — Recommended for companies and brands. Gives access to analytics, ads, and the ability to add contact buttons.</span>,
                <span><strong>Creator</strong> — Recommended for influencers, content creators, and public figures.</span>,
              ]} />
              Select your preferred type, choose a <strong>Category</strong>, then tap <strong>Done</strong>.
            </Step>

            <Success>
              Your Instagram is now a Business/Creator account. You can verify this by going to your profile — you should see a category label below your name.
            </Success>
          </section>

          <Divider />

          {/* ── PART 3: LINK INSTAGRAM TO FACEBOOK ── */}
          <section id="link-instagram-facebook">
            <PartHeader number="3" title="Link Instagram to Your Facebook Page" platform="facebook" />

            <P>This is the most critical step. Without this link, the AirSpark portal cannot access your Instagram data or publish Instagram content.</P>

            <Info title="Why is this required?">
              Instagram's API (the technology that lets apps like AirSpark connect to Instagram) only works through Facebook's authentication system. Linking your Instagram to a Facebook Page is Meta's required method for business integrations.
            </Info>

            <H3>Method A — Link via Facebook Page Settings (Recommended)</H3>

            <Step number={1} platform="facebook">
              <strong>Go to Your Facebook Page</strong>
              <br />
              Navigate to your Facebook Page (not your personal profile). Click <strong>Settings</strong> from the left sidebar or the top right menu.
            </Step>

            <Step number={2} platform="facebook">
              <strong>Find Linked Accounts</strong>
              <br />
              In the left menu, look for:
              <NavPath steps={["Page Settings", "Linked Accounts"]} />
              Or search for <strong>"Instagram"</strong> in the settings search bar.
            </Step>

            <Step number={3} platform="facebook">
              <strong>Connect Your Instagram</strong>
              <br />
              Click <strong>Connect account</strong> → a popup will appear → enter your Instagram <strong>username and password</strong> → click <strong>Log in</strong>.
            </Step>

            <Step number={4} platform="facebook">
              <strong>Confirm the Connection</strong>
              <br />
              Select the Instagram Business/Creator account you want to link → click <strong>Confirm</strong>.
            </Step>

            <H3>Method B — Link via Instagram App</H3>

            <Step number={1} platform="instagram">
              <strong>Go to Instagram Settings</strong>
              <br />
              Open the Instagram app → go to your Profile → tap <strong>three lines (≡)</strong> → <strong>Settings and Privacy</strong>
            </Step>

            <Step number={2} platform="instagram">
              <strong>Find Account Center</strong>
              <NavPath steps={["Settings and Privacy", "Accounts Center"]} />
            </Step>

            <Step number={3} platform="instagram">
              <strong>Add Facebook Account</strong>
              <br />
              Tap <strong>Add accounts</strong> → select <strong>Facebook</strong> → log in to Facebook → select your <strong>Facebook Page</strong> → tap <strong>Confirm</strong>.
            </Step>

            <Success>
              Your Instagram is now linked to your Facebook Page. Both accounts will appear under the same Meta Business connection.
            </Success>

            <Warning title="How to verify the link worked">
              Go to your Facebook Page → Settings → Linked Accounts → You should see your Instagram account listed with a green "Connected" status.
            </Warning>
          </section>

          <Divider />

          {/* ── PART 4: CONNECT TO PORTAL ── */}
          <section id="connect-to-portal">
            <PartHeader number="4" title="Connect to AirSpark Portal" platform="portal" />

            <P>Now that your Facebook Page is created and Instagram is linked, you can connect both to the AirSpark Customer Portal.</P>

            <H3>Connect Facebook</H3>

            <Step number={1} platform="portal">
              Log in to the AirSpark Customer Portal at <a href="https://airspark.storage.googleapis.com/index.html#/customer/login" target="_blank" rel="noopener noreferrer" style={{ color: "#1877f2" }}>airspark portal</a>
            </Step>

            <Step number={2} platform="portal">
              Navigate to:
              <NavPath steps={["Settings", "Social Integrations", "Facebook / Meta"]} />
            </Step>

            <Step number={3} platform="portal">
              Click <strong>Connect Facebook Account</strong> → log in with the Facebook account that manages your Page → grant all requested permissions → your Facebook Page will appear automatically.
            </Step>

            <Success>
              Your Facebook Page is now connected. You can view posts, analytics, and historical data from the portal.
            </Success>

            <H3>Connect Instagram</H3>

            <Step number={1} platform="portal">
              Navigate to:
              <NavPath steps={["Settings", "Social Integrations", "Instagram"]} />
            </Step>

            <Step number={2} platform="portal">
              Click <strong>Connect Instagram</strong> → log in through the <strong>Facebook authentication window</strong> (not directly with Instagram credentials) → grant the required permissions.
            </Step>

            <Step number={3} platform="portal">
              Select the <strong>Instagram Business account</strong> you want to connect → click <strong>Done</strong>.
            </Step>

            <Success>
              Your Instagram account is now connected. You can view posts, reel analytics, reach, and engagement data from the portal.
            </Success>

            <Warning title="Connection not working?">
              If the connection fails, verify that: (1) your Instagram is a Business or Creator account, (2) it is linked to your Facebook Page, and (3) you logged into Facebook using the account that manages the Page.
            </Warning>
          </section>

          <Divider />

          {/* ── QUICK REFERENCE ── */}
          <section id="quick-reference">
            <H2 id="quick-reference">Quick Reference</H2>
            <P>Summary of all requirements for using the AirSpark portal with social media accounts.</P>

            <Table
              headers={["Platform", "Requirement", "Why It's Needed"]}
              rows={[
                ["Facebook", "Must have a Facebook Page (not personal account)", "Personal accounts cannot access business APIs or analytics"],
                ["Facebook", "Must be Page Admin or Editor", "Only admins can grant access to third-party apps"],
                ["Instagram", "Must be a Business or Creator account", "Personal accounts don't support API access or analytics"],
                ["Instagram", "Must be linked to a Facebook Page", "Instagram API requires Facebook authentication for business accounts"],
                ["Both", "Must grant all requested permissions during connection", "Missing permissions will block posting and analytics features"],
                ["Portal", "Connect accounts via Settings → Social Integrations", "Required to enable live data, analytics, and publishing"],
              ]}
            />

            <H3>Common Issues & Fixes</H3>
            <Table
              headers={["Issue", "Cause", "Fix"]}
              rows={[
                ["Instagram not appearing after connecting Facebook", "Instagram is not linked to the Facebook Page", "Complete Part 3 of this guide first"],
                ["'No pages found' error", "Facebook account has no Pages", "Create a Facebook Page (Part 1)"],
                ["Analytics showing no data", "Account was just connected — data needs time to load", "Wait 10–15 minutes and refresh"],
                ["Permission denied error", "Some permissions were denied during login", "Reconnect and grant all permissions when prompted"],
                ["Instagram connecting as personal account", "Account type not switched to Business/Creator", "Complete Part 2 of this guide first"],
              ]}
            />
          </section>

          {/* ── HELPFUL FEEDBACK ── */}
          <Divider />
          <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#8a8d91" }}>Was this document helpful?</span>
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => setHelpfulVote(opt)}
                style={{
                  padding: "4px 16px", border: "1px solid",
                  borderColor: helpfulVote === opt ? "#1877f2" : "#ccd0d5",
                  borderRadius: 20, background: helpfulVote === opt ? "#e7f3ff" : "#fff",
                  color: helpfulVote === opt ? "#1877f2" : "#606770",
                  fontSize: 13, cursor: "pointer", fontWeight: helpfulVote === opt ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >{opt}</button>
            ))}
            {helpfulVote && (
              <span style={{ fontSize: 13, color: "#2e7d32", marginLeft: 4 }}>
                ✓ Thanks for your feedback!
              </span>
            )}
          </div>
        </main>

        {/* RIGHT OUTLINE — hidden on mobile/tablet */}
        {!isMobile && !isTablet && (
          <aside style={{
            width: 190, flexShrink: 0, position: "sticky", top: 60,
            maxHeight: "calc(100vh - 60px)", overflowY: "auto",
            padding: "32px 16px 24px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a8d91", marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              On This Page
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {RIGHT_NAV.map((item) => (
                <li key={item.id} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => goto(item.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: "2px 0",
                      fontSize: 13, color: activeId === item.id ? "#1877f2" : "#8a8d91",
                      fontWeight: activeId === item.id ? 600 : 400, textAlign: "left",
                      transition: "color 0.15s", lineHeight: 1.5,
                    }}
                  >{item.label}</button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
