"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IntakeForm from "@/app/components/intake-form";
import { EMPTY_FORM, type IntakeFormData } from "@/app/lib/intake-types";
import { useUploadAudio } from "@/app/lib/upload-audio-context";

type AppState = "idle" | "countdown" | "recording" | "processing" | "form" | "success";

function playRecordingSound(type: "start" | "stop") {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

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
    // silently ignore if AudioContext unavailable
  }
}

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


export default function Page() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [formData, setFormData] = useState<IntakeFormData>(EMPTY_FORM);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [processingLabel, setProcessingLabel] = useState("Transcribing your recording…");
  const [jiraKey, setJiraKey] = useState<string | null>(null);
  const { setHandler } = useUploadAudio();

  useEffect(() => {
    setHandler((file: File) => {
      setAppState("processing");
      void processRecording(file);
    });
    return () => setHandler(null);
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg", "audio/mp4"]
        .find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void processRecording(new Blob(chunksRef.current, { type: mimeType || "audio/webm" }));
      };

      mediaRecorderRef.current = recorder;

      // Countdown 3 → 2 → 1 then start
      setCountdown(3);
      setAppState("countdown");

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
      setAppState("recording");
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      alert("Microphone access is required to record. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    playRecordingSound("stop");
    mediaRecorderRef.current?.stop();
    setAppState("processing");
  };

  const processRecording = async (blob: Blob) => {
    try {
      setProcessingLabel("Transcribing your recording…");
      const filename = blob instanceof File ? blob.name : "recording.webm";
      console.log("[intake] uploading", filename, blob.type, blob.size, "bytes");
      const fd = new FormData();
      fd.append("audio", blob, filename);
      const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const transcribeJson = await transcribeRes.json() as { transcript?: string; error?: string };
      console.log("[intake] transcribe →", transcribeRes.status, transcribeJson);
      if (!transcribeRes.ok || !transcribeJson.transcript?.trim()) {
        throw new Error(transcribeJson.error ?? "Transcription failed — no speech detected");
      }
      const { transcript } = transcribeJson;

      setProcessingLabel("Structuring your intake with AI…");
      console.log("[intake] structuring transcript:", transcript.slice(0, 80) + "…");
      const structureRes = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const structureJson = await structureRes.json() as IntakeFormData & { error?: string };
      console.log("[intake] structure →", structureRes.status, structureJson);
      if (!structureRes.ok) {
        throw new Error(structureJson.error ?? "Structuring failed");
      }

      setFormData(structureJson);
      setAudioBlob(blob);
      setAppState("form");
    } catch (err) {
      console.error("[intake] processRecording failed:", err);
      alert("Something went wrong processing your recording. Please try again.");
      setAppState("idle");
    }
  };

  if (appState === "success") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)", gap: 3, textAlign: "center", px: 3 }}>
        <Typography variant="h4" fontWeight={700}>You&rsquo;re all set.</Typography>
        <Typography color="text.secondary">
          Your intake has been submitted to Jira Product Discovery
          {jiraKey ? <> as <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>{jiraKey}</Box></> : ""}.
        </Typography>
        <Button variant="outlined" onClick={() => { setFormData(EMPTY_FORM); setJiraKey(null); setAppState("idle"); }} sx={{ mt: 1, borderRadius: 999, px: 4 }}>
          Submit another
        </Button>
      </Box>
    );
  }

  if (appState === "form") {
    return (
      <IntakeForm
        data={formData}
        onChange={setFormData}
        audioBlob={audioBlob}
        onStartOver={() => { setFormData(EMPTY_FORM); setAudioBlob(null); setAppState("idle"); }}
        onSubmitSuccess={(key) => { setJiraKey(key); setAppState("success"); }}
      />
    );
  }

  if (appState === "processing") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)", gap: 3 }}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">{processingLabel}</Typography>
      </Box>
    );
  }

  if (appState === "countdown") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)" }}>
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
    );
  }

  if (appState === "recording") {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)", gap: 4 }}>
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
        <Button
          variant="outlined"
          size="large"
          startIcon={<StopIcon />}
          onClick={stopRecording}
          sx={{ borderRadius: 999, px: 4 }}
        >
          Stop recording
        </Button>
      </Box>
    );
  }

  // idle
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

        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={<MicIcon />}
            onClick={startRecording}
            sx={{ px: 4, py: 1.5, fontSize: "1rem", borderRadius: 999 }}
          >
            Record
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
