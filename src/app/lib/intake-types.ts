export type MetricDirection = "increased" | "decreased";
export type RetentionRisk = "Low" | "Medium" | "High" | "";

export type ResourceLink = { id: string; type: "link"; url: string; description: string };
export type ResourceFile = { id: string; type: "file"; name: string; description: string };
export type Resource = ResourceLink | ResourceFile;

export type Platform = "CurbsidePRO" | "HONK" | "";

export type IntakeFormData = {
  title: string;
  shortDescription: string;
  customer: string;
  action: string;
  outcome: string;
  idea: string;
  whySolves: string;
  metric: string;
  metricDirection: MetricDirection;
  incrementVolume: string;
  contractValue: string;
  retentionRisk: RetentionRisk;
  additionalBackground: string;
  functionalRequirements: string;
  risks: string;
  goToMarket: string;
  platform: Platform;
  clientName: string;
  yourName: string;
  timeline: string;
  resources: Resource[];
};

export const EMPTY_FORM: IntakeFormData = {
  title: "",
  shortDescription: "",
  customer: "",
  action: "",
  outcome: "",
  idea: "",
  whySolves: "",
  metric: "",
  metricDirection: "decreased",
  incrementVolume: "",
  contractValue: "",
  retentionRisk: "",
  additionalBackground: "",
  functionalRequirements: "",
  risks: "",
  goToMarket: "",
  platform: "HONK",
  clientName: "",
  yourName: "",
  timeline: "",
  resources: [],
};

export const HONK_CLIENTS = [
  "21st Century", "A-Max Auto Insurance", "ACV Auto Auctions", "Aegis",
  "American National", "Aspire", "Assurance", "Auto-Owners Insurance",
  "Branch", "Bristol West", "Carvana", "Chevron Roadside", "Clearcover",
  "Confie", "Connect", "Copart", "Cox Enterprises", "Curbside SOS",
  "Cure Auto Insurance", "Dealer General", "Driven Brands", "Driven Solutions",
  "Elephant Insurance", "FIMC", "Fair Warranty", "Farmers Crash Assist",
  "Farmers Fleet", "Farmers Roadside", "First Connect Insurance", "FleetNet",
  "Foremost Roadside", "Gather", "HONK", "HONK - a Lemonade Partner",
  "HONK Roadside - a Wheels partner", "Highway Heroes", "Holman", "Home Depot",
  "Insurance Auto Auctions", "InsureOne Auto Club", "KeyMe", "KeyMe Direct",
  "KeyMe Lockout", "LeasePlan", "Lemonade", "MINI USA", "Metromile",
  "NJM Insurance", "Norton Healthcare", "Ohio Mutual Insurance Company",
  "Omega Autocare", "Pure Insurance", "Qualitas Insurance Company", "Reserv",
  "Seaview Insurance", "ServiceUp", "Sewell", "Sixt Rent a Car LLC",
  "Southwest Re", "Tint", "Toco Warranty", "Toggle", "Toggle Services",
  "Toyota", "USAA", "Valley Insurance", "Vault", "Wawanesa Insurance",
  "Waymo", "Whip", "Zoox", "eLockout",
] as const;

export const DEMO_DATA: IntakeFormData = {
  title: "Real-time ETA Tracking for Stranded Motorists",
  shortDescription: "Stranded motorists have no visibility into their provider's progress, driving anxiety and repeat dispatch calls. A live ETA screen in the HONK app would reduce inbound volume and improve NPS.",
  customer: "stranded motorist",
  action: "track the real-time location and ETA of their incoming service provider",
  outcome: "they have no visibility into the provider's progress, causing anxiety and repeat calls into our dispatch center",
  idea: "we surface a live provider-tracking map and countdown ETA in the HONK customer experience",
  whySolves: "customers feel informed and in control, reducing inbound support calls and improving NPS scores",
  metric: "inbound dispatcher call volume per job",
  metricDirection: "decreased",
  incrementVolume: "~200 additional jobs/month driven by improved NPS and word-of-mouth referrals",
  contractValue: "Potential $50K ARR uplift — AAA has flagged this as a renewal requirement",
  retentionRisk: "High",
  additionalBackground:
    "Three enterprise clients raised this in Q1 QBRs, including AAA who listed it as a blocker for renewal. NPS verbatims consistently cite 'not knowing where my driver is' as the top frustration.",
  functionalRequirements:
    "- Provider location updates every 60 seconds on a customer-facing map\n- ETA calculated using live traffic conditions\n- Push notification sent when provider is 5 minutes away\n- Status progression: Assigned → En Route → Arrived\n- Works on both iOS and Android HONK apps",
  risks:
    "- GPS accuracy degrades in rural or low-signal areas\n- Frequent polling may increase battery drain on provider devices\n- Some providers may have privacy concerns about real-time location sharing",
  goToMarket:
    "- Proactive outreach to enterprise clients flagging this as a renewal requirement, 2 weeks before launch\n- In-app announcement to all existing customers on launch day\n- Update HONK.com features page\n- Brief dispatchers and account managers before release",
  platform: "HONK",
  clientName: "",
  yourName: "",
  timeline: "",
  resources: [],
};
