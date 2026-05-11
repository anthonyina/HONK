"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertLinkIcon from "@mui/icons-material/InsertLink";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import Autocomplete from "@mui/material/Autocomplete";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import MenuItem from "@mui/material/MenuItem";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import type { IntakeFormData, Impact, MetricDirection, Platform, Resource, ResourceFile, ResourceLink, RetentionRisk } from "@/app/lib/intake-types";
import { HONK_CLIENTS } from "@/app/lib/intake-types";
import { useHeaderActions } from "@/app/lib/header-actions-context";

// ── Icons ──────────────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

// ── Shared display helpers ─────────────────────────────────────────────────

function Empty() {
  return (
    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
      Not specified
    </Typography>
  );
}

function BulletList({ text }: { text?: string }) {
  const items = (text ?? "")
    .split("\n")
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
  if (!items.length) return <Empty />;
  return (
    <Box component="ul" sx={{ m: 0, pl: 3 }}>
      {items.map((item, i) => (
        <Typography
          key={i}
          component="li"
          variant="body2"
          color="text.secondary"
          sx={{ mb: 0.75, lineHeight: 1.65 }}
        >
          {item}
        </Typography>
      ))}
    </Box>
  );
}

function LabeledRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} sx={{ mb: 0.75 }}>
      <Typography
        variant="body2"
        color="text.disabled"
        sx={{ minWidth: 160, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        color={value ? "text.secondary" : "text.disabled"}
        sx={{ fontStyle: value ? "normal" : "italic" }}
      >
        {value || "Not specified"}
      </Typography>
    </Stack>
  );
}

function Span({ children }: { children: React.ReactNode }) {
  return (
    <Box component="span" sx={{ color: "text.primary" }}>
      {children}
    </Box>
  );
}

// ── Section card ───────────────────────────────────────────────────────────

function FilledIconButton({ onClick, editing, label, disabled }: { onClick: () => void; editing: boolean; label: string; disabled?: boolean }) {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      disabled={disabled}
      aria-label={editing ? "Done editing" : label}
      sx={{
        width: 28,
        height: 28,
        backgroundColor: disabled ? "action.disabledBackground" : "primary.main",
        color: "#fff",
        flexShrink: 0,
        "&:hover": { backgroundColor: disabled ? "action.disabledBackground" : "primary.dark" },
      }}
    >
      {editing ? <CheckIcon /> : <PencilIcon />}
    </IconButton>
  );
}

function Section({
  label,
  editing,
  onToggle,
  view,
  edit,
}: {
  label: string;
  editing: boolean;
  onToggle: () => void;
  view: React.ReactNode;
  edit: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: editing ? "rgba(143, 9, 249, 0.4)" : "divider",
        borderRadius: 2,
        p: 3,
        transition: "border-color 0.2s ease",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: editing ? 2.5 : 1.5 }}
      >
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.12em" }}
        >
          {label}
        </Typography>
        <FilledIconButton onClick={onToggle} editing={editing} label={`Edit ${label}`} />
      </Stack>
      {editing ? edit : view}
    </Box>
  );
}

// ── Additional Resources ───────────────────────────────────────────────────

const MAX_RESOURCES = 5;

function ResourceList({
  resources,
  onRemove,
}: {
  resources: Resource[];
  onRemove: (id: string) => void;
}) {
  return (
    <Stack spacing={1}>
      {resources.map((res) => (
        <Stack key={res.id} direction="row" alignItems="flex-start" spacing={1}>
          {res.type === "link" ? (
            <InsertLinkIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.25 }} />
          ) : (
            <AttachFileIcon fontSize="small" sx={{ color: "text.secondary", mt: 0.25 }} />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2">{res.description}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {res.type === "link" ? res.url : res.name}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => onRemove(res.id)} aria-label="Remove resource">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
    </Stack>
  );
}

function ResourcesSection({
  resources,
  resourceFiles,
  editing,
  onToggle,
  onChange,
  onFilesChange,
}: {
  resources: Resource[];
  resourceFiles: Map<string, File>;
  editing: boolean;
  onToggle: () => void;
  onChange: (res: Resource[]) => void;
  onFilesChange: (files: Map<string, File>) => void;
}) {
  const [mode, setMode] = useState<"link" | "file">("link");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => { setUrl(""); setDescription(""); setPickedFile(null); };

  const canAdd = resources.length < MAX_RESOURCES;
  const addDisabled = mode === "link" ? !url || !description : !pickedFile || !description;

  const handleAdd = () => {
    if (addDisabled) return;
    const id = crypto.randomUUID();
    if (mode === "link") {
      onChange([...resources, { id, type: "link", url, description } as ResourceLink]);
    } else {
      const newFiles = new Map(resourceFiles);
      newFiles.set(id, pickedFile!);
      onFilesChange(newFiles);
      onChange([...resources, { id, type: "file", name: pickedFile!.name, description } as ResourceFile]);
    }
    resetForm();
  };

  const handleRemove = (id: string) => {
    onChange(resources.filter((r) => r.id !== id));
    const newFiles = new Map(resourceFiles);
    newFiles.delete(id);
    onFilesChange(newFiles);
  };

  const viewContent = resources.length === 0 ? (
    <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
      No resources added (optional)
    </Typography>
  ) : (
    <ResourceList resources={resources} onRemove={handleRemove} />
  );

  const editContent = (
    <Stack spacing={2}>
      {resources.length > 0 && <ResourceList resources={resources} onRemove={handleRemove} />}

      {canAdd && (
        <Box sx={{ borderTop: resources.length > 0 ? "1px solid" : "none", borderColor: "divider", pt: resources.length > 0 ? 2 : 0 }}>
          <Stack spacing={1.5}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => { if (v) { setMode(v); resetForm(); } }}
              size="small"
            >
              <ToggleButton value="link" sx={{ px: 2 }}>
                <InsertLinkIcon sx={{ mr: 0.75 }} fontSize="small" />Link
              </ToggleButton>
              <ToggleButton value="file" sx={{ px: 2 }}>
                <AttachFileIcon sx={{ mr: 0.75 }} fontSize="small" />File
              </ToggleButton>
            </ToggleButtonGroup>

            {mode === "link" ? (
              <>
                <TextField label="URL" value={url} onChange={(e) => setUrl(e.target.value)} fullWidth size="small" placeholder="https://…" />
                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth size="small" placeholder="What is this link?" required />
              </>
            ) : (
              <>
                <Box>
                  <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => { setPickedFile(e.target.files?.[0] ?? null); }} />
                  <Button variant="outlined" size="small" startIcon={<AttachFileIcon />} onClick={() => fileInputRef.current?.click()}>
                    {pickedFile ? pickedFile.name : "Choose file"}
                  </Button>
                </Box>
                <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth size="small" placeholder="What is this file?" required />
              </>
            )}

            <Box>
              <Button variant="contained" size="small" onClick={handleAdd} disabled={addDisabled}>
                Add resource
              </Button>
            </Box>
          </Stack>
        </Box>
      )}

      {!canAdd && (
        <Typography variant="caption" color="text.secondary">Maximum {MAX_RESOURCES} resources reached.</Typography>
      )}
    </Stack>
  );

  return (
    <Section
      label="Additional Resources"
      editing={editing}
      onToggle={onToggle}
      view={viewContent}
      edit={editContent}
    />
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type Props = {
  data: IntakeFormData;
  onChange: (data: IntakeFormData) => void;
  audioBlob?: Blob | null;
  onStartOver: () => void;
  onSubmitSuccess?: (jiraKey: string, jiraUrl?: string) => void;
};

const riskColor: Record<string, "success" | "warning" | "error"> = {
  Low: "success",
  Medium: "warning",
  High: "error",
};

const impactColor: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  "Very Low": "default",
  Low: "info",
  Medium: "warning",
  High: "error",
  "Very High": "error",
};

const IMPACT_DEFINITIONS: { level: string; definition: string; examples: string }[] = [
  { level: "Very High", definition: "$500K+ annual impact, or a named client has explicitly tied it to contract renewal or expansion. Executive visibility.", examples: "Waymo highway launch, Farmers escalation (Chief Claims Officer involved), FleetNet API ($726K revenue)" },
  { level: "High", definition: "$100K-$500K annual impact, or a client has raised it as a pain point with account team. Competitive gap.", examples: "Storage compliance (USAA disputes), Job Alerts (Wheels diverted 33% volume), phone call intake for retail" },
  { level: "Medium", definition: "$25K-$100K annual impact, or operational efficiency gain that reduces manual work for multiple people.", examples: "Flexible arrival window (reduces ops rescheduling), wheel lock questions in intake, FIMC 4010 enforcement" },
  { level: "Low", definition: "<$25K annual impact, or a single-client retention ask with no escalation. Minor friction reduction.", examples: "Individual client config change, single-client billing tweak, retention feature request without contract risk" },
  { level: "Very Low", definition: "Quality of life improvement. No measurable revenue, cost, or risk impact. Nice to have.", examples: "UI polish, label changes, internal tooling cosmetics" },
];

export default function IntakeForm({ data, onChange, audioBlob, onStartOver, onSubmitSuccess }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [impactInfoOpen, setImpactInfoOpen] = useState(false);
  const [resourceFiles, setResourceFiles] = useState<Map<string, File>>(new Map());
  const { setRightAction } = useHeaderActions();

  useEffect(() => {
    setRightAction(
      <Button variant="outlined" size="small" onClick={onStartOver} sx={{ color: "text.secondary", borderColor: "divider" }}>
        Start over
      </Button>
    );
    return () => setRightAction(null);
  }, [onStartOver, setRightAction]);

  const toggle = (key: string) => setEditing((prev) => (prev === key ? null : key));
  const is = (key: string) => editing === key;

  const set =
    (field: keyof IntakeFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...data, [field]: e.target.value });

  const handleSubmit = async () => {
    if (!data.impact) {
      setSubmitError("Please select an Impact level before submitting.");
      return;
    }
    if (!data.yourName || !data.timeline) {
      setSubmitError("Please fill in your name and desired timeline before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        throw new Error(error);
      }
      const { key, url } = (await res.json()) as { key: string; url?: string };

      if (audioBlob) {
        const filename = audioBlob instanceof File ? audioBlob.name : "recording.webm";
        const fd = new FormData();
        fd.append("key", key);
        fd.append("audio", audioBlob, filename);
        await fetch("/api/jira-attach", { method: "POST", body: fd });
      }

      for (const res of data.resources) {
        if (res.type === "file") {
          const file = resourceFiles.get(res.id);
          if (file) {
            const fd = new FormData();
            fd.append("key", key);
            fd.append("audio", file, file.name);
            await fetch("/api/jira-attach", { method: "POST", body: fd });
          }
        }
      }

      onSubmitSuccess?.(key, url);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>

      {/* ── Page header ── */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.12em", display: "block", mb: 1 }}
        >
          Review and Submit
        </Typography>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ flex: 1 }}>
            {is("title") ? (
              <Stack spacing={1.5}>
                <TextField
                  value={data.title}
                  onChange={set("title")}
                  variant="standard"
                  fullWidth
                  autoFocus
                  placeholder="Title"
                  slotProps={{ input: { style: { fontSize: "1.35rem", fontWeight: 700 } } }}
                />
                <TextField
                  value={data.shortDescription}
                  onChange={set("shortDescription")}
                  variant="standard"
                  fullWidth
                  multiline
                  placeholder="Short description…"
                  slotProps={{ input: { style: { fontSize: "0.875rem" } } }}
                />
              </Stack>
            ) : (
              <Box onClick={() => toggle("title")} sx={{ cursor: "pointer" }}>
                <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                  {data.title || "Product Intake"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
                  {data.shortDescription || "No description yet"}
                </Typography>
              </Box>
            )}
          </Box>
          <FilledIconButton onClick={() => toggle("title")} editing={is("title")} label="Edit title" />
        </Stack>
      </Box>

      <Stack spacing={2}>

        {/* ── Problem Abstract ── */}
        <Section
          label="Problem Abstract"
          editing={is("problem")}
          onToggle={() => toggle("problem")}
          view={
            data.customer || data.action || data.outcome ? (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                Today, when a <Span>{data.customer}</Span> attempts to{" "}
                <Span>{data.action}</Span>, the result is <Span>{data.outcome}</Span>.
              </Typography>
            ) : (
              <Empty />
            )
          }
          edit={
            <Stack spacing={2}>
              <TextField label="Customer / User" value={data.customer} onChange={set("customer")} fullWidth size="small" />
              <TextField label="Action they're trying to take" value={data.action} onChange={set("action")} fullWidth size="small" />
              <TextField label="Undesirable outcome" value={data.outcome} onChange={set("outcome")} fullWidth size="small" multiline rows={2} />
            </Stack>
          }
        />

        {/* ── Hypothesis ── */}
        <Section
          label="Hypothesis"
          editing={is("hypothesis")}
          onToggle={() => toggle("hypothesis")}
          view={
            data.idea || data.whySolves ? (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                We believe that <Span>{data.idea}</Span> will result in{" "}
                <Span>{data.whySolves}</Span>. We will know if this is true if{" "}
                <Span>{data.metric || "…"}</Span> is <Span>{data.metricDirection}</Span>.
              </Typography>
            ) : (
              <Empty />
            )
          }
          edit={
            <Stack spacing={2}>
              <TextField label="Idea / proposed solution" value={data.idea} onChange={set("idea")} fullWidth size="small" multiline rows={2} />
              <TextField label="Why it solves the problem" value={data.whySolves} onChange={set("whySolves")} fullWidth size="small" multiline rows={2} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-start">
                <TextField label="Success metric" value={data.metric} onChange={set("metric")} fullWidth size="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                    Direction
                  </Typography>
                  <ToggleButtonGroup
                    exclusive
                    value={data.metricDirection}
                    onChange={(_, v) => v && onChange({ ...data, metricDirection: v as MetricDirection })}
                    size="small"
                  >
                    <ToggleButton value="increased">Increased</ToggleButton>
                    <ToggleButton value="decreased">Decreased</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Stack>
            </Stack>
          }
        />


        {/* ── Additional Background ── */}
        <Section
          label="Additional Background"
          editing={is("background")}
          onToggle={() => toggle("background")}
          view={
            data.additionalBackground ? (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                {data.additionalBackground}
              </Typography>
            ) : (
              <Empty />
            )
          }
          edit={
            <TextField
              value={data.additionalBackground}
              onChange={set("additionalBackground")}
              fullWidth
              size="small"
              multiline
              rows={4}
              placeholder="Anything else that doesn't fit above…"
            />
          }
        />

        {/* ── Functional Requirements ── */}
        <Section
          label="Functional Requirements"
          editing={is("requirements")}
          onToggle={() => toggle("requirements")}
          view={<BulletList text={data.functionalRequirements} />}
          edit={
            <TextField
              value={data.functionalRequirements}
              onChange={set("functionalRequirements")}
              fullWidth
              size="small"
              multiline
              rows={6}
              placeholder={"- Requirement one\n- Requirement two"}
            />
          }
        />

        {/* ── Risks ── */}
        <Section
          label="Risks"
          editing={is("risks")}
          onToggle={() => toggle("risks")}
          view={<BulletList text={data.risks} />}
          edit={
            <TextField
              value={data.risks}
              onChange={set("risks")}
              fullWidth
              size="small"
              multiline
              rows={4}
              placeholder={"- Risk one\n- Risk two"}
            />
          }
        />

        {/* ── Go to Market ── */}
        <Section
          label="Go to Market"
          editing={is("gtm")}
          onToggle={() => toggle("gtm")}
          view={<BulletList text={data.goToMarket} />}
          edit={
            <TextField
              value={data.goToMarket}
              onChange={set("goToMarket")}
              fullWidth
              size="small"
              multiline
              rows={4}
              placeholder={"- Launch step one\n- Launch step two"}
            />
          }
        />

        {/* ── Additional Resources ── */}
        <ResourcesSection
          resources={data.resources}
          resourceFiles={resourceFiles}
          editing={is("resources")}
          onToggle={() => toggle("resources")}
          onChange={(res) => onChange({ ...data, resources: res })}
          onFilesChange={setResourceFiles}
        />

        {/* ── Platform, Client & Impact ── */}
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.12em", display: "block", mb: 2 }}>
            Platform, Client & Impact
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
            <ToggleButtonGroup
              value={data.platform}
              exclusive
              onChange={(_e, val: Platform | null) => onChange({ ...data, platform: val ?? "" })}
              size="small"
              sx={{ height: 40 }}
            >
              <ToggleButton value="CurbsidePRO">CurbsidePRO</ToggleButton>
              <ToggleButton value="HONK">HONK</ToggleButton>
            </ToggleButtonGroup>
            <Autocomplete
              options={HONK_CLIENTS as unknown as string[]}
              value={data.clientName || null}
              onChange={(_e, val) => onChange({ ...data, clientName: val ?? "" })}
              renderInput={(params) => (
                <TextField {...params} label="Client (optional)" size="small" />
              )}
              sx={{ flex: 1 }}
            />
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                select
                label="Impact *"
                value={data.impact}
                onChange={(e) => onChange({ ...data, impact: e.target.value as Impact })}
                size="small"
                required
                error={!data.impact}
                helperText={!data.impact ? "Required" : ""}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="Very High">Very High</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Very Low">Very Low</MenuItem>
              </TextField>
              <IconButton onClick={() => setImpactInfoOpen(true)} sx={{ mt: 0.5 }}>
                <InfoOutlinedIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* ── Submitter ── */}
        <Box>
          <Typography variant="overline" sx={{ color: "primary.main", fontWeight: 700, letterSpacing: "0.12em", display: "block", mb: 2 }}>
            Submitter
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Your name"
              value={data.yourName}
              onChange={set("yourName")}
              fullWidth
              size="small"
              required
              error={!data.yourName}
              helperText={!data.yourName ? "Required" : ""}
            />
            <DatePicker
              label="Desired timeline"
              views={["year", "month"]}
              openTo="month"
              value={data.timeline ? dayjs(data.timeline) : null}
              onChange={(val: Dayjs | null) =>
                onChange({ ...data, timeline: val ? val.startOf("month").format("YYYY-MM-DD") : "" })
              }
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  required: true,
                  error: !data.timeline,
                  helperText: !data.timeline ? "Required" : "",
                },
              }}
            />
          </Stack>
        </Box>

        {/* ── Submit ── */}
        <Box sx={{ pt: 2 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
            sx={{ py: 1.5, fontSize: "1rem", borderRadius: 2 }}
          >
            {submitting ? "Submitting…" : "Submit to Jira Product Discovery"}
          </Button>
        </Box>

      </Stack>

      <Dialog open={impactInfoOpen} onClose={() => setImpactInfoOpen(false)} maxWidth="md" fullWidth
        PaperProps={{ sx: { bgcolor: "#fff", color: "#1e293b" } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Impact Level Definitions
          <IconButton onClick={() => setImpactInfoOpen(false)} size="small" sx={{ color: "#64748b" }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e5e7eb", width: 100, color: "#1e293b" }}>Level</th>
                <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e5e7eb", color: "#1e293b" }}>Definition</th>
                <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e5e7eb", color: "#1e293b" }}>Examples</th>
              </tr>
            </thead>
            <tbody>
              {IMPACT_DEFINITIONS.map((d) => (
                <tr key={d.level}>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#1e293b" }}>{d.level}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", color: "#334155" }}>{d.definition}</td>
                  <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", color: "#64748b", fontStyle: "italic" }}>{d.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>

    </Container>
  );
}
