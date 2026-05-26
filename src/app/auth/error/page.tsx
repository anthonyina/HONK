"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { signIn } from "next-auth/react";

export default function AuthError() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 128px)", gap: 3, textAlign: "center", px: 3 }}>
      <Typography variant="h4" fontWeight={700}>Access denied</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 400 }}>
        Only @honkforhelp.com accounts can access Product Intake. Please sign in with your HONK Google account.
      </Typography>
      <Button
        variant="outlined"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        sx={{ borderRadius: 999, px: 4 }}
      >
        Try again
      </Button>
    </Box>
  );
}
