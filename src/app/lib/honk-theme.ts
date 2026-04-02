import { createTheme } from "@mui/material/styles";

// HONK Brand Guidelines 2025
// Primary:    Electric Violet  #8F09F9
// Secondary:  Coral            #FF814F
// Info:       Indigo Dye       #004B70
// Background: Rich Black       #09121B
// Paper:      Slate Gray       #465967
// Text sec:   French Gray      #C3CFD5
// Text pri:   White            #FCFDFD

export const honkTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    primary: {
      main: "#8F09F9",
      contrastText: "#FCFDFD",
    },
    secondary: {
      main: "#FF814F",
      contrastText: "#09121B",
    },
    info: {
      main: "#004B70",
      contrastText: "#FCFDFD",
    },
    background: {
      default: "#09121B",
      paper: "#465967",
    },
    text: {
      primary: "#FCFDFD",
      secondary: "#C3CFD5",
    },
    divider: "rgba(195, 207, 213, 0.16)",
  },
  typography: {
    fontFamily: [
      "TT Commons Pro",
      "Roboto",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: "linear-gradient(135deg, #8F09F9 0%, #FF814F 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #7a08d8 0%, #e5703f 100%)",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "linear-gradient(90deg, #09121B 0%, #1a0a2e 100%)",
          borderBottom: "1px solid rgba(143, 9, 249, 0.3)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        colorPrimary: {
          background: "linear-gradient(135deg, #8F09F9 0%, #FF814F 100%)",
          color: "#FCFDFD",
        },
      },
    },
  },
});
