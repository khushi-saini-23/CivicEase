export interface Scheme {
  id: string;
  title: string;
  category: string;
  shortDesc: string;
  jargonBuster: Record<string, string>;
  checklist: string[];
  nextSteps: string;
}

export interface Complaint {
  id: string;
  category: string;
  description: string;
  location: string;
  reporterName: string;
  status: "Submitted" | "Under Investigation" | "In Progress" | "Resolved";
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}
