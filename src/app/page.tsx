// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
// IMPORT FIXED: Points to src/data/data.ts
import { PAYERS } from '../data/data';

// --- TYPE DEFINITIONS ---
type Licensure = 'AF' | 'AH' | 'HO' | 'AJ' | 'SA';
type Tab = 'new_patient' | 'med_check' | 'combo' | 'treatment_plan' | 'psychotherapy' | 'ai_assistant' | 'additional_revenue';

interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64
}

// --- JULES SYSTEM PROMPT (JSON MODE) ---
const JULES_SYSTEM_PROMPT = `
**Role:**
You are an expert Psychiatric Documentation Assistant named Jules. Your sole purpose is to generate professional "Clinical Mental Health Treatment Plans" adhering to Headway Clinical Team documentation standards.

**Operational Mandate:**
You must output PURE JSON. Do not include markdown formatting (like \`\`\`json). 

**Input Data Processing:**
Analyze the provided Intake Forms (PDF/Images), Audio Files (Session recordings/Dictation), and Notes to extract the following structured data.

**JSON Schema Requirements:**
{
  "patientName": "String (or [NAME])",
  "dob": "String (or [DOB])",
  "dateOfService": "String (Today's date)",
  "providerName": "Douglas Zelisko, M.D.",
  "clientID": "String (or [ID])",
  "chiefComplaint": "String (Verbatim quote)",
  "hpi": "String (Onset, duration, frequency, quality, severity, context)",
  "ros": "String (Constitutional, Psych, Sleep, etc. - pertinent positives/negatives)",
  "substanceUse": "String",
  "psychHistory": "String",
  "medicalHistory": "String",
  "currentMeds": "String (List name, dose, freq)",
  "mse": {
    "appearance": "String",
    "orientation": "String",
    "speech": "String",
    "mood": "String",
    "affect": "String",
    "thoughtProcess": "String",
    "thoughtContent": "String",
    "judgment": "String",
    "insight": "String",
    "cognition": "String"
  },
  "riskAssessment": {
    "si_hi": "String",
    "selfHarm": "String",
    "riskFactors": "String",
    "safetyPlan": "String (or 'N/A')"
  },
  "diagnosis": [
    { "code": "String", "name": "String", "rationale": "String (Clinical Evidence)" }
  ],
  "symptomInventory": {
    "cognitive": "String",
    "affective": "String",
    "neurovegetative": "String",
    "psychomotor": "String",
    "interpersonal": "String"
  },
  "mdm": {
    "level": "String (Low/Moderate/High)",
    "rationale": "String (Problems, Data, Risk)"
  },
  "psychotherapy": {
    "totalTime": "String",
    "therapyTime": "String",
    "modality": "String",
    "progress": "String"
  },
  "plan": {
    "meds": "String (List with rationale)",
    "therapy": "String (Freq/Duration)",
    "labs": "String"
  },
  "goals": ["String (Goal 1)", "String (Goal 2)"]
}
`;

interface ClinicalReport {
  source?: 'Gemini' | 'Perplexity'; // To track which AI generated it
  patientName: string;
  dob: string;
  dateOfService: string;
  providerName: string;
  clientID: string;
  chiefComplaint: string;
  hpi: string;
  ros: string;
  substanceUse: string;
  psychHistory: string;
  medicalHistory: string;
  currentMeds: string;
  mse: {
    appearance: string;
    orientation: string;
    speech: string;
    mood: string;
    affect: string;
    thoughtProcess: string;
    thoughtContent: string;
    judgment: string;
    insight: string;
    cognition: string;
  };
  riskAssessment: {
    si_hi: string;
    selfHarm: string;
    riskFactors: string;
    safetyPlan: string;
  };
  diagnosis: Array<{ code: string; name: string; rationale: string }>;
  symptomInventory: {
    cognitive: string;
    affective: string;
    neurovegetative: string;
    psychomotor: string;
    interpersonal: string;
  };
  mdm: {
    level: string;
    rationale: string;
  };
  psychotherapy: {
    totalTime: string;
    therapyTime: string;
    modality: string;
    progress: string;
  };
  plan: {
    meds: string;
    therapy: string;
    labs: string;
  };
  goals: string[];
}

const COMMON_DX = [
  { code: 'F33.1', label: 'MDD, Recurrent, Moderate' },
  { code: 'F33.2', label: 'MDD, Recurrent, Severe' },
  { code: 'F41.1', label: 'Generalized Anxiety Disorder' },
  { code: 'F90.2', label: 'ADHD, Combined Type' },
  { code: 'F31.9', label: 'Bipolar Disorder, Unspecified' },
  { code: 'F43.10', label: 'PTSD' },
  { code: 'F32.9', label: 'MDD, Single Episode, Unspecified' },
];

export default function BillingCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('new_patient');
  const [selectedPayer, setSelectedPayer] = useState('anthem');
  
  // --- STATE: Compliance & Setup ---
  const [licensureModifier, setLicensureModifier] = useState<Licensure>('AF'); 
  const [isTelehealth, setIsTelehealth] = useState(false);
  const [diagnosis, setDiagnosis] = useState(''); 

  // --- STATE: New Patient Wizard ---
  const [showMDMGuide, setShowMDMGuide] = useState(false); 
  const [newPtTherapyAddOn, setNewPtTherapyAddOn] = useState('90838'); 

  // --- STATE: Med Check Wizard ---
  const [showMDMWizard, setShowMDMWizard] = useState(false);
  const [problemLevel, setProblemLevel] = useState('low');
  const [riskLevel, setRiskLevel] = useState('low');

  // --- STATE: Combo Visit ---
  const [comboMedical, setComboMedical] = useState('99214');
  const [comboTherapy, setComboTherapy] = useState('90833');

  // --- STATE: Add-ons ---
  const [interactiveComplexity, setInteractiveComplexity] = useState(false);

  // --- STATE: AI Assistant ---
  const [aiInput, setAiInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Reports
  const [geminiReport, setGeminiReport] = useState<ClinicalReport | null>(null);
  const [perplexityReport, setPerplexityReport] = useState<ClinicalReport | null>(null);
  const [activeReportView, setActiveReportView] = useState<'Gemini' | 'Perplexity'>('Gemini');

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [processingSource, setProcessingSource] = useState<'Gemini' | 'Perplexity' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // API Keys (Pre-filled)
  const [perplexityKey, setPerplexityKey] = useState('Pplx-GemdHAnRW0DmdbTkQXPVEKuG6dvp8ulzil1lrBJ7UJPJPcVi');
  const [geminiKey, setGeminiKey] = useState('AIzaSyClIsPS_apaSc-8wiIsVlCabudhbwAk3MI');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE: UI Feedback ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- EFFECT: Reset Interactive Complexity on Tab Change ---
  useEffect(() => {
    setInteractiveComplexity(false);
  }, [activeTab]);

  // --- HELPER: Formatter ---
  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getRate = (code: string): number => {
    if (!PAYERS) return 0;
    const payer = PAYERS[selectedPayer as keyof typeof PAYERS];
    return payer?.rates[code] || 0;
  };

  // --- REVENUE CALCULATORS ---
  const getInteractiveRate = () => interactiveComplexity ? getRate('90785') : 0;

  const getNewPatientComboTotal = (emCode: string) => {
    return getRate(emCode) + getRate(newPtTherapyAddOn) + getInteractiveRate();
  };

  const getComboTotal = () => {
    return getRate(comboMedical) + getRate(comboTherapy) + getInteractiveRate();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- TELEHEALTH LOGIC ---
  const getTelehealthCompliance = () => {
    const payerName = PAYERS[selectedPayer as keyof typeof PAYERS]?.name.toLowerCase() || '';
    
    let pos = "11 (Office)";
    let modifier = "";
    let alertText = "";

    if (isTelehealth) {
        if (payerName.includes('medicare')) {
            pos = "10 (Patient Home)";
            modifier = "95 (or 93 for Audio-Only)";
            alertText = "Medicare Note: Use POS 10 for higher reimbursement rate.";
        } else if (payerName.includes('blue cross') || payerName.includes('anthem')) {
            pos = "10 or 11 (Check State)";
            modifier = "95 / GT";
            alertText = "BCBS Note: Strict documentation required (start/stop times).";
        } else if (payerName.includes('united') || payerName.includes('optum')) {
            pos = "02 (Other Telehealth)";
            modifier = "95 (Informational)";
            alertText = "UHC Note: UHC often prefers POS 02.";
        } else {
            pos = "11 (Office/Telehealth)";
            modifier = "95";
            alertText = "General Telehealth: Use Modifier 95.";
        }
    }
    
    return { pos, modifier, alertText };
  };
  const { pos, modifier, alertText } = getTelehealthCompliance();

  // --- NOTE GENERATOR ---
  const copyNote = (type: string) => {
    let text = "";
    const commonPrefix = `[LICENSURE: ${licensureModifier}] [POS: ${isTelehealth ? pos : '11'}] ${diagnosis ? `[Dx: ${diagnosis}]` : ''}`;
    const interactiveText = interactiveComplexity ? "\n* **Interactive Complexity (+90785):** Communication difficult due to [anxiety/reactivity/caregiver interference]. Specific interventions used to manage this factor." : "";
    
    const getTherapySection = (code: string) => {
        const mins = code === '90833' ? '16-37' : code === '90836' ? '38-52' : '53+';
        return `
---
**PSYCHOTHERAPY NOTE (Add-on ${code}):**
* **Time:** [Start Time] - [End Time] (${mins} mins face-to-face)
* **Identified Issues:** ...
* **Intervention:** ...
* **Treatment Plan/Goals:** ...
(Therapy service is separate and distinct from the medical E/M service)${interactiveText}`;
    };

    if (type === '90792') {
      text = `${commonPrefix} **Psychiatric Diagnostic Evaluation (90792)**
Comprehensive history, mental status exam, and initial plan formulation completed. Medical decision making included prescription management and ordering of diagnostic studies.`;
    } else if (type.startsWith('new_pt_combo')) {
      const emCode = type.includes('99205') ? '99205' : '99204';
      const mdmLevel = emCode === '99205' ? 'HIGH' : 'MODERATE';
      const riskExample = emCode === '99205' ? 'severe risk/threat to life' : 'prescription management of moderate risk';
      text = `${commonPrefix} **New Patient Combo (${emCode}-25${isTelehealth ? `-${modifier}` : ''})**
* **MDM:** ${mdmLevel} complexity.
* **Justification:** [Problem Complexity] and [${riskExample}].
* **E/M Service:** Medical assessment, history, and plan formulation.
${getTherapySection(newPtTherapyAddOn)}`;
    } else if (type === 'med_check_mod') {
      text = `${commonPrefix} **Follow-up Visit (99214${isTelehealth ? `-${modifier}` : ''})**
* **MDM:** MODERATE
* **Problem:** [Worsening/New Problem] or [2+ Stable Chronic Illnesses].
* **Risk:** Prescription management performed (e.g., [Med Name] adjustment/review). Counseling provided on potential side effects.${interactiveText}`;
    } else if (type === 'med_check_low') {
      text = `${commonPrefix} **Follow-up Visit (99213${isTelehealth ? `-${modifier}` : ''})**
* **MDM:** LOW
* **Status:** Patient stable. Current regimen continued. No new problems or side effects reported.`;
    } else if (type === 'combo') {
      text = `${commonPrefix} **Combo Visit (${comboMedical}-25${isTelehealth ? `-${modifier}` : ''})**
* **E/M Service:** Medical management provided for [Diagnosis].
* **MDM:** ${comboMedical === '99214' ? 'Moderate' : 'Low'}.
${getTherapySection(comboTherapy)}`;
    }

    navigator.clipboard.writeText(text); 
    showToast(`📋 ${type.replace('_', ' ')} note copied!`);
  };

  // --- AI ASSISTANT FUNCTIONS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        if (file.type === 'application/pdf' || file.type.startsWith('image/') || file.type.startsWith('audio/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64String = (event.target?.result as string).split(',')[1];
                setAttachments(prev => [...prev, {
                    name: file.name,
                    mimeType: file.type,
                    data: base64String
                }]);
                showToast(`📎 ${file.name} attached`);
            };
            reader.readAsDataURL(file);
        } else {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setAiInput(prev => prev + `\n\n--- FILE: ${file.name} ---\n${event.target?.result as string}`);
                    showToast(`📄 ${file.name} read as text`);
                }
            };
            reader.readAsText(file);
        }
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      setIsRecording(true);
      showToast('🎤 Listening...');
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
          setAiInput(prev => prev + " " + finalTranscript);
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
      showToast('🛑 Recording stopped');
    };
    recognition.start();
  };

  // --- GEMINI HANDLER ---
  const generateWithGemini = async () => {
    if (!aiInput.trim() && attachments.length === 0) {
        showToast('⚠️ Input needed');
        return;
    }
    if (!geminiKey) {
        showToast('⚠️ Gemini API Key required');
        return;
    }
    
    setIsAiProcessing(true);
    setProcessingSource('Gemini');
    
    try {
        const parts: any[] = [{ text: aiInput || "Analyze the attached documents." }];
        attachments.forEach(att => {
            parts.push({
                inlineData: { mimeType: att.mimeType, data: att.data }
            });
        });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }],
                    systemInstruction: { parts: [{ text: JULES_SYSTEM_PROMPT }] },
                    generationConfig: { responseMimeType: "application/json" }
                })
            }
        );
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
            const parsed = JSON.parse(text);
            parsed.source = 'Gemini';
            setGeminiReport(parsed);
            setActiveReportView('Gemini');
            showToast('🤖 Gemini Report Ready!');
        } else {
            throw new Error("No output");
        }
    } catch (e: any) {
        console.error(e);
        showToast(`❌ Gemini Error: ${e.message}`);
    } finally {
        setIsAiProcessing(false);
        setProcessingSource(null);
    }
  };

  // --- PERPLEXITY HANDLER ---
  const generateWithPerplexity = async () => {
    if (!aiInput.trim()) {
        showToast('⚠️ Text/Notes required for Perplexity (Files ignored)');
        return;
    }
    if (!perplexityKey) {
        showToast('⚠️ Perplexity API Key required');
        return;
    }

    setIsAiProcessing(true);
    setProcessingSource('Perplexity');

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${perplexityKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    { role: 'system', content: JULES_SYSTEM_PROMPT + "\n IMPORTANT: Return ONLY JSON." },
                    { role: 'user', content: aiInput }
                ],
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const text = data.choices?.[0]?.message?.content;
        
        // Clean markdown code blocks if Perplexity includes them
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        if (cleanText) {
            const parsed = JSON.parse(cleanText);
            parsed.source = 'Perplexity';
            setPerplexityReport(parsed);
            setActiveReportView('Perplexity');
            showToast('🧠 Perplexity Report Ready!');
        } else {
            throw new Error("No output");
        }

    } catch (e: any) {
        console.error(e);
        showToast(`❌ Perplexity Error: ${e.message}`);
    } finally {
        setIsAiProcessing(false);
        setProcessingSource(null);
    }
  };

  const printReport = () => {
    window.print();
  };

  const currentReport = activeReportView === 'Gemini' ? geminiReport : perplexityReport;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900 pb-20 print:p-0 print:bg-white">
      {/* Styles for Printing */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report {
            position: absolute; left: 0; top: 0; width: 100%;
            margin: 0; padding: 20px; background: white; color: black;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 relative print:max-w-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Toast Notification */}
        {toastMessage && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl z-50 flex items-center animate-bounce whitespace-nowrap no-print">
                ✅ {toastMessage}
            </div>
        )}

        {/* Header */}
        <div className="bg-slate-900 p-6 text-white no-print">
          <h1 className="text-xl font-bold mb-1">Billing Command Center</h1>
          <p className="text-slate-400 text-sm mb-4">Integrative Psychiatry • Dr. Zelisko</p>
          
          {/* Header Controls */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
                 <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Licensure</label>
                 <select value={licensureModifier} onChange={(e) => setLicensureModifier(e.target.value as Licensure)} className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-sm">
                    <option value="AF">AF - Psychiatrist</option>
                    <option value="AH">AH - Psychologist</option>
                    <option value="HO">HO - LCSW/LPC</option>
                    <option value="SA">SA - Nurse Prac.</option>
                 </select>
            </div>
            <div>
                 <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Diagnosis</label>
                 <select value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 text-sm">
                    <option value="">-- Select Dx --</option>
                    {COMMON_DX.map(dx => (<option key={dx.code} value={dx.code}>{dx.code}</option>))}
                 </select>
            </div>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Select Payer</label>
          <select 
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Object.entries(PAYERS || {}).map(([key, data]) => (
              <option key={key} value={key}>{data.name}</option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide overflow-x-auto no-print">
          {['new_patient', 'med_check', 'combo', 'ai_assistant', 'additional_revenue'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as Tab)}
              className={`flex-shrink-0 px-3 py-3 text-center transition-colors duration-100 whitespace-nowrap ${activeTab === tab ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {tab === 'ai_assistant' ? '🤖 JULES AI' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* TAB 1: NEW PATIENT */}
        {activeTab === 'new_patient' && (
          <div className="p-6 space-y-4">
            <h2 className="font-bold text-lg">New Patient Intake</h2>
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Psychotherapy Time</label>
                <select 
                    value={newPtTherapyAddOn}
                    onChange={(e) => setNewPtTherapyAddOn(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded"
                >
                    <option value="90833">16–37 minutes (90833)</option>
                    <option value="90836">38–52 minutes (90836)</option>
                    <option value="90838">53+ minutes (90838)</option>
                </select>
                <div className="mt-3 flex items-center space-x-2">
                    <input 
                        type="checkbox" 
                        checked={interactiveComplexity} 
                        onChange={(e) => setInteractiveComplexity(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label className="text-sm text-slate-700 font-medium">Add Interactive Complexity (+90785)</label>
                </div>
            </div>

            <div className="p-4 rounded-lg border border-orange-300 bg-orange-50 flex justify-between items-center group relative overflow-hidden">
              <div className="relative z-10">
                <div className="font-bold text-orange-900">99204 + {newPtTherapyAddOn} {interactiveComplexity && '+ 90785'}</div>
                <div className="text-xs text-orange-800">Moderate Intake + Therapy</div>
              </div>
              <div className="text-right relative z-10">
                <div className="text-xl font-bold text-orange-700">{formatCurrency(calculateNewPatientTotal('99204'))}</div>
                <button onClick={() => copyNote('new_pt_combo_99204')} className="text-xs text-orange-700 hover:text-orange-900 underline mt-1 font-bold">📋 Copy Note</button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-green-600 bg-green-50 flex justify-between items-center group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-200 text-green-800 text-[10px] px-2 py-0.5 rounded-bl font-bold">MAXIMIZER</div>
              <div className="relative z-10">
                <div className="font-bold text-green-900">99205 + {newPtTherapyAddOn} {interactiveComplexity && '+ 90785'}</div>
                <div className="text-xs text-green-800">High Intake + Therapy</div>
              </div>
              <div className="text-right relative z-10">
                <div className="text-xl font-bold text-green-700">{formatCurrency(calculateNewPatientTotal('99205'))}</div>
                <button onClick={() => copyNote('new_pt_combo_99205')} className="text-xs text-green-700 hover:text-green-900 underline mt-1 font-bold">📋 Copy Note</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MED CHECK */}
        {activeTab === 'med_check' && (
          <div className="p-6 space-y-4">
            <h2 className="font-bold text-lg mb-2">Medication Management (E/M Only)</h2>
             <div className="flex items-center space-x-2 mb-4">
                    <input 
                        type="checkbox" 
                        checked={interactiveComplexity} 
                        onChange={(e) => setInteractiveComplexity(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label className="text-sm text-slate-700">Add Interactive Complexity (+90785)</label>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <div><div className="font-bold">99213 {interactiveComplexity && '+ 90785'}</div><div className="text-sm text-slate-500">Stable Refill</div></div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(getRate('99213') + getInteractiveRate())}</div>
                <button onClick={() => copyNote('med_check_low')} className="text-xs text-blue-500 hover:text-blue-700 underline mt-1 font-bold">📋 Copy Note</button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <div><div className="font-bold">99214 {interactiveComplexity && '+ 90785'}</div><div className="text-sm text-slate-500">Complex/Adjust</div></div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(getRate('99214') + getInteractiveRate())}</div>
                <button onClick={() => copyNote('med_check_mod')} className="text-xs text-blue-500 hover:text-blue-700 underline mt-1 font-bold">📋 Copy Note</button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COMBO VISIT */}
        {activeTab === 'combo' && (
          <div className="p-6 space-y-6">
            <h2 className="font-bold text-lg mb-2">Combo Visit (Meds + Therapy)</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Medical</label>
                <select value={comboMedical} onChange={(e) => setComboMedical(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded">
                  <option value="99213">99213 (Low)</option>
                  <option value="99214">99214 (Mod)</option>
                  <option value="99215">99215 (High)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Therapy</label>
                <select value={comboTherapy} onChange={(e) => setComboTherapy(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded">
                  <option value="90833">16-37m (90833)</option>
                  <option value="90836">38-52m (90836)</option>
                  <option value="90838">53m+ (90838)</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 bg-blue-50 p-3 rounded border border-blue-100">
                <input 
                    type="checkbox" 
                    id="comboInt" 
                    checked={interactiveComplexity} 
                    onChange={(e) => setInteractiveComplexity(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="comboInt" className="text-sm text-slate-700 font-bold">Add Interactive Complexity (+90785)</label>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-lg text-center shadow-lg relative">
              <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Total Revenue</div>
              <div className="text-4xl font-bold">{formatCurrency(getComboTotal())}</div>
              <button onClick={() => copyNote('combo')} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center justify-center mx-auto">
                📋 Copy Note for EMR
              </button>
            </div>
          </div>
        )}
        
        {/* ADD REVENUE TAB */}
        {activeTab === 'additional_revenue' && (
          <div className="p-6 space-y-6">
            <h2 className="font-bold text-lg mb-4">Additional Revenue Opportunities</h2>
            
            <div className="space-y-3">
                <h3 className="font-bold text-md text-slate-700 border-b pb-1">Caregiver Training Services (CTS)</h3>
                <div className="text-xs text-slate-500 mb-2">For teaching parents/spouses skills to manage the patient's condition (not relationship-focused like family therapy).</div>
                {[
                  { code: 'G0539', label: 'Initial 30 mins' },
                  { code: 'G0540', label: 'Add\'l 15 mins' },
                ].map((item) => (
                  <div key={item.code} className="p-3 rounded border border-slate-200 bg-white flex justify-between items-center">
                    <span className="font-medium text-slate-700">{item.label} <span className="text-slate-400 text-xs">({item.code})</span></span>
                    <span className="font-bold text-green-600">{formatCurrency(getRate(item.code))}</span>
                  </div>
                ))}
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-md text-slate-700 border-b pb-1">Digital Health Management (DMHT)</h3>
                <div className="text-xs text-red-600 mb-2">WARNING: Only for FDA-cleared apps (e.g., Somryst). Billing for common apps is fraud.</div>
                {[
                  { code: 'G0552', label: 'Device Supply/Onboarding' },
                  { code: 'G0553', label: 'Monthly Mgmt (First 20m)' },
                  { code: 'G0554', label: 'Monthly Mgmt (Add\'l 20m)' },
                ].map((item) => (
                  <div key={item.code} className="p-3 rounded border border-slate-200 bg-white flex justify-between items-center">
                    <span className="font-medium text-slate-700">{item.label} <span className="text-slate-400 text-xs">({item.code})</span></span>
                    <span className="font-bold text-green-600">{formatCurrency(getRate(item.code))}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 6: AI ASSISTANT (JULES) */}
        {activeTab === 'ai_assistant' && (
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between no-print">
                    <h2 className="font-bold text-lg text-purple-700">Jules AI Assistant</h2>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold">Dual Engine</span>
                </div>

                {/* --- INPUT SECTION --- */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-4 no-print">
                    {/* API Keys */}
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                            type="password"
                            value={perplexityKey}
                            onChange={(e) => setPerplexityKey(e.target.value)}
                            placeholder="Perplexity API Key"
                            className="w-full p-2 text-xs border border-purple-200 rounded focus:border-purple-500 outline-none"
                        />
                        <input 
                            type="password"
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            placeholder="Gemini API Key (Required for Jules)"
                            className="w-full p-2 text-xs border border-purple-200 rounded focus:border-purple-500 outline-none"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-purple-800 mb-2">1. Upload (PDF / Audio / IMG)</label>
                        <input 
                            type="file" 
                            multiple
                            accept=".txt,.md,.json,.csv,.pdf,.jpg,.png,.jpeg,.mp3,.wav,.m4a"
                            onChange={handleFileUpload}
                            ref={fileInputRef}
                            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                        />
                        {/* Attachments */}
                        {attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {attachments.map((att, idx) => (
                                    <span key={idx} className="flex items-center text-[10px] bg-white border border-purple-200 px-2 py-1 rounded-full text-purple-700">
                                        📎 {att.name.substring(0, 15)}...
                                        <button onClick={() => removeAttachment(idx)} className="ml-2 text-red-500 font-bold">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dictation Area */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-xs font-bold uppercase text-purple-800">2. Notes / Dictation</label>
                             <button 
                                onClick={toggleRecording}
                                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-bold transition-colors ${isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                             >
                                <span>{isRecording ? '🛑 Stop' : '🎤 Dictate'}</span>
                             </button>
                        </div>
                        <textarea
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            placeholder="Type notes or dictate here. (Required for Perplexity)"
                            className="w-full h-32 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>

                    {/* DUAL BUTTONS */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={generateWithGemini}
                            disabled={isAiProcessing}
                            className={`py-3 rounded-lg shadow font-bold text-white text-xs transition-all flex flex-col items-center justify-center ${isAiProcessing && processingSource === 'Gemini' ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            <span>✨ Jules (Gemini)</span>
                            <span className="text-[9px] font-normal opacity-75">Multimodal (Files + Audio)</span>
                        </button>

                        <button 
                            onClick={generateWithPerplexity}
                            disabled={isAiProcessing}
                            className={`py-3 rounded-lg shadow font-bold text-white text-xs transition-all flex flex-col items-center justify-center ${isAiProcessing && processingSource === 'Perplexity' ? 'bg-slate-400' : 'bg-teal-600 hover:bg-teal-700'}`}
                        >
                            <span>🧠 Perplexity AI</span>
                            <span className="text-[9px] font-normal opacity-75">Research/Text Only</span>
                        </button>
                    </div>
                </div>

                {/* --- REPORT PREVIEW SECTION --- */}
                {(geminiReport || perplexityReport) && (
                    <div className="animate-fade-in border-t-4 border-slate-200 pt-4">
                        <div className="flex items-center justify-between mb-4 no-print">
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => setActiveReportView('Gemini')}
                                    disabled={!geminiReport}
                                    className={`px-4 py-2 rounded text-xs font-bold ${activeReportView === 'Gemini' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    Gemini Report
                                </button>
                                <button 
                                    onClick={() => setActiveReportView('Perplexity')}
                                    disabled={!perplexityReport}
                                    className={`px-4 py-2 rounded text-xs font-bold ${activeReportView === 'Perplexity' ? 'bg-teal-600 text-white shadow' : 'bg-slate-100 text-slate-400'}`}
                                >
                                    Perplexity Report
                                </button>
                            </div>
                            <button onClick={printReport} className="px-3 py-1 bg-slate-800 text-white rounded text-xs font-bold hover:bg-black shadow">
                                🖨️ Save PDF
                            </button>
                        </div>

                        {/* THE PRINTABLE DOCUMENT */}
                        {currentReport ? (
                            <div id="printable-report" className="bg-white text-black font-sans leading-relaxed text-sm p-8 border border-slate-200 shadow-sm relative">
                                <div className="absolute top-2 right-2 text-[10px] text-slate-300 uppercase tracking-widest no-print">
                                    Generated by {currentReport.source}
                                </div>

                                <div className="text-center border-b pb-4 mb-4">
                                    <h1 className="text-xl font-bold uppercase tracking-wide">Clinical Mental Health Treatment Plan</h1>
                                    <p className="text-xs text-slate-500 mt-1">CONFIDENTIAL PATIENT RECORD</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                                    <div>
                                        <p><strong>Patient Name:</strong> {currentReport.patientName}</p>
                                        <p><strong>DOB:</strong> {currentReport.dob}</p>
                                        <p><strong>Service:</strong> Initial Psychiatric Evaluation</p>
                                    </div>
                                    <div className="text-right">
                                        <p><strong>Provider:</strong> {currentReport.providerName}</p>
                                        <p><strong>Date:</strong> {currentReport.dateOfService}</p>
                                        <p><strong>Client ID:</strong> {currentReport.clientID}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <section>
                                        <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Clinical Formulation</h2>
                                        <p className="mb-2"><strong>Chief Complaint:</strong> "{currentReport.chiefComplaint}"</p>
                                        <p className="mb-2"><strong>HPI:</strong> {currentReport.hpi}</p>
                                        <p className="mb-2"><strong>ROS:</strong> {currentReport.ros}</p>
                                        <p><strong>History:</strong> {currentReport.psychHistory} | {currentReport.medicalHistory}</p>
                                    </section>

                                    <section>
                                        <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Mental Status Exam (MSE)</h2>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            {Object.entries(currentReport.mse).map(([key, val]) => (
                                                <div key={key}><strong className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {val}</div>
                                            ))}
                                        </div>
                                    </section>

                                    <section>
                                        <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Diagnosis & Plan</h2>
                                        {currentReport.diagnosis.map((dx, idx) => (
                                            <div key={idx} className="mb-2">
                                                <p className="font-bold">{dx.code} - {dx.name}</p>
                                                <p className="italic text-slate-600 pl-2 border-l-2 border-slate-200 text-xs">{dx.rationale}</p>
                                            </div>
                                        ))}
                                        <div className="mt-2">
                                            <strong>Plan:</strong> {currentReport.plan.meds} | {currentReport.plan.therapy}
                                        </div>
                                    </section>
                                </div>

                                <div className="mt-8 pt-4 border-t-2 border-slate-800 flex justify-between items-end">
                                    <div>
                                        <div className="font-serif text-xl italic mb-1">Douglas Zelisko, MD</div>
                                        <p className="text-xs uppercase font-bold">Provider Signature</p>
                                    </div>
                                    <div className="text-xs text-right">
                                        <p>Electronically Signed: {currentReport.dateOfService}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded">
                                Select a report to preview
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
}
