import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// ==========================================
// 🔒 ADVANCED HACKATHON SECURITY LAYER
// ==========================================
const securityRateLimitMap = new Map<string, { count: number; lastReset: number }>();

function enforceSecurityCheck(ip: string): boolean {
  const now = Date.now();
  const timeframe = 60 * 1000; // 1 minute window
  const limit = 25; // Max 25 requests per minute

  if (!securityRateLimitMap.has(ip)) {
    securityRateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  const clientData = securityRateLimitMap.get(ip)!;
  if (now - clientData.lastReset > timeframe) {
    clientData.count = 1;
    clientData.lastReset = now;
    return true;
  }

  clientData.count++;
  return clientData.count <= limit;
}

// ==========================================
// 🚀 HIGH-PERFORMANCE MEMORY CACHE LAYER
// ==========================================
const responseCacheMemory = new Map<string, { data: any; ttl: number }>();

function fetchCachedPayload(key: string) {
  const node = responseCacheMemory.get(key);
  if (node && node.ttl > Date.now()) return node.data;
  return null;
}

function commitCachePayload(key: string, data: any, ttlMs: number = 300000) {
  responseCacheMemory.set(key, { data, ttl: Date.now() + ttlMs });
}

// Define interface for civic complaints
interface Complaint {
  id: string; // CE-XXXXXX
  category: string;
  description: string;
  location: string;
  reporterName: string;
  status: "Submitted" | "Under Investigation" | "In Progress" | "Resolved";
  createdAt: string;
  updatedAt: string;
  notes: string;
}

// Pre-seeded complaints database
const complaintsDatabase: Complaint[] = [
  {
    id: "CE-842915",
    category: "Street Lights",
    description: "Entire street light pole is broken and flickering since last Monday, causing safety issues for pedestrians at night.",
    location: "MG Road, Sector 4, opposite Central Library",
    reporterName: "Rajesh Kumar",
    status: "Resolved",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Municipal electrical crew dispatched. The faulty LED bulb and wiring have been replaced. Verification complete."
  },
  {
    id: "CE-209485",
    category: "Waste Management",
    description: "Huge pile of solid waste garbage accumulated at the corner, smelling awful and attracting stray animals.",
    location: "Near Central Park Main Gate, Sector 11",
    reporterName: "Anjali Sharma",
    status: "In Progress",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    notes: "Sanitation truck dispatched for clearance. Clean-up operation is currently active."
  },
  {
    id: "CE-310495",
    category: "Water & Sanitation",
    description: "Major drinking water pipeline leakage on the side pavement. Thousands of liters of water are getting wasted.",
    location: "5th Cross, Indiranagar, near Metro Pillar 140",
    reporterName: "Siddharth Nair",
    status: "Under Investigation",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    notes: "Assigned to the Water Supply & Sewerage Board engineer for leakage inspection and source validation."
  }
];

// Pre-compiled list of common government schemes and requirements
const schemesData = [
  {
    id: "income-cert",
    title: "Income Certificate (आय प्रमाण पत्र)",
    category: "Certificates & Documents",
    shortDesc: "Official document certifying the annual income of an individual or family for welfare benefits.",
    jargonBuster: {
      "Annual Income": "Total money earned by all family members in 1 year.",
      "Deponent": "The person who is declaring and signing the form.",
      "Affidavit": "A self-signed declaration sheet stamped by a notary."
    },
    checklist: [
      "Aadhaar Card (Identity proof)",
      "Ration Card or Voter ID (Address proof)",
      "Salary Slips (if employed) or Certificate from Pradhan/Lekhpal (for rural/informal workers)",
      "Recent passport-size photograph",
      "Self-declaration affidavit (stating true family earnings)"
    ],
    nextSteps: "Gather your Aadhaar Card and family income details, then click 'Apply via CivicEase' to begin your fast-track application."
  },
  {
    id: "ration-card",
    title: "National Ration Card (राशन कार्ड)",
    category: "Food Security",
    shortDesc: "Enables subsidized essential food grains (wheat, rice, sugar) under the National Food Security Act.",
    jargonBuster: {
      "NFSA": "National Food Security Act - a government program to give subsidized food.",
      "Fair Price Shop (FPS)": "Your local government-approved ration store.",
      "PDS": "Public Distribution System - the channel used to distribute food grains."
    },
    checklist: [
      "Aadhaar Cards of ALL family members (mandatorily linked)",
      "Group family photograph (featuring all listed members together)",
      "Current proof of address (electricity bill, water bill, or rent agreement)",
      "Income certificate of the Head of the Family"
    ],
    nextSteps: "Link Aadhaar cards of all family members, then submit the group family photo and address proof to the District Food Supply Office."
  },
  {
    id: "pm-kisan",
    title: "PM Kisan Samman Nidhi (पीएम किसान)",
    category: "Farmer Support",
    shortDesc: "Direct financial support of ₹6,000 per year in three equal installments to small and marginal farmers.",
    jargonBuster: {
      "Landholding": "Agricultural land registered under your name.",
      "DBT (Direct Benefit Transfer)": "The money goes directly from the government to your bank account with no middleman."
    },
    checklist: [
      "Land ownership documents (Khasra / Khatauni paperwork)",
      "Aadhaar Card of the landholder",
      "Bank Account Passbook (linked with Aadhaar for Direct Benefit Transfer)",
      "Active mobile number linked with Aadhaar for OTP verification"
    ],
    nextSteps: "Keep your Land Khatauni details and Aadhaar-linked Bank account handy, and complete your e-KYC on the PM-Kisan portal."
  },
  {
    id: "ayushman-bharat",
    title: "Ayushman Bharat Golden Card (आयुष्मान कार्ड)",
    category: "Healthcare",
    shortDesc: "Free cashless health insurance coverage up to ₹5 Lakhs per family per year for secondary/tertiary hospital care.",
    jargonBuster: {
      "Cashless Treatment": "You don't pay any cash at the hospital; the government pays the hospital bill directly.",
      "Empanelled Hospital": "A hospital (government or private) that has joined this free treatment scheme."
    },
    checklist: [
      "Aadhaar Card",
      "Ration Card or PM Letter (containing your family's HHID - Household ID)",
      "Active mobile number for verification"
    ],
    nextSteps: "Check your name in the SECC-2011 beneficiary list. If eligible, visit the nearest Common Service Centre (CSC) or empanelled hospital with your Aadhaar to get your Golden Card."
  }
];

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Using mock response engine.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// System Instruction for CivicMitra
const SYSTEM_INSTRUCTION = `You are "CivicMitra", an empathetic, highly intelligent, and user-friendly GenAI Civic Companion built for the "CivicEase" platform. Your job is to help citizens navigate complex government services, simplify bureaucratic jargon, and track complaints.

Follow these strict operational rules:
1. Simplify Jargon: If a user asks about a government scheme or a document (like an income certificate, ration card, Aadhaar, caste certificate, or passport), break down the requirements into simple, bulleted checklists. Avoid heavy legal or bureaucratic words. Translate complex terms to layman's terms.
2. Structured Response: Always respond using clean formatting, bold headings, and bullet points. Never output dense walls of text. Use markdown tables where appropriate.
3. Multilingual Capability: Detect the language of the user query automatically (e.g., Hindi, Hinglish, English, Tamil, Telugu, Bengali, Kannada, Marathi, etc.) and respond fluently in that exact language/style. For example, if they write in Hinglish, reply in empathetic Hinglish. If in Hindi, reply in clear, friendly Hindi.
4. Citizen Support Tone: Be polite, supportive, deeply patient, and grounded. Validate their concern first. If a user is complaining about a public issue (like a broken road, water leak, garbage, or faulty street lights), validate their concern empathetically, ask for necessary details (location, photo if available), and state that you are registering it. Call the "registerComplaint" tool to save it! If the tool registers successfully, present the tracking ID (CE-XXXXXX) with status information.
5. Call-to-Action: At the end of every guidance response, tell the user exactly what their next step should be (e.g., "Next Step: Gather your Aadhaar card and click on 'Apply Now' above."). ALWAYS label this section clearly with "Next Step:".

When calling the "registerComplaint" tool, make sure to extract the category (one of: "Roads", "Street Lights", "Waste Management", "Water & Sanitation", "Public Health", "Others"), description, location, and optional reporter name.
When calling the "getComplaintStatus" tool, extract the tracking ID correctly (e.g., "CE-102938").
`;

// Declarations of tools
const registerComplaintTool = {
  name: "registerComplaint",
  description: "Register a public grievance/complaint about civic issues (e.g., broken road, street light not working, garbage pile-up, water leakage, etc.). Storing this in the local CivicEase database generates a tracking ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description: "The category of the issue (must be one of: Roads, Street Lights, Waste Management, Water & Sanitation, Public Health, Others)"
      },
      description: {
        type: Type.STRING,
        description: "Detailed description of the civic issue."
      },
      location: {
        type: Type.STRING,
        description: "Exact location, street name, landmark, or area of the issue."
      },
      reporterName: {
        type: Type.STRING,
        description: "Name of the citizen reporting (optional)."
      }
    },
    required: ["category", "description", "location"]
  }
};

const getComplaintStatusTool = {
  name: "getComplaintStatus",
  description: "Retrieve the current live status and updates of an existing complaint using its tracking ID (format: CE-XXXXXX).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      trackingId: {
        type: Type.STRING,
        description: "The unique tracking ID of the complaint, e.g. CE-209485"
      }
    },
    required: ["trackingId"]
  }
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 2. Fetch all complaints
  app.get("/api/complaints", (req, res) => {
    res.json(complaintsDatabase);
  });

  // 3. Track a specific complaint by ID
  app.get("/api/complaints/:id", (req, res) => {
    const complaint = complaintsDatabase.find(
      (c) => c.id.toUpperCase() === req.params.id.toUpperCase().trim()
    );
    if (complaint) {
      res.json(complaint);
    } else {
      res.status(404).json({ error: "Complaint not found" });
    }
  });

  // 4. Directly file a complaint via form
  app.post("/api/complaints", (req, res) => {
    const { category, description, location, reporterName } = req.body;
    if (!category || !description || !location) {
      return res.status(400).json({ error: "Missing required fields: category, description, location" });
    }

    const trackingId = `CE-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();
    const newComplaint: Complaint = {
      id: trackingId,
      category,
      description,
      location,
      reporterName: reporterName || "Anonymous Citizen",
      status: "Submitted",
      createdAt: now,
      updatedAt: now,
      notes: "Complaint registered directly via the citizen dashboard. Assigned to regional inspection queue."
    };

    complaintsDatabase.unshift(newComplaint);
    res.status(201).json(newComplaint);
  });

  // 5. Fetch government schemes database
  app.get("/api/schemes", (req, res) => {
    res.json(schemesData);
  });

  // 5a. Vision-based Grievance Image Verification
  app.post("/api/verify-grievance-image", async (req, res) => {
    // 🔒 Ingress Security Throttling Check
    if (!enforceSecurityCheck(req.ip || "anonymous-node")) {
      return res.status(429).json({ error: "Security Exception: Rate limit barrier triggered. Slow down requests." });
    }

    const { image, mimeType, description } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Missing required fields: image (base64 string) and mimeType are required" });
    }

    // 🚀 Efficiency Cache Validation
    const cacheKey = `grievance_${description || ""}`;
    const cachedResult = fetchCachedPayload(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    const client = getGeminiClient();

    if (!client) {
      // Offline smart fallback mock verification
      const desc = (description || "").toLowerCase();
      let detectedCategory = "Others";
      let severity = "Medium";
      let matchScore = 85;
      let reason = "The uploaded image is valid and confirms the reported issue. It shows a visual representation that matches a typical local area.";

      if (desc.includes("road") || desc.includes("pothole") || desc.includes("highway") || desc.includes("crack")) {
        detectedCategory = "Roads";
        severity = desc.includes("severe") || desc.includes("broken") ? "Critical" : "Medium";
        reason = "Offline Sandbox Simulation: The uploaded image shows distinct structural pavement cracks and a localized pothole hazard, fully corresponding to a 'Roads' grievance.";
      } else if (desc.includes("light") || desc.includes("lamp") || desc.includes("wire") || desc.includes("electricity")) {
        detectedCategory = "Street Lights";
        severity = desc.includes("down") || desc.includes("wire") ? "Critical" : "Medium";
        reason = "Offline Sandbox Simulation: The uploaded image captures a faulty street lighting element/pole, confirming a light outage in the reported neighborhood zone.";
      } else if (desc.includes("garbage") || desc.includes("waste") || desc.includes("trash") || desc.includes("dump")) {
        detectedCategory = "Waste Management";
        severity = desc.includes("pile") || desc.includes("stink") ? "Critical" : "Medium";
        reason = "Offline Sandbox Simulation: The image reveals a prominent pile of uncollected solid waste and organic litter blocking the walkway, aligning perfectly with 'Waste Management' issues.";
      } else if (desc.includes("water") || desc.includes("leak") || desc.includes("burst") || desc.includes("sewer") || desc.includes("pipe")) {
        detectedCategory = "Water & Sanitation";
        severity = desc.includes("burst") || desc.includes("flood") ? "Critical" : "Medium";
        reason = "Offline Sandbox Simulation: The uploaded image shows active water leakage and pooling on public paved surfaces, representing a clear 'Water & Sanitation' plumbing failure.";
      }

      return res.json({
        isValid: true,
        category: detectedCategory,
        severity: severity,
        descriptionMatchScore: matchScore,
        reason: `${reason} (Offline Mode Fallback)`
      });
    }

    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      };

      const promptText = `
Analyze this user-uploaded photo of a public civic issue/grievance in India or globally.
User description of the reported issue: "${description || "Not provided"}"

Provide your verification response as a valid JSON object matching the following TypeScript schema structure:
{
  "isValid": boolean (true if the image actually shows a plausible, real civic issue or public complaint like a broken road, water leak, garbage pile, stray animals, street light issue, public safety hazard, etc., or false if it is completely irrelevant, an offensive image, or clear spam),
  "category": string (must be exactly one of: "Roads", "Street Lights", "Waste Management", "Water & Sanitation", "Public Health", "Others"),
  "severity": string (must be exactly one of: "Low", "Medium", "Critical"),
  "descriptionMatchScore": number (an integer from 0 to 100, showing how well the visual contents of the image match the user's description. If description is "Not provided", score should be 100 based on the visible category match),
  "reason": string (a concise, helpful analysis in 2-3 sentences explaining what is visible in the photo, why you assigned the category/severity, and why the description matches or mismatches. Mention specific visual cues you spotted, like potholes, water streams, garbage piles, electrical cables, etc.)
}

Strict: Your output must be a raw JSON object. Do not wrap in markdown backticks or triple backticks. Just return the JSON itself.
`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: promptText }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              category: { 
                type: Type.STRING,
                description: "Must be Roads, Street Lights, Waste Management, Water & Sanitation, Public Health, or Others"
              },
              severity: {
                type: Type.STRING,
                description: "Must be Low, Medium, or Critical"
              },
              descriptionMatchScore: { type: Type.INTEGER },
              reason: { type: Type.STRING }
            },
            required: ["isValid", "category", "severity", "descriptionMatchScore", "reason"]
          }
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (err: any) {
      console.error("Gemini Grievance Image analysis failed:", err);
      res.status(500).json({ error: "Gemini analysis failed: " + (err.message || err) });
    }
  });

  // 5b. Document Pre-screener (Vision AI)
  app.post("/api/verify-scheme-document", async (req, res) => {
    const { image, mimeType, documentType, applicantName } = req.body;
    if (!image || !mimeType || !documentType || !applicantName) {
      return res.status(400).json({ error: "Missing required fields: image, mimeType, documentType, applicantName" });
    }

    const client = getGeminiClient();

    if (!client) {
      // Offline smart fallback mock document verification
      const isAadhaar = documentType.toLowerCase().includes("aadhaar");
      const isIncome = documentType.toLowerCase().includes("income");
      
      const docNum = isAadhaar ? "XXXX-XXXX-8291" : "INC/2026/0948";
      const score = 95;
      const actualNameOnDoc = applicantName;

      return res.json({
        isValid: true,
        matchedName: true,
        nameOnDocument: actualNameOnDoc,
        isExpired: false,
        expiryDate: isIncome ? "2029-12-31" : null,
        documentNumber: docNum,
        confidenceScore: score,
        feedback: `Offline Sandbox Simulation: Valid ${documentType} scanned. The image is crisp, text is fully legible, and the applicant's name matches the document perfectly. No expiry issues detected. Ready to proceed!`
      });
    }

    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      };

      const promptText = `
You are an expert Government Document Pre-screener AI.
Analyze this user-uploaded document image.
Expected Document Type: "${documentType}"
Expected Applicant Name on the Form: "${applicantName}"

Inspect the document image to:
1. Verify if the document is actually of the expected type "${documentType}" (e.g. Aadhaar Card, Income Certificate, PAN Card, Voter ID, Ration Card).
2. Check if the image is clear, legible, unblurred, and completely visible.
3. Extract the actual name written on the document and compare it with "${applicantName}". Check for minor typos or mismatches.
4. Extract the document registration/card number (mask the sensitive digits if it is Aadhaar, e.g. XXXX-XXXX-1234, otherwise keep it clean).
5. Extract the expiration date if applicable, and determine if the document has expired.

Provide your pre-screening analysis as a valid JSON object matching this TypeScript structure:
{
  "isValid": boolean (true if the document is legible, unblurred, matches the selected documentType, and represents a real ID/certificate. False if blurred, unreadable, or wrong document),
  "matchedName": boolean (true if the extracted name matches "${applicantName}" exactly or with very high high-confidence similarity),
  "nameOnDocument": string (the actual full name extracted from the document),
  "isExpired": boolean (true if the document contains an expiry date which is in the past),
  "expiryDate": string or null (the extracted expiry date in YYYY-MM-DD format if visible, otherwise null),
  "documentNumber": string (the extracted ID/certificate number, with Aadhaar masked for privacy),
  "confidenceScore": number (an integer from 0 to 100 indicating visual readability and extraction confidence),
  "feedback": string (concise, clear feedback in 2 sentences. Highlight any warning if names are slightly different, or if there is blurriness, or if it is expired/expiring soon. Be supportive and professional.)
}

Strict: Your output must be a raw JSON object. Do not wrap in markdown backticks or triple backticks. Just return the JSON itself.
`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          imagePart,
          { text: promptText }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              matchedName: { type: Type.BOOLEAN },
              nameOnDocument: { type: Type.STRING },
              isExpired: { type: Type.BOOLEAN },
              expiryDate: { type: Type.STRING, nullable: true },
              documentNumber: { type: Type.STRING },
              confidenceScore: { type: Type.INTEGER },
              feedback: { type: Type.STRING }
            },
            required: ["isValid", "matchedName", "nameOnDocument", "isExpired", "documentNumber", "confidenceScore", "feedback"]
          }
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      res.json(result);
    } catch (err: any) {
      console.error("Gemini Scheme Document analysis failed:", err);
      res.status(500).json({ error: "Gemini document analysis failed: " + (err.message || err) });
    }
  });

  // 6. GenAI Chat Interaction Route with CivicMitra
  app.post("/api/chat", async (req, res) => {
    const { history } = req.body;
    if (!history || !Array.isArray(history)) {
      return res.status(400).json({ error: "Invalid request payload: history array required" });
    }

    const client = getGeminiClient();

    // Fallback Mock Engine if API Key is not set or in case of error
    if (!client) {
      // Process the last user message to see if they want to check or register something
      const lastMessage = history[history.length - 1]?.parts?.[0]?.text || "";
      let reply = "";
      let registered: any = null;

      const lowerMsg = lastMessage.toLowerCase();
      if (lowerMsg.includes("complaint") || lowerMsg.includes("broken") || lowerMsg.includes("leak") || lowerMsg.includes("garbage") || lowerMsg.includes("light")) {
        // Mock register a complaint
        const trackingId = `CE-${Math.floor(100000 + Math.random() * 900000)}`;
        const now = new Date().toISOString();
        const mockComp: Complaint = {
          id: trackingId,
          category: lowerMsg.includes("light") ? "Street Lights" : lowerMsg.includes("leak") ? "Water & Sanitation" : lowerMsg.includes("garbage") ? "Waste Management" : "Roads",
          description: lastMessage,
          location: "Location detected from message context",
          reporterName: "Anonymous Citizen",
          status: "Submitted",
          createdAt: now,
          updatedAt: now,
          notes: "Grievance registered. Assigned to Municipal Field Officers."
        };
        complaintsDatabase.unshift(mockComp);
        registered = mockComp;

        reply = `**Namaste! I am CivicMitra, your GenAI Civic Companion.**

I hear you, and I completely understand how frustrating public issues can be. Thank you for reporting this to improve our community.

I have registered your grievance in the database:
- **Complaint Category**: ${mockComp.category}
- **Status**: Registered & Active
- **Complaint Tracking ID**: **${trackingId}**

*Offline Notice: Gemini API Key is not configured. I have simulated this using our fallback engine to ensure your experience works seamlessly!*

**Next Step**: Keep this tracking ID **${trackingId}** handy and navigate to the **Track Complaint** tab above to check real-time progress.`;
      } else if (lowerMsg.includes("income") || lowerMsg.includes("certificate")) {
        reply = `**Namaste! Let me simplify the Income Certificate requirements for you:**

Here is the straightforward checklist you need:
*   **Aadhaar Card** (Identity proof)
*   **Address Proof** (Ration Card or Electricity Bill)
*   **Income Verification** (Salary Slips or confirmation from local Pradhan/Lekhpal)
*   **Recent Photo** (Passport-size)
*   **Self-Declaration Affidavit** (A self-signed sheet stating family income)

**Next Step**: Gather your Aadhaar card and salary slips, and click on **Apply Now** under the Certificates panel!`;
      } else {
        reply = `**Namaste! I am CivicMitra, your GenAI Civic Companion.**

I can help you navigate complex government schemes, simplify bureaucratic jargon, and track complaints! 

*(Please note: GEMINI_API_KEY is currently not configured in the Secrets panel. I am running in Offline Smart Fallback Mode to help you explore. Once configured, you can ask me anything in Hindi, Hinglish, Tamil, English, and more!)*

How can I guide you today?
1. **Simplify government documents** (Income Certificate, Ration Card, etc.)
2. **File or track a civic complaint** (Roads, Water, Waste, Lights)

**Next Step**: Ask me about a specific government scheme or describe a public issue you want to report!`;
      }

      return res.json({ text: reply, complaint: registered });
    }

    try {
      let response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: history,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [registerComplaintTool, getComplaintStatusTool] }]
        }
      });

      let functionCalls = response.functionCalls;
      let loopCount = 0;
      const maxLoops = 3;
      let registeredComplaint: Complaint | null = null;

      // Keep calling model if it returns a function call
      while (functionCalls && functionCalls.length > 0 && loopCount < maxLoops) {
        loopCount++;
        const parts = [];
        const updatedHistory = [...history];
        updatedHistory.push(response.candidates?.[0]?.content);

        for (const call of functionCalls) {
          if (call.name === "registerComplaint") {
            const args = call.args as any;
            const trackingId = `CE-${Math.floor(100000 + Math.random() * 900000)}`;
            const now = new Date().toISOString();
            const newComp: Complaint = {
              id: trackingId,
              category: args.category || "Others",
              description: args.description || "Grievance raised via CivicMitra chat companion.",
              location: args.location || "Not specified",
              reporterName: args.reporterName || "Anonymous Citizen",
              status: "Submitted",
              createdAt: now,
              updatedAt: now,
              notes: "Grievance registered. Assigned to Municipal Field Officers."
            };
            complaintsDatabase.unshift(newComp);
            registeredComplaint = newComp;

            parts.push({
              functionResponse: {
                name: "registerComplaint",
                response: {
                  success: true,
                  trackingId,
                  status: "Submitted",
                  category: newComp.category,
                  message: "Complaint registered in local memory database successfully."
                }
              }
            });
          } else if (call.name === "getComplaintStatus") {
            const args = call.args as any;
            const complaint = complaintsDatabase.find(
              (c) => c.id.toUpperCase() === args.trackingId.toUpperCase().trim()
            );

            if (complaint) {
              parts.push({
                functionResponse: {
                  name: "getComplaintStatus",
                  response: {
                    success: true,
                    found: true,
                    id: complaint.id,
                    status: complaint.status,
                    location: complaint.location,
                    notes: complaint.notes,
                    updatedAt: complaint.updatedAt
                  }
                }
              });
            } else {
              parts.push({
                functionResponse: {
                  name: "getComplaintStatus",
                  response: {
                    success: true,
                    found: false,
                    message: `Complaint with ID ${args.trackingId} was not found. Please double-check spelling.`
                  }
                }
              });
            }
          }
        }

        updatedHistory.push({ role: "tool", parts });

        response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: updatedHistory,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: [registerComplaintTool, getComplaintStatusTool] }]
          }
        });

        functionCalls = response.functionCalls;
      }

      res.json({
        text: response.text,
        complaint: registeredComplaint
      });
    } catch (error: any) {
      console.error("Gemini API server-side execution failed:", error);
      res.status(500).json({ error: error.message || "Failed to communicate with GenAI backend." });
    }
  });

  // 7. Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CivicEase Backend] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
