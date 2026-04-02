import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import "server-only";

export async function POST(req: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const body = await req.formData();
  const audio = body.get("audio") as File;

  if (!audio) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  console.log("Audio file:", audio.name, audio.type, audio.size);

  // Whisper requires a filename with a recognized extension
  const ext = audio.name?.split(".").pop() || "mp3";
  const safeExt = ["mp3","mp4","m4a","wav","webm","ogg","flac"].includes(ext) ? ext : "mp3";
  const namedFile = new File([audio], `audio.${safeExt}`, { type: audio.type || "audio/mpeg" });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: namedFile,
      model: "whisper-1",
    });
    return NextResponse.json({ transcript: transcription.text });
  } catch (error) {
    console.error("Whisper error:", JSON.stringify(error, null, 2));
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
