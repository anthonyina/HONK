"use client";

import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { useHeaderActions } from "@/app/lib/header-actions-context";

export default function AppHeader() {
  const { rightAction } = useHeaderActions();

  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Image
            src="/honk-logo-white.svg"
            alt="HONK"
            width={80}
            height={32}
            priority
          />
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              color: "text.secondary",
              borderLeft: "1px solid",
              borderColor: "divider",
              pl: 2,
            }}
          >
            Product Intake
          </Typography>
        </Box>
        {rightAction && <Box sx={{ ml: "auto" }}>{rightAction}</Box>}
      </Toolbar>
    </AppBar>
  );
}
