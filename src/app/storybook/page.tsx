"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 600 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  );
}

export default function Page() {
  const [radioValue, setRadioValue] = useState("option-a");
  const [selectValue, setSelectValue] = useState("");
  const [checked, setChecked] = useState({ alpha: true, beta: false, gamma: false });
  const [toggled, setToggled] = useState(false);
  const [textValue, setTextValue] = useState("");

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>

      {/* ── Typography ── */}
      <Section title="Typography">
        <Stack spacing={1}>
          <Typography variant="h1">h1 — The quick brown fox</Typography>
          <Typography variant="h2">h2 — The quick brown fox</Typography>
          <Typography variant="h3">h3 — The quick brown fox</Typography>
          <Typography variant="h4">h4 — The quick brown fox</Typography>
          <Typography variant="h5">h5 — The quick brown fox</Typography>
          <Typography variant="h6">h6 — The quick brown fox</Typography>
          <Divider />
          <Typography variant="body1">
            body1 — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Pellentesque euismod, nisi eu consectetur porttitor.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            body2 — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            Pellentesque euismod, nisi eu consectetur porttitor.
          </Typography>
          <Typography variant="caption" display="block">
            caption — Used for labels, hints, and helper text
          </Typography>
          <Typography variant="overline" display="block">
            overline — Section labels and tags
          </Typography>
        </Stack>
      </Section>

      {/* ── Buttons ── */}
      <Section title="Buttons">
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" display="block" sx={{ mb: 1 }}>
              Variants
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button variant="contained">Contained</Button>
              <Button variant="outlined">Outlined</Button>
              <Button variant="text">Text</Button>
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" display="block" sx={{ mb: 1 }}>
              Colors
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button variant="contained" color="primary">Primary</Button>
              <Button variant="contained" color="secondary">Secondary</Button>
              <Button variant="contained" color="success">Success</Button>
              <Button variant="contained" color="warning">Warning</Button>
              <Button variant="contained" color="error">Error</Button>
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" display="block" sx={{ mb: 1 }}>
              Sizes
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Button variant="contained" size="small">Small</Button>
              <Button variant="contained" size="medium">Medium</Button>
              <Button variant="contained" size="large">Large</Button>
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" display="block" sx={{ mb: 1 }}>
              States
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button variant="contained" disabled>Disabled</Button>
              <Button variant="outlined" disabled>Disabled</Button>
              <Button variant="contained" loading>Loading</Button>
            </Stack>
          </Box>
        </Stack>
      </Section>

      {/* ── Checkboxes ── */}
      <Section title="Checkboxes">
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={checked.alpha}
                onChange={(e) => setChecked((prev) => ({ ...prev, alpha: e.target.checked }))}
              />
            }
            label="Alpha"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={checked.beta}
                onChange={(e) => setChecked((prev) => ({ ...prev, beta: e.target.checked }))}
              />
            }
            label="Beta"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={checked.gamma}
                onChange={(e) => setChecked((prev) => ({ ...prev, gamma: e.target.checked }))}
              />
            }
            label="Gamma"
          />
          <FormControlLabel
            control={<Checkbox disabled />}
            label="Disabled"
          />
          <FormControlLabel
            control={<Checkbox disabled checked />}
            label="Disabled checked"
          />
        </FormGroup>
      </Section>

      {/* ── Radio Buttons ── */}
      <Section title="Radio Buttons">
        <FormControl>
          <FormLabel>Select an option</FormLabel>
          <RadioGroup
            value={radioValue}
            onChange={(e) => setRadioValue(e.target.value)}
          >
            <FormControlLabel value="option-a" control={<Radio />} label="Option A" />
            <FormControlLabel value="option-b" control={<Radio />} label="Option B" />
            <FormControlLabel value="option-c" control={<Radio />} label="Option C" />
            <FormControlLabel value="option-d" control={<Radio disabled />} label="Disabled" />
          </RadioGroup>
        </FormControl>
      </Section>

      {/* ── Select / Dropdown ── */}
      <Section title="Select / Dropdown">
        <Stack spacing={3} sx={{ maxWidth: 320 }}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectValue}
              label="Category"
              onChange={(e) => setSelectValue(e.target.value)}
            >
              <MenuItem value="feature">Feature Request</MenuItem>
              <MenuItem value="bug">Bug Report</MenuItem>
              <MenuItem value="improvement">Improvement</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth disabled>
            <InputLabel>Disabled</InputLabel>
            <Select value="" label="Disabled">
              <MenuItem value="">None</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Section>

      {/* ── Text Fields ── */}
      <Section title="Text Fields">
        <Stack spacing={2} sx={{ maxWidth: 320 }}>
          <TextField
            label="Outlined"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Type something..."
          />
          <TextField label="Filled" variant="filled" />
          <TextField label="Standard" variant="standard" />
          <TextField label="With helper text" helperText="This is helper text" />
          <TextField label="Error state" error helperText="This field is required" />
          <TextField label="Disabled" disabled value="Cannot edit this" />
          <TextField label="Multiline" multiline rows={3} placeholder="Enter notes..." />
        </Stack>
      </Section>

      {/* ── Switch ── */}
      <Section title="Switch">
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Switch checked={toggled} onChange={(e) => setToggled(e.target.checked)} />
            }
            label={toggled ? "Enabled" : "Disabled"}
          />
          <FormControlLabel
            control={<Switch defaultChecked color="secondary" />}
            label="Secondary color"
          />
          <FormControlLabel
            control={<Switch disabled />}
            label="Disabled off"
          />
          <FormControlLabel
            control={<Switch disabled checked />}
            label="Disabled on"
          />
        </Stack>
      </Section>

      {/* ── Chips ── */}
      <Section title="Chips">
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" display="block" sx={{ mb: 1 }}>
              Variants
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label="Filled" />
              <Chip label="Outlined" variant="outlined" />
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" display="block" sx={{ mb: 1 }}>
              Colors
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label="Default" />
              <Chip label="Primary" color="primary" />
              <Chip label="Secondary" color="secondary" />
              <Chip label="Success" color="success" />
              <Chip label="Warning" color="warning" />
              <Chip label="Error" color="error" />
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" display="block" sx={{ mb: 1 }}>
              Clickable / Deletable
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label="Clickable" color="primary" onClick={() => {}} />
              <Chip label="Deletable" onDelete={() => {}} />
              <Chip label="Both" color="primary" onClick={() => {}} onDelete={() => {}} />
            </Stack>
          </Box>
        </Stack>
      </Section>

    </Container>
  );
}
