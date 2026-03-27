import { useState, useEffect, useRef } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const LANDING_CARDS = [
  {
    title: "Getting Started",
    desc: "Log in, create your account, and navigate the portal for the first time.",
    link: "dashboard",
    cols: 3,
  },
  {
    title: "Content Calendar",
    desc: "View all planned, scheduled, and published social media posts in one place.",
    link: "content-calendar",
    cols: 3,
  },
  {
    title: "Content Review",
    desc: "Review drafts, leave image comments, manage versions, and approve posts.",
    link: "content-review",
    cols: 3,
  },
];

const LANDING_GRID = [
  { title: "Dashboard", items: ["Statistics Overview", "Quick Actions"] },
  { title: "Media Library", items: ["Upload Media", "Preview & Download", "Tag Management"] },
  { title: "ROI Analytics", items: ["Followers & Reach", "Engagement Rate", "Export Reports"] },
  { title: "Social Integrations", items: ["Facebook / Meta", "Instagram", "LinkedIn", "YouTube"] },
];

const LEFT_NAV = [
  { id: "overview", label: "Overview" },
  { id: "login", label: "Login & Sign Up" },
  { id: "dashboard", label: "Dashboard" },
  { id: "content-calendar", label: "Content Calendar" },
  { id: "content-review", label: "Content Review" },
  { id: "media-library", label: "Media Library" },
  { id: "roi-dashboard", label: "ROI Analytics" },
  { id: "social-integrations", label: "Social Integrations" },
  { id: "facebook", label: "Facebook / Meta" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
];

const RIGHT_NAV = [
  { id: "overview", label: "Customer Portal Docs" },
  { id: "login", label: "Login & Sign Up" },
  { id: "dashboard", label: "Dashboard" },
  { id: "content-calendar", label: "Content Calendar" },
  { id: "content-review", label: "Content Review" },
  { id: "media-library", label: "Media Library" },
  { id: "roi-dashboard", label: "ROI Analytics" },
  { id: "social-integrations", label: "Social Integrations" },
  { id: "facebook", label: "Facebook / Meta" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
];

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

const DocIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </svg>
);

const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14" />
  </svg>
);

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

const Table = ({ headers, rows }) => (
  <div className="overflow-x-auto my-5" style={{ border: "1px solid #e4e6e8", borderRadius: 6 }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: "#f0f2f5", borderBottom: "1px solid #e4e6e8" }}>
          {headers.map((h) => (
            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, color: "#1c1e21", fontSize: 13 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: i < rows.length - 1 ? "1px solid #e4e6e8" : "none" }}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: "10px 16px", color: j === 0 ? "#1c1e21" : "#606770", fontWeight: j === 0 ? 500 : 400 }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Steps = ({ steps }) => (
  <ol style={{ margin: "16px 0", padding: 0, listStyle: "none" }}>
    {steps.map((step, i) => (
      <li key={i} style={{ display: "flex", gap: 14, marginBottom: 12 }}>
        <span style={{
          flexShrink: 0, width: 26, height: 26, borderRadius: "50%",
          background: "#1877f2", color: "#fff", fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
        }}>{i + 1}</span>
        <span style={{ color: "#1c1e21", lineHeight: 1.6 }}>{step}</span>
      </li>
    ))}
  </ol>
);

const Bullets = ({ items }) => (
  <ul style={{ margin: "12px 0", padding: 0, listStyle: "none" }}>
    {items.map((item, i) => (
      <li key={i} style={{ display: "flex", gap: 10, marginBottom: 8, color: "#1c1e21", fontSize: 14 }}>
        <span style={{ color: "#1877f2", marginTop: 6, flexShrink: 0, fontSize: 8 }}>●</span>
        {item}
      </li>
    ))}
  </ul>
);

const Note = ({ type = "info", title, children }) => {
  const map = {
    info: { bg: "#e7f3ff", border: "#1877f2", icon: "ℹ️" },
    tip: { bg: "#e6f4ea", border: "#34a853", icon: "💡" },
    warning: { bg: "#fff8e1", border: "#fbbc04", icon: "⚠️" },
  };
  const s = map[type];
  return (
    <div style={{ background: s.bg, borderLeft: `4px solid ${s.border}`, borderRadius: 4, padding: "12px 16px", margin: "20px 0", fontSize: 14 }}>
      {title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.icon} {title}</div>}
      <div style={{ color: "#1c1e21" }}>{children}</div>
    </div>
  );
};

const H2 = ({ id, children }) => (
  <h2 id={id} style={{ fontSize: 22, fontWeight: 700, color: "#1c1e21", margin: "40px 0 12px", paddingTop: 8, scrollMarginTop: 72 }}>
    {children}
  </h2>
);

const H3 = ({ children }) => (
  <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1c1e21", margin: "28px 0 10px" }}>{children}</h3>
);

const P = ({ children }) => (
  <p style={{ color: "#606770", lineHeight: 1.7, margin: "10px 0", fontSize: 15 }}>{children}</p>
);

const Divider = () => <hr style={{ border: "none", borderTop: "1px solid #e4e6e8", margin: "32px 0" }} />;

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────

const LandingPage = ({ onNavigate }) => (
  <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
    <h1 style={{ fontSize: 36, fontWeight: 800, color: "#1c1e21", marginBottom: 12 }}>
      AirSpark Customer Portal Documentation
    </h1>
    <p style={{ fontSize: 16, color: "#606770", maxWidth: 680, lineHeight: 1.7, marginBottom: 48, fontStyle: "italic" }}>
      Learn how to manage your social media content, review posts, track analytics, and connect your social accounts using the AirSpark Customer Portal.
    </p>

    {/* Feature cards row */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, marginBottom: 48 }}>
      {LANDING_CARDS.map((card) => (
        <div key={card.title}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1c1e21", marginBottom: 8 }}>{card.title}</h3>
          <p style={{ fontSize: 14, color: "#606770", lineHeight: 1.6, marginBottom: 12 }}>{card.desc}</p>
          <button
            onClick={() => onNavigate(card.link)}
            style={{ background: "none", border: "none", color: "#1877f2", fontSize: 14, cursor: "pointer", padding: 0, fontWeight: 500 }}
          >
            Docs
          </button>
        </div>
      ))}
    </div>

    <hr style={{ border: "none", borderTop: "1px solid #e4e6e8", marginBottom: 48 }} />

    {/* Grid of sections */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
      {LANDING_GRID.map((group) => (
        <div key={group.title}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1c1e21", marginBottom: 12 }}>{group.title}</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {group.items.map((item) => (
              <li key={item} style={{ borderBottom: "1px solid #e4e6e8", padding: "8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  onClick={() => onNavigate(group.title.toLowerCase().replace(/ /g, "-"))}
                  style={{ background: "none", border: "none", color: "#606770", fontSize: 13, cursor: "pointer", padding: 0, textAlign: "left" }}
                >
                  {item}
                </button>
                <span style={{ color: "#bcc0c4" }}><DocIcon /></span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
);

// ─── DOC PAGE ─────────────────────────────────────────────────────────────────

const DocPage = ({ scrollTo }) => {
  const [activeId, setActiveId] = useState("overview");

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
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>

      {/* LEFT NAV */}
      <aside style={{
        width: 220, flexShrink: 0, position: "sticky", top: 60,
        maxHeight: "calc(100vh - 60px)", overflowY: "auto",
        padding: "24px 0", borderRight: "1px solid #e4e6e8",
      }}>
        <div style={{ fontWeight: 700, color: "#1c1e21", fontSize: 14, padding: "0 20px 12px" }}>
          Customer Portal
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {LEFT_NAV.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => goto(item.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 20px", fontSize: 14, background: "none", border: "none",
                  cursor: "pointer", borderLeft: activeId === item.id ? "3px solid #1877f2" : "3px solid transparent",
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
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, minWidth: 0, padding: "32px 48px" }}>

        <section id="overview">
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#1c1e21", marginBottom: 16 }}>Customer Portal</h1>
          <P>The AirSpark Customer Portal is a centralized platform designed to help you manage, review, and track your social media content and performance.</P>
          <P>Through the portal you can view your content calendar, review and approve social media posts, upload and manage media files, track analytics and ROI metrics, connect your social media accounts, and manage your subscription plan.</P>

          <H3>Documentation Contents</H3>
          <P>We recommend you read each guide in the following order:</P>
          <ol style={{ paddingLeft: 20, margin: "12px 0", color: "#606770", fontSize: 14, lineHeight: 2 }}>
            {[
              ["login", "Login & Sign Up", "Create your account and access the portal"],
              ["dashboard", "Dashboard", "Overview of your content statistics and quick actions"],
              ["content-calendar", "Content Calendar", "View and filter all your planned and published posts"],
              ["content-review", "Content Review", "Approve content, leave comments, manage versions"],
              ["media-library", "Media Library", "Upload, preview, tag, and manage media files"],
              ["roi-dashboard", "ROI Analytics Dashboard", "Track performance metrics across platforms"],
              ["social-integrations", "Social Integrations", "Connect Facebook, Instagram, LinkedIn, YouTube"],
            ].map(([id, title, desc]) => (
              <li key={id}>
                <button onClick={() => goto(id)} style={{ background: "none", border: "none", color: "#1877f2", cursor: "pointer", padding: 0, fontSize: 14, fontWeight: 500 }}>{title}</button>
                {" – "}{desc}
              </li>
            ))}
          </ol>
        </section>

        <Divider />

        <section id="login">
          <H2 id="login">Login & Sign Up</H2>
          <P>Access the portal at <a href="https://airspark.storage.googleapis.com/index.html#/customer/login" style={{ color: "#1877f2" }} target="_blank" rel="noopener noreferrer">airspark.storage.googleapis.com</a>.</P>

          <H3>Logging In</H3>
          <Steps steps={[
            "Enter your registered email address.",
            "Enter your password.",
            <span>Click <strong>Login</strong>. If your credentials are correct, you will be redirected to the Dashboard.</span>,
          ]} />

          <H3>Forgot Password</H3>
          <Steps steps={[
            <span>Click <strong>Forgot Password</strong> on the login screen.</span>,
            "Enter your registered email address.",
            "You will receive a password reset link in your email.",
          ]} />

          <H3>Creating a New Account</H3>
          <Steps steps={[
            "Enter your Full Name.",
            "Enter your Email Address.",
            "Create a Password.",
            <span>Click <strong>Sign Up</strong>.</span>,
          ]} />
        </section>

        <Divider />

        <section id="dashboard">
          <H2 id="dashboard">Dashboard</H2>
          <P>The Dashboard is the main overview screen of your portal. It displays a summary of all content and activity related to your account.</P>

          <H3>Statistics Overview</H3>
          <Table
            headers={["Metric", "Description"]}
            rows={[
              ["Total Posts", "Number of content items across all calendars"],
              ["Content Calendars", "Number of calendars assigned to your account"],
              ["Published Content", "Posts that have already been published"],
            ]}
          />

          <H3>Quick Actions</H3>
          <Table
            headers={["Button", "Action"]}
            rows={[
              ["View Content Calendar", "Opens the Content Calendar"],
              ["Review Content", "Opens Content Review section"],
              ["Manage Media Library", "Opens Media Library"],
              ["ROI Dashboard", "Opens ROI Analytics Dashboard"],
            ]}
          />
        </section>

        <Divider />

        <section id="content-calendar">
          <H2 id="content-calendar">Content Calendar</H2>
          <P>The Content Calendar shows all planned and published content for your account. It helps you track upcoming posts, scheduled posts, and published posts.</P>

          <H3>Filtering and Search</H3>
          <P>Use the search bar to locate content by title, description, or creator name.</P>

          <H3>Content Item Information</H3>
          <P>Each content item displays:</P>
          <Bullets items={["Title and Description", "Scheduled date", "Platform icon", "Status badge (Published / Under Review / Scheduled / Pending)", "Assigned creator", "Post link (if published)"]} />
        </section>

        <Divider />

        <section id="content-review">
          <H2 id="content-review">Content Review</H2>
          <P>This section allows you to review content before it is published. You can provide feedback, request changes, or approve the content.</P>

          <H3>Content Navigation</H3>
          <Steps steps={[
            "The left panel displays all calendars.",
            "Click a calendar to expand and view its content items.",
            "Click a content item to open it in the review panel.",
          ]} />

          <H3>Media Preview</H3>
          <P>You can preview images, videos, and multiple media files. If multiple files exist, use the navigation arrows to switch between them.</P>

          <H3>Content Versions</H3>
          <P>If a creator updates content, multiple versions may exist. Use version tabs to compare revisions.</P>

          <H3>Image Commenting</H3>
          <P>Add comments directly on images for precise feedback.</P>
          <Steps steps={[
            "Click on the image.",
            "Select a location on the image.",
            "Add your comment.",
          ]} />
          <Note type="tip" title="Tip">
            A marker appears on the image showing the comment location, allowing very precise feedback to your content creators.
          </Note>

          <H3>Review Features</H3>
          <Bullets items={["View latest media version", "Add approval notes", "Set publish date and time", "Approve or request revisions"]} />
        </section>

        <Divider />

        <section id="media-library">
          <H2 id="media-library">Media Library</H2>
          <P>The Media Library stores all files related to your content including images, videos, and documents.</P>

          <H3>Uploading Media</H3>
          <P>Upload files by clicking the <strong>Upload Button</strong> or by dragging and dropping files. Uploaded files become immediately available for creators.</P>

          <H3>Media Actions</H3>
          <Table
            headers={["Action", "Description"]}
            rows={[
              ["Preview", "View full-size media"],
              ["Download", "Save file locally"],
              ["Edit Tags", "Add tags for organization"],
              ["Delete", "Remove the file"],
            ]}
          />
        </section>

        <Divider />

        <section id="roi-dashboard">
          <H2 id="roi-dashboard">ROI Analytics Dashboard</H2>
          <P>This dashboard provides advanced performance analytics using live social media data from Facebook, Instagram, LinkedIn, and YouTube.</P>

          <H3>Available Metrics</H3>
          <Table
            headers={["Metric", "Description"]}
            rows={[
              ["Followers", "Total followers and growth"],
              ["Reach", "Unique users reached"],
              ["Impressions", "Total views"],
              ["Engagement", "Likes, comments, shares"],
              ["Engagement Rate", "Engagement ÷ reach"],
              ["Link Clicks", "Clicks on post links"],
              ["Profile Visits", "Visits to your profile"],
            ]}
          />

          <H3>Visual Reports</H3>
          <Bullets items={["Line charts for growth trends", "Bar charts for post performance", "Doughnut charts for audience distribution"]} />

          <H3>Export Reports</H3>
          <P>Click <strong>Download PDF</strong> to export a full analytics report for any time period.</P>
        </section>

        <Divider />

        <section id="social-integrations">
          <H2 id="social-integrations">Social Integrations</H2>
          <P>Connect your social media accounts using secure authentication. Connecting accounts allows the system to fetch live analytics and performance data.</P>
          <P>Supported platforms include Facebook, Instagram, LinkedIn, and YouTube.</P>

          <H3>Profile Information</H3>
          <P>From the Settings section, you can update your Name, Email, Phone number, Address, and Business description.</P>
        </section>

        <Divider />

        <section id="facebook">
          <H2 id="facebook">Facebook / Meta Integration</H2>
          <P>This integration connects your Facebook Business Page to the portal so you can monitor posts, view analytics, and manage comments directly.</P>

          <H3>Step 1 – Connect Your Facebook Account</H3>
          <Steps steps={[
            <span>Go to <strong>Settings → Social Integrations → Facebook / Meta</strong>.</span>,
            <span>Click <strong>Connect Facebook Account</strong>.</span>,
            "A Facebook login window will appear.",
            "Log in using the Facebook account that manages your Business Page.",
            "Grant the requested permissions.",
          ]} />

          <H3>Step 2 – View Your Facebook Pages</H3>
          <P>After connecting, the portal displays all Facebook Pages you manage. Each page card shows Page Name, Page Category, Total Followers / Page Likes, and Connection Status.</P>

          <H3>Step 3 – View Page Posts</H3>
          <P>Click <strong>View Posts</strong> under any page. Each post card includes post image or preview, caption text, publish date, and performance metrics (Likes, Comments, Shares, Reactions) with a direct link to view the post on Facebook.</P>

          <H3>Step 4 – View Post Analytics</H3>
          <Table
            headers={["Metric", "Description"]}
            rows={[
              ["Likes", "Total number of likes"],
              ["Comments", "Total comment count"],
              ["Shares", "Number of times the post was shared"],
              ["Reactions", "Total reactions"],
              ["Total Engagement", "Combined interactions"],
              ["Engagement Trend", "Growth trend after posting"],
            ]}
          />

          <H3>Step 6 – View Historical Performance</H3>
          <P>Click <strong>Show Historical Data</strong> to open historical analytics charts. You can select time period, chart type (Trend / Bar / Pie), and metrics. Click <strong>Export PDF</strong> to download the report.</P>
        </section>

        <Divider />

        <section id="instagram">
          <H2 id="instagram">Instagram Integration</H2>
          <P>This integration connects your Instagram Business or Creator account to the portal.</P>
          <Note type="warning" title="Prerequisite">
            Your Instagram account must be connected to a Facebook Page before integration.
          </Note>

          <H3>Step 1 – Connect Your Instagram Account</H3>
          <Steps steps={[
            <span>Go to <strong>Settings → Social Integrations → Instagram</strong>.</span>,
            <span>Click <strong>Connect Instagram</strong>.</span>,
            "Log in through the Facebook authentication window.",
            "Grant the required permissions.",
            "Select the Instagram Business account you want to connect.",
          ]} />

          <H3>Step 2 – View Your Instagram Profile</H3>
          <P>Your account summary card will show profile picture, username, follower count, and total number of posts.</P>

          <H3>Step 3 – View Recent Posts</H3>
          <P>Each post card displays image or video thumbnail, caption preview, publish date, likes, comments, and video views for videos/reels. Click <strong>View on Instagram</strong> to open the post.</P>

          <H3>Step 4 – View Post Analytics</H3>
          <Table
            headers={["Metric", "Description"]}
            rows={[
              ["Reach", "Number of unique users who saw the post"],
              ["Views", "Video or Reel play count"],
              ["Saved", "Number of users who saved the post"],
              ["Shares", "Number of times the post was shared"],
              ["Likes", "Total likes"],
              ["Comments", "Total comments"],
              ["Engagement Rate", "Engagement percentage"],
            ]}
          />
        </section>

        <Divider />

        <section id="linkedin">
          <H2 id="linkedin">LinkedIn Integration</H2>
          <P>This integration connects your LinkedIn profile or company page to track professional network performance.</P>

          <H3>Step 1 – Connect Your LinkedIn Account</H3>
          <Steps steps={[
            <span>Go to <strong>Settings → Social Integrations → LinkedIn</strong>.</span>,
            <span>Click <strong>Connect LinkedIn Account</strong>.</span>,
            "Log in through the LinkedIn authorization window.",
            "Approve the requested permissions. Your profile and company pages will appear in the portal.",
          ]} />

          <H3>Step 2 – Switch Between Accounts</H3>
          <P>If you manage multiple LinkedIn accounts, use the account selector dropdown to choose between Personal Profile or Organization Page.</P>

          <H3>Step 3 – Account Analytics</H3>
          <Table
            headers={["Metric", "Description"]}
            rows={[
              ["Followers", "Total followers"],
              ["Post Engagement", "Likes + comments + shares"],
              ["Impressions", "Number of times posts appeared"],
              ["Engagement Rate", "Percentage of interactions"],
              ["Clicks", "Number of link clicks"],
            ]}
          />

          <H3>Step 4 – View LinkedIn Posts</H3>
          <P>The portal displays your recent posts including post text, images, publish date, likes, comments, shares, and impressions.</P>

          <H3>Step 5 – View Post Analytics</H3>
          <Table
            headers={["Metric", "Description"]}
            rows={[
              ["Likes", "Total likes"],
              ["Comments", "Comment count"],
              ["Shares", "Number of shares"],
              ["Impressions", "Total views"],
              ["Clicks", "Link clicks"],
              ["Engagement Rate", "Engagement percentage"],
            ]}
          />
        </section>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e4e6e8", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#bcc0c4" }}>Was this document helpful?</span>
          {["Yes", "No"].map((opt) => (
            <button key={opt} style={{
              padding: "4px 14px", border: "1px solid #ccd0d5", borderRadius: 20,
              background: "#fff", color: "#606770", fontSize: 13, cursor: "pointer",
            }}>{opt}</button>
          ))}
        </div>
      </main>

      {/* RIGHT OUTLINE — "On This Page" */}
      <aside style={{
        width: 200, flexShrink: 0, position: "sticky", top: 60,
        maxHeight: "calc(100vh - 60px)", overflowY: "auto",
        padding: "32px 16px 24px",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1c1e21", marginBottom: 12, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          On This Page
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {RIGHT_NAV.map((item) => (
            <li key={item.id} style={{ marginBottom: 4 }}>
              <button
                onClick={() => goto(item.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "3px 0",
                  fontSize: 13, color: activeId === item.id ? "#1877f2" : "#8a8d91",
                  fontWeight: activeId === item.id ? 600 : 400, textAlign: "left",
                  transition: "color 0.15s",
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
};

// ─── APP SHELL ─────────────────────────────────────────────────────────────────

export default function AirSparkDocs() {
  const [page, setPage] = useState("landing"); // "landing" | "docs"
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goToDocs = (scrollId) => {
    setPage("docs");
    if (scrollId) {
      setTimeout(() => {
        document.getElementById(scrollId)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif", background: "#fff", minHeight: "100vh" }}>

      {/* TOP NAV — matches Meta style */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "#fff", borderBottom: "1px solid #e4e6e8",
        height: 60, display: "flex", alignItems: "center",
        padding: "0 24px", gap: 24,
      }}>
        {/* Logo */}
        <button
          onClick={() => setPage("landing")}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <img
            src="/logoAirspark.png"
            alt="AirSpark Logo"
            style={{ height: 85, width: "auto", display: "block" }}
          />
        </button>

        {/* Nav pills */}
        <nav style={{ display: "flex", gap: 4 }}>
          {[
            { label: "Docs", view: "landing" },
            { label: "Portal", view: "docs" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => item.view === "docs" ? goToDocs() : setPage("landing")}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "none",
                background: page === item.view ? "#e7f3ff" : "none",
                color: page === item.view ? "#1877f2" : "#606770",
                fontWeight: page === item.view ? 600 : 400,
                fontSize: 14, cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Breadcrumb for doc page */}
        {page === "docs" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#606770" }}>
            <button onClick={() => setPage("landing")} style={{ background: "none", border: "none", color: "#606770", cursor: "pointer", padding: 0, fontSize: 13 }}>Docs</button>
            <ChevronRight />
            <span style={{ color: "#1c1e21", fontWeight: 500 }}>Customer Portal</span>
          </div>
        )}

        {/* Search */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#f0f2f5", border: "1px solid #e4e6e8",
            borderRadius: 6, padding: "7px 12px", width: 200,
          }}>
            <span style={{ color: "#8a8d91" }}><SearchIcon /></span>
            <span style={{ fontSize: 14, color: "#8a8d91" }}>Search...</span>
          </div>

          <a
            href="https://airspark.storage.googleapis.com/index.html#/customer/login"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 16px", borderRadius: 6,
              background: "#1877f2", color: "#fff",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            Open Portal <ExternalIcon />
          </a>
        </div>
      </header>

      {/* PAGE CONTENT */}
      {page === "landing" ? (
        <LandingPage onNavigate={goToDocs} />
      ) : (
        <DocPage scrollTo={null} />
      )}
    </div>
  );
}
