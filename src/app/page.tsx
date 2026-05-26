"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import IntakeForm from "@/app/components/intake-form";
import IntakeStepper from "@/app/components/intake-stepper";
import { EMPTY_FORM, type IntakeFormData, type StepAudioBlob } from "@/app/lib/intake-types";
import { useUploadAudio } from "@/app/lib/upload-audio-context";

type AppState = "idle" | "stepper" | "processing" | "paste" | "form" | "success" | "saved";

export default function Page() {
  const { data: session, status } = useSession();

  const [appState, setAppState] = useState<AppState>("idle");
  const [formData, setFormData] = useState<IntakeFormData>(EMPTY_FORM);
  const [audioBlobs, setAudioBlobs] = useState<StepAudioBlob[]>([]);
  const [processingLabel, setProcessingLabel] = useState("Structuring your intake with AI\u2026");
  const [jiraKey, setJiraKey] = useState<string | null>(null);
  const [jiraUrl, setJiraUrl] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setHandler } = useUploadAudio();

  useEffect(() => {
    setHandler((file: File) => {
      void handleFilesUpload([file]);
    });
    return () => setHandler(null);
  }, []);

  // ── Full-form processing (paste/upload bypass the stepper) ────────

  const processText = async (text: string) => {
    try {
      setProcessingLabel("Structuring your intake with AI\u2026");
      setAppState("processing");
      const structureRes = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const structureJson = (await structureRes.json()) as IntakeFormData & { error?: string };
      if (!structureRes.ok) {
        throw new Error(structureJson.error ?? "Structuring failed");
      }
      setFormData(structureJson);
      setAudioBlobs([]);
      setAppState("form");
    } catch (err) {
      console.error("[intake] processText failed:", err);
      alert("Something went wrong processing your text. Please try again.");
      setAppState("idle");
    }
  };

  const handleFilesUpload = async (files: File[]) => {
    setAppState("processing");

    try {
      const textParts: string[] = [];
      const blobs: StepAudioBlob[] = [];

      for (const file of files) {
        const isAudio =
          file.type.startsWith("audio/") ||
          /\.(mp3|m4a|wav|webm|ogg|flac|aac|wma)$/i.test(file.name);

        if (isAudio) {
          setProcessingLabel(`Transcribing ${file.name}\u2026`);
          const fd = new FormData();
          fd.append("audio", file, file.name);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const json = (await res.json()) as { transcript?: string; error?: string };
          if (!res.ok || !json.transcript?.trim()) {
            throw new Error(json.error ?? `Transcription failed for ${file.name}`);
          }
          textParts.push(json.transcript);
          blobs.push({ name: file.name, blob: file });
        } else {
          setProcessingLabel(`Extracting content from ${file.name}\u2026`);
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/extract-text", { method: "POST", body: fd });
          const json = (await res.json()) as { text?: string; error?: string };
          if (!res.ok || !json.text?.trim()) {
            throw new Error(json.error ?? `Could not extract text from ${file.name}`);
          }
          textParts.push(json.text);
        }
      }

      setProcessingLabel("Structuring your intake with AI\u2026");
      const combined = textParts.join("\n\n");
      const structureRes = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: combined }),
      });
      const structureJson = (await structureRes.json()) as IntakeFormData & { error?: string };
      if (!structureRes.ok) {
        throw new Error(structureJson.error ?? "Structuring failed");
      }

      setFormData(structureJson);
      setAudioBlobs(blobs);
      setAppState("form");
    } catch (err) {
      console.error("[intake] handleFilesUpload failed:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Something went wrong processing your files. Please try again.",
      );
      setAppState("idle");
    }
  };

  // ── Stepper completion handler ────────────────────────────────────────

  const handleStepperComplete = (data: IntakeFormData, blobs: StepAudioBlob[]) => {
    setFormData(data);
    setAudioBlobs(blobs);
    setAppState("form");
  };

  // ── Render: Auth ─────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)" }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!session) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)", gap: 3, textAlign: "center", px: 3 }}>
        <Typography variant="h4" fontWeight={700}>Product Intake</Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 400 }}>
          Sign in with your HONK Google account to submit product ideas.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => signIn("google")}
          sx={{
            borderRadius: 999,
            px: 5,
            py: 1.5,
            fontSize: "1rem",
            background: "linear-gradient(135deg, #8F09F9 0%, #FF814F 100%)",
            "&:hover": { background: "linear-gradient(135deg, #7a08d8 0%, #e5703f 100%)" },
          }}
        >
          Sign in with Google
        </Button>
      </Box>
    );
  }

  // ── Render: Success ───────────────────────────────────────────────────

  if (appState === "success") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)", gap: 3, textAlign: "center", px: 3 }}>
        <Typography variant="h4" fontWeight={700}>You&rsquo;re all set.</Typography>
        <Typography color="text.secondary">
          Your intake has been submitted to Jira Product Discovery
          {jiraKey ? <> as <Box component="a" href={jiraUrl || "#"} target="_blank" rel="noopener noreferrer" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{jiraKey}</Box></> : ""}.
        </Typography>
        <Button variant="outlined" onClick={() => { setFormData(EMPTY_FORM); setJiraKey(null); setJiraUrl(null); setAudioBlobs([]); setAppState("idle"); }} sx={{ mt: 1, borderRadius: 999, px: 4 }}>
          Submit another
        </Button>
      </Box>
    );
  }

  // ── Render: Form (review) ─────────────────────────────────────────────

  if (appState === "form") {
    return (
      <IntakeForm
        data={formData}
        onChange={setFormData}
        audioBlobs={audioBlobs}
        onStartOver={() => { setFormData(EMPTY_FORM); setAudioBlobs([]); setAppState("idle"); }}
        onSubmitSuccess={(key, url) => { setJiraKey(key); setJiraUrl(url ?? null); setAppState("success"); }}
      />
    );
  }

  // ── Render: Stepper ───────────────────────────────────────────────────

  if (appState === "stepper") {
    return (
      <IntakeStepper
        onComplete={handleStepperComplete}
        onCancel={() => setAppState("idle")}
      />
    );
  }

  // ── Render: Processing ────────────────────────────────────────────────

  if (appState === "processing") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)", gap: 3 }}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">{processingLabel}</Typography>
      </Box>
    );
  }

  // ── Render: Paste ─────────────────────────────────────────────────────

  if (appState === "paste") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 128px)",
          px: 3,
        }}
      >
        <Container maxWidth="sm">
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textAlign: "center" }}>
            Paste your intake
          </Typography>
          <TextField
            multiline
            minRows={10}
            maxRows={20}
            fullWidth
            placeholder="Paste your product intake text here\u2026"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            autoFocus
          />
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              onClick={() => { setPasteText(""); setAppState("idle"); }}
              sx={{ borderRadius: 999, px: 4 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!pasteText.trim()}
              onClick={() => void processText(pasteText.trim())}
              sx={{ borderRadius: 999, px: 4 }}
            >
              Submit
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  // ── Render: Idle ──────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 128px)",
        px: 3,
        textAlign: "center",
      }}
    >
      <Container maxWidth="sm">
        <Typography
          variant="h3"
          component="h1"
          sx={{ fontWeight: 700, mb: 3, letterSpacing: "-0.02em", lineHeight: 1.2, textWrap: "balance" }}
        >
          Tell us what&rsquo;s on your mind.
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 5, lineHeight: 1.75 }}>
          Who&rsquo;s the customer? What problem are they hitting? What do you think we should build &mdash;
          and how would we know it worked? Just talk, we&rsquo;ll organize the rest.
        </Typography>

        <Stack spacing={2} alignItems="center">
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<RecordVoiceOverIcon />}
              onClick={() => setAppState("stepper")}
              sx={{
                borderRadius: 999,
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                minWidth: 140,
                background: "linear-gradient(135deg, #8F09F9 0%, #FF814F 100%)",
                "&:hover": { background: "linear-gradient(135deg, #7a08d8 0%, #e5703f 100%)" },
              }}
            >
              Speak it
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInputRef.current?.click()}
              sx={{ borderRadius: 999, px: 4, py: 1.5, fontSize: "1rem", minWidth: 140 }}
            >
              Upload
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ContentPasteIcon />}
              onClick={() => { setPasteText(""); setAppState("paste"); }}
              sx={{ borderRadius: 999, px: 4, py: 1.5, fontSize: "1rem", minWidth: 140 }}
            >
              Paste
            </Button>
          </Stack>
          <Button
            variant="text"
            size="large"
            onClick={() => { setFormData(EMPTY_FORM); setAudioBlobs([]); setAppState("form"); }}
            sx={{ borderRadius: 999, px: 4, py: 1.5, fontSize: "1rem", minWidth: 140, color: "text.secondary" }}
          >
            Skip
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept="audio/*,application/pdf,image/*,.txt,.csv,.md,.rtf"
            onChange={(e) => {
              const files = e.target.files;
              if (files?.length) void handleFilesUpload(Array.from(files));
              e.target.value = "";
            }}
          />
        </Stack>
      </Container>
    </Box>
  );
}
