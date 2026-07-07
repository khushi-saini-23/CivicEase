import React, { useState, useEffect, useRef } from "react";
import { 
  Building2, 
  Search, 
  FileText, 
  CheckCircle2, 
  MessageSquare, 
  HelpCircle, 
  Send, 
  ArrowRight, 
  Clock, 
  PlusCircle, 
  User, 
  MapPin, 
  AlertCircle, 
  Filter, 
  Languages, 
  BookOpen, 
  Sparkles, 
  ChevronRight, 
  Check, 
  Copy, 
  RefreshCw, 
  Loader2, 
  Smile,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  Scale,
  Home,
  Activity,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Scheme, Complaint, Message } from "./types";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Upload, Eye, ShieldCheck, FileCheck, Map, Layers, Info, X, Mic, MicOff } from "lucide-react";

export default function App() {
  // Tabs: 'home' | 'chat' | 'schemes' | 'grievances'
  const [activeTab, setActiveTab] = useState<"home" | "chat" | "schemes" | "grievances">("home");

  // Floating AI Widget state
  const [isFloatingWidgetOpen, setIsFloatingWidgetOpen] = useState(false);
  const [floatingWidgetInput, setFloatingWidgetInput] = useState("");
  const [floatingWidgetHistory, setFloatingWidgetHistory] = useState<Message[]>([
    {
      role: "model",
      parts: [
        {
          text: `**Namaste! I am CivicMitra**, your personal GenAI companion. 

How can I help you today? I can:
- **Simplify bureaucracy** (documents, ration cards, etc.)
- **Register community complaints** instantly

Type your request below, and I'll take care of it!`
        }
      ]
    }
  ]);
  const [floatingWidgetSending, setFloatingWidgetSending] = useState(false);

  // Omnibar state
  const [omnibarText, setOmnibarText] = useState("");

  // Report via AI Modal State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceModalCategory, setVoiceModalCategory] = useState("Roads");
  const [voiceModalDescription, setVoiceModalDescription] = useState("");
  const [voiceModalLocation, setVoiceModalLocation] = useState("");
  const [voiceModalReporterName, setVoiceModalReporterName] = useState("");
  const [voiceModalSuccess, setVoiceModalSuccess] = useState<{ id: string; category: string } | null>(null);
  const [voiceModalSubmitting, setVoiceModalSubmitting] = useState(false);
  const [voiceModalError, setVoiceModalError] = useState("");
  const [voiceModalIsListening, setVoiceModalIsListening] = useState(false);
  const [voiceModalLanguage, setVoiceModalLanguage] = useState("en-IN");
  const [voiceModalSpeechError, setVoiceModalSpeechError] = useState<string | null>(null);
  const voiceModalRecognitionRef = useRef<any>(null);

  // Send message from Floating Widget
  const handleFloatingWidgetSend = async (textToSend?: string) => {
    const query = (textToSend || floatingWidgetInput).trim();
    if (!query) return;

    if (!textToSend) {
      setFloatingWidgetInput("");
    }

    const updatedHistory: Message[] = [
      ...floatingWidgetHistory,
      { role: "user", parts: [{ text: query }] }
    ];
    setFloatingWidgetHistory(updatedHistory);
    setFloatingWidgetSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: updatedHistory })
      });
      const data = await res.json();

      if (data.error) {
        setFloatingWidgetHistory(prev => [
          ...prev,
          {
            role: "model",
            parts: [{ text: `⚠️ **Server Issue**: We encountered an error processing your query. Please check if your Gemini API key is active.` }]
          }
        ]);
      } else {
        setFloatingWidgetHistory(prev => [
          ...prev,
          { role: "model", parts: [{ text: data.text }] }
        ]);
        if (data.complaint) {
          fetchComplaints();
        }
      }
    } catch (e) {
      console.error("Floating Chat error:", e);
      setFloatingWidgetHistory(prev => [
        ...prev,
        {
          role: "model",
          parts: [{ text: `⚠️ **Network Error**: Unable to reach CivicMitra at this moment.` }]
        }
      ]);
    } finally {
      setFloatingWidgetSending(false);
    }
  };

  // Toggle Speech for the AI Voice Modal
  const handleToggleVoiceModalListening = () => {
    if (voiceModalIsListening) {
      if (voiceModalRecognitionRef.current) {
        voiceModalRecognitionRef.current.stop();
      }
      setVoiceModalIsListening(false);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceModalSpeechError("Speech Recognition is not supported by your browser.");
      setTimeout(() => setVoiceModalSpeechError(null), 5000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = voiceModalLanguage;

      recognition.onstart = () => {
        setVoiceModalIsListening(true);
        setVoiceModalSpeechError(null);
      };

      recognition.onerror = (event: any) => {
        console.error("Voice Modal Speech Error:", event);
        if (event.error === "not-allowed") {
          setVoiceModalSpeechError("Microphone permission denied.");
        } else if (event.error === "no-speech") {
          setVoiceModalSpeechError("No speech detected.");
        } else {
          setVoiceModalSpeechError(`Voice Error: ${event.error}`);
        }
        setVoiceModalIsListening(false);
      };

      recognition.onend = () => {
        setVoiceModalIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setVoiceModalDescription((prev) => prev ? `${prev} ${transcript}` : transcript);
        }
      };

      voiceModalRecognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setVoiceModalSpeechError("Failed to initiate voice recording.");
      setVoiceModalIsListening(false);
    }
  };

  // Submit Voice Modal Report
  const handleVoiceModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoiceModalError("");
    setVoiceModalSuccess(null);

    if (!voiceModalDescription.trim()) {
      setVoiceModalError("Please provide a description of the issue.");
      return;
    }
    if (!voiceModalLocation.trim()) {
      setVoiceModalError("Please provide the exact location.");
      return;
    }

    setVoiceModalSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: voiceModalCategory,
          description: voiceModalDescription,
          location: voiceModalLocation,
          reporterName: voiceModalReporterName || "Voice Citizen"
        })
      });
      const data = await res.json();

      if (res.ok) {
        setVoiceModalSuccess({ id: data.id, category: data.category });
        setVoiceModalDescription("");
        setVoiceModalLocation("");
        setVoiceModalReporterName("");
        fetchComplaints(); // reload complaints list
      } else {
        setVoiceModalError(data.error || "Failed to submit complaint.");
      }
    } catch (err) {
      setVoiceModalError("Connection failed. Please check network.");
    } finally {
      setVoiceModalSubmitting(false);
    }
  };

  // Clean up Voice Modal Speech Recognition ref on unmount
  useEffect(() => {
    return () => {
      if (voiceModalRecognitionRef.current) {
        try {
          voiceModalRecognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Submit Omnibar search/chat
  const handleOmnibarSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = omnibarText.trim();
    if (!query) return;

    setOmnibarText("");

    // Detect if they are entering a complaint code or tracking request
    const ceMatch = query.match(/CE-\d{6}/i);
    if (ceMatch) {
      const trackingCode = ceMatch[0].toUpperCase();
      setActiveTab("grievances");
      setSearchComplaintId(trackingCode);
      // We will perform a micro lookup using setTimeout
      setTimeout(() => {
        const found = complaints.find(
          c => c.id.toUpperCase() === trackingCode
        );
        if (found) {
          setSelectedComplaint(found);
          const lookupElement = document.getElementById("grievance-search-result");
          if (lookupElement) {
            lookupElement.scrollIntoView({ behavior: "smooth" });
          }
        } else {
          alert(`No complaint found with Tracking ID: ${trackingCode}`);
        }
      }, 500);
      return;
    }

    // Otherwise, direct the user query to the main CivicMitra chat companion!
    setActiveTab("chat");
    handleSendChat(query);
  };
  
  // Schemes state
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [searchSchemeQuery, setSearchSchemeQuery] = useState("");
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [loadingSchemes, setLoadingSchemes] = useState(false);

  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [searchComplaintId, setSearchComplaintId] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  
  // New Complaint Form state
  const [formCategory, setFormCategory] = useState("Roads");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formReporterName, setFormReporterName] = useState("");
  const [formSuccessMessage, setFormSuccessMessage] = useState<{ id: string; category: string } | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Speech Recognition states
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState("en-IN");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Emergency Templates state
  const [showEmergencyTemplates, setShowEmergencyTemplates] = useState(false);
  const [showTemplateFeedback, setShowTemplateFeedback] = useState(false);
  const [loadedTemplateLabel, setLoadedTemplateLabel] = useState("");

  const emergencyTemplates = [
    {
      label: "Water Pipe Burst",
      icon: "🚰",
      category: "Water & Sanitation",
      description: "🚨 [URGENT EMERGENCY] Major drinking water main pipeline burst reported. Water is gushing out at extremely high pressure, causing direct street flooding, erosion, and immediate local drinking water supply disruption. Please dispatch the hydraulic maintenance crew to isolate and repair the leak immediately.",
      location: "[Add Landmark, e.g. Opposite Sector 4 Community Hall]"
    },
    {
      label: "Live Wire Down",
      icon: "⚡",
      category: "Street Lights",
      description: "🚨 [URGENT SAFETY HAZARD] A live high-voltage electricity transmission wire has snapped and is lying active on the open street/pavement. Severe risk of lethal electrocution to pedestrians and stray animals. Immediate grid shutoff and repair crew dispatch required.",
      location: "[Add Exact Location, e.g. Near Indiranagar Metro Pillar 140]"
    },
    {
      label: "Open Manhole",
      icon: "🕳️",
      category: "Water & Sanitation",
      description: "🚨 [URGENT ACCIDENT HAZARD] An open sewer manhole has been left completely uncovered on the main roadway without safety barricades or night reflectors. Severe risk of serious vehicle or pedestrian injuries.",
      location: "[Add Location, e.g. In front of Central Park gate]"
    },
    {
      label: "Toxic Chemical Dump",
      icon: "☣️",
      category: "Waste Management",
      description: "🚨 [URGENT HEALTH HAZARD] Unauthorized commercial illegal dumping of potentially toxic, hazardous medical or chemical waste in an open public residential corner. Strong noxious chemical odors are spreading.",
      location: "[Add Location, e.g. Corner of 5th Cross Road]"
    }
  ];

  const handleLoadEmergencyTemplate = (tpl: typeof emergencyTemplates[0]) => {
    setFormCategory(tpl.category);
    setFormDescription(tpl.description);
    setFormLocation(tpl.location);
    setLoadedTemplateLabel(tpl.label);
    setShowTemplateFeedback(true);
    setFormError("");
    setFormSuccessMessage(null);
    
    // Smooth scroll the form container into view so the user sees the pre-populated values
    setTimeout(() => {
      const formElement = document.getElementById("grievance-form-container");
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Web Speech API Voice Dictation Handler
  const handleToggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSpeechError("Speech Recognition is not supported by your browser. Please try Chrome, Edge, or Safari.");
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event);
        if (event.error === "not-allowed") {
          setSpeechError("Microphone permission denied. Please enable microphone permissions in your browser.");
        } else if (event.error === "no-speech") {
          setSpeechError("No speech was detected. Please try speaking closer to the microphone.");
        } else {
          setSpeechError(`Voice Error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setFormDescription((prev) => prev ? `${prev} ${transcript}` : transcript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error(err);
      setSpeechError("Failed to initiate voice recording. Please check browser privacy permissions.");
      setIsListening(false);
    }
  };

  // Cleanup speech instance on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Grievance Vision state
  const [grievanceImage, setGrievanceImage] = useState<string | null>(null);
  const [grievanceImageName, setGrievanceImageName] = useState<string | null>(null);
  const [verifyingGrievanceImage, setVerifyingGrievanceImage] = useState(false);
  const [grievanceVerificationResult, setGrievanceVerificationResult] = useState<{
    isValid: boolean;
    category: string;
    severity: string;
    descriptionMatchScore: number;
    reason: string;
  } | null>(null);

  // Document Pre-screener state
  const [prescreenerDocType, setPrescreenerDocType] = useState("Aadhaar Card");
  const [prescreenerApplicantName, setPrescreenerApplicantName] = useState("");
  const [prescreenerImage, setPrescreenerImage] = useState<string | null>(null);
  const [prescreenerImageName, setPrescreenerImageName] = useState<string | null>(null);
  const [verifyingPrescreener, setVerifyingPrescreener] = useState(false);
  const [prescreenerResult, setPrescreenerResult] = useState<{
    isValid: boolean;
    matchedName: boolean;
    nameOnDocument: string;
    isExpired: boolean;
    expiryDate: string | null;
    documentNumber: string;
    confidenceScore: number;
    feedback: string;
  } | null>(null);

  const handleGrievanceImageChange = async (file: File) => {
    if (!file) return;
    setGrievanceImageName(file.name);
    setVerifyingGrievanceImage(true);
    setGrievanceVerificationResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      setGrievanceImage(base64Str);

      try {
        const response = await fetch("/api/verify-grievance-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Str,
            mimeType: file.type,
            description: formDescription
          })
        });

        if (!response.ok) {
          throw new Error("Analysis failed");
        }

        const data = await response.json();
        setGrievanceVerificationResult(data);

        // Auto populate category if valid
        if (data.isValid && data.category) {
          setFormCategory(data.category);
        }
      } catch (err) {
        console.error("Grievance image analysis failed", err);
      } finally {
        setVerifyingGrievanceImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePrescreenerImageChange = async (file: File) => {
    if (!file) return;
    setPrescreenerImageName(file.name);
    setVerifyingPrescreener(true);
    setPrescreenerResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Str = reader.result as string;
      setPrescreenerImage(base64Str);

      try {
        const response = await fetch("/api/verify-scheme-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Str,
            mimeType: file.type,
            documentType: prescreenerDocType,
            applicantName: prescreenerApplicantName || "A citizen"
          })
        });

        if (!response.ok) {
          throw new Error("Document analysis failed");
        }

        const data = await response.json();
        setPrescreenerResult(data);
      } catch (err) {
        console.error("Document analysis failed", err);
      } finally {
        setVerifyingPrescreener(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Map and Hotspot pinning states
  const [mapCategoryFilter, setMapCategoryFilter] = useState<string>("All");
  const [selectedMapPinId, setSelectedMapPinId] = useState<string | null>(null);
  const [hoveredMapPinId, setHoveredMapPinId] = useState<string | null>(null);

  // Stable coordinates on a 0-100 map grid
  const getComplaintCoordinates = (complaintId: string, category: string) => {
    let hash = 0;
    const idStr = complaintId || "CE-000000";
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let baseX = 50;
    let baseY = 50;
    
    // Position categories in distinct neighborhood zones
    if (category === "Street Lights") {
      baseX = 25; // North-West: Sector 4 Residential block
      baseY = 25;
    } else if (category === "Waste Management") {
      baseX = 75; // North-East: Sector 11 commercial Hub
      baseY = 35;
    } else if (category === "Water & Sanitation") {
      baseX = 35; // South-West: Indiranagar dense block
      baseY = 70;
    } else if (category === "Roads") {
      baseX = 65; // South-East: Outer bypass road & highway
      baseY = 65;
    } else if (category === "Public Health") {
      baseX = 50; // Central Civic Plaza
      baseY = 50;
    } else {
      baseX = 50;
      baseY = 50;
    }
    
    // Small stable variance so pins don't overlap exactly
    const offsetX = (Math.abs(hash) % 16) - 8; // -8 to +8
    const offsetY = (Math.abs(hash >> 3) % 16) - 8; // -8 to +8
    
    return {
      x: Math.min(85, Math.max(15, baseX + offsetX)),
      y: Math.min(85, Math.max(15, baseY + offsetY))
    };
  };

  // Chat state
  const [chatHistory, setChatHistory] = useState<Message[]>([
    {
      role: "model",
      parts: [
        {
          text: `**Namaste! I am CivicMitra**, your empathetic and intelligent GenAI Civic Companion. 

My purpose is to help you easily navigate complex government welfare programs, break down confusing bureaucratic jargon into simple checklists, and register or track your public complaints.

I speak multiple languages including **Hindi (हिंदी)**, **Hinglish**, **Tamil (தமிழ்)**, **English**, and more!

**How can I assist you today?**
*   "Simplify the Income Certificate requirements."
*   "Ration Card apply karne ke liye kya docs chahiye?" (Hinglish)
*   "I want to report a water leakage problem in my neighborhood."
*   "Track my complaint status."

**Next Step**: Ask me a question in any language or select one of the quick options below to get started!`
        }
      ]
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial data
  useEffect(() => {
    fetchSchemes();
    fetchComplaints();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, sendingChat]);

  // 30 Days trend calculation for the Recharts line chart
  const complaintsTrendData = React.useMemo(() => {
    const days: { date: string; isoDate: string; count: number }[] = [];
    const now = new Date();
    
    // Generate dates for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullDateISO = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        isoDate: fullDateISO,
        count: 0
      });
    }

    // Seed realistic baseline data of grievances over the last 30 days so the chart is lively
    days.forEach((day, index) => {
      const seedVal = Math.round(1 + Math.sin(index * 0.8) * 1 + (index % 4 === 0 ? 1 : 0));
      day.count = Math.max(0, seedVal);
    });

    // Layer in the actual dynamic grievances from state
    complaints.forEach((comp) => {
      try {
        const compDate = new Date(comp.createdAt);
        const compDateISO = compDate.toISOString().split('T')[0];
        
        const match = days.find(d => d.isoDate === compDateISO);
        if (match) {
          match.count += 1;
        }
      } catch (err) {
        console.error(err);
      }
    });

    return days.map(d => ({
      date: d.date,
      "Grievances Logged": d.count
    }));
  }, [complaints]);

  const fetchSchemes = async () => {
    setLoadingSchemes(true);
    try {
      const res = await fetch("/api/schemes");
      const data = await res.json();
      setSchemes(data);
      if (data.length > 0) {
        setSelectedScheme(data[0]);
      }
    } catch (e) {
      console.error("Error fetching schemes:", e);
    } finally {
      setLoadingSchemes(false);
    }
  };

  const fetchComplaints = async () => {
    setLoadingComplaints(true);
    try {
      const res = await fetch("/api/complaints");
      const data = await res.json();
      setComplaints(data);
    } catch (e) {
      console.error("Error fetching complaints:", e);
    } finally {
      setLoadingComplaints(false);
    }
  };

  // Send message to CivicMitra
  const handleSendChat = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    if (!textToSend) {
      setInputText("");
    }

    // Append user message
    const updatedHistory: Message[] = [
      ...chatHistory,
      { role: "user", parts: [{ text: query }] }
    ];
    setChatHistory(updatedHistory);
    setSendingChat(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: updatedHistory })
      });
      const data = await res.json();

      if (data.error) {
        setChatHistory(prev => [
          ...prev,
          {
            role: "model",
            parts: [{ text: `⚠️ **Server Connection Issue**: We encountered an error processing your query. Please check if your Gemini API key is active.\n\n**Next Step**: Please retry sending your query or review your configuration.` }]
          }
        ]);
      } else {
        setChatHistory(prev => [
          ...prev,
          { role: "model", parts: [{ text: data.text }] }
        ]);
        
        // If chat interaction registered a new complaint, reload the list
        if (data.complaint) {
          fetchComplaints();
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      setChatHistory(prev => [
        ...prev,
        {
          role: "model",
          parts: [{ text: `⚠️ **Network Error**: Unable to reach CivicMitra at this moment. Please check your internet connection.\n\n**Next Step**: Retry in a few seconds once connection stabilizes.` }]
        }
      ]);
    } finally {
      setSendingChat(false);
    }
  };

  // Form submit for direct complaints
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccessMessage(null);

    if (!formDescription.trim()) {
      setFormError("Please provide a description of the issue.");
      return;
    }
    if (!formLocation.trim()) {
      setFormError("Please provide the exact location.");
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          description: formDescription,
          location: formLocation,
          reporterName: formReporterName
        })
      });
      const data = await res.json();

      if (res.ok) {
        setFormSuccessMessage({ id: data.id, category: data.category });
        setFormDescription("");
        setFormLocation("");
        setFormReporterName("");
        fetchComplaints(); // reload complaints list
      } else {
        setFormError(data.error || "Failed to submit complaint.");
      }
    } catch (err) {
      setFormError("Connection failed. Please check network.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Switch to chat tab with prefilled scheme question
  const askAboutScheme = (schemeTitle: string) => {
    setActiveTab("chat");
    handleSendChat(`Please explain the requirements and application process for "${schemeTitle}" in detail. Also, simplify any legal or bureaucratic terms.`);
  };

  // Filter schemes
  const filteredSchemes = schemes.filter(s =>
    s.title.toLowerCase().includes(searchSchemeQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchSchemeQuery.toLowerCase()) ||
    s.shortDesc.toLowerCase().includes(searchSchemeQuery.toLowerCase())
  );

  // Look up complaint by ID
  const handleTrackComplaintLookup = () => {
    if (!searchComplaintId.trim()) return;
    const found = complaints.find(
      c => c.id.toUpperCase() === searchComplaintId.toUpperCase().trim()
    );
    if (found) {
      setSelectedComplaint(found);
    } else {
      setSelectedComplaint(null);
      alert(`No complaint found with Tracking ID: ${searchComplaintId}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper function to render markdown simply
  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    let inList = false;
    let listItems: React.ReactNode[] = [];
    const elements: React.ReactNode[] = [];

    const flushList = (key: string) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc pl-5 my-2 space-y-1 text-gray-700 leading-relaxed">
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const lineTrim = line.trim();

      // 1. Detect "Next Step:" Call to Action box
      if (lineTrim.startsWith("Next Step:") || lineTrim.toLowerCase().startsWith("**next step:**") || lineTrim.startsWith("Next Steps:")) {
        flushList(`step-flush-${idx}`);
        const rawContent = line.replace(/Next Step[s]?:\s*/i, "").replace(/\*\*/g, "");
        elements.push(
          <div key={`next-step-${idx}`} className="mt-4 p-4 rounded-xl border border-green-200 bg-emerald-50/70 shadow-sm flex items-start gap-3 animate-pulse-subtle">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-950 font-display">RECOMMENDED NEXT STEP</h4>
              <p className="text-sm text-emerald-800 font-medium mt-0.5">{rawContent}</p>
            </div>
          </div>
        );
        return;
      }

      // 2. Detect bullet points
      if (lineTrim.startsWith("*") || lineTrim.startsWith("-")) {
        inList = true;
        let content = lineTrim.substring(1).trim();
        
        // Parse bold tags within bullet points
        const parsedContent = parseInlineFormatting(content);
        listItems.push(
          <li key={`li-${idx}`} className="text-sm text-gray-700">
            {parsedContent}
          </li>
        );
        return;
      }

      // If we were in a list but current line is not bullet point, flush list
      if (inList && !lineTrim.startsWith("*") && !lineTrim.startsWith("-") && lineTrim !== "") {
        flushList(`flush-${idx}`);
      }

      if (lineTrim === "") {
        return; // ignore empty lines
      }

      // 3. Detect major bold headings like "### Heading" or "**Heading**"
      if (lineTrim.startsWith("###")) {
        const h3Content = lineTrim.replace("###", "").trim().replace(/\*\*/g, "");
        elements.push(
          <h4 key={`h3-${idx}`} className="text-md font-bold text-gray-800 font-display mt-4 mb-2 tracking-tight">
            {h3Content}
          </h4>
        );
      } else if (lineTrim.startsWith("**") && lineTrim.endsWith("**")) {
        const boldHeading = lineTrim.replace(/\*\*/g, "").trim();
        elements.push(
          <h3 key={`h2-${idx}`} className="text-md font-bold text-gray-900 font-display mt-3 mb-1 bg-gray-50 px-2 py-1 rounded inline-block">
            {boldHeading}
          </h3>
        );
      } else {
        // Standard paragraph
        elements.push(
          <p key={`p-${idx}`} className="text-sm text-gray-700 leading-relaxed my-2">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    });

    // Flush any remaining list at the end
    if (inList) {
      flushList(`end-flush`);
    }

    return elements;
  };

  // Process bold blocks e.g. **bold text**
  const parseInlineFormatting = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <strong key={index} className="font-semibold text-gray-900">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-emerald-100 selection:text-emerald-800">
      
      {/* Upper Navigation Banner with Premium SaaS Design */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center transition-all hover:scale-105 duration-300">
              <Building2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold font-display tracking-tight text-white">
                  Civic<span className="text-emerald-400">Ease</span>
                </h1>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                  GENAI CIVIC COMPANION
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Empathetic Governance, Reimagined</p>
            </div>
          </div>

          {/* Navigation and Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Tab Selection */}
            <nav className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === "home"
                    ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Home
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === "chat"
                    ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                CivicMitra Chat
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab("schemes")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === "schemes"
                    ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Jargon-Buster
              </button>
              <button
                onClick={() => setActiveTab("grievances")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === "grievances"
                    ? "bg-slate-900 text-emerald-400 border border-slate-800 shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                File & Track
              </button>
            </nav>

            {/* Glowing AI Voice/Text reporting button */}
            <button
              onClick={() => {
                setVoiceModalSuccess(null);
                setVoiceModalError("");
                setVoiceModalDescription("");
                setVoiceModalLocation("");
                setVoiceModalReporterName("");
                setIsVoiceModalOpen(true);
              }}
              className="relative w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.55)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-emerald-400/20"
            >
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-950"></span>
              </span>
              <Mic className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Report via AI</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        
        <AnimatePresence mode="wait">
          {/* TAB 0: HOME PORTAL HOME DASHBOARD */}
          {activeTab === "home" && (
            <motion.div
              key="home-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-10 py-4"
            >
              {/* ELEGANT TYPOGRAPHIC HERO SECTION WITH EMBEDDED FLOATING OMNIBAR */}
              <div className="relative py-14 px-6 md:px-12 rounded-3xl bg-slate-950 border border-slate-800 text-center overflow-hidden shadow-2xl">
                {/* Subtle cosmic mesh background accents */}
                <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
                
                <div className="relative max-w-3xl mx-auto space-y-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Next-Gen GovTech Platform — CivicEase</span>
                  </div>
                  
                  <h2 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white leading-[1.1]">
                    Simplify Bureaucracy.<br />Navigate Governance with AI.
                  </h2>
                  
                  <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto font-medium">
                    CivicEase translates administrative jargon, streamlines welfare access, and registers local community complaints instantly in your own language.
                  </p>

                  {/* EMBEDDED FLOATING OMNIBAR SEARCH/CHAT */}
                  <div className="pt-4 max-w-2xl mx-auto">
                    <form onSubmit={handleOmnibarSubmit} className="relative flex items-center p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.6)] focus-within:border-emerald-500/80 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300">
                      <div className="flex items-center pl-3.5 text-slate-400 shrink-0 select-none">
                        <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                      </div>
                      
                      <input
                        type="text"
                        value={omnibarText}
                        onChange={(e) => setOmnibarText(e.target.value)}
                        placeholder="Ask about welfare schemes, pre-screen files, or type tracking IDs..."
                        className="w-full pl-3 pr-24 py-2.5 bg-transparent border-0 text-white placeholder-slate-500 focus:outline-none focus:ring-0 text-sm font-semibold"
                      />

                      <div className="absolute right-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setVoiceModalSuccess(null);
                            setVoiceModalError("");
                            setVoiceModalDescription("");
                            setVoiceModalLocation("");
                            setVoiceModalReporterName("");
                            setIsVoiceModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Speak Query"
                        >
                          <Mic className="w-4 h-4" />
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md"
                        >
                          <span>Ask AI</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    </form>

                    {/* Popular search terms / Suggestion chips */}
                    <div className="mt-4 flex flex-wrap justify-center items-center gap-2 text-slate-400 text-xs">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Try asking:</span>
                      <button
                        type="button"
                        onClick={() => setOmnibarText("How do I apply for the National Ration Card welfare scheme?")}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
                      >
                        Apply for Ration Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setOmnibarText("Report a deep pothole and street light malfunction on Indiranagar 5th Cross.")}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
                      >
                        Report Indiranagar Pothole
                      </button>
                      <button
                        type="button"
                        onClick={() => setOmnibarText("Check status of complaint CE-209485")}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg hover:text-white transition-colors cursor-pointer text-[11px] font-semibold"
                      >
                        Track CE-209485
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CORE SERVICES GRID: Minimalist micro-cards with glassmorphism */}
              <div className="space-y-4">
                <div className="flex items-end justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="text-base font-extrabold font-display text-slate-900 tracking-tight">Core Services Directory</h3>
                    <p className="text-xs text-slate-500 font-medium">Instantly launch services or translate civic actions using GenAI</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/50 uppercase tracking-wider">
                    6 Categories
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Category 1: Government */}
                  <div
                    onClick={() => {
                      setActiveTab("schemes");
                      setSearchSchemeQuery("");
                    }}
                    className="group relative p-5 bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                        <Building2 className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 font-display group-hover:text-emerald-700 transition-colors">Government Services</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Welfare schemes, official certifications & credentials</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <span>Explore 4 Welfare Schemes</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Category 2: Jobs */}
                  <div
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendChat("Show me available government jobs, employment exchanges, and youth skill development programs.");
                    }}
                    className="group relative p-5 bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                        <Briefcase className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 font-display group-hover:text-emerald-700 transition-colors">Jobs & Employment</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Employment registries, technical skills, and training</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <span>Inquire Job Registries</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Category 3: Business */}
                  <div
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendChat("How can I register a local small business? Show me requirements for commercial licenses & permits.");
                    }}
                    className="group relative p-5 bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                        <TrendingUp className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 font-display group-hover:text-emerald-700 transition-colors">Business Licenses</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Commercial permits, registrations, small business aid</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <span>Ask Commercial Permits</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Category 4: Roads */}
                  <div
                    onClick={() => {
                      setActiveTab("grievances");
                    }}
                    className="group relative p-5 bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                        <Map className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 font-display group-hover:text-emerald-700 transition-colors">Roads & Repairs</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Potholes, non-working streetlights, waste dumps</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <span>File Repair Request</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Category 5: Culture */}
                  <div
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendChat("Tell me about community libraries, cultural events, and heritage sites managed by the municipal corporation.");
                    }}
                    className="group relative p-5 bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                        <BookOpen className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 font-display group-hover:text-emerald-700 transition-colors">Culture & Tourism</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Municipal libraries, public parks, community heritage</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <span>Explore Public Culture</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Category 6: Justice */}
                  <div
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendChat("How can I find legal aid programs or get in contact with consumer grievance courts?");
                    }}
                    className="group relative p-5 bg-white border border-slate-200 hover:border-emerald-500/40 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:bg-emerald-500/10 transition-all duration-300" />
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all duration-300">
                        <Scale className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 font-display group-hover:text-emerald-700 transition-colors">Justice & Legal Aid</h4>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Consumer forums, civic legal aids, public grievance desks</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <span>Inquire Legal Desks</span>
                      <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* DYNAMIC FEEDS: Personalized recommendations powered by AI companion */}
              <div className="space-y-4">
                <div className="flex items-end justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="text-base font-extrabold font-display text-slate-900 tracking-tight">CivicMitra Recommendation Feed</h3>
                    <p className="text-xs text-slate-500 font-medium">Real-time alerts, dynamic widgets, and smart shortcuts tailored for you</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200/50 uppercase tracking-wider animate-pulse">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    AI Feed Active
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Feed item 1: Welfare scheme shortcut */}
                  <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between h-[210px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-sans">
                          Welfare Access
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Popular</span>
                      </div>
                      <h4 className="text-sm font-bold font-display line-clamp-2">Simplify Welfare: Translate Ayushman Bharat Medical Card Requirements</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">Get up to ₹5 Lakhs free hospitalization cover. Tap to translate bureaucratic jargon into plain spoken local dialect.</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("schemes");
                        // Scroll down slightly to select SCH-002
                        setTimeout(() => {
                          const trigger = document.querySelector('[title*="Ayushman"]');
                          if (trigger) {
                            (trigger as HTMLElement).click();
                          }
                        }, 200);
                      }}
                      className="mt-3 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer self-start transition-colors"
                    >
                      <span>Translate with Jargon-Buster</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Feed item 2: Pre-screener shortcut */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between h-[210px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-sans">
                          Document Pre-Screener
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-sans">Instant Verification</span>
                      </div>
                      <h4 className="text-sm font-bold font-display text-slate-805 line-clamp-2">Prevent Application Rejection: Cross-Check Certificates</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">Upload any PDF/JPG affidavit or income certificate. Gemini will match names, identify spelling discrepancies, and check expiry status before submission.</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("schemes");
                        setTimeout(() => {
                          const scannerElement = document.getElementById("document-scanner-card");
                          if (scannerElement) {
                            scannerElement.scrollIntoView({ behavior: "smooth" });
                          }
                        }, 300);
                      }}
                      className="mt-3 text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer self-start transition-colors"
                    >
                      <span>Upload & Verify Document</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Feed item 3: Resolution timeline stream */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between h-[210px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 font-sans">
                          Community Resolution
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono">CE-209485</span>
                      </div>
                      <h4 className="text-sm font-bold font-display text-slate-805 line-clamp-2">Locality Updates: Garbage Pile Cleared at Central Park Gate</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">Ward 14 Sanitation crew verified the garbage dump reported via voice and completed clearance. Tap to inspect the verified ticket status.</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("grievances");
                        setSearchComplaintId("CE-209485");
                        const found = complaints.find(c => c.id === "CE-209485");
                        if (found) {
                          setSelectedComplaint(found);
                        }
                      }}
                      className="mt-3 text-xs font-bold text-slate-700 hover:text-emerald-600 flex items-center gap-1 cursor-pointer self-start transition-colors"
                    >
                      <span>Inspect Resolution Notes</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Feed item 4: Spatial hotspot alerts */}
                  <div className="bg-rose-50/40 rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between h-[210px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200 font-sans">
                          Safety Alert
                        </span>
                        <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1 font-sans">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                          </span>
                          Critical
                        </span>
                      </div>
                      <h4 className="text-sm font-bold font-display text-slate-805 line-clamp-2">Streetlight Blackout: Indiranagar Ward 14 Bypass</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">8 citizens have filed reports of non-functional sodium lamps. Ward Officer notes confirm dispatch scheduled. Tap to check emergency reports.</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("grievances");
                        setSearchComplaintId("CE-108253");
                        const found = complaints.find(c => c.id === "CE-108253");
                        if (found) {
                          setSelectedComplaint(found);
                        }
                      }}
                      className="mt-3 text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer self-start transition-colors"
                    >
                      <span>Track Streetlight Outage</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Feed item 5: Quick voice dictate card */}
                  <div className="bg-emerald-50/40 rounded-2xl p-5 border border-emerald-100 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between h-[210px]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-sans">
                          Accessibility Voice
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-sans">Multilingual</span>
                      </div>
                      <h4 className="text-sm font-bold font-display text-slate-805 line-clamp-2">Hindi / English Dictation: Cannot Type easily? Speak Out!</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">Use our high-precision Web Speech API. Just speak your public issue in Hindi or English, and we will formulate the ticket description for you.</p>
                    </div>
                    <button
                      onClick={() => {
                        setVoiceModalSuccess(null);
                        setVoiceModalError("");
                        setVoiceModalDescription("");
                        setVoiceModalLocation("");
                        setVoiceModalReporterName("");
                        setIsVoiceModalOpen(true);
                      }}
                      className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer self-start transition-colors"
                    >
                      <span>Launch Mic Dictator</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Feed item 6: Citizen feedback / trust banner */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between h-[210px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-full blur-xl pointer-events-none" />
                    <div className="space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold tracking-wider uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-sans">
                          Secure Platform
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold font-sans font-medium">Trust Guard</span>
                      </div>
                      <h4 className="text-sm font-bold font-display text-slate-805 line-clamp-2">Transparent Governance & Real-time Tracking</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">Every ticket filed triggers active SMS tracking, Ward Officer assigned logs, and visual timeline progress, backed by automated anti-spam analysis.</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab("grievances");
                      }}
                      className="mt-3 text-xs font-bold text-slate-700 hover:text-emerald-600 flex items-center gap-1 cursor-pointer self-start transition-colors"
                    >
                      <span>Explore Active Grievances</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 1: CIVIC MITRA GENAI CHAT */}
          {activeTab === "chat" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] min-h-[500px]"
            >
              {/* Left sidebar: Helpful Guidelines & Info */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 mb-3 text-emerald-700">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold font-display text-sm tracking-tight">Meet CivicMitra</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    CivicMitra is your personal GenAI concierge. Speak naturally. We automatically simplify legal requirements, write formal briefs, and submit public works repair orders.
                  </p>
                  
                  <div className="border-t border-slate-100 my-4 pt-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <Languages className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Supports 10+ regional languages</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Registers live grievance tickets</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Explains complex documents</span>
                    </div>
                  </div>
                </div>

                {/* Local Statistics Panel */}
                <div className="bg-emerald-950 text-emerald-100 p-5 rounded-2xl shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-display">PORTAL ACTIVITY MONITOR</h4>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-2xl font-extrabold font-mono text-white">{complaints.length}</p>
                      <p className="text-[10px] text-emerald-300 font-medium uppercase mt-1">Total Grievances</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold font-mono text-white">
                        {complaints.filter(c => c.status === "Resolved").length}
                      </p>
                      <p className="text-[10px] text-emerald-300 font-medium uppercase mt-1">Grievances Resolved</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-emerald-800/60 text-[10px] text-emerald-300 flex items-center justify-between">
                    <span>Ward No. 14 Corporation Desk</span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></span> Live Sync
                    </span>
                  </div>
                </div>


              </div>

              {/* Chat Window Frame */}
              <div className="lg:col-span-3 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden h-full">
                
                {/* Chat Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-display font-bold">
                      CM
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                        CivicMitra
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-sans">GenAI Companion</span>
                      </h2>
                      <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online & Listening
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (confirm("Reset conversation?")) {
                          setChatHistory([chatHistory[0]]);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-all text-xs flex items-center gap-1.5 font-medium"
                      title="Clear Chat History"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset Chat
                    </button>
                  </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/45">
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-4 shadow-xs border ${
                          msg.role === "user"
                            ? "bg-slate-900 text-slate-100 rounded-tr-none border-slate-800"
                            : "bg-white text-slate-800 rounded-tl-none border-slate-100"
                        }`}
                      >
                        {/* Role Indicator Header */}
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100/10">
                          {msg.role === "user" ? (
                            <>
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-300 tracking-wider">CITIZEN QUERY</span>
                            </>
                          ) : (
                            <>
                              <Smile className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-[10px] font-bold text-emerald-700 tracking-wider">CIVICMITRA COMPANION</span>
                            </>
                          )}
                        </div>

                        {/* Text Output Render */}
                        <div className="space-y-1">
                          {msg.role === "user" ? (
                            <p className="text-sm font-medium whitespace-pre-wrap">{msg.parts[0].text}</p>
                          ) : (
                            renderFormattedText(msg.parts[0].text)
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {sendingChat && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-xs max-w-[80%] flex items-center gap-3">
                        <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                        <span className="text-xs text-slate-500 font-medium">CivicMitra is analyzing requirements and simplifying jargon...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Prompt Starters */}
                <div className="bg-slate-50 p-3 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Suggested Prompts:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSendChat("How do I apply for an Income Certificate? Explain simply.")}
                      className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-xl text-slate-600 font-medium transition-all duration-150 shadow-2xs cursor-pointer"
                    >
                      📄 Apply Income Certificate
                    </button>
                    <button
                      onClick={() => handleSendChat("राशन कार्ड बनवाने के लिए क्या नियम हैं और कौन से दस्तावेज़ लगेंगे?")}
                      className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-xl text-slate-600 font-medium transition-all duration-150 shadow-2xs cursor-pointer"
                    >
                      🌾 राशन कार्ड दस्तावेज़
                    </button>
                    <button
                      onClick={() => handleSendChat("I want to register a complaint about street lights not working in Sector 4 Near Central Library.")}
                      className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-xl text-slate-600 font-medium transition-all duration-150 shadow-2xs cursor-pointer"
                    >
                      💡 Broken Street Light
                    </button>
                    <button
                      onClick={() => handleSendChat("Check status of complaint CE-209485.")}
                      className="text-xs bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-3 py-1.5 rounded-xl text-slate-600 font-medium transition-all duration-150 shadow-2xs cursor-pointer"
                    >
                      🔍 Track CE-209485
                    </button>
                  </div>
                </div>

                {/* Chat Input Area */}
                <div className="p-4 bg-white border-t border-slate-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChat();
                        }
                      }}
                      placeholder="Ask CivicMitra in Hindi, English, Tamil, Hinglish (e.g. Broken road repair...)"
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm placeholder-slate-400 font-medium"
                    />
                    <button
                      onClick={() => handleSendChat()}
                      disabled={sendingChat || !inputText.trim()}
                      className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span>Send</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 2: SCHEME JARGON-BUSTER DIRECTORY */}
        <AnimatePresence mode="wait">
          {activeTab === "schemes" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              
              {/* Left Column: List of common schemes */}
              <div className="md:col-span-1 flex flex-col gap-4">
                
                {/* Search Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block font-display">
                    FILTER SCHEMES & PROGRAMS
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchSchemeQuery}
                      onChange={(e) => setSearchSchemeQuery(e.target.value)}
                      placeholder="Search schemes (e.g., kisan, ration)..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-400 font-medium"
                    />
                  </div>
                </div>

                {/* Schemes Cards Stack */}
                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {loadingSchemes ? (
                    <div className="flex items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    </div>
                  ) : filteredSchemes.length === 0 ? (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs">
                      No matching schemes found.
                    </div>
                  ) : (
                    filteredSchemes.map((scheme) => (
                      <button
                        key={scheme.id}
                        onClick={() => setSelectedScheme(scheme)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          selectedScheme?.id === scheme.id
                            ? "bg-emerald-50 border-emerald-300 shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-white border border-slate-200 text-slate-600 tracking-wider">
                            {scheme.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-2 font-display">
                          {scheme.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {scheme.shortDesc}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold mt-3">
                          <span>View simplified breakdown</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Interactive Details Pane */}
              <div className="md:col-span-2">
                {selectedScheme ? (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                    
                    {/* Header Details */}
                    <div className="bg-emerald-50 p-6 border-b border-emerald-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-xs font-bold text-emerald-800 tracking-wider uppercase bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          {selectedScheme.category}
                        </span>
                        <h2 className="text-xl font-extrabold text-slate-900 font-display mt-2 tracking-tight">
                          {selectedScheme.title}
                        </h2>
                        <p className="text-xs text-slate-600 mt-1">
                          {selectedScheme.shortDesc}
                        </p>
                      </div>

                      <button
                        onClick={() => askAboutScheme(selectedScheme.title)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        Ask CivicMitra about this
                      </button>
                    </div>

                    {/* Jargon Buster Section */}
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2 text-slate-800 mb-3 font-semibold">
                        <Languages className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-display">
                          JARGON BUSTER (नौकरशाही शब्दकोश)
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(selectedScheme.jargonBuster).map(([term, definition], i) => (
                          <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                            <h5 className="text-xs font-bold text-slate-900 font-display border-b border-slate-100 pb-1 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                              {term}
                            </h5>
                            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed font-medium">
                              {definition}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simplified Requirements Checklist */}
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-slate-800 mb-4 font-semibold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 font-display">
                          REQUIRED DOCUMENTS CHECKLIST
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedScheme.checklist.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/25"
                          >
                            <div className="p-1 rounded-full bg-emerald-50 text-emerald-600 shrink-0 mt-0.5 border border-emerald-200">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-semibold text-slate-700 leading-relaxed">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Section */}
                    <div className="mx-6 mb-4 p-4 rounded-xl border border-green-200 bg-emerald-50 flex items-start gap-3 shadow-xs">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-950 tracking-wider font-display uppercase">RECOMMENDED NEXT STEP</h4>
                        <p className="text-xs text-emerald-800 font-medium mt-0.5">{selectedScheme.nextSteps}</p>
                      </div>
                    </div>

                    {/* AI Document Pre-screener (Vision AI) */}
                    <div className="mx-6 mb-6 p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
                          <h3 className="font-bold text-slate-900 font-display text-xs uppercase tracking-wider">
                            AI DOCUMENT PRE-SCREENER
                          </h3>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded font-bold uppercase border border-slate-300">
                          Vision AI (OCR)
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        Prevent government rejection! Pre-screen your documents (Aadhaar, Income Certificate, etc.) instantly. We verify spelling consistency, image clarity, and expiration dates.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Document Type</label>
                          <select
                            value={prescreenerDocType}
                            onChange={(e) => {
                              setPrescreenerDocType(e.target.value);
                              setPrescreenerResult(null);
                              setPrescreenerImage(null);
                              setPrescreenerImageName(null);
                            }}
                            className="w-full text-xs px-3 py-2 border border-slate-300 bg-white rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold"
                          >
                            <option value="Aadhaar Card">Aadhaar Card (Identity Proof)</option>
                            <option value="Income Certificate">Income Certificate (आय प्रमाण पत्र)</option>
                            <option value="Ration Card">Ration Card (राशन कार्ड)</option>
                            <option value="PAN Card">PAN Card (Tax ID)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Applicant Name to Match</label>
                          <input
                            type="text"
                            value={prescreenerApplicantName}
                            onChange={(e) => {
                              setPrescreenerApplicantName(e.target.value);
                              if (prescreenerResult) setPrescreenerResult(null);
                            }}
                            placeholder="e.g. Rajesh Kumar"
                            className="w-full px-3 py-2 text-xs border border-slate-300 bg-white rounded-xl focus:outline-hidden focus:border-emerald-500 font-semibold"
                          />
                        </div>
                      </div>

                      {!prescreenerImage ? (
                        <div 
                          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer transition-all bg-white hover:bg-emerald-50/20"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files?.[0]) {
                              handlePrescreenerImageChange(e.dataTransfer.files[0]);
                            }
                          }}
                          onClick={() => {
                            if (!prescreenerApplicantName.trim()) {
                              alert("Please fill in the Applicant Name to Match first so we can verify name consistency.");
                              return;
                            }
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e: any) => {
                              if (e.target.files?.[0]) {
                                handlePrescreenerImageChange(e.target.files[0]);
                              }
                            };
                            input.click();
                          }}
                        >
                          <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                          <span className="text-xs font-bold text-slate-700 block">Drag & drop document image</span>
                          <span className="text-[10px] text-slate-400 font-medium">or click to browse from device</span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0 font-sans">
                              <span className="text-xs font-bold text-slate-800 block truncate">{prescreenerImageName}</span>
                              <span className="text-[9px] text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{prescreenerDocType}</span>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                setPrescreenerImage(null);
                                setPrescreenerImageName(null);
                                setPrescreenerResult(null);
                              }}
                              className="text-xs font-bold text-red-600 hover:text-red-800 underline cursor-pointer px-2"
                            >
                              Reset
                            </button>
                          </div>

                          {verifyingPrescreener && (
                            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50 text-blue-950 text-xs font-medium flex items-center gap-3">
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                              <div className="space-y-0.5">
                                <span className="font-bold font-sans">Running OCR & Cross-Verification...</span>
                                <p className="text-[10px] text-blue-700 leading-tight">Gemini is extracting document details, auditing visual clarity, and verifying name alignment.</p>
                              </div>
                            </div>
                          )}

                          {prescreenerResult && (
                            <div className={`p-4 rounded-xl border ${
                              prescreenerResult.isValid && prescreenerResult.matchedName
                                ? "border-emerald-200 bg-emerald-50/50 text-emerald-950" 
                                : "border-amber-200 bg-amber-50/60 text-amber-950"
                            } space-y-4`}>
                              <div className="flex items-center gap-2 font-semibold">
                                {prescreenerResult.isValid && prescreenerResult.matchedName ? (
                                  <>
                                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                                    <span className="text-emerald-950 text-xs font-bold font-sans">Document Verified successfully!</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                                    <span className="text-amber-950 text-xs font-bold font-sans">Verification Alert: Review Needed</span>
                                  </>
                                )}
                              </div>

                              {/* Key statistics metrics */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Confidence Level</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-mono font-bold text-slate-800">{prescreenerResult.confidenceScore}%</span>
                                    <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-emerald-500 h-full rounded-full" 
                                        style={{ width: `${prescreenerResult.confidenceScore}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs">
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Name Consistency</span>
                                  <span className={`text-[10px] font-bold block mt-1 ${
                                    prescreenerResult.matchedName ? "text-emerald-700" : "text-amber-600"
                                  }`}>
                                    {prescreenerResult.matchedName ? "Perfect Match" : "Mismatch / Partial"}
                                  </span>
                                </div>
                              </div>

                              {/* Technical details table */}
                              <div className="bg-white rounded-lg border border-slate-100 divide-y divide-slate-100 shadow-2xs font-mono text-[10px] text-slate-700">
                                <div className="p-2 flex justify-between items-center gap-2">
                                  <span className="text-slate-400">Extracted Name:</span>
                                  <span className="font-bold text-slate-900">{prescreenerResult.nameOnDocument || "N/A"}</span>
                                </div>
                                <div className="p-2 flex justify-between items-center gap-2">
                                  <span className="text-slate-400">Card/Document ID:</span>
                                  <span className="font-bold text-slate-900">{prescreenerResult.documentNumber || "N/A"}</span>
                                </div>
                                <div className="p-2 flex justify-between items-center gap-2">
                                  <span className="text-slate-400">Expiration Check:</span>
                                  <span className={`font-bold ${prescreenerResult.isExpired ? "text-red-600 animate-pulse" : "text-emerald-700"}`}>
                                    {prescreenerResult.isExpired ? "EXPIRED" : (prescreenerResult.expiryDate ? `Active (Expires: ${prescreenerResult.expiryDate})` : "No Expiry Limit")}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-700 font-medium leading-relaxed italic bg-white/70 p-3 rounded-lg border border-slate-100">
                                "{prescreenerResult.feedback}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
                    Please select a scheme on the left to inspect its jargon-buster checklist.
                  </div>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 3: TRACK & FILE COMPLAINT */}
        <AnimatePresence mode="wait">
          {activeTab === "grievances" && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              
              {/* Neighborhood Insights: Trend Chart & Spatial Map */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* 1. Complaints Trend Analysis Panel (Recharts Line Chart) */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </span>
                          Locality Grievances Trend (Past 30 Days)
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">
                          Visualizing reported public complaints over the last 30 days to give citizens visibility.
                        </p>
                      </div>
                    </div>

                    {/* Recharts Line Chart */}
                    <div className="h-[210px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={complaintsTrendData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderRadius: '12px',
                              color: '#f8fafc',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              padding: '10px 14px',
                              boxShadow: '0 4px 12px -1px rgb(0 0 0 / 0.15)'
                            }}
                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Grievances Logged" 
                            stroke="#059669" 
                            strokeWidth={3} 
                            dot={{ r: 3, stroke: '#059669', strokeWidth: 1.5, fill: '#ffffff' }}
                            activeDot={{ r: 5, strokeWidth: 0, fill: '#059669' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Micro Legend/Stats */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                      Complaints Trend
                    </span>
                    <span className="flex items-center gap-1 border border-slate-100 bg-slate-50 px-2.5 py-0.5 rounded-lg text-[10px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Sync Active
                    </span>
                  </div>
                </div>

                {/* 2. Interactive Spatial Hotspot Map (Vision Spatial Hub) */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-xs p-6 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-display flex items-center gap-2">
                          <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                            <Map className="w-4 h-4" />
                          </span>
                          Locality Hotspot Map (वार्ड समस्या मानचित्र)
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1 font-medium leading-tight">
                          Real-time spatial visualization of registered grievances. Click a pin to track or search details.
                        </p>
                      </div>

                      {/* Map Filter Dropdown/Pills */}
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl font-sans shrink-0">
                        {["All", "Street Lights", "Waste Management", "Water & Sanitation"].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setMapCategoryFilter(cat);
                              setSelectedMapPinId(null);
                            }}
                            className={`px-2 py-1 rounded-lg text-[9px] font-extrabold uppercase transition-all cursor-pointer ${
                              mapCategoryFilter === cat
                                ? "bg-white text-slate-900 shadow-2xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {cat === "All" ? "ALL" : cat.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Styled Map Container */}
                    <div className="relative w-full h-[220px] rounded-xl overflow-hidden border border-slate-200 bg-slate-50/50 shadow-inner select-none font-sans">
                      
                      {/* Styled Grid / Blueprint Vector Layout (Map Background) */}
                      <svg className="absolute inset-0 w-full h-full text-slate-300 opacity-60" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {/* Styled Roads */}
                        {/* MG Road (Horizontal West-East) */}
                        <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                        <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="#f1f5f9" strokeWidth="8" strokeDasharray="5 5" strokeLinecap="round" />
                        
                        {/* Sector 11 Bypass (Vertical North-South) */}
                        <line x1="75%" y1="0%" x2="75%" y2="100%" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
                        <line x1="75%" y1="0%" x2="75%" y2="100%" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />

                        {/* Indiranagar 5th Cross (Diagonal Link) */}
                        <line x1="0%" y1="85%" x2="45%" y2="50%" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
                        <line x1="0%" y1="85%" x2="45%" y2="50%" stroke="#f1f5f9" strokeWidth="6" strokeLinecap="round" />

                        {/* Outer Expressway (Diagonal Bypass) */}
                        <line x1="50%" y1="100%" x2="100%" y2="60%" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
                        
                        {/* Landmarks Fills */}
                        {/* Central Park Area */}
                        <rect x="70%" y="20%" width="20%" height="25%" rx="8" fill="#f0fdf4" stroke="#dcfce7" strokeWidth="1.5" />
                        
                        {/* Civil Plaza Core */}
                        <circle cx="48%" cy="46%" r="22" fill="#eff6ff" stroke="#dbeafe" strokeWidth="1.5" />
                        <circle cx="48%" cy="46%" r="14" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                        
                        {/* Metro Line representation */}
                        <path d="M 0,72 Q 40,72 80,100" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="4 4" />

                        {/* Grid Labels/Regions in low-opacity */}
                        <text x="25%" y="15%" fill="#94a3b8" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1" className="uppercase select-none">Ward 4 Residential</text>
                        <text x="80%" y="42%" fill="#22c55e" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1" className="uppercase select-none">Central Park</text>
                        <text x="50%" y="54%" fill="#3b82f6" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1" className="uppercase select-none">Civic Plaza</text>
                        <text x="20%" y="90%" fill="#94a3b8" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1" className="uppercase select-none">Indiranagar Ward</text>
                        <text x="85%" y="92%" fill="#94a3b8" fontSize="8" fontWeight="800" textAnchor="middle" letterSpacing="1" className="uppercase select-none">Bypass Exp</text>
                        
                        {/* Street Label overlays */}
                        <text x="15%" y="27%" fill="#64748b" fontSize="7" fontWeight="bold">M.G. Road</text>
                        <text x="71%" y="85%" fill="#64748b" fontSize="7" fontWeight="bold" transform="rotate(90, 71, 85)">Sector 11 Bypass</text>
                      </svg>

                      {/* Compass widget in bottom corner */}
                      <div className="absolute top-2.5 left-2.5 bg-white/90 border border-slate-200/50 p-1.5 rounded-lg shadow-2xs flex items-center gap-1.5 pointer-events-none backdrop-blur-xs select-none">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[8px] font-extrabold text-slate-600 font-sans tracking-wide">VECTOR HUD ACTIVE</span>
                      </div>

                      {/* Compass overlay bottom right */}
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 text-[8px] font-bold text-slate-400 select-none bg-white/40 px-1.5 py-0.5 rounded backdrop-blur-xs">
                        <span>W 4, 11 & INDIRANAGAR</span>
                      </div>

                      {/* Map Pins overlay */}
                      {(() => {
                        const filtered = complaints.filter(
                          (comp) => mapCategoryFilter === "All" || comp.category === mapCategoryFilter
                        );

                        if (filtered.length === 0) {
                          return (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-xs p-4 text-center">
                              <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
                                No active complaints registered in category: "{mapCategoryFilter}"
                              </span>
                            </div>
                          );
                        }

                        return filtered.map((comp) => {
                          const { x, y } = getComplaintCoordinates(comp.id, comp.category);
                          const isSelected = selectedMapPinId === comp.id;
                          const isHovered = hoveredMapPinId === comp.id;
                          
                          // Custom colors based on status/category
                          let pinColorClass = "bg-amber-500 border-amber-300 text-amber-900";
                          let ringColorClass = "bg-amber-500";
                          if (comp.status === "Resolved") {
                            pinColorClass = "bg-emerald-500 border-emerald-300 text-white";
                            ringColorClass = "bg-emerald-500";
                          } else if (comp.status === "In Progress") {
                            pinColorClass = "bg-indigo-500 border-indigo-300 text-white";
                            ringColorClass = "bg-indigo-500";
                          } else if (comp.category === "Roads") {
                            pinColorClass = "bg-rose-500 border-rose-300 text-white";
                            ringColorClass = "bg-rose-500";
                          }

                          return (
                            <div
                              key={comp.id}
                              style={{ left: `${x}%`, top: `${y}%` }}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
                                isSelected || isHovered ? "z-30 scale-125" : "z-10"
                              }`}
                              onMouseEnter={() => setHoveredMapPinId(comp.id)}
                              onMouseLeave={() => setHoveredMapPinId(null)}
                              onClick={() => {
                                setSelectedMapPinId(isSelected ? null : comp.id);
                                setSearchComplaintId(comp.id);
                              }}
                            >
                              {/* Pulse Effect */}
                              <span className={`absolute -inset-2.5 rounded-full animate-ping opacity-25 ${ringColorClass}`} />
                              
                              {/* Standard Map Pin Wrapper */}
                              <div className={`p-1.5 rounded-full shadow-md border-2 transition-all duration-200 ${
                                isSelected 
                                  ? "bg-slate-900 border-white text-emerald-400 scale-125 ring-2 ring-emerald-500 ring-offset-1" 
                                  : isHovered
                                  ? "bg-slate-800 border-white text-emerald-300 scale-110"
                                  : pinColorClass
                              }`}>
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {/* Absolute Details Tooltip Panel inside the map box */}
                      <AnimatePresence>
                        {(selectedMapPinId || hoveredMapPinId) && (() => {
                          const activeComp = complaints.find(
                            (c) => c.id === (selectedMapPinId || hoveredMapPinId)
                          );
                          if (!activeComp) return null;
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-2.5 left-2.5 right-2.5 bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 shadow-xl z-40 backdrop-blur-md bg-opacity-95 font-sans flex flex-col gap-1.5"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                      {activeComp.category}
                                    </span>
                                    <span className="text-[8px] bg-slate-800 text-slate-300 font-mono px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                      {activeComp.id}
                                    </span>
                                  </div>
                                  <h4 className="text-[11px] font-bold text-slate-100 mt-0.5 truncate max-w-[180px]">
                                    {activeComp.location}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    activeComp.status === "Resolved" 
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                      : activeComp.status === "In Progress" 
                                      ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
                                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  }`}>
                                    {activeComp.status}
                                  </span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMapPinId(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-200 cursor-pointer p-0.5 rounded-full hover:bg-slate-850"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-[10px] text-slate-300 line-clamp-1 leading-normal italic font-medium">
                                "{activeComp.description}"
                              </p>

                              <div className="flex justify-between items-center text-[8px] border-t border-slate-900 pt-1.5 mt-0.5 font-bold text-slate-400 uppercase tracking-wider">
                                <span className="truncate max-w-[150px]">
                                  Filed by: <strong className="text-slate-200">{activeComp.reporterName || "Anonymous"}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchComplaintId(activeComp.id);
                                    setSelectedComplaint(activeComp);
                                    // Scroll to the detail lookup card if present
                                    const lookupElement = document.getElementById("grievance-search-result");
                                    if (lookupElement) {
                                      lookupElement.scrollIntoView({ behavior: "smooth" });
                                    }
                                  }}
                                  className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer flex items-center gap-0.5"
                                >
                                  Open Tracker
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Map Hotspot status summary */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] font-extrabold text-slate-400 font-sans tracking-widest uppercase">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                      Roads / Lights
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                      Waste Pile
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      Water Leak
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Resolved
                    </span>
                  </div>
                </div>

              </div>

              {/* Grid content columns for file and locality stream */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form & Search Section */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* 1. Track Complaint Lookup Box */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center gap-2 text-slate-800 mb-3">
                    <Search className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold font-display text-sm uppercase tracking-tight">TRACK AN EXISTING GRIEVANCE</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    Have a code like **CE-209485**? Enter it below to check your municipal tracking status instantly.
                  </p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchComplaintId}
                      onChange={(e) => setSearchComplaintId(e.target.value)}
                      placeholder="e.g., CE-209485"
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 uppercase font-mono tracking-wider"
                    />
                    <button
                      onClick={handleTrackComplaintLookup}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs shrink-0 cursor-pointer"
                    >
                      Lookup
                    </button>
                  </div>
                </div>

                {/* 2. File Complaint Direct Form */}
                <div id="grievance-form-container" className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs scroll-mt-6">
                  <div className="flex items-center gap-2 text-slate-800 mb-4">
                    <PlusCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold font-display text-sm uppercase tracking-tight">FILE A NEW GRIEVANCE</h3>
                  </div>

                  {formSuccessMessage && (
                    <div className="mb-4 p-4 rounded-xl border border-green-200 bg-emerald-50 text-emerald-800 text-xs">
                      <div className="flex items-center gap-2 mb-1.5 font-bold text-emerald-950">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Grievance Lodged Successfully!
                      </div>
                      <p className="font-medium text-emerald-900">Your complaint has been assigned to Ward 14.</p>
                      <div className="mt-3 flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-green-200/50">
                        <span className="font-mono font-bold text-sm tracking-widest">{formSuccessMessage.id}</span>
                        <button 
                          onClick={() => copyToClipboard(formSuccessMessage.id)}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                        >
                          {copiedId === formSuccessMessage.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          Copy Code
                        </button>
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      {formError}
                    </div>
                  )}

                  {showTemplateFeedback && (
                    <div className="mb-4 p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold flex items-start justify-between gap-3 animate-pulse-subtle">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 animate-bounce mt-0.5" />
                        <div>
                          <span className="font-bold">"{loadedTemplateLabel}" Template Loaded!</span>
                          <p className="text-[10px] text-amber-700 font-medium mt-0.5 leading-relaxed">
                            Please review the auto-filled category and description details, complete the **Exact Location / Landmark** field below, and click submit.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTemplateFeedback(false)}
                        className="text-amber-500 hover:text-amber-800 p-0.5 rounded-full hover:bg-amber-100 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500"
                      >
                        <option value="Roads">Roads & Potholes</option>
                        <option value="Street Lights">Street Lights & Electricity</option>
                        <option value="Waste Management">Waste Management & Dumping</option>
                        <option value="Water & Sanitation">Water & Sanitation Leakage</option>
                        <option value="Public Health">Public Health & Pest Control</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Exact Location / Landmark</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          placeholder="e.g., Ward 14, Pillar 10 MG Road"
                          className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Explain the issue</label>
                        
                        {/* Voice Dictation Tools */}
                        <div className="flex items-center gap-2">
                          {/* Language selector toggle */}
                          <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200/60 p-0.5 rounded-lg select-none">
                            <button
                              type="button"
                              onClick={() => setSpeechLanguage("en-IN")}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all cursor-pointer ${
                                speechLanguage === "en-IN"
                                  ? "bg-white text-slate-900 shadow-2xs"
                                  : "text-slate-500 hover:text-slate-850"
                              }`}
                              title="Dictate in English (India)"
                            >
                              EN
                            </button>
                            <button
                              type="button"
                              onClick={() => setSpeechLanguage("hi-IN")}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold transition-all cursor-pointer ${
                                speechLanguage === "hi-IN"
                                  ? "bg-white text-slate-900 shadow-2xs"
                                  : "text-slate-500 hover:text-slate-850"
                              }`}
                              title="हिंदी में बोलें (Hindi)"
                            >
                              हिंदी
                            </button>
                          </div>

                          {/* Mic Toggle Button */}
                          <button
                            type="button"
                            onClick={handleToggleListening}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                              isListening
                                ? "bg-red-500 text-white animate-pulse shadow-xs hover:bg-red-600 border border-red-400"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50"
                            }`}
                          >
                            {isListening ? (
                              <>
                                <MicOff className="w-3 h-3 animate-bounce" />
                                <span>Listening...</span>
                              </>
                            ) : (
                              <>
                                <Mic className="w-3 h-3 text-emerald-600" />
                                <span>Dictate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          required
                          rows={3}
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          placeholder={
                            speechLanguage === "hi-IN"
                              ? "समस्या का विवरण दें (उदा. सड़क पर बड़ा गड्ढा है, पानी बह रहा है...)"
                              : "Detail what is wrong, how long it's broken..."
                          }
                          className={`w-full p-3 pr-16 text-xs border rounded-xl focus:outline-hidden font-medium transition-all ${
                            isListening 
                              ? "border-red-500 ring-2 ring-red-100 bg-red-50/10 placeholder-red-400" 
                              : "border-slate-300 focus:border-emerald-500"
                          }`}
                        />
                        {/* Audio Pulse Visualizer Overlay inside textarea when listening */}
                        {isListening && (
                          <div className="absolute right-3.5 bottom-3.5 flex items-end gap-0.5 h-5 pointer-events-none">
                            <span className="w-0.5 bg-red-500 rounded-full animate-pulse-bar-1" />
                            <span className="w-0.5 bg-red-500 rounded-full animate-pulse-bar-2" />
                            <span className="w-0.5 bg-red-500 rounded-full animate-pulse-bar-3" />
                            <span className="w-0.5 bg-red-500 rounded-full animate-pulse-bar-4" />
                          </div>
                        )}
                      </div>

                      {/* Speech Error Banner */}
                      <AnimatePresence>
                        {speechError && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="mt-1.5 text-[10px] text-red-600 font-semibold bg-red-50 border border-red-100 p-2 rounded-lg flex items-center gap-1.5"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>{speechError}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Vision AI Grievance Image Verification */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 font-display">
                          <Sparkles className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                          Multimodal Verification (Vision AI)
                        </span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded font-sans uppercase">
                          Anti-Spam Shield
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Snap or upload a photo of the broken road, garbage pile, or issue. Gemini's Vision model will instantly verify your ticket & prioritize response severity.
                      </p>

                      {!grievanceImage ? (
                        <div 
                          className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-white hover:bg-emerald-50/20"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files?.[0]) {
                              handleGrievanceImageChange(e.dataTransfer.files[0]);
                            }
                          }}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e: any) => {
                              if (e.target.files?.[0]) {
                                handleGrievanceImageChange(e.target.files[0]);
                              }
                            };
                            input.click();
                          }}
                        >
                          <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
                          <span className="text-xs font-bold text-slate-700 block">Drag & drop photo here</span>
                          <span className="text-[10px] text-slate-400 font-medium font-sans">or click to browse local files</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <img 
                              src={grievanceImage} 
                              alt="Grievance preview" 
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0 font-sans">
                              <span className="text-xs font-bold text-slate-800 block truncate">{grievanceImageName}</span>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setGrievanceImage(null);
                                  setGrievanceImageName(null);
                                  setGrievanceVerificationResult(null);
                                }}
                                className="text-[10px] font-bold text-red-600 hover:text-red-800 underline cursor-pointer"
                              >
                                Remove Photo
                              </button>
                            </div>
                          </div>

                          {verifyingGrievanceImage && (
                            <div className="p-3 rounded-xl border border-blue-100 bg-blue-50 text-blue-950 text-xs font-medium flex items-center gap-3">
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                              <div className="space-y-0.5">
                                <span className="font-bold font-sans">Analyzing with Gemini Vision...</span>
                                <p className="text-[10px] text-blue-700 leading-tight">Extracting category, cross-checking description matching & assessing severity level.</p>
                              </div>
                            </div>
                          )}

                          {grievanceVerificationResult && (
                            <div className={`p-3.5 rounded-xl border ${
                              grievanceVerificationResult.isValid 
                                ? "border-emerald-200 bg-emerald-50/50 text-emerald-900" 
                                : "border-rose-200 bg-rose-50 text-rose-900"
                            } space-y-3`}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-1.5 font-sans">
                                  {grievanceVerificationResult.isValid ? (
                                    <>
                                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                      <span className="text-emerald-950">Grievance Verified!</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                                      <span className="text-rose-950">Verification Flagged!</span>
                                    </>
                                  )}
                                </span>
                                
                                <div className="flex gap-1.5 font-sans">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                    grievanceVerificationResult.severity === "Critical" 
                                      ? "bg-rose-100 text-rose-800 animate-pulse border border-rose-200" 
                                      : grievanceVerificationResult.severity === "Medium"
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-blue-100 text-blue-800 border border-blue-200"
                                  }`}>
                                    {grievanceVerificationResult.severity} Severity
                                  </span>
                                  <span className="text-[9px] bg-slate-100 text-slate-800 font-bold px-1.5 py-0.5 rounded uppercase border border-slate-200">
                                    {grievanceVerificationResult.category}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 font-sans">
                                  <span>Anti-Spam Verification Score:</span>
                                  <span className="font-mono">{grievanceVerificationResult.descriptionMatchScore}% Match</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      grievanceVerificationResult.descriptionMatchScore >= 75 
                                        ? "bg-emerald-600" 
                                        : grievanceVerificationResult.descriptionMatchScore >= 40 
                                        ? "bg-amber-500" 
                                        : "bg-rose-600"
                                    }`}
                                    style={{ width: `${grievanceVerificationResult.descriptionMatchScore}%` }}
                                  />
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-100 shadow-2xs font-medium">
                                "{grievanceVerificationResult.reason}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Reporter Name (Optional)</label>
                      <input
                        type="text"
                        value={formReporterName}
                        onChange={(e) => setFormReporterName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-500 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={formSubmitting}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      File Grievance Ticket
                    </button>
                  </form>

                  {/* Card Footer: Emergency Quick-Report */}
                  <div className="mt-6 pt-5 border-t border-slate-100 bg-rose-50/25 -mx-5 -mb-5 p-5 rounded-b-2xl border-t border-rose-50/50">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-1.5 font-display">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                        </span>
                        🚨 Emergency Quick-Report
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowEmergencyTemplates(!showEmergencyTemplates)}
                        className="text-[10px] font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer"
                      >
                        {showEmergencyTemplates ? "Hide Templates" : "Use Templates"}
                      </button>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                      Need to report a critical public hazard? Select a pre-filled template to automatically configure the grievance ticket.
                    </p>

                    <AnimatePresence>
                      {showEmergencyTemplates && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {emergencyTemplates.map((tpl, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleLoadEmergencyTemplate(tpl)}
                                className="p-2.5 rounded-xl border border-rose-100 hover:border-rose-300 bg-white hover:bg-rose-50/50 transition-all text-left flex flex-col justify-between h-[85px] cursor-pointer group shadow-2xs"
                              >
                                <span className="text-xs font-bold text-slate-800 font-display flex items-center gap-1.5 group-hover:text-rose-700">
                                  <span>{tpl.icon}</span>
                                  <span className="truncate">{tpl.label}</span>
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wide group-hover:bg-rose-50 group-hover:border-rose-100">
                                  {tpl.category}
                                </span>
                              </button>
                            ))}
                          </div>
                          <p className="text-[9px] text-rose-500 font-medium italic mt-2 leading-tight">
                            *Disclaimer: Use emergency templates only for genuine locality repairs or hazards.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Complaints list and details stage */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-full align-top">
                
                {/* Active Wards list */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col h-full self-start">
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-display">Grievances in your Locality</span>
                    <span className="text-[9px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">LIVE STREAM</span>
                  </div>
                  
                  <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px]">
                    {loadingComplaints ? (
                      <div className="flex items-center justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                      </div>
                    ) : complaints.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">No active grievances filed.</div>
                    ) : (
                      complaints.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedComplaint(c)}
                          className={`w-full text-left p-4 hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col ${
                            selectedComplaint?.id === c.id ? "bg-emerald-50/40" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                              {c.id}
                            </span>
                            
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              c.status === "Resolved" 
                                ? "bg-emerald-100 text-emerald-800" 
                                : c.status === "In Progress" 
                                ? "bg-orange-100 text-orange-800" 
                                : c.status === "Under Investigation" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 mt-2 font-display">{c.category}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 font-medium mt-1">{c.description}</p>
                          <div className="flex items-center gap-1 mt-2.5 text-[10px] text-slate-400 font-semibold">
                            <MapPin className="w-3.5 h-3.5 text-slate-300" />
                            <span className="line-clamp-1">{c.location}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Inspect status window */}
                <div className="self-start">
                  {selectedComplaint ? (
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-display">Inspect Ticket Details</span>
                        <button 
                          onClick={() => copyToClipboard(selectedComplaint.id)}
                          className="text-[9px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 border border-slate-200 bg-white px-2 py-1 rounded-md"
                        >
                          {copiedId === selectedComplaint.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          Copy ID
                        </button>
                      </div>

                      <div className="p-5 space-y-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-sm font-extrabold text-slate-900 tracking-wider">
                              {selectedComplaint.id}
                            </span>
                          </div>
                          
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-100 border border-slate-200 rounded-md text-slate-600 uppercase">
                              {selectedComplaint.category}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase border ${
                              selectedComplaint.status === "Resolved"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : selectedComplaint.status === "In Progress"
                                ? "bg-orange-50 border-orange-200 text-orange-800"
                                : selectedComplaint.status === "Under Investigation"
                                ? "bg-amber-50 border-amber-200 text-amber-800"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}>
                              {selectedComplaint.status}
                            </span>
                          </div>
                        </div>

                        {/* Description field */}
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Issue Description</span>
                          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                            {selectedComplaint.description}
                          </p>
                        </div>

                        {/* Location / Reporter Info */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Exact Location</span>
                              <span className="text-slate-700 font-semibold leading-relaxed">{selectedComplaint.location}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                            <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Reporter Name</span>
                              <span className="text-slate-700 font-semibold">{selectedComplaint.reporterName}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Filed At</span>
                              <span className="text-slate-500 font-semibold">{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Official updates timeline notes */}
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <Building2 className="w-4 h-4" />
                            <h4 className="text-[10px] font-bold uppercase tracking-wider">WARD OFFICERS NOTES</h4>
                          </div>
                          <p className="text-xs text-emerald-900 leading-relaxed font-semibold">
                            {selectedComplaint.notes}
                          </p>
                          <span className="text-[9px] text-emerald-600 block pt-1 font-medium italic">
                            Last checked on: {new Date(selectedComplaint.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs">
                      Select any complaint from the locality list, or perform a search to track status here.
                    </div>
                  )}
                </div>

              </div>

            </div>
          </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer Branding Area */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-300">CivicEase Companion Portal — powered by CivicMitra GenAI</p>
            <p className="text-[11px] text-slate-500 mt-1">Providing automated language detection and administrative jargon simplification.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Secure Server Proxy active
            </span>
          </div>
        </div>
      </footer>

      {/* 1. REPORT VIA AI VOICE/TEXT DICTATOR MODAL */}
      <AnimatePresence>
        {isVoiceModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVoiceModalOpen(false)}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 relative overflow-hidden z-10"
            >
              <button
                onClick={() => setIsVoiceModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2 text-emerald-600">
                <Sparkles className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-wider">AI Guided Report</span>
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900 mb-2">Report via AI (Voice/Text)</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Speak or type naturally. CivicMitra's speech engine will capture details, categorize the ticket, and file it instantly for resolution tracking.
              </p>

              {voiceModalSuccess ? (
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center space-y-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Grievance Ticket Created Successfully!</h4>
                    <p className="text-xs text-slate-600 mt-1">Grievance ID: <strong className="font-mono text-slate-900 bg-emerald-100/50 px-2 py-0.5 rounded border border-emerald-200">{voiceModalSuccess.id}</strong></p>
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <button
                      onClick={() => {
                        setIsVoiceModalOpen(false);
                        setActiveTab("grievances");
                        setSearchComplaintId(voiceModalSuccess.id);
                        const found = complaints.find(c => c.id === voiceModalSuccess.id);
                        if (found) setSelectedComplaint(found);
                      }}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Inspect Status
                    </button>
                    <button
                      onClick={() => setVoiceModalSuccess(null)}
                      className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      File Another
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleVoiceModalSubmit} className="space-y-4">
                  
                  {/* Category Selection */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Issue Category</label>
                    <select
                      value={voiceModalCategory}
                      onChange={(e) => setVoiceModalCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
                    >
                      <option value="Roads">Roads & Potholes</option>
                      <option value="Street Lights">Street Lights & Electricity</option>
                      <option value="Waste Management">Waste Management & Dumping</option>
                      <option value="Water & Sanitation">Water & Sanitation Leakage</option>
                      <option value="Public Health">Public Health & Pest Control</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Dictation Box */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Explain What's Wrong</label>
                      
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200/60 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setVoiceModalLanguage("en-IN")}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${voiceModalLanguage === "en-IN" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
                          >
                            EN
                          </button>
                          <button
                            type="button"
                            onClick={() => setVoiceModalLanguage("hi-IN")}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${voiceModalLanguage === "hi-IN" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
                          >
                            हिंदी
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleToggleVoiceModalListening}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all duration-200 ${
                            voiceModalIsListening ? "bg-red-500 text-white animate-pulse shadow-xs" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/40"
                          }`}
                        >
                          {voiceModalIsListening ? (
                            <>
                              <MicOff className="w-3 h-3 animate-bounce" />
                              <span>Stop Mic</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3 h-3" />
                              <span>Dictate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        required
                        rows={3}
                        value={voiceModalDescription}
                        onChange={(e) => setVoiceModalDescription(e.target.value)}
                        placeholder={voiceModalLanguage === "hi-IN" ? "समस्या का वर्णन करें... (जैसे की सड़क पर गहरा गड्ढा है)" : "Describe the grievance... e.g. Streetlight has been flickering since last night"}
                        className={`w-full p-3 text-xs border rounded-xl focus:outline-none font-medium transition-all ${
                          voiceModalIsListening ? "border-red-500 ring-2 ring-red-100 bg-red-50/10" : "border-slate-300 focus:border-emerald-500"
                        }`}
                      />
                      {voiceModalIsListening && (
                        <div className="absolute right-3.5 bottom-3.5 flex items-end gap-0.5 h-4 pointer-events-none">
                          <span className="w-0.5 bg-red-500 rounded-full animate-pulse-bar-1" />
                          <span className="w-0.5 bg-red-500 rounded-full animate-pulse-bar-2" />
                          <span className="w-0.5 bg-red-500 rounded-full animate-pulse-bar-3" />
                        </div>
                      )}
                    </div>

                    {voiceModalSpeechError && (
                      <div className="mt-1.5 text-[10px] text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg flex items-center gap-1.5 font-semibold font-sans">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 font-sans" />
                        <span>{voiceModalSpeechError}</span>
                      </div>
                    )}
                  </div>

                  {/* Location Pin */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Exact Location / Landmark</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={voiceModalLocation}
                        onChange={(e) => setVoiceModalLocation(e.target.value)}
                        placeholder="e.g. Near Indiranagar Metro Station Pillar 5"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Reporter Name Optional */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Your Name (Optional)</label>
                    <input
                      type="text"
                      value={voiceModalReporterName}
                      onChange={(e) => setVoiceModalReporterName(e.target.value)}
                      placeholder="e.g. Dev Patel"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>

                  {voiceModalError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{voiceModalError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsVoiceModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={voiceModalSubmitting}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 shadow-md"
                    >
                      {voiceModalSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>File AI Grievance</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING AI ASSISTANT WIDGET BADGE */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {isFloatingWidgetOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="mb-4 w-80 sm:w-96 h-[480px] rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 flex flex-col overflow-hidden shadow-2xl transition-all duration-300"
            >
              {/* Header */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                    <Sparkles className="w-4.5 h-4.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <span className="text-xs font-black block tracking-wide text-white">CivicMitra Quick Help</span>
                    <span className="text-[9px] text-emerald-400 font-bold block flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      AI Companion Live
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsFloatingWidgetOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
                {floatingWidgetHistory.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-emerald-500 text-slate-950 font-bold rounded-tr-none"
                          : "bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-none font-medium"
                      }`}
                    >
                      <div className="markdown-body whitespace-pre-line">
                        {m.parts[0].text}
                      </div>
                    </div>
                  </div>
                ))}
                {floatingWidgetSending && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      <span className="text-[11px] text-slate-400 font-medium">CivicMitra is thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleFloatingWidgetSend();
                }}
                className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={floatingWidgetInput}
                  onChange={(e) => setFloatingWidgetInput(e.target.value)}
                  placeholder="Ask any municipal question or report issue..."
                  disabled={floatingWidgetSending}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 text-white placeholder-slate-600 rounded-xl text-xs focus:outline-none focus:border-emerald-500/80 font-medium"
                />
                <button
                  type="submit"
                  disabled={floatingWidgetSending || !floatingWidgetInput.trim()}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-xl transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsFloatingWidgetOpen(!isFloatingWidgetOpen)}
          className="h-14 w-14 rounded-full bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 cursor-pointer"
          title="CivicMitra Quick Help"
        >
          {isFloatingWidgetOpen ? (
            <X className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <MessageSquare className="w-6 h-6 stroke-[2]" />
          )}
        </button>
      </div>

    </div>
  );
}
