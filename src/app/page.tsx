// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { PAYERS } from './data';

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

  // --- STATE: Add-ons ---
  const [interactiveComplexity, setInteractiveComplexity] = useState(false);

  // --- STATE: AI Assistant ---
  const [aiInput, setAiInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [generatedReport, setGeneratedReport] = useState<ClinicalReport | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- STATE: UI Feedback ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- EFFECT: Reset Interactive Complexity on Tab Change ---
  useEffect(() => {
    setInteractiveComplexity(false);
  }, [activeTab]);

  // --- HELPER: Formatter ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getRate = (code: string): number => {
    const payer = PAYERS[selectedPayer as keyof typeof PAYERS];
    return payer?.rates[code] || 0;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- AI ASSISTANT FUNCTIONS ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        // Handle PDF, Images, and Audio as base64 attachments
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
            // Handle text files as text context
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

  const generateWithJules = async () => {
    if (!aiInput.trim() && attachments.length === 0) {
        showToast('⚠️ Please upload files or enter notes first');
        return;
    }
    
    setIsAiProcessing(true);
    const apiKey = ""; // Runtime provided
    
    try {
        // Build parts array
        const parts: any[] = [{ text: aiInput || "Analyze the attached documents." }];
        
        // Add attachments (images/pdfs/audio)
        attachments.forEach(att => {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data
                }
            });
        });

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
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
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
            const parsed = JSON.parse(text);
            setGeneratedReport(parsed);
            showToast('🤖 Report Generated!');
        } else {
            throw new Error("No output");
        }
    } catch (e: any) {
        console.error(e);
        showToast(`❌ Error: ${e.message || 'Generation failed'}`);
    } finally {
        setIsAiProcessing(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900 pb-20 print:p-0 print:bg-white">
      {/* Styles for Printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white;
            color: black;
          }
          /* Hide non-print elements */
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 relative print:max-w-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Toast Notification (No Print) */}
        {toastMessage && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl z-50 flex items-center animate-bounce whitespace-nowrap no-print">
                ✅ {toastMessage}
            </div>
        )}

        {/* Header (No Print) */}
        <div className="bg-slate-900 p-6 text-white no-print">
          <h1 className="text-xl font-bold mb-1">Billing Command Center</h1>
          <p className="text-slate-400 text-sm mb-4">Integrative Psychiatry • Dr. Zelisko</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
                 <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Licensure</label>
                 <select 
                    value={licensureModifier}
                    onChange={(e) => setLicensureModifier(e.target.value as Licensure)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                 >
                    <option value="AF">AF - Psychiatrist</option>
                    <option value="AH">AH - Psychologist</option>
                    <option value="HO">HO - LCSW/LPC</option>
                    <option value="SA">SA - Nurse Prac.</option>
                 </select>
            </div>
            <div>
                 <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Diagnosis (ICD-10)</label>
                 <select 
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                 >
                    <option value="">-- Select Dx --</option>
                    {COMMON_DX.map(dx => (
                        <option key={dx.code} value={dx.code}>{dx.code} - {dx.label.split(',')[0]}</option>
                    ))}
                 </select>
            </div>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Select Payer</label>
          <select 
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Object.entries(PAYERS).map(([key, data]) => (
              <option key={key} value={key}>{data.name}</option>
            ))}
          </select>
        </div>

        {/* Navigation Tabs (No Print) */}
        <div className="flex border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide overflow-x-auto no-print">
          {['new_patient', 'med_check', 'combo', 'ai_assistant', 'additional_revenue'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as Tab)}
              className={`flex-shrink-0 px-3 py-3 text-center transition-colors duration-100 whitespace-nowrap ${activeTab === tab ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {tab === 'ai_assistant' ? '🤖 JULES AI (UPLOAD)' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* TAB 1, 2, 3, 5 Logic Hidden for Brevity - Standard Billing Logic Remains */}
        {activeTab !== 'ai_assistant' && activeTab !== 'treatment_plan' && (
             <div className="p-6 text-center text-slate-500 text-sm no-print">
                 (Standard Billing Calculators available in this tab)
                 <br/><br/>
                 <button onClick={() => setActiveTab('ai_assistant')} className="text-blue-600 underline">Go to Jules AI for PDF Reports</button>
             </div>
        )}

        {/* TAB 6: AI ASSISTANT (JULES) */}
        {activeTab === 'ai_assistant' && (
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between no-print">
                    <h2 className="font-bold text-lg text-purple-700">Jules AI Assistant</h2>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-bold">Multimodal</span>
                </div>

                {/* Input Section (No Print) */}
                {!generatedReport && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 space-y-4 no-print">
                    <div>
                        <label className="block text-xs font-bold uppercase text-purple-800 mb-2">1. Upload Files (PDF / IMG / AUDIO)</label>
                        <input 
                            type="file" 
                            multiple
                            accept=".txt,.md,.json,.csv,.pdf,.jpg,.png,.jpeg,.mp3,.wav,.m4a"
                            onChange={handleFileUpload}
                            ref={fileInputRef}
                            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                        />
                        {/* Attachment List */}
                        {attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {attachments.map((att, idx) => (
                                    <span key={idx} className="flex items-center text-[10px] bg-white border border-purple-200 px-2 py-1 rounded-full text-purple-700">
                                        📎 {att.name}
                                        <button onClick={() => removeAttachment(idx)} className="ml-2 text-red-500 font-bold">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-xs font-bold uppercase text-purple-800">2. Add Context / Dictation</label>
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
                            placeholder="Add specific notes, observations, or dictate here to combine with files..."
                            className="w-full h-40 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>

                    <button 
                        onClick={generateWithJules}
                        disabled={isAiProcessing}
                        className={`w-full py-3 rounded-lg shadow font-bold text-white transition-all flex items-center justify-center ${isAiProcessing ? 'bg-slate-400 cursor-wait' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {isAiProcessing ? '⚙️ Jules is reading your files...' : '✨ Generate Clinical Report'}
                    </button>
                </div>
                )}

                {/* VISUAL REPORT PREVIEW (This is what gets printed) */}
                {generatedReport && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-4 no-print">
                            <h3 className="font-bold text-slate-700">Document Preview</h3>
                            <div className="space-x-2">
                                <button onClick={() => setGeneratedReport(null)} className="px-3 py-1 bg-slate-200 rounded text-xs font-bold hover:bg-slate-300">Edit Inputs</button>
                                <button onClick={printReport} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 shadow">🖨️ Save as PDF</button>
                            </div>
                        </div>

                        {/* THE PRINTABLE DOCUMENT */}
                        <div id="printable-report" className="bg-white text-black font-sans leading-relaxed text-sm p-8 border border-slate-200 shadow-sm">
                            <div className="text-center border-b pb-4 mb-4">
                                <h1 className="text-xl font-bold uppercase tracking-wide">Clinical Mental Health Treatment Plan</h1>
                                <p className="text-xs text-slate-500 mt-1">CONFIDENTIAL PATIENT RECORD</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                                <div>
                                    <p><strong>Patient Name:</strong> {generatedReport.patientName}</p>
                                    <p><strong>DOB:</strong> {generatedReport.dob}</p>
                                    <p><strong>Service:</strong> Initial Psychiatric Evaluation</p>
                                </div>
                                <div className="text-right">
                                    <p><strong>Provider:</strong> {generatedReport.providerName}</p>
                                    <p><strong>Date:</strong> {generatedReport.dateOfService}</p>
                                    <p><strong>Client ID:</strong> {generatedReport.clientID}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <section>
                                    <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Clinical Formulation</h2>
                                    <p className="mb-2"><strong>Chief Complaint:</strong> "{generatedReport.chiefComplaint}"</p>
                                    <p className="mb-2"><strong>HPI:</strong> {generatedReport.hpi}</p>
                                    <p className="mb-2"><strong>ROS:</strong> {generatedReport.ros}</p>
                                    <p className="mb-2"><strong>History:</strong> {generatedReport.psychHistory} | {generatedReport.medicalHistory} | {generatedReport.substanceUse}</p>
                                    <p><strong>Current Meds:</strong> {generatedReport.currentMeds}</p>
                                </section>

                                <section>
                                    <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Mental Status Exam (MSE)</h2>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                        {Object.entries(generatedReport.mse).map(([key, val]) => (
                                            <div key={key}><strong className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {val}</div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Risk Assessment</h2>
                                    <p><strong>SI/HI:</strong> {generatedReport.riskAssessment.si_hi}</p>
                                    <p><strong>Self Harm/Violence:</strong> {generatedReport.riskAssessment.selfHarm}</p>
                                    <p><strong>Safety Plan:</strong> {generatedReport.riskAssessment.safetyPlan}</p>
                                </section>

                                <section>
                                    <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Diagnosis (DSM-5-TR)</h2>
                                    {generatedReport.diagnosis.map((dx, idx) => (
                                        <div key={idx} className="mb-2">
                                            <p className="font-bold">{dx.code} - {dx.name}</p>
                                            <p className="italic text-slate-600 pl-2 border-l-2 border-slate-200">{dx.rationale}</p>
                                        </div>
                                    ))}
                                </section>

                                <section>
                                    <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Medical Decision Making</h2>
                                    <p><strong>Level:</strong> {generatedReport.mdm.level}</p>
                                    <p className="text-xs">{generatedReport.mdm.rationale}</p>
                                </section>

                                <section>
                                    <h2 className="font-bold border-b border-slate-300 mb-1 uppercase text-xs">Treatment Plan</h2>
                                    <div className="mb-2">
                                        <strong>Pharmacotherapy:</strong>
                                        <p className="pl-2">{generatedReport.plan.meds}</p>
                                    </div>
                                    <div className="mb-2">
                                        <strong>Psychotherapy ({generatedReport.psychotherapy.therapyTime}):</strong>
                                        <p className="pl-2">{generatedReport.plan.therapy}</p>
                                    </div>
                                    <div>
                                        <strong>Goals:</strong>
                                        <ul className="list-disc pl-5">
                                            {generatedReport.goals.map((g, i) => <li key={i}>{g}</li>)}
                                        </ul>
                                    </div>
                                </section>
                            </div>

                            <div className="mt-8 pt-4 border-t-2 border-slate-800 flex justify-between items-end">
                                <div>
                                    <div className="font-serif text-xl italic mb-1">Douglas Zelisko, MD</div>
                                    <p className="text-xs uppercase font-bold">Provider Signature</p>
                                </div>
                                <div className="text-xs text-right">
                                    <p>Electronically Signed: {generatedReport.dateOfService}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
        
        {/* TAB 7: ADDITIONAL REVENUE */}
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

      </div>
    </div>
  );
}
