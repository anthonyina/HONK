"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import { type IntakeFormData, type StepAudioBlob } from "@/app/lib/intake-types";

// ── Icons ───────────────────────────────────────────────────────────────────

function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" />
      <path d="M19 11a1 1 0 0 0-2 0 5 5 0 0 1-10 0 1 1 0 0 0-2 0 7 7 0 0 0 6 6.93V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.07A7 7 0 0 0 19 11Z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function playRecordingSound(type: "start" | "stop") {
  try {
    const ctx = new AudioContext();
    const notes = type === "start"
      ? [{ freq: 880, start: 0, dur: 0.08 }, { freq: 1320, start: 0.1, dur: 0.1 }]
      : [{ freq: 1320, start: 0, dur: 0.08 }, { freq: 880, start: 0.1, dur: 0.1 }];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0, ctx.currentTime + start);
      env.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.01);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    // silently ignore
  }
}

// ── Step configuration ──────────────────────────────────────────────────────

const STEP_AUDIO_NAMES = ["problem", "solution", "background"] as const;

const STEPS = [
  {
    label: "Describe the problem",
    heading: "Describe the problem",
    instructional: "Today, when a [user] attempts to [action] the result is [problem].",
  },
  {
    label: "Offer a solution",
    heading: "Offer a solution",
    instructional:
      "We believe that [solution] will result in [outcome]. We\u2019ll know this is true by [metric].",
  },
  {
    label: "Additional background",
    heading: "Provide additional background",
    instructional:
      "Share any context, requirements, risks, or timeline that might be helpful.",
    optional: true,
  },
];

const SECTION_HEADERS = [
  "Problem Description",
  "Proposed Solution",
  "Additional Background",
];

// ── Types ───────────────────────────────────────────────────────────────────

type StepState = "prompt" | "countdown" | "recording" | "transcribing";

type StepData = {
  transcript: string;
  audioBlob: Blob | null;
};

type Props = {
  onComplete: (formData: IntakeFormData, audioBlobs: StepAudioBlob[]) => void;
  onCancel: () => void;
};

// ── Component ───────────────────────────────────────────────────────────────

export default function IntakeStepper({ onComplete, onCancel }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [stepState, setStepState] = useState<StepState>("prompt");
  const [stepData, setStepData] = useState<Map<number, StepData>>(new Map());
  const stepDataRef = useRef<Map<number, StepData>>(new Map());
  const [countdown, setCountdown] = useState(3);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [finalizing, setFinalizing] = useState(false);
  const [failedBlob, setFailedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = STEPS[activeStep];

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Recording ─────────────────────────────────────────────────────────

  const downloadFailedBlob = () => {
    if (!failedBlob) return;
    const url = URL.createObjectURL(failedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${STEP_AUDIO_NAMES[activeStep]}-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startRecording = async () => {
    setFailedBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"].find((t) =>
          MediaRecorder.isTypeSupported(t),
        ) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        void transcribeAndStore(blob);
      };

      mediaRecorderRef.current = recorder;

      setCountdown(3);
      setStepState("countdown");

      await new Promise<void>((resolve) => {
        let n = 3;
        const tick = setInterval(() => {
          n -= 1;
          if (n <= 0) {
            clearInterval(tick);
            resolve();
          } else {
            setCountdown(n);
          }
        }, 1000);
      });

      recorder.start(250);
      playRecordingSound("start");
      setRecordingSeconds(0);
      setStepState("recording");
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone access is required to record. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playRecordingSound("stop");
    mediaRecorderRef.current?.stop();
    setStepState("transcribing");
  };

  // ── Transcribe only (no AI structuring) ───────────────────────────────

  const transcribeAndStore = async (blob: Blob) => {
    setStepState("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, `${STEP_AUDIO_NAMES[activeStep]}.webm`);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const json = (await res.json()) as { transcript?: string; error?: string };
      if (!res.ok || !json.transcript?.trim()) {
        throw new Error(json.error ?? "Transcription failed \u2014 no speech detected");
      }

      const updated = new Map(stepDataRef.current);
      updated.set(activeStep, { transcript: json.transcript!, audioBlob: blob });
      stepDataRef.current = updated;
      setStepData(updated);
      advance();
    } catch (err) {
      console.error("[stepper] transcribeAndStore failed:", err);
      setFailedBlob(blob);
      setStepState("prompt");
    }
  };

  // ── Finalize: combine transcripts + one AI structure call ─────────────

  const finalize = async () => {
    setFinalizing(true);
    try {
      // Build combined transcript with section labels
      const currentData = stepDataRef.current;
      const parts: string[] = [];
      for (let i = 0; i < 3; i++) {
        const d = currentData.get(i);
        if (d?.transcript) {
          parts.push(`## ${SECTION_HEADERS[i]}\n${d.transcript}`);
        }
      }
      const combined = parts.join("\n\n");

      const structureRes = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: combined }),
      });
      const formData = (await structureRes.json()) as IntakeFormData & { error?: string };
      if (!structureRes.ok) {
        throw new Error(formData.error ?? "Structuring failed");
      }

      // Collect audio blobs
      const blobs: StepAudioBlob[] = [];
      currentData.forEach((d, i) => {
        if (d.audioBlob) {
          blobs.push({ name: `${STEP_AUDIO_NAMES[i]}.webm`, blob: d.audioBlob });
        }
      });

      onComplete(formData, blobs);
    } catch (err) {
      console.error("[stepper] finalize failed:", err);
      alert("Something went wrong structuring your intake. Please try again.");
      setFinalizing(false);
    }
  };

  // ── Navigation ────────────────────────────────────────────────────────

  const advance = () => {
    if (activeStep < 2) {
      setActiveStep((prev) => prev + 1);
      setStepState("prompt");
    } else {
      void finalize();
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setStepState("prompt");
    setFailedBlob(null);
  };

  const handleSkip = () => {
    void finalize();
  };

  // ── Render: Stepper header ────────────────────────────────────────────

  const stepperHeader = (
    <Box sx={{ mb: 5 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {STEPS.map((s, i) => (
          <Step key={s.label} completed={i < activeStep || stepData.has(i)}>
            <StepLabel
              optional={
                s.optional ? (
                  <Typography variant="caption" color="text.secondary">
                    Optional
                  </Typography>
                ) : undefined
              }
            >
              {s.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );

  // ── Render: Finalizing ────────────────────────────────────────────────

  if (finalizing) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        {stepperHeader}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 3 }}>
          <CircularProgress size={48} />
          <Typography color="text.secondary">Putting it all together&hellip;</Typography>
        </Box>
      </Container>
    );
  }

  // ── Render: Countdown ─────────────────────────────────────────────────

  if (stepState === "countdown") {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        {stepperHeader}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 700,
              fontSize: "8rem",
              lineHeight: 1,
              color: "primary.main",
              animation: "countPop 0.3s ease-out",
              "@keyframes countPop": {
                "0%": { transform: "scale(1.4)", opacity: 0 },
                "100%": { transform: "scale(1)", opacity: 1 },
              },
            }}
            key={countdown}
          >
            {countdown}
          </Typography>
        </Box>
      </Container>
    );
  }

  // ── Render: Recording ─────────────────────────────────────────────────

  if (stepState === "recording") {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        {stepperHeader}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, fontStyle: "italic", textAlign: "center", maxWidth: 440, mx: "auto", lineHeight: 1.7 }}
        >
          {step.instructional}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 240, justifyContent: "center" }}>
          <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                backgroundColor: "rgba(255, 82, 82, 0.15)",
                animation: "pulse 1.4s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": { transform: "scale(1)", opacity: 0.6 },
                  "50%": { transform: "scale(1.25)", opacity: 1 },
                },
              }}
            />
            <Box
              sx={{
                position: "absolute",
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: "#ff5252",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <MicIcon size={24} />
            </Box>
          </Box>
          <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.05em" }}>
            {formatDuration(recordingSeconds)}
          </Typography>
          <Button variant="contained" size="large" startIcon={<StopIcon />} onClick={stopRecording} sx={{ borderRadius: 999, px: 4 }}>
            Stop recording
          </Button>
        </Box>
      </Container>
    );
  }

  // ── Render: Transcribing ──────────────────────────────────────────────

  if (stepState === "transcribing") {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        {stepperHeader}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 3 }}>
          <CircularProgress size={48} />
          <Typography color="text.secondary">Transcribing&hellip;</Typography>
        </Box>
      </Container>
    );
  }

  // ── Render: Prompt (default) ──────────────────────────────────────────

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      {stepperHeader}

      <Box sx={{ textAlign: "center", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 1.5, letterSpacing: "-0.01em" }}>
          {step.heading}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 5, fontStyle: "italic", maxWidth: 440, lineHeight: 1.7 }}
        >
          {step.instructional}
        </Typography>

        {failedBlob && (
          <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="body2" color="error">
              Transcription failed. Your recording is safe.
            </Typography>
            <Button variant="text" size="small" onClick={downloadFailedBlob} sx={{ color: "text.secondary" }}>
              Download recording
            </Button>
          </Stack>
        )}

        <Button
          variant="contained"
          size="large"
          startIcon={<MicIcon />}
          onClick={startRecording}
          sx={{
            borderRadius: 999,
            px: 5,
            py: 1.5,
            fontSize: "1rem",
            background: "linear-gradient(135deg, #8F09F9 0%, #FF814F 100%)",
            "&:hover": { background: "linear-gradient(135deg, #7a08d8 0%, #e5703f 100%)" },
          }}
        >
          {failedBlob ? "Try again" : "Record"}
        </Button>

        <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
          {activeStep > 0 && (
            <Button variant="text" onClick={handleBack} sx={{ color: "text.secondary" }}>
              Go back
            </Button>
          )}
          {step.optional && (
            <Button variant="text" onClick={handleSkip} sx={{ color: "text.secondary" }}>
              Skip &mdash; go to review
            </Button>
          )}
          {activeStep === 0 && (
            <Button variant="text" onClick={onCancel} sx={{ color: "text.secondary" }}>
              Cancel
            </Button>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
