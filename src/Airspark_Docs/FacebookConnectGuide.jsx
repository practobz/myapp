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

// Import screenshots from docs folder
import step1 from "./docs/1.PNG";
import step2 from "./docs/2.PNG";
import step3 from "./docs/3.PNG";
import step4 from "./docs/4.PNG";
import step5 from "./docs/5.PNG";
import step6 from "./docs/6.PNG";
import step7 from "./docs/7.PNG";
import step8 from "./docs/8.PNG";

// ─── NAV ─────────────────────────────────────────────────────────────────────

const LEFT_NAV = [
  { id: "overview", label: "Overview" },
  { id: "step-1", label: "Step 1 — Accept Connection" },
  { id: "step-2", label: "Step 2 — Continue to Facebook" },
  { id: "step-3", label: "Step 3 — Log in to Facebook" },
  { id: "step-4", label: "Step 4 — Select Your Page" },
  { id: "step-5", label: "Step 5 — Select Business" },
  { id: "step-6", label: "Step 6 — Select Instagram" },
  { id: "step-7", label: "Step 7 — Review Permissions" },
  { id: "step-8", label: "Step 8 — Connection Complete" },
  { id: "troubleshooting", label: "Troubleshooting" },
];

// ─── STEP DATA ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "step-1",
    number: 1,
    title: "Accept the Connection Request",
    image: step1,
    imageAlt: "Connect Facebook confirmation dialog",
    description: "After scanning the QR code provided by your AirSpark admin, you will see a confirmation dialog asking if you want to connect your Facebook account to AirSpark.",
    actions: [
      { type: "do", text: 'Click "Accept" to proceed with connecting your Facebook account.' },
      { type: "dont", text: 'Click "Reject" only if you do not want to connect at this time.' },
    ],
    note: {
      type: "info",
      text: "The link has a time limit (shown as 'Link valid for: X hours'). Make sure to complete the connection before it expires.",
    },
  },
  {
    id: "step-2",
    number: 2,
    title: "Continue to Facebook Login",
    image: step2,
    imageAlt: "Continue to Connect Facebook popup",
    description: "A popup will appear explaining that AirSpark needs to open the Facebook sign-in window to complete authentication.",
    actions: [
      { type: "do", text: 'Tap "Tap to Connect Facebook" to open the Facebook login window.' },
      { type: "dont", text: 'Do not tap "Cancel" unless you want to stop the process.' },
    ],
    note: {
      type: "warning",
      text: "On mobile browsers, this action must be initiated by a direct tap. Do not block popups for this page.",
    },
  },
  {
    id: "step-3",
    number: 3,
    title: "Log in to Your Facebook Account",
    image: step3,
    imageAlt: "Facebook login window",
    description: "A Facebook login popup window will open. Enter the credentials for the Facebook account that manages your Business Page.",
    actions: [
      { type: "do", text: "Enter your Email address or mobile number associated with your Facebook account." },
      { type: "do", text: "Enter your Password and click Log in." },
    ],
    note: {
      type: "warning",
      text: "Make sure you log in with the Facebook account that is an Admin or Editor of your Business Page — not a personal account without a Page.",
    },
  },
  {
    id: "step-4",
    number: 4,
    title: "Choose the Facebook Pages to Connect",
    image: step4,
    imageAlt: "Choose Facebook Pages screen",
    description: "Facebook will show you a list of all Pages you manage. Select the Page(s) you want AirSpark to have access to.",
    actions: [
      { type: "do", text: 'Select "Opt in to current Pages only" and check the specific Page you want to connect (e.g. Aureum Solutions).' },
      { type: "do", text: 'Click "Continue" once your Page is selected (you will see "1 asset selected").' },
      { type: "dont", text: 'Do not leave all Pages unselected — AirSpark needs at least one Page to function.' },
    ],
    note: {
      type: "info",
      text: 'You can select "Opt in to all current and future Pages" if you want AirSpark to automatically access any new Pages you create in the future.',
    },
  },
  {
    id: "step-5",
    number: 5,
    title: "Choose the Business Accounts to Connect",
    image: step5,
    imageAlt: "Choose Businesses screen",
    description: "Next, Facebook will show your Business Manager accounts. Select the Business account associated with the Page you selected in the previous step.",
    actions: [
      { type: "do", text: 'Select "Opt in to current Businesses only" and check your Business account (e.g. Aureum Solutions).' },
      { type: "do", text: 'Click "Continue" once the correct Business is selected.' },
    ],
    note: {
      type: "info",
      text: "If you do not have a Business Manager account, this screen may be skipped automatically.",
    },
  },
  {
    id: "step-6",
    number: 6,
    title: "Choose the Instagram Account to Connect",
    image: step6,
    imageAlt: "Choose Instagram accounts screen",
    description: "Facebook will display all Instagram Business/Creator accounts linked to your Facebook Pages. Select the Instagram account you want AirSpark to access.",
    actions: [
      { type: "do", text: 'Select "Opt in to current Instagram accounts only" and check your Instagram account (e.g. aureum.solutions.in).' },
      { type: "do", text: 'Click "Continue" once the correct account is selected.' },
      { type: "dont", text: "Do not skip this step if you also want Instagram analytics and posting enabled." },
    ],
    note: {
      type: "warning",
      text: "Your Instagram account will only appear here if it is already linked to your Facebook Page and is a Business or Creator account. If it does not appear, refer to the Accounts Configuration guide first.",
    },
  },
  {
    id: "step-7",
    number: 7,
    title: "Review AirSpark's Access Request",
    image: step7,
    imageAlt: "Review AirSpark access permissions screen",
    description: "Facebook will show a summary of all permissions AirSpark is requesting. Review each item carefully before saving.",
    actions: [
      { type: "do", text: 'Click "Save" to grant all the listed permissions to AirSpark.' },
      { type: "dont", text: 'Do not click "Back" unless you need to change your selected Pages or Instagram account.' },
    ],
    permissions: [
      "Receive your email address",
      "Manage your business",
      "Access profile and posts from the selected Instagram account",
      "Upload media and create posts for the Instagram account",
      "Manage comments for the selected Instagram account",
      "Access insights for the Instagram account",
      "Create and manage content on your Page",
    ],
    note: {
      type: "warning",
      text: "All permissions are required for AirSpark to fully function. Denying any permission may limit posting, analytics, or comment management features.",
    },
  },
  {
    id: "step-8",
    number: 8,
    title: "Connection Complete!",
    image: step8,
    imageAlt: "Connection success screen",
    description: "You will see a confirmation screen showing your name followed by 'has been connected to AirSpark'. Your Facebook and Instagram accounts are now fully connected.",
    actions: [
      { type: "do", text: 'Click "Got it" to close the window and return to the portal.' },
    ],
    note: {
      type: "success",
      text: "Your accounts are now connected. Go to the AirSpark portal → Settings → Social Integrations to verify the connection status and view your linked accounts.",
    },
  },
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

const CheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" />
  </svg>
);

const XCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

// Callout box
const Callout = ({ type, children }) => {
  const styles = {
    info: { bg: "#e7f3ff", border: "#1877f2", icon: "ℹ️", color: "#0d47a1" },
    warning: { bg: "#fff8e1", border: "#f9a825", icon: "⚠️", color: "#7f4e00" },
    success: { bg: "#e8f5e9", border: "#43a047", icon: "✅", color: "#1b5e20" },
  };
  const s = styles[type] || styles.info;
  return (
    <div style={{
      background: s.bg, borderLeft: `4px solid ${s.border}`,
      borderRadius: 6, padding: "12px 16px",
      margin: "16px 0", fontSize: 14, color: s.color, lineHeight: 1.65,
    }}>
      {s.icon} {children}
    </div>
  );
};

// Screenshot viewer with zoom
const Screenshot = ({ src, alt, stepNumber }) => {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <div
        onClick={() => setZoomed(true)}
        style={{
          margin: "20px 0", borderRadius: 10, overflow: "hidden",
          border: "1px solid #e4e6e8", cursor: "zoom-in",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          position: "relative", background: "#f0f2f5",
        }}
      >
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 2,
          background: "#1877f2", color: "#fff",
          fontSize: 11, fontWeight: 700, padding: "3px 10px",
          borderRadius: 20,
        }}>
          Step {stepNumber}
        </div>
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          background: "rgba(0,0,0,0.45)", color: "#fff",
          fontSize: 11, padding: "3px 8px", borderRadius: 4,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6m0 0v6m0-6L10 14M9 21H3m0 0v-6m0 6l11-11" />
          </svg>
          Click to enlarge
        </div>
        <img
          src={src}
          alt={alt}
          style={{ width: "100%", maxHeight: 380, objectFit: "contain", display: "block", padding: "12px" }}
        />
      </div>

      {/* Zoom modal */}
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "zoom-out", padding: 24,
          }}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button
              onClick={() => setZoomed(false)}
              style={{
                position: "absolute", top: -14, right: -14, zIndex: 2,
                width: 30, height: 30, borderRadius: "50%",
                background: "#fff", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 16, color: "#1c1e21",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >×</button>
            <img
              src={src}
              alt={alt}
              style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
            />
            <div style={{ textAlign: "center", color: "#aaa", fontSize: 13, marginTop: 10 }}>
              Step {stepNumber} — {alt}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Progress bar at top
const ProgressBar = ({ current, total }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 28px" }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          flex: 1, height: 4, borderRadius: 4,
          background: i < current ? "#1877f2" : "#e4e6e8",
          transition: "background 0.3s",
        }}
      />
    ))}
    <span style={{ fontSize: 12, color: "#8a8d91", whiteSpace: "nowrap", marginLeft: 4 }}>
      {current} / {total} steps
    </span>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function FacebookConnectGuide({ onBack }) {
  const [activeId, setActiveId] = useState("overview");
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
      { rootMargin: "-15% 0px -60% 0px" }
    );
    document.querySelectorAll("section[id]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const goto = (id) => {
    setMobileNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // Current visible step number for progress bar
  const currentStep = LEFT_NAV.findIndex(n => n.id === activeId);

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif", background: "#fff", minHeight: "100vh" }}>

      {/* ── HEADER ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#fff", borderBottom: "1px solid #e4e6e8",
        minHeight: 60, display: "flex", alignItems: "center",
        padding: isMobile ? "0 12px" : "0 24px", gap: isMobile ? 8 : 16,
      }}>
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

        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#606770" }}>
            <button onClick={onBack} style={{ background: "none", border: "none", color: "#606770", cursor: "pointer", padding: 0, fontSize: 13 }}>Docs</button>
            <ChevronRight />
            <span style={{ color: "#606770" }}>Accounts &amp; Configuration</span>
            <ChevronRight />
            <span style={{ color: "#1c1e21", fontWeight: 500 }}>Connect Facebook</span>
          </div>
        )}

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
            width: 230, flexShrink: 0, position: "sticky", top: 60,
            maxHeight: "calc(100vh - 60px)", overflowY: "auto",
            padding: "24px 0", borderRight: "1px solid #e4e6e8",
          }}>
            <div style={{ fontWeight: 700, color: "#1c1e21", fontSize: 13, padding: "0 20px 14px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Connect Facebook
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {LEFT_NAV.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => goto(item.id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 20px", fontSize: 13.5,
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

            {/* Related */}
            <div style={{ padding: "20px 20px 0", borderTop: "1px solid #e4e6e8", marginTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8a8d91", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Related</div>
              {[
                { label: "Accounts Configuration Guide", href: "#" },
                { label: "Instagram Integration", href: "#" },
                { label: "ROI Analytics", href: "#" },
              ].map((link) => (
                <a key={link.label} href={link.href} style={{ display: "block", fontSize: 13, color: "#1877f2", marginBottom: 8, textDecoration: "none" }}>
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

          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "#1877f2",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1877f2", background: "#e7f3ff", padding: "3px 10px", borderRadius: 20 }}>
              Facebook Integration
            </span>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#1c1e21", margin: "8px 0 10px" }}>
            How to Connect Facebook to AirSpark
          </h1>
          <p style={{ color: "#606770", fontSize: 15, lineHeight: 1.75, margin: "0 0 8px" }}>
            This guide shows the exact screens you will see when connecting your Facebook account to AirSpark after scanning the QR code provided by your admin. Follow each step carefully using the screenshots below.
          </p>

          {/* Progress bar */}
          <ProgressBar current={Math.max(0, currentStep)} total={8} />

          {/* Prerequisites */}
          <section id="overview">
            <div style={{
              background: "#f0f2f5", border: "1px solid #e4e6e8",
              borderRadius: 10, padding: "18px 20px", marginBottom: 32,
            }}>
              <div style={{ fontWeight: 700, color: "#1c1e21", fontSize: 15, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <LockIcon /> Before You Begin — Prerequisites
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                {[
                  "You have a Facebook Page (not just a personal account)",
                  "Your Instagram is a Business or Creator account",
                  "Instagram is linked to your Facebook Page",
                  "You are an Admin or Editor of the Facebook Page",
                  "You have the QR code link from your AirSpark admin",
                  "Popups are allowed in your browser for this page",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13.5, color: "#444950" }}>
                    <span style={{ marginTop: 1, flexShrink: 0 }}><CheckCircle /></span>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #e4e6e8", fontSize: 13, color: "#8a8d91" }}>
                Don't have a Facebook Page or Instagram not linked yet?{" "}
                <a href="#/docs/accounts-configure" style={{ color: "#1877f2" }}>
                  Read the Accounts Configuration Guide first →
                </a>
              </div>
            </div>
          </section>

          {/* ── STEPS ── */}
          {STEPS.map((step) => (
            <section
              key={step.id}
              id={step.id}
              style={{ marginBottom: 52, scrollMarginTop: 72 }}
            >
              {/* Step header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 14,
                marginBottom: 16,
                paddingBottom: 14,
                borderBottom: "2px solid #e4e6e8",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "#1877f2", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 16, flexShrink: 0,
                }}>{step.number}</div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1c1e21", margin: 0 }}>
                  {step.title}
                </h2>
              </div>

              {/* Description */}
              <p style={{ color: "#606770", fontSize: 15, lineHeight: 1.75, margin: "0 0 12px" }}>
                {step.description}
              </p>

              {/* Screenshot */}
              <Screenshot src={step.image} alt={step.imageAlt} stepNumber={step.number} />

              {/* Actions — what to do / not do */}
              <div style={{ margin: "16px 0" }}>
                {step.actions.map((action, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 14px", borderRadius: 8, marginBottom: 8,
                      background: action.type === "do" ? "#e8f5e9" : "#ffebee",
                      border: `1px solid ${action.type === "do" ? "#a5d6a7" : "#ef9a9a"}`,
                    }}
                  >
                    <span style={{ marginTop: 1, flexShrink: 0 }}>
                      {action.type === "do" ? <CheckCircle /> : <XCircle />}
                    </span>
                    <span style={{
                      fontSize: 14, lineHeight: 1.6,
                      color: action.type === "do" ? "#1b5e20" : "#b71c1c",
                    }}>
                      <strong>{action.type === "do" ? "Do: " : "Don't: "}</strong>
                      {action.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Permissions list (Step 7) */}
              {step.permissions && (
                <div style={{ background: "#f0f2f5", borderRadius: 8, padding: "14px 18px", margin: "14px 0" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1c1e21", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Permissions Being Requested
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {step.permissions.map((perm, i) => (
                      <li key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "7px 0",
                        borderBottom: i < step.permissions.length - 1 ? "1px solid #e4e6e8" : "none",
                        fontSize: 14, color: "#1c1e21",
                      }}>
                        <span style={{ color: "#1877f2", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
                          </svg>
                        </span>
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Note */}
              {step.note && (
                <Callout type={step.note.type}>{step.note.text}</Callout>
              )}
            </section>
          ))}

          {/* ── TROUBLESHOOTING ── */}
          <section id="troubleshooting" style={{ scrollMarginTop: 72 }}>
            <div style={{ borderBottom: "2px solid #e4e6e8", paddingBottom: 10, marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1c1e21", margin: 0 }}>Troubleshooting</h2>
            </div>

            {[
              {
                problem: "The QR code link says 'Link expired'",
                cause: "QR links are time-limited (usually 2 hours).",
                fix: "Contact your AirSpark admin to generate a new QR code link.",
              },
              {
                problem: "Facebook login popup is blocked",
                cause: "Your browser is blocking popups for this page.",
                fix: "Click the popup blocked icon in your browser's address bar and allow popups for this site, then try again.",
              },
              {
                problem: "My Instagram account does not appear in Step 6",
                cause: "Instagram is not linked to your Facebook Page, or it's a personal account.",
                fix: "Follow the Accounts Configuration Guide to link your Instagram to your Facebook Page first.",
              },
              {
                problem: "No Facebook Pages appear in Step 4",
                cause: "Your Facebook account does not manage any Pages.",
                fix: "Create a Facebook Page first. See the Accounts Configuration Guide → Part 1.",
              },
              {
                problem: "Connection succeeded but data is not showing in the portal",
                cause: "There may be a short delay for data to sync after connecting.",
                fix: "Wait 10–15 minutes and refresh the portal. If the issue persists, go to Settings → Social Integrations and click Refresh Connections.",
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #e4e6e8", borderRadius: 8,
                  marginBottom: 12, overflow: "hidden",
                }}
              >
                <div style={{ background: "#f0f2f5", padding: "10px 16px", fontWeight: 600, fontSize: 14, color: "#1c1e21" }}>
                  ❓ {item.problem}
                </div>
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, color: "#8a8d91", marginBottom: 6 }}>
                    <strong>Cause:</strong> {item.cause}
                  </div>
                  <div style={{ fontSize: 14, color: "#1c1e21" }}>
                    <strong>Fix:</strong> {item.fix}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Feedback */}
          <hr style={{ border: "none", borderTop: "1px solid #e4e6e8", margin: "36px 0 20px" }} />
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#8a8d91" }}>Was this document helpful?</span>
            {["Yes", "No"].map((opt) => (
              <button
                key={opt}
                onClick={() => setHelpfulVote(opt)}
                style={{
                  padding: "4px 16px", border: "1px solid",
                  borderColor: helpfulVote === opt ? "#1877f2" : "#ccd0d5",
                  borderRadius: 20,
                  background: helpfulVote === opt ? "#e7f3ff" : "#fff",
                  color: helpfulVote === opt ? "#1877f2" : "#606770",
                  fontSize: 13, cursor: "pointer",
                  fontWeight: helpfulVote === opt ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >{opt}</button>
            ))}
            {helpfulVote && (
              <span style={{ fontSize: 13, color: "#2e7d32" }}>✓ Thanks for your feedback!</span>
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
              {LEFT_NAV.map((item) => (
                <li key={item.id} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() => goto(item.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "2px 0", fontSize: 13, textAlign: "left",
                      color: activeId === item.id ? "#1877f2" : "#8a8d91",
                      fontWeight: activeId === item.id ? 600 : 400,
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
