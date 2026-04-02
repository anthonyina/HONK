"use client";

import { useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useUploadAudio } from "@/app/lib/upload-audio-context";

export default function AppFooter() {
  const { handler } = useUploadAudio();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: "auto",
        borderTop: 1,
        borderColor: "divider",
        backgroundColor: "background.default",
      }}
    >
      <Typography variant="body2" color="text.secondary" align="center">
        © 2025 HONK — Product Intake
        {handler && (
          <>
            {" "}
            <Box
              component="span"
              onClick={() => inputRef.current?.click()}
              sx={{
                cursor: "pointer",
                opacity: 0.2,
                "&:hover": { opacity: 0.7 },
                transition: "opacity 0.2s",
                userSelect: "none",
              }}
            >
              ◉
            </Box>
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.webm,.mp3,.wav,.m4a,.ogg"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handler(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </Typography>
    </Box>
  );
}
