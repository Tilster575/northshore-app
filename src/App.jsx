import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   SUPABASE CONFIG — Replace with your own credentials
   ══════════════════════════════════════════════════════════════ */
const SUPABASE_URL = "https://uicdvvaadsrexqvbkbgp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY2R2dmFhZHNyZXhxdmJrYmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTQ1NzgsImV4cCI6MjA4ODM3MDU3OH0.kUQyZeJsgzI9bMlCXlVitdtT-yoNLz-oCEKPrUfsw2k";

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

/* ── Supabase REST helpers ── */
async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...supabaseHeaders, ...options.headers }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${res.status} ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function uploadPhoto(file) {
  const ext = file.name ? file.name.split(".").pop() : "jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/job-photos/${fileName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": file.type
    },
    body: file
  });
  if (!res.ok) throw new Error("Photo upload failed");
  return `${SUPABASE_URL}/storage/v1/object/public/job-photos/${fileName}`;
}

/* ══════════════════════════════════════════════════════════════
   CONSTANTS & THEME
   ══════════════════════════════════════════════════════════════ */
const ACCENT = "#CDFF00";
const BG = "#000";
const CARD = "#111";
const BORDER = "#222";
const TEXT = "#fff";
const MUTED = "#888";

const ACTIVITIES = ["Lift & Launch", "Yard Job", "Quick Turnaround", "Winter Package", "Other"];
const ACTIVITY_CODES = {
  "Lift & Launch": "LL", "Yard Job": "YJ", "Quick Turnaround": "QT",
  "Winter Package": "WP", "Other": "OT"
};

const STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const PRIORITY_COLORS = { Low: "#6b7280", Medium: "#3b82f6", High: "#f59e0b", Urgent: "#ef4444" };

const TEAM = [
  "Select team member...", "Matt Rogers", "Henry Message", "Tom Knight",
  "Charlie Nicholls", "Josh McCarthney"
];

const statusColor = (s) => ({
  Pending: "#f59e0b", "In Progress": "#3b82f6", Completed: ACCENT, Cancelled: "#ef4444"
}[s] || MUTED);

/* ══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ══════════════════════════════════════════════════════════════ */
const Badge = ({ status }) => (
  <span style={{
    background: statusColor(status) + "22", color: statusColor(status),
    border: `1px solid ${statusColor(status)}`, borderRadius: 20,
    padding: "2px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap"
  }}>{status}</span>
);

const PriorityBadge = ({ priority }) => {
  const c = PRIORITY_COLORS[priority] || MUTED;
  const icon = { Urgent: "🔴", High: "🟠", Medium: "🔵", Low: "⚪" }[priority] || "";
  return (
    <span style={{
      background: c + "18", color: c, border: `1px solid ${c}55`, borderRadius: 20,
      padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
    }}>{icon} {priority}</span>
  );
};

const inputStyle = {
  background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 8,
  color: TEXT, padding: "10px 12px", fontSize: 14, outline: "none",
  fontFamily: "inherit", width: "100%", boxSizing: "border-box"
};

const Label = ({ children }) => (
  <label style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{children}</label>
);
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><Label>{label}</Label>{children}</div>
);
const Inp = ({ label, ...p }) => (
  <Field label={label}><input {...p} style={{ ...inputStyle, ...p.style }} /></Field>
);
const Sel = ({ label, options, ...p }) => (
  <Field label={label}>
    <select {...p} style={{ ...inputStyle }}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
  </Field>
);
const Txt = ({ label, ...p }) => (
  <Field label={label}>
    <textarea {...p} style={{ ...inputStyle, resize: "vertical", minHeight: 72, ...p.style }} />
  </Field>
);
const StatCard = ({ label, value, highlight, color }) => (
  <div style={{
    background: highlight ? ACCENT : CARD, border: `1px solid ${highlight ? ACCENT : BORDER}`,
    borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 110
  }}>
    <div style={{ fontSize: 26, fontWeight: 800, color: highlight ? BG : (color || ACCENT) }}>{value}</div>
    <div style={{ fontSize: 12, color: highlight ? "#333" : MUTED, fontWeight: 600, marginTop: 2 }}>{label}</div>
  </div>
);

/* Saving indicator */
const SavingIndicator = ({ saving, error }) => {
  if (!saving && !error) return null;
  return (
    <div style={{
      position: "fixed", top: 70, right: 24, zIndex: 999,
      background: error ? "#ef4444" : CARD, border: `1px solid ${error ? "#ef4444" : ACCENT}`,
      borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600,
      color: error ? TEXT : ACCENT
    }}>
      {error ? `⚠ ${error}` : "Saving..."}
    </div>
  );
};

/* Searchable Dropdown Component */
function SearchableDropdown({ items, value, onChange, placeholder, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const inputRef = useRef(null);

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const selectedItem = items.find((item) => item.id === value);

  const handleSelect = (item) => {
    onChange(item.id);
    setSearchText("");
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearchText("");
    setIsOpen(false);
  };

  return (
    <Field label={label}>
      <div style={{ position: "relative" }}>
        <div
          style={{ ...inputStyle, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0, paddingRight: 8 }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={selectedItem ? "" : placeholder}
            value={isOpen ? searchText : (selectedItem ? selectedItem.label : "")}
            onChange={(e) => {
              setSearchText(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            style={{ ...inputStyle, border: "none", padding: "10px 12px", outline: "none", flex: 1, background: "transparent" }}
          />
          {selectedItem && (
            <button onClick={handleClear} style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", padding: 0, fontSize: 16 }}>✕</button>
          )}
        </div>
        {isOpen && (
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
            background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, zIndex: 100,
            maxHeight: 200, overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.5)"
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 16px", color: MUTED, fontSize: 13 }}>No matches</div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  style={{
                    padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer",
                    background: value === item.id ? ACCENT + "11" : "transparent",
                    color: TEXT, fontSize: 13
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.label}</div>
                  {item.sublabel && <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{item.sublabel}</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

/* ── Header ── */
function Header({ view, setView }) {
  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "calendar", label: "Calendar" },
    { key: "boats", label: "Boats" },
    { key: "customers", label: "Customers" },
    { key: "add", label: "+ New Job" }
  ];
  return (
    <div style={{ background: "#111", borderBottom: `2px solid ${ACCENT}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: ACCENT, letterSpacing: -1 }}>NORTHSHORE</span>
        <span style={{ color: MUTED, fontSize: 13 }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>Lift &amp; Launch</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            background: view === t.key ? ACCENT : "transparent",
            color: view === t.key ? BG : MUTED,
            border: `1px solid ${view === t.key ? ACCENT : BORDER}`,
            borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DEFAULTS & HELPERS
   ══════════════════════════════════════════════════════════════ */
const emptyForm = {
  customerName: "", boatName: "", phone: "", location: "", activity: ACTIVITIES[0],
  scheduledDate: "", priority: "Medium", issues: "", photoFile: null, photoPreview: null,
  boatId: null, customerId: null, useCustomBoat: false
};
const emptyCompletion = {
  teamMember: TEAM[0], fromLocation: "", toLocation: "",
  plannedActivity: "", actualActivity: "", completionNotes: "",
  completionIssues: "", compPhotoFile: null, compPhotoPreview: null
};
const emptyBoat = {
  name: "", customerId: null, lengthFt: "", type: "", berthNumber: "", notes: ""
};
const emptyCustomer = {
  name: "", email: "", phone: "", company: ""
};

function generateJobRef(activity, scheduledDate, existingJobs) {
  const code = ACTIVITY_CODES[activity] || "OT";
  const d = scheduledDate ? new Date(scheduledDate) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const dateStr = `${dd}/${mm}/${yy}`;
  const prefix = `${code}-${dateStr}-`;
  const existing = existingJobs
    .filter((j) => (j.jobRef || j.job_ref))
    .map((j) => j.jobRef || j.job_ref)
    .filter((ref) => ref.startsWith(prefix))
    .map((ref) => parseInt(ref.split("-").pop(), 10))
    .filter((n) => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

/* Map DB rows (snake_case) → display objects */
function mapJob(row) {
  return {
    id: row.id,
    jobRef: row.job_ref,
    customerName: row.customer_name,
    boatName: row.boat_name,
    phone: row.phone || "",
    location: row.location || "",
    activity: row.activity,
    scheduledDate: row.scheduled_date || "",
    priority: row.priority || "Medium",
    issues: row.issues || "",
    photoUrl: row.photo_url,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleString("en-GB") : "",
    completedAt: row.completed_at ? new Date(row.completed_at).toLocaleString("en-GB") : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toLocaleString("en-GB") : null,
    cancelReason: row.cancel_reason,
    boatId: row.boat_id,
    completion: row.completion_team_member ? {
      teamMember: row.completion_team_member,
      fromLocation: row.completion_from_location || "",
      toLocation: row.completion_to_location || "",
      plannedActivity: row.completion_planned_activity || "",
      actualActivity: row.completion_actual_activity || "",
      completionNotes: row.completion_notes || "",
      completionIssues: row.completion_issues || "",
      compPhotoUrl: row.completion_photo_url,
      submittedAt: row.completion_submitted_at ? new Date(row.completion_submitted_at).toLocaleString("en-GB") : ""
    } : null
  };
}

function mapBoat(row) {
  return {
    id: row.id,
    name: row.name,
    customerId: row.customer_id,
    lengthFt: row.length_ft,
    lengthM: row.length_m,
    draft: row.draft,
    weight: row.weight,
    type: row.type,
    berthNumber: row.berth_number,
    boatNumber: row.boat_number || "",
    vesselType: row.vessel_type || "",
    keel: row.keel || "",
    cradle: row.cradle || "",
    xeroCustomer: row.xero_customer || "",
    notes: row.notes || ""
  };
}

function mapCustomer(row) {
  return {
    id: row.id,
    xeroContactId: row.xero_contact_id,
    name: row.name,
    email: row.email || "",
    phone: row.phone || "",
    company: row.company || "",
    notes: row.notes || ""
  };
}

/* Calendar helpers */
function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDay = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);
  return cells;
}
function toDateKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = (h / w) * maxDim; w = maxDim; }
          else { w = (w / h) * maxDim; h = maxDim; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ── Compute field-level diff between original job and edited form ── */
function computeJobDiff(originalJob, editedForm) {
  const fields = ["customerName", "boatName", "phone", "location", "activity", "scheduledDate", "priority", "issues"];
  const fieldLabels = {
    customerName: "Customer Name", boatName: "Boat Name", phone: "Telephone",
    location: "Location", activity: "Activity", scheduledDate: "Scheduled Date",
    priority: "Priority", issues: "Issues"
  };
  return fields
    .filter((f) => {
      const oldVal = (originalJob[f] ?? "").toString();
      const newVal = (editedForm[f] ?? "").toString();
      return oldVal !== newVal;
    })
    .map((f) => ({
      field: f,
      label: fieldLabels[f] || f,
      oldValue: (originalJob[f] ?? "").toString(),
      newValue: (editedForm[f] ?? "").toString()
    }));
}

/* ══════════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════════ */
export default function App() {
  const [jobs, setJobs] = useState([]);
  const [boats, setBoats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [view, setView] = useState("dashboard");
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [completion, setCompletion] = useState(emptyCompletion);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activityFilter, setActivityFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [boatSearch, setBoatSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedBoatId, setSelectedBoatId] = useState(null);
  const [boatForm, setBoatForm] = useState(emptyBoat);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [showAddCustomerForm, setShowAddCustomerForm] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangeReasonModal, setShowChangeReasonModal] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [editForm, setEditForm] = useState(emptyForm);
  const [jobChanges, setJobChanges] = useState([]);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calSelectedDate, setCalSelectedDate] = useState(null);

  const fileRef = useRef();
  const compFileRef = useRef();

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setC = (k, v) => setCompletion((c) => ({ ...c, [k]: v }));
  const setB = (k, v) => setBoatForm((b) => ({ ...b, [k]: v }));
  const setCu = (k, v) => setCustomerForm((c) => ({ ...c, [k]: v }));

  /* ── Load data from Supabase on mount ── */
  const fetchJobs = useCallback(async () => {
    try {
      const rows = await supaFetch("jobs?order=created_at.desc");
      setJobs(rows.map(mapJob));
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setSaveError("Failed to load jobs");
      setTimeout(() => setSaveError(null), 4000);
    }
  }, []);

  const fetchBoats = useCallback(async () => {
    try {
      const rows = await supaFetch("boats?order=name.asc");
      setBoats(rows.map(mapBoat));
    } catch (err) {
      console.error("Failed to load boats:", err);
      setSaveError("Failed to load boats");
      setTimeout(() => setSaveError(null), 4000);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const rows = await supaFetch("customers?order=name.asc");
      setCustomers(rows.map(mapCustomer));
    } catch (err) {
      console.error("Failed to load customers:", err);
      setSaveError("Failed to load customers");
      setTimeout(() => setSaveError(null), 4000);
    }
  }, []);

  const fetchJobChanges = useCallback(async (jobId) => {
    try {
      const rows = await supaFetch(`job_changes?job_id=eq.${jobId}&order=changed_at.desc`);
      setJobChanges(rows || []);
    } catch (err) {
      console.error("Failed to load job changes:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchJobs(), fetchBoats(), fetchCustomers()]).finally(() => {
      setLoading(false);
    });
  }, [fetchJobs, fetchBoats, fetchCustomers]);

  /* ── Edit job helpers ── */
  const startEditJob = (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    setEditForm({
      customerName: job.customerName,
      boatName: job.boatName,
      phone: job.phone,
      location: job.location,
      activity: job.activity,
      scheduledDate: job.scheduledDate,
      priority: job.priority,
      issues: job.issues,
      photoFile: null, photoPreview: null,
      boatId: job.boatId, customerId: null, useCustomBoat: true
    });
    setShowEditModal(true);
  };

  const cancelEditJob = () => {
    setEditForm(emptyForm);
    setShowEditModal(false);
    setShowChangeReasonModal(false);
    setChangeReason("");
  };

  const handleEditSaveClick = () => {
    const job = jobs.find((j) => j.id === selectedId);
    if (!job) return;
    const changes = computeJobDiff(job, editForm);
    if (changes.length === 0) { alert("No changes were made."); return; }
    setShowChangeReasonModal(true);
  };

  const saveJobEdit = async (jobId, reason) => {
    if (!reason?.trim()) { alert("Please provide a reason for the changes."); return; }
    const originalJob = jobs.find((j) => j.id === jobId);
    if (!originalJob) return;
    const changes = computeJobDiff(originalJob, editForm);
    if (changes.length === 0) return;

    setSaving(true); setSaveError(null);
    try {
      const dbFieldMap = {
        customerName: "customer_name", boatName: "boat_name", phone: "phone",
        location: "location", activity: "activity", scheduledDate: "scheduled_date",
        priority: "priority", issues: "issues"
      };
      const updateBody = {};
      changes.forEach(({ field }) => {
        updateBody[dbFieldMap[field]] = editForm[field] || null;
      });

      const [updatedRow] = await supaFetch(`jobs?id=eq.${jobId}`, {
        method: "PATCH", body: JSON.stringify(updateBody)
      });

      const changeRecords = changes.map(({ label, oldValue, newValue }) => ({
        job_id: jobId,
        changed_field: label,
        old_value: oldValue,
        new_value: newValue,
        reason: reason.trim()
      }));
      await supaFetch("job_changes", { method: "POST", body: JSON.stringify(changeRecords) });

      setJobs((prev) => prev.map((j) => j.id === jobId ? mapJob(updatedRow) : j));
      setShowEditModal(false);
      setShowChangeReasonModal(false);
      setChangeReason("");
      await fetchJobChanges(jobId);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to save job changes");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  /* ── Photo handlers ── */
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setF("photoFile", file);
    const r = new FileReader();
    r.onload = (ev) => setF("photoPreview", ev.target.result);
    r.readAsDataURL(file);
  };
  const handleCompPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setC("compPhotoFile", file);
    const r = new FileReader();
    r.onload = (ev) => setC("compPhotoPreview", ev.target.result);
    r.readAsDataURL(file);
  };

  /* ── Submit new job → Supabase ── */
  const submitJob = async () => {
    if (!form.customerName || !form.boatName) {
      alert("Customer Name and Boat Name are required.");
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const jobRef = generateJobRef(form.activity, form.scheduledDate, jobs);
      let photoUrl = null;
      if (form.photoFile) {
        const compressed = form.photoFile.size > 2 * 1024 * 1024
          ? await compressImage(form.photoFile) : form.photoFile;
        photoUrl = await uploadPhoto(compressed);
      }
      const body = {
        job_ref: jobRef,
        customer_name: form.customerName,
        boat_name: form.boatName,
        phone: form.phone,
        location: form.location,
        activity: form.activity,
        scheduled_date: form.scheduledDate || null,
        priority: form.priority,
        issues: form.issues,
        photo_url: photoUrl,
        status: "Pending",
        boat_id: form.boatId || null
      };
      const [row] = await supaFetch("jobs", { method: "POST", body: JSON.stringify(body) });
      setJobs((prev) => [mapJob(row), ...prev]);
      setForm(emptyForm);
      setView("dashboard");
    } catch (err) {
      console.error(err);
      const msg = err.message || "Failed to save job";
      setSaveError(msg);
      alert("Save error: " + msg);
      setTimeout(() => setSaveError(null), 8000);
    } finally {
      setSaving(false);
    }
  };

  /* ── Complete job → Supabase ── */
  const submitCompletion = async (jobId) => {
    if (completion.teamMember === TEAM[0]) { alert("Please select a team member."); return; }
    if (!completion.fromLocation || !completion.toLocation) { alert("From and To locations are required."); return; }
    setSaving(true); setSaveError(null);
    try {
      let compPhotoUrl = null;
      if (completion.compPhotoFile) {
        const compressed = completion.compPhotoFile.size > 2 * 1024 * 1024
          ? await compressImage(completion.compPhotoFile) : completion.compPhotoFile;
        compPhotoUrl = await uploadPhoto(compressed);
      }
      const body = {
        status: "Completed",
        completed_at: new Date().toISOString(),
        completion_team_member: completion.teamMember,
        completion_from_location: completion.fromLocation,
        completion_to_location: completion.toLocation,
        completion_planned_activity: completion.plannedActivity,
        completion_actual_activity: completion.actualActivity,
        completion_notes: completion.completionNotes,
        completion_issues: completion.completionIssues,
        completion_photo_url: compPhotoUrl,
        completion_submitted_at: new Date().toISOString()
      };
      const [row] = await supaFetch(`jobs?id=eq.${jobId}`, { method: "PATCH", body: JSON.stringify(body) });
      setJobs((prev) => prev.map((j) => j.id === jobId ? mapJob(row) : j));
      setCompletion(emptyCompletion);
      setView("detail");
    } catch (err) {
      console.error(err);
      setSaveError("Failed to complete job");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  /* ── Cancel job → Supabase ── */
  const cancelJob = async (jobId) => {
    if (!cancelReason.trim()) { alert("Please provide a reason for cancellation."); return; }
    setSaving(true); setSaveError(null);
    try {
      const body = {
        status: "Cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason.trim()
      };
      const [row] = await supaFetch(`jobs?id=eq.${jobId}`, { method: "PATCH", body: JSON.stringify(body) });
      setJobs((prev) => prev.map((j) => j.id === jobId ? mapJob(row) : j));
      setCancelReason("");
      setShowCancelModal(false);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to cancel job");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  /* ── Update status → Supabase ── */
  const updateStatus = async (id, status) => {
    setSaving(true); setSaveError(null);
    try {
      const body = { status };
      if (status === "Completed") body.completed_at = new Date().toISOString();
      const [row] = await supaFetch(`jobs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) });
      setJobs((prev) => prev.map((j) => j.id === id ? mapJob(row) : j));
    } catch (err) {
      console.error(err);
      setSaveError("Failed to update status");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  /* ── Generate boat number: B + first 4 letters (uppercase) + sequential 0001 ── */
  const generateBoatNumber = (boatName) => {
    const letters = boatName.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase().padEnd(4, "X");
    const prefix = `B${letters}`;
    const existing = boats
      .map((b) => b.boatNumber)
      .filter((bn) => bn && bn.startsWith(prefix))
      .map((bn) => parseInt(bn.slice(prefix.length), 10))
      .filter((n) => !isNaN(n));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    return `${prefix}${String(next).padStart(4, "0")}`;
  };

  /* ── Save boat → Supabase ── */
  const saveBoat = async () => {
    if (!boatForm.name) {
      alert("Boat Name is required.");
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const body = {
        name: boatForm.name,
        customer_id: boatForm.customerId || null,
        length_m: boatForm.lengthM ? parseFloat(boatForm.lengthM) : null,
        vessel_type: boatForm.vesselType || null,
        draft: boatForm.draft ? parseFloat(boatForm.draft) : null,
        notes: boatForm.notes
      };
      if (selectedBoatId) {
        const [row] = await supaFetch(`boats?id=eq.${selectedBoatId}`, { method: "PATCH", body: JSON.stringify(body) });
        setBoats((prev) => prev.map((b) => b.id === selectedBoatId ? mapBoat(row) : b));
      } else {
        let newNumber = generateBoatNumber(boatForm.name);
        const duplicate = boats.find((b) => b.boatNumber === newNumber);
        if (duplicate) {
          const nums = boats.map((b) => b.boatNumber).filter(Boolean).map((bn) => parseInt(bn.slice(5), 10)).filter((n) => !isNaN(n));
          const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
          newNumber = `B${boatForm.name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase().padEnd(4, "X")}${String(maxNum + 1).padStart(4, "0")}`;
        }
        body.boat_number = newNumber;
        const [row] = await supaFetch("boats", { method: "POST", body: JSON.stringify(body) });
        setBoats((prev) => [...prev, mapBoat(row)]);
      }
      setBoatForm(emptyBoat);
      setSelectedBoatId(null);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to save boat");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  /* ── Save customer → Supabase ── */
  const saveCustomer = async () => {
    if (!customerForm.name) {
      alert("Customer Name is required.");
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      const body = {
        name: customerForm.name,
        email: customerForm.email,
        phone: customerForm.phone,
        company: customerForm.company
      };
      const [row] = await supaFetch("customers", { method: "POST", body: JSON.stringify(body) });
      setCustomers((prev) => [...prev, mapCustomer(row)]);
      setCustomerForm(emptyCustomer);
      setShowAddCustomerForm(false);
    } catch (err) {
      console.error(err);
      setSaveError("Failed to save customer");
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const formatScheduledDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  };

  const exportCSV = () => {
    const h = ["Job Ref","Customer","Boat","Phone","Location","Activity","Priority","Scheduled Date","Issues","Status","Created","Completed","Cancelled","Cancel Reason","Team Member","From","To","Planned","Actual","Completion Notes","Completion Issues"];
    const rows = jobs.map((j) => {
      const c = j.completion || {};
      return [j.jobRef, j.customerName, j.boatName, j.phone, j.location, j.activity, j.priority || "", j.scheduledDate || "", j.issues, j.status, j.createdAt, j.completedAt || "", j.cancelledAt || "", j.cancelReason || "",
        c.teamMember || "", c.fromLocation || "", c.toLocation || "", c.plannedActivity || "", c.actualActivity || "", c.completionNotes || "", c.completionIssues || ""
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [h.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Northshore_Lift_Launch_${Date.now()}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  /* ── Filtering ── */
  const filtered = jobs.filter((j) => {
    const matchSearch = [j.customerName, j.boatName, j.location, j.jobRef].some(
      (v) => (v || "").toLowerCase().includes(search.toLowerCase())
    );
    const matchStatus = statusFilter === "All" || j.status === statusFilter;
    const matchActivity = activityFilter === "All" || j.activity === activityFilter;
    let matchDate = true;
    if (dateFrom && j.scheduledDate) matchDate = matchDate && j.scheduledDate >= dateFrom;
    else if (dateFrom && !j.scheduledDate) matchDate = false;
    if (dateTo && j.scheduledDate) matchDate = matchDate && j.scheduledDate <= dateTo;
    else if (dateTo && !j.scheduledDate) matchDate = false;
    return matchSearch && matchStatus && matchActivity && matchDate;
  });

  const counts = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === "Pending").length,
    inProgress: jobs.filter((j) => j.status === "In Progress").length,
    completed: jobs.filter((j) => j.status === "Completed").length,
    cancelled: jobs.filter((j) => j.status === "Cancelled").length,
    issues: jobs.filter((j) => j.issues?.trim() || j.completion?.completionIssues?.trim()).length
  };

  const selectedJob = jobs.find((j) => j.id === selectedId);

  /* Load change history when viewing a job */
  useEffect(() => {
    if (selectedId && view === "detail") {
      fetchJobChanges(selectedId);
    }
  }, [selectedId, view, fetchJobChanges]);

  const hasActiveFilters = activityFilter !== "All" || dateFrom || dateTo;
  const clearFilters = () => { setActivityFilter("All"); setDateFrom(""); setDateTo(""); };

  /* Calendar data */
  const jobsByDate = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      const key = toDateKey(j.scheduledDate);
      if (key) { if (!map[key]) map[key] = []; map[key].push(j); }
    });
    return map;
  }, [jobs]);
  const calGrid = getMonthGrid(calYear, calMonth);
  const calDayJobs = calSelectedDate ? (jobsByDate[calSelectedDate] || []) : [];

  /* Boats filtering */
  const filteredBoats = boats.filter((b) => {
    const q = boatSearch.toLowerCase();
    return b.name.toLowerCase().includes(q) ||
      b.xeroCustomer.toLowerCase().includes(q) ||
      b.boatNumber.toLowerCase().includes(q) ||
      b.vesselType.toLowerCase().includes(q) ||
      (customers.find((c) => c.id === b.customerId)?.name || "").toLowerCase().includes(q);
  });

  /* Customers filtering */
  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    const note = (c.notes || "").toLowerCase();
    const isCustomer = note.includes("customer");
    const isContact = note.includes("contact");
    const isSupplier = note.includes("supplier");
    const isUnknown = !isCustomer && !isContact && !isSupplier;
    if (isCustomer || isUnknown) return true;
    if (isContact && showContacts) return true;
    if (isSupplier && showSuppliers) return true;
    return false;
  });

  /* ── Cancel Modal ── */
  const CancelModal = ({ job }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: CARD, border: `1px solid #ef4444`, borderRadius: 16, padding: 28, maxWidth: 480, width: "90%" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>Cancel Job</div>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>{job.jobRef} · {job.boatName} · {job.customerName}</div>
        <Txt label="Reason for cancellation *" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Please provide a reason..." />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button disabled={saving} onClick={() => cancelJob(job.id)} style={{
            background: "#ef4444", color: TEXT, border: "none", borderRadius: 8,
            padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer", flex: 1, opacity: saving ? 0.6 : 1
          }}>{saving ? "Cancelling..." : "Confirm Cancellation"}</button>
          <button onClick={() => { setShowCancelModal(false); setCancelReason(""); }} style={{
            background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer"
          }}>Go Back</button>
        </div>
      </div>
    </div>
  );

  /* ── Edit Job Modal ── */
  const EditJobModal = ({ job }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: CARD, border: `1px solid ${ACCENT}`, borderRadius: 16, padding: 28, maxWidth: 640, width: "90%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT, marginBottom: 4 }}>Edit Job</div>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>{job.jobRef} · {job.boatName}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Inp label="Customer Name" value={editForm.customerName} onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))} />
          <Inp label="Boat Name" value={editForm.boatName} onChange={(e) => setEditForm((f) => ({ ...f, boatName: e.target.value }))} />
          <Inp label="Telephone" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
          <Inp label="Location" value={editForm.location} onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
          <Sel label="Activity" options={ACTIVITIES} value={editForm.activity} onChange={(e) => setEditForm((f) => ({ ...f, activity: e.target.value }))} />
          <Inp label="Scheduled Date" type="date" value={editForm.scheduledDate} onChange={(e) => setEditForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
          <Sel label="Priority" options={PRIORITIES} value={editForm.priority} onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Txt label="Issues" value={editForm.issues} onChange={(e) => setEditForm((f) => ({ ...f, issues: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button disabled={saving} onClick={handleEditSaveClick} style={{
            background: ACCENT, color: BG, border: "none", borderRadius: 8,
            padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer", flex: 1, opacity: saving ? 0.6 : 1
          }}>{saving ? "Saving..." : "Save Changes"}</button>
          <button onClick={cancelEditJob} style={{
            background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer"
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );

  /* ── Change Reason Modal ── */
  const ChangeReasonModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }}>
      <div style={{ background: CARD, border: `1px solid ${ACCENT}`, borderRadius: 16, padding: 28, maxWidth: 480, width: "90%" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT, marginBottom: 4 }}>Reason for Changes</div>
        <div style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>Please explain why these changes are being made.</div>
        <Txt label="Reason *" value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="e.g. Customer changed mind, date correction..." />
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button disabled={saving || !changeReason.trim()} onClick={() => saveJobEdit(selectedId, changeReason)} style={{
            background: ACCENT, color: BG, border: "none", borderRadius: 8,
            padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer", flex: 1,
            opacity: (saving || !changeReason.trim()) ? 0.6 : 1
          }}>{saving ? "Saving..." : "Confirm Changes"}</button>
          <button onClick={() => { setShowChangeReasonModal(false); setChangeReason(""); }} style={{
            background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer"
          }}>Go Back</button>
        </div>
      </div>
    </div>
  );

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: ACCENT }}>Loading Northshore...</div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── BOATS VIEW ──
  // ══════════════════════════════════════════════════════════════
  if (view === "boats") {
    const customerDropdownItems = customers.map((c) => ({ id: c.id, label: c.name, sublabel: c.company || "" }));
    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
        <Header view={view} setView={setView} />
        <SavingIndicator saving={saving} error={saveError} />
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
            <input placeholder="🔍  Search boats or owner..." value={boatSearch} onChange={(e) => setBoatSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
            <button onClick={() => { setSelectedBoatId(null); setBoatForm(emptyBoat); }} style={{
              background: ACCENT, color: BG, border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap"
            }}>+ Add Boat</button>
          </div>

          {selectedBoatId !== null && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT, marginBottom: 20 }}>
                {selectedBoatId ? "Edit Boat" : "Add New Boat"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <Inp label="Boat Name *" value={boatForm.name} onChange={(e) => setB("name", e.target.value)} placeholder="e.g. Sea Spirit" />
                <Inp label="Length (m)" type="number" value={boatForm.lengthM || ""} onChange={(e) => setB("lengthM", e.target.value)} placeholder="e.g. 10.5" />
                <Sel label="Vessel Type" options={["", "Yacht", "Motor Boat", "Dingy"]} value={boatForm.vesselType || ""} onChange={(e) => setB("vesselType", e.target.value)} />
                <Inp label="Draft" type="number" value={boatForm.draft || ""} onChange={(e) => setB("draft", e.target.value)} placeholder="e.g. 1.5" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <SearchableDropdown
                  items={customerDropdownItems}
                  value={boatForm.customerId}
                  onChange={(val) => setB("customerId", val)}
                  placeholder="Search and select owner..."
                  label="Owner"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Txt label="Notes" value={boatForm.notes} onChange={(e) => setB("notes", e.target.value)} placeholder="Any additional notes..." />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button disabled={saving} onClick={saveBoat} style={{
                  background: ACCENT, color: BG, border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1
                }}>{saving ? "Saving..." : "Save Boat"}</button>
                <button onClick={() => { setSelectedBoatId(null); setBoatForm(emptyBoat); }} style={{
                  background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer"
                }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${ACCENT}`, textAlign: "left" }}>
                  {["Name", "Owner", "Boat No.", "Length (m)", "Draft", "Weight", "Type", "Keel", "Cradle", "Xero Customer"].map((h) => (
                    <th key={h} style={{ padding: "10px 8px", color: ACCENT, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBoats.map((boat) => {
                  const owner = customers.find((c) => c.id === boat.customerId);
                  return (
                    <tr key={boat.id} onClick={() => { setSelectedBoatId(boat.id); setBoatForm(boat); }} style={{
                      borderBottom: `1px solid ${BORDER}`, cursor: "pointer",
                      background: selectedBoatId === boat.id ? ACCENT + "11" : "transparent"
                    }}>
                      <td style={{ padding: "10px 8px", fontWeight: 700, color: ACCENT, whiteSpace: "nowrap" }}>{boat.name}</td>
                      <td style={{ padding: "10px 8px", color: TEXT }}>{owner?.name || "—"}</td>
                      <td style={{ padding: "10px 8px", color: MUTED, fontFamily: "monospace", fontSize: 12 }}>{boat.boatNumber || "—"}</td>
                      <td style={{ padding: "10px 8px", color: TEXT }}>{boat.lengthM || "—"}</td>
                      <td style={{ padding: "10px 8px", color: TEXT }}>{boat.draft || "—"}</td>
                      <td style={{ padding: "10px 8px", color: TEXT }}>{boat.weight || "—"}</td>
                      <td style={{ padding: "10px 8px", color: TEXT }}>{boat.vesselType || "—"}</td>
                      <td style={{ padding: "10px 8px", color: TEXT }}>{boat.keel || "—"}</td>
                      <td style={{ padding: "10px 8px", color: TEXT }}>{boat.cradle || "—"}</td>
                      <td style={{ padding: "10px 8px", color: MUTED, fontSize: 12 }}>{boat.xeroCustomer || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredBoats.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: MUTED }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚓</div>
              <div style={{ fontWeight: 600 }}>{boatSearch ? "No boats match your search" : "No boats registered yet"}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── CUSTOMERS VIEW ──
  // ══════════════════════════════════════════════════════════════
  if (view === "customers") {
    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
        <Header view={view} setView={setView} />
        <SavingIndicator saving={saving} error={saveError} />
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ color: MUTED, fontSize: 13, fontWeight: 600 }}>💡 Customers synced from Xero. To add customers, add them in Xero first.</div>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
            <input placeholder="🔍  Search customers..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
            <button onClick={() => setShowAddCustomerForm(!showAddCustomerForm)} style={{
              background: showAddCustomerForm ? "transparent" : ACCENT, color: showAddCustomerForm ? MUTED : BG, border: `1px solid ${showAddCustomerForm ? BORDER : ACCENT}`, borderRadius: 8, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap"
            }}>{showAddCustomerForm ? "Cancel" : "+ Add Customer Manually"}</button>
          </div>
          <div style={{ display: "flex", gap: 20, marginBottom: 24, alignItems: "center" }}>
            <div style={{ color: MUTED, fontSize: 12, fontWeight: 600 }}>Showing: Customers</div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: TEXT }}>
              <input type="checkbox" checked={showContacts} onChange={(e) => setShowContacts(e.target.checked)}
                style={{ accentColor: ACCENT, width: 16, height: 16, cursor: "pointer" }} />
              + Contacts
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: TEXT }}>
              <input type="checkbox" checked={showSuppliers} onChange={(e) => setShowSuppliers(e.target.checked)}
                style={{ accentColor: ACCENT, width: 16, height: 16, cursor: "pointer" }} />
              + Suppliers
            </label>
            <div style={{ color: MUTED, fontSize: 12 }}>({filteredCustomers.length} shown)</div>
          </div>

          {showAddCustomerForm && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT, marginBottom: 20 }}>Add Customer</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <Inp label="Name *" value={customerForm.name} onChange={(e) => setCu("name", e.target.value)} placeholder="e.g. James Smith" />
                <Inp label="Email" type="email" value={customerForm.email} onChange={(e) => setCu("email", e.target.value)} placeholder="e.g. james@example.com" />
                <Inp label="Phone" type="tel" value={customerForm.phone} onChange={(e) => setCu("phone", e.target.value)} placeholder="e.g. 07700 900000" />
                <Inp label="Company" value={customerForm.company} onChange={(e) => setCu("company", e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button disabled={saving} onClick={saveCustomer} style={{
                  background: ACCENT, color: BG, border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: saving ? 0.6 : 1
                }}>{saving ? "Saving..." : "Save Customer"}</button>
                <button onClick={() => { setShowAddCustomerForm(false); setCustomerForm(emptyCustomer); }} style={{
                  background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer"
                }}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {filteredCustomers.map((customer) => {
              const boatCount = boats.filter((b) => b.customerId === customer.id).length;
              return (
                <div key={customer.id} style={{
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: ACCENT, marginBottom: 12 }}>{customer.name}</div>
                  {customer.company && (
                    <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>{customer.company}</div>
                  )}
                  {customer.email && (
                    <div style={{ fontSize: 12, color: TEXT, marginBottom: 6, wordBreak: "break-all" }}>{customer.email}</div>
                  )}
                  {customer.phone && (
                    <div style={{ fontSize: 12, color: TEXT, marginBottom: 12 }}>{customer.phone}</div>
                  )}
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {boatCount} boat{boatCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCustomers.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: MUTED }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontWeight: 600 }}>{customerSearch ? "No customers match your search" : "No customers yet"}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── COMPLETE ACTIVITY ──
  // ══════════════════════════════════════════════════════════════
  if (view === "complete" && selectedJob) {
    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
        <Header view={view} setView={setView} />
        <SavingIndicator saving={saving} error={saveError} />
        <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
          <button onClick={() => setView("detail")} style={{ background: "transparent", color: MUTED, border: "none", cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0 }}>← Back</button>
          <div style={{ background: CARD, border: `2px solid ${ACCENT}`, borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT, marginBottom: 4 }}>✓ Complete Activity</div>
            <div style={{ color: MUTED, fontSize: 13, marginBottom: 24 }}>{selectedJob.jobRef} · {selectedJob.boatName} · {selectedJob.activity} · {selectedJob.customerName}</div>
            <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: ACCENT, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>👤 Team Sign-Off</div>
              <Sel label="Completed by *" options={TEAM} value={completion.teamMember} onChange={(e) => setC("teamMember", e.target.value)} />
            </div>
            <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: ACCENT, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>⚓ Boat Movement</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Inp label="From (origin) *" value={completion.fromLocation} onChange={(e) => setC("fromLocation", e.target.value)} placeholder="e.g. Berth 14" />
                <Inp label="To (destination) *" value={completion.toLocation} onChange={(e) => setC("toLocation", e.target.value)} placeholder="e.g. Hard standing" />
                <Inp label="What was planned" value={completion.plannedActivity} onChange={(e) => setC("plannedActivity", e.target.value)} placeholder="e.g. Launch to pontoon" />
                <Inp label="What actually happened" value={completion.actualActivity} onChange={(e) => setC("actualActivity", e.target.value)} placeholder="e.g. Launched port side" />
              </div>
            </div>
            <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ color: ACCENT, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Notes &amp; Issues</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Txt label="Completion notes" value={completion.completionNotes} onChange={(e) => setC("completionNotes", e.target.value)} placeholder="Any general notes..." />
                <Txt label="Issues encountered" value={completion.completionIssues} onChange={(e) => setC("completionIssues", e.target.value)} placeholder="Log any damage or problems..." />
              </div>
            </div>
            <div style={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ color: ACCENT, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📷 Photo Evidence</div>
              <button onClick={() => compFileRef.current?.click()} style={{ ...inputStyle, cursor: "pointer", color: completion.compPhotoFile ? ACCENT : MUTED, textAlign: "left", border: `1px dashed ${BORDER}` }}>
                {completion.compPhotoFile ? `✓ ${completion.compPhotoFile.name}` : "Tap to take or choose photo..."}
              </button>
              <input ref={compFileRef} type="file" accept="image/*" capture="environment" onClick={(e) => e.stopPropagation()} style={{ display: "none" }} onChange={handleCompPhoto} />
              {completion.compPhotoPreview && (
                <img src={completion.compPhotoPreview} alt="completion" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 12, border: `1px solid ${BORDER}` }} />
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button disabled={saving} onClick={() => submitCompletion(selectedJob.id)} style={{
                background: ACCENT, color: BG, border: "none", borderRadius: 8, padding: "13px 24px", fontWeight: 800, fontSize: 15, cursor: "pointer", flex: 1, opacity: saving ? 0.6 : 1
              }}>{saving ? "Saving..." : "Mark as Completed ✓"}</button>
              <button onClick={() => setView("detail")} style={{ background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "13px 24px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── JOB DETAIL ──
  // ══════════════════════════════════════════════════════════════
  if (view === "detail" && selectedJob) {
    const job = selectedJob;
    const c = job.completion;
    const isCancelled = job.status === "Cancelled";
    const isCompleted = !!c;
    const linkedBoat = job.boatId ? boats.find((b) => b.id === job.boatId) : null;
    const linkedBoatOwner = linkedBoat ? customers.find((cu) => cu.id === linkedBoat.customerId) : null;
    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
        <Header view={view} setView={setView} />
        <SavingIndicator saving={saving} error={saveError} />
        {showCancelModal && <CancelModal job={job} />}
        {showEditModal && <EditJobModal job={job} />}
        {showChangeReasonModal && <ChangeReasonModal />}
        <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
          <button onClick={() => setView("dashboard")} style={{ background: "transparent", color: MUTED, border: "none", cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0 }}>← Back to Dashboard</button>
          <div style={{ background: CARD, border: `1px solid ${isCancelled ? "#ef444444" : BORDER}`, borderRadius: 16, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: 1 }}>{job.jobRef}</span>
                  <PriorityBadge priority={job.priority} />
                  {linkedBoat && <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: ACCENT + "22", border: `1px solid ${ACCENT}`, borderRadius: 4, padding: "2px 8px" }}>Registered Boat</span>}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{job.boatName}</div>
                <div style={{ color: MUTED, fontSize: 13 }}>{job.activity} · Logged {job.createdAt}</div>
              </div>
              <Badge status={job.status} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {[["Customer", job.customerName], ["Telephone", job.phone], ["Location", job.location], ["Activity", job.activity], ["Scheduled Date", formatScheduledDate(job.scheduledDate)], ["Priority", job.priority], ["Boat Owner", linkedBoatOwner?.name || "—"], ["Boat Type", linkedBoat?.type || "—"]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                  <div style={{ fontWeight: 600, marginTop: 2, color: l === "Priority" ? (PRIORITY_COLORS[v] || TEXT) : TEXT }}>{v || "—"}</div>
                </div>
              ))}
            </div>
            {job.issues?.trim() && (
              <div style={{ background: "#ef444411", border: "1px solid #ef444444", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
                <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>⚠ INITIAL ISSUES LOGGED</div>
                <div style={{ fontSize: 14 }}>{job.issues}</div>
              </div>
            )}
            {job.photoUrl && (
              <div style={{ marginBottom: 16 }}>
                <Label>Initial Photo</Label>
                <img src={job.photoUrl} alt="initial" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8, border: `1px solid ${BORDER}` }} />
              </div>
            )}
            {jobChanges.length > 0 && (
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginTop: 8, marginBottom: 16 }}>
                <div style={{ color: ACCENT, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Change History</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {jobChanges.map((ch, idx) => (
                    <div key={idx} style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 16px", borderLeft: `3px solid ${ACCENT}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 6 }}>
                        <div style={{ color: ACCENT, fontSize: 13, fontWeight: 700 }}>{ch.changed_field}</div>
                        <div style={{ color: MUTED, fontSize: 11 }}>{new Date(ch.changed_at).toLocaleString("en-GB")}</div>
                      </div>
                      <div style={{ color: MUTED, fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "#ef4444" }}>"{ch.old_value || "(empty)"}"</span>
                        <span style={{ margin: "0 6px" }}>&rarr;</span>
                        <span style={{ color: ACCENT }}>"{ch.new_value || "(empty)"}"</span>
                      </div>
                      {ch.reason && (
                        <div style={{ fontSize: 12, color: TEXT, marginTop: 6, fontStyle: "italic" }}>Reason: {ch.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isCancelled && (
              <div style={{ background: "#ef444411", border: "1px solid #ef444444", borderRadius: 10, padding: "16px 20px", marginTop: 8 }}>
                <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 800, marginBottom: 6 }}>✕ Job Cancelled — {job.cancelledAt}</div>
                <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Reason</div>
                <div style={{ fontSize: 14 }}>{job.cancelReason}</div>
              </div>
            )}
            {isCompleted && !isCancelled && (
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginTop: 8 }}>
                <div style={{ color: ACCENT, fontWeight: 800, fontSize: 15, marginBottom: 16 }}>✓ Completed — {job.completedAt}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                  {[["Completed by", c.teamMember], ["From", c.fromLocation], ["To", c.toLocation], ["Planned", c.plannedActivity || "—"], ["Actual", c.actualActivity || "—"]].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
                      <div style={{ fontWeight: 600, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
                {c.completionNotes && (
                  <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                    <div style={{ color: MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Notes</div>
                    <div style={{ fontSize: 14 }}>{c.completionNotes}</div>
                  </div>
                )}
                {c.completionIssues && (
                  <div style={{ background: "#ef444411", border: "1px solid #ef444444", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
                    <div style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>⚠ COMPLETION ISSUES</div>
                    <div style={{ fontSize: 14 }}>{c.completionIssues}</div>
                  </div>
                )}
                {c.compPhotoUrl && (
                  <div style={{ marginBottom: 8 }}>
                    <Label>Completion Photo</Label>
                    <img src={c.compPhotoUrl} alt="completion" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8, border: `1px solid ${BORDER}` }} />
                  </div>
                )}
              </div>
            )}
            {!isCompleted && !isCancelled && (
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, marginTop: 8 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                  {STATUSES.filter((s) => s !== "Completed" && s !== "Cancelled").map((s) => (
                    <button key={s} disabled={saving} onClick={() => updateStatus(job.id, s)} style={{
                      background: job.status === s ? statusColor(s) : "transparent",
                      color: job.status === s ? BG : statusColor(s),
                      border: `1px solid ${statusColor(s)}`,
                      borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer"
                    }}>{s}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => startEditJob(job.id)} style={{
                    background: ACCENT, color: BG, border: "none", borderRadius: 8,
                    padding: "12px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer", flex: 1
                  }}>✏ Edit Job</button>
                  <button onClick={() => { setCompletion(emptyCompletion); setView("complete"); }} style={{
                    background: ACCENT, color: BG, border: "none", borderRadius: 8,
                    padding: "12px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer", flex: 1
                  }}>✓ Complete</button>
                  <button onClick={() => setShowCancelModal(true)} style={{
                    background: "transparent", color: "#ef4444", border: "1px solid #ef4444",
                    borderRadius: 8, padding: "12px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer"
                  }}>✕ Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── ADD JOB ──
  // ══════════════════════════════════════════════════════════════
  if (view === "add") {
    const boatDropdownItems = boats.map((b) => {
      const displayLabel = b.xeroCustomer ? `${b.name} - ${b.xeroCustomer}` : b.name;
      return {
        id: b.id,
        label: displayLabel,
        sublabel: b.boatNumber ? `Ref: ${b.boatNumber}` : null
      };
    });

    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
        <Header view={view} setView={setView} />
        <SavingIndicator saving={saving} error={saveError} />
        <div style={{ padding: 24, maxWidth: 640, margin: "0 auto" }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, color: ACCENT }}>Log New Job</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {!form.useCustomBoat && boatDropdownItems.length > 0 ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <SearchableDropdown
                    items={boatDropdownItems}
                    value={form.boatId}
                    onChange={(val) => {
                      if (val) {
                        const boat = boats.find((b) => b.id === val);
                        setF("boatId", val);
                        setF("boatName", boat?.name || "");
                        setF("customerName", boat?.xeroCustomer || "");
                        setF("phone", "");
                      } else {
                        setF("boatId", null);
                        setF("boatName", "");
                        setF("customerName", "");
                        setF("phone", "");
                      }
                    }}
                    placeholder="Search and select boat..."
                    label="Boat (from register)"
                  />
                  <button onClick={() => setF("useCustomBoat", true)} style={{
                    background: "transparent", color: ACCENT, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 8, padding: 0
                  }}>Not in register? Enter manually</button>
                </div>
              ) : (
                <>
                  <Inp label="Customer Name *" value={form.customerName} onChange={(e) => setF("customerName", e.target.value)} placeholder="e.g. James Smith" />
                  <Inp label="Boat Name *" value={form.boatName} onChange={(e) => setF("boatName", e.target.value)} placeholder="e.g. Sea Spirit" />
                  {form.useCustomBoat && (
                    <button onClick={() => { setF("useCustomBoat", false); setF("boatId", null); setF("boatName", ""); setF("customerName", ""); }} style={{
                      background: "transparent", color: ACCENT, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, gridColumn: "1 / -1", padding: 0
                    }}>← Back to boat register</button>
                  )}
                </>
              )}
              <Inp label="Customer Telephone" value={form.phone} onChange={(e) => setF("phone", e.target.value)} placeholder="e.g. 07700 900000" type="tel" />
              <Inp label="Boat Location" value={form.location} onChange={(e) => setF("location", e.target.value)} placeholder="e.g. Berth 14, Pontoon B" />
              <Sel label="Activity" options={ACTIVITIES} value={form.activity} onChange={(e) => setF("activity", e.target.value)} />
              <Inp label="Scheduled Date" type="date" value={form.scheduledDate} onChange={(e) => setF("scheduledDate", e.target.value)} />
              <Sel label="Priority" options={PRIORITIES} value={form.priority} onChange={(e) => setF("priority", e.target.value)} />
              <Field label="Photo">
                <button onClick={() => fileRef.current?.click()} style={{ ...inputStyle, cursor: "pointer", color: form.photoFile ? ACCENT : MUTED, textAlign: "left" }}>
                  {form.photoFile ? `✓ ${form.photoFile.name}` : "📷  Tap to take or choose photo..."}
                </button>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onClick={(e) => e.stopPropagation()} style={{ display: "none" }} onChange={handlePhoto} />
              </Field>
            </div>
            <div style={{ marginTop: 16 }}>
              <Txt label="Issues to Log" value={form.issues} onChange={(e) => setF("issues", e.target.value)} placeholder="Note any damage, concerns or operational issues..." />
            </div>
            {form.photoPreview && (
              <img src={form.photoPreview} alt="preview" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 16, border: `1px solid ${BORDER}` }} />
            )}
            <div style={{ marginTop: 16, background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Job Reference Preview</div>
              <div style={{ color: ACCENT, fontSize: 16, fontWeight: 800, letterSpacing: 1 }}>
                {generateJobRef(form.activity, form.scheduledDate, jobs)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button disabled={saving} onClick={submitJob} style={{
                background: ACCENT, color: BG, border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 800, fontSize: 15, cursor: "pointer", flex: 1, opacity: saving ? 0.6 : 1
              }}>{saving ? "Saving..." : "Log Job"}</button>
              <button onClick={() => { setForm(emptyForm); setView("dashboard"); }} style={{ background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 24px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── CALENDAR VIEW ──
  // ══════════════════════════════════════════════════════════════
  if (view === "calendar") {
    const todayKey = toDateKey(new Date().toISOString().split("T")[0]);
    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
        <Header view={view} setView={setView} />
        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); setCalSelectedDate(null); }}
              style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700 }}>←</button>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{MONTH_NAMES[calMonth]} {calYear}</div>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); setCalSelectedDate(null); }}
              style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700 }}>→</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 24 }}>
            {DAY_NAMES.map((d) => (
              <div key={d} style={{ textAlign: "center", color: MUTED, fontSize: 11, fontWeight: 700, padding: "8px 0", textTransform: "uppercase", letterSpacing: 1 }}>{d}</div>
            ))}
            {calGrid.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayJobs = jobsByDate[dateKey] || [];
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === calSelectedDate;
              const activeJobs = dayJobs.filter((j) => j.status !== "Cancelled");
              const hasUrgent = activeJobs.some((j) => j.priority === "Urgent");
              const hasHigh = activeJobs.some((j) => j.priority === "High");
              return (
                <div key={dateKey} onClick={() => setCalSelectedDate(isSelected ? null : dateKey)} style={{
                  background: isSelected ? ACCENT + "22" : CARD,
                  border: `1px solid ${isSelected ? ACCENT : isToday ? ACCENT + "66" : BORDER}`,
                  borderRadius: 8, padding: "8px 6px", minHeight: 70, cursor: "pointer"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? ACCENT : TEXT, background: isToday ? ACCENT + "22" : "transparent", borderRadius: 4, padding: "1px 4px" }}>{day}</span>
                    {activeJobs.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: BG, background: hasUrgent ? "#ef4444" : hasHigh ? "#f59e0b" : ACCENT, borderRadius: 10, padding: "1px 6px" }}>{activeJobs.length}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {activeJobs.slice(0, 4).map((j) => (
                      <div key={j.id} style={{ width: 6, height: 6, borderRadius: 3, background: PRIORITY_COLORS[j.priority] || MUTED }} />
                    ))}
                    {activeJobs.length > 4 && <span style={{ fontSize: 9, color: MUTED }}>+{activeJobs.length - 4}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {calSelectedDate && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: ACCENT }}>
                {new Date(calSelectedDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                <span style={{ color: MUTED, fontWeight: 600, fontSize: 13, marginLeft: 8 }}>({calDayJobs.length} job{calDayJobs.length !== 1 ? "s" : ""})</span>
              </div>
              {calDayJobs.length === 0 ? (
                <div style={{ color: MUTED, textAlign: "center", padding: 20 }}>No jobs scheduled</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {calDayJobs.map((job) => (
                    <div key={job.id} onClick={() => { setSelectedId(job.id); setView("detail"); }} style={{
                      background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 10,
                      padding: "12px 16px", cursor: "pointer", display: "flex",
                      justifyContent: "space-between", alignItems: "center", gap: 12,
                      opacity: job.status === "Cancelled" ? 0.5 : 1
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 11, color: ACCENT, fontWeight: 700 }}>{job.jobRef}</span>
                          <PriorityBadge priority={job.priority} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{job.boatName} <span style={{ color: MUTED, fontWeight: 400, fontSize: 12 }}>· {job.customerName}</span></div>
                        <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{job.activity} · {job.location || "No location"}</div>
                      </div>
                      <Badge status={job.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // ── DASHBOARD ──
  // ══════════════════════════════════════════════════════════════
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT, fontFamily: "Inter, system-ui, sans-serif" }}>
      <Header view={view} setView={setView} />
      <SavingIndicator saving={saving} error={saveError} />
      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Total Jobs" value={counts.total} />
          <StatCard label="Pending" value={counts.pending} />
          <StatCard label="In Progress" value={counts.inProgress} />
          <StatCard label="Completed" value={counts.completed} highlight />
          <StatCard label="Cancelled" value={counts.cancelled} color="#ef4444" />
          <StatCard label="With Issues" value={counts.issues} />
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="🔍  Search by ref, customer, boat or location..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 2, minWidth: 200, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit" }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["All", ...STATUSES].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                background: statusFilter === s ? (s === "All" ? ACCENT : statusColor(s)) : "transparent",
                color: statusFilter === s ? BG : (s === "All" ? MUTED : statusColor(s)),
                border: `1px solid ${s === "All" ? (statusFilter === s ? ACCENT : BORDER) : statusColor(s)}`,
                borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap"
              }}>{s}</button>
            ))}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} style={{
            background: hasActiveFilters ? ACCENT + "22" : "transparent",
            border: `1px solid ${hasActiveFilters ? ACCENT : BORDER}`,
            color: hasActiveFilters ? ACCENT : MUTED,
            borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>⚙ Filters{hasActiveFilters ? " ●" : ""}</button>
          {jobs.length > 0 && (
            <button onClick={exportCSV} style={{ background: "transparent", border: `1px solid ${ACCENT}`, color: ACCENT, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>⬇ Export CSV</button>
          )}
        </div>
        {showFilters && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Field label="Activity Type">
                <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={{ ...inputStyle, width: 180 }}>
                  <option value="All">All Activities</option>
                  {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Scheduled From">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputStyle, width: 160 }} />
              </Field>
              <Field label="Scheduled To">
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputStyle, width: 160 }} />
              </Field>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ Clear</button>
              )}
            </div>
          </div>
        )}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: MUTED }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚓</div>
            <div style={{ fontWeight: 600 }}>{jobs.length === 0 ? "No jobs logged yet" : "No jobs match your filter"}</div>
            {jobs.length === 0 && <div style={{ fontSize: 13, marginTop: 6 }}>Click <span style={{ color: ACCENT }}>+ New Job</span> to get started</div>}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "130px 2fr 1fr 80px 1fr 1fr 70px 110px", gap: 10, padding: "8px 18px", color: MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              <span>Ref</span><span>Boat / Customer</span><span>Activity</span><span>Priority</span><span>Scheduled</span><span>Logged</span><span>Issues</span><span>Status</span>
            </div>
            {filtered.map((job) => (
              <div key={job.id} onClick={() => { setSelectedId(job.id); setView("detail"); }} style={{
                background: CARD,
                border: `1px solid ${job.status === "Cancelled" ? "#ef444444" : (job.issues?.trim() || job.completion?.completionIssues?.trim()) ? "#ef444444" : BORDER}`,
                borderRadius: 12, padding: "14px 18px", cursor: "pointer",
                display: "grid", gridTemplateColumns: "130px 2fr 1fr 80px 1fr 1fr 70px 110px", gap: 10, alignItems: "center",
                opacity: job.status === "Cancelled" ? 0.6 : 1
              }}>
                <div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: ACCENT }}>{job.jobRef}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{job.boatName}</div>
                  <div style={{ color: MUTED, fontSize: 12 }}>{job.customerName}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{job.activity}</div>
                <div><PriorityBadge priority={job.priority} /></div>
                <div style={{ color: MUTED, fontSize: 12 }}>{job.scheduledDate ? new Date(job.scheduledDate + "T00:00:00").toLocaleDateString("en-GB") : "—"}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{job.createdAt?.split(",")[0]}</div>
                <div>
                  {(job.issues?.trim() || job.completion?.completionIssues?.trim())
                    ? <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>⚠ Yes</span>
                    : <span style={{ color: MUTED, fontSize: 12 }}>—</span>}
                </div>
                <div><Badge status={job.status} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
