// src/app/page.tsx
'use client';

import { useState } from 'react';
import { PAYERS } from '@/data/data';

// --- TYPE DEFINITIONS ---
type Licensure = 'AF' | 'AH' | 'HO' | 'AJ' | 'SA';
type Tab = 'new_patient' | 'med_check' | 'combo' | 'psychotherapy' | 'additional_revenue';

export default function BillingCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('new_patient');
  const [selectedPayer, setSelectedPayer] = useState('anthem');
  
  // --- STATE: Compliance & Setup ---
  const [licensureModifier, setLicensureModifier] = useState<Licensure>('AF'); 
  const [isTelehealth, setIsTelehealth] = useState(false);

  // --- STATE: New Patient Wizard ---
  const [showMDMGuide, setShowMDMGuide] = useState(false); // New MDM Guide Toggle
  const [newPtTherapyAddOn, setNewPtTherapyAddOn] = useState('90838'); // Default to 60m therapy

  // --- STATE: Med Check Wizard ---
  const [showMDMWizard, setShowMDMWizard] = useState(false);
  const [problemLevel, setProblemLevel] = useState('low');
  const [riskLevel, setRiskLevel] = useState('low');

  // --- STATE: Combo Visit ---
  const [comboMedical, setComboMedical] = useState('99214');
  const [comboTherapy, setComboTherapy] = useState('90833');
  
  // --- STATE: Therapy Suite ---
  const [therapyType, setTherapyType] = useState('individual');

  // --- STATE: UI Feedback ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- HELPER: Formatter ---
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getRate = (code: string): number => {
    const payer = PAYERS[selectedPayer as keyof typeof PAYERS];
    return payer?.rates[code] || 0;
  };

  const getComboTotal = () => {
    return getRate(comboMedical) + getRate(comboTherapy);
  };

  const getNewPatientComboTotal = (emCode: string, therapyAddOn: string) => {
    return getRate(emCode) + getRate(therapyAddOn);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- TELEHEALTH LOGIC ---
  const getTelehealthCompliance = () => {
    const payerName = PAYERS[selectedPayer as keyof typeof PAYERS]?.name.toLowerCase();
    
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

  // --- FEATURE: Note Generator (Enhanced MDM) ---
  const copyNote = (type: string) => {
    let text = "";
    const commonPrefix = `[LICENSURE: ${licensureModifier}] [POS: ${isTelehealth ? pos : '11'}]`;
    
    if (type === '90792') {
      text = `${commonPrefix} Psychiatric diagnostic evaluation with medical services (90792). Comprehensive history, mental status exam, and initial plan formulation completed. Medical decision making included prescription management and ordering of diagnostic studies.`;
    } else if (type.startsWith('new_pt_combo')) {
      const emCode = type.includes('99205') ? '99205' : '99204';
      const mdmLevel = emCode === '99205' ? 'HIGH' : 'MODERATE';
      const riskExample = emCode === '99205' ? 'severe risk/threat to life' : 'prescription management of moderate risk';
      const therapyMins = newPtTherapyAddOn === '90833' ? '16-37' : newPtTherapyAddOn === '90836' ? '38-52' : '53+';
      
      text = `${commonPrefix} New Patient Combo (${emCode}-25${isTelehealth ? `-${modifier}` : ''} + ${newPtTherapyAddOn}). MDM: ${mdmLevel} complexity justified by [Problem Complexity] and [${riskExample}]. Separately identifiable psychotherapy (${therapyMins} mins) provided, distinct from medical management. Start/Stop time documented. (Note: Therapy content separated from E/M in chart).`;
    } else if (type === 'med_check_mod') {
      text = `${commonPrefix} Follow-up visit (99214${isTelehealth ? `-${modifier}` : ''}). MDM: MODERATE. 1) Problem: [Worsening/New Problem]. 2) Risk: Prescription management performed (e.g., [Med Name] adjustment/review). Counseling provided on potential side effects.`;
    } else if (type === 'med_check_low') {
      text = `${commonPrefix} Follow-up visit (99213${isTelehealth ? `-${modifier}` : ''}). MDM: LOW. Patient stable. Current regimen continued. No new problems or side effects reported.`;
    } else if (type === 'combo') {
      text = `${commonPrefix} Combo Visit (${comboMedical}-25${isTelehealth ? `-${modifier}` : ''} + ${comboTherapy}). Medical management provided for [Diagnosis]. Separately identifiable psychotherapy (${comboTherapy === '90833' ? '16-37' : comboTherapy === '90836' ? '38-52' : '53+'} mins) provided. Therapy distinct from medical work. (Note: Therapy content separated from E/M in chart).`;
    }

    navigator.clipboard.writeText(text); 
    showToast(`📋 ${type.replace('_', ' ')} note copied!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900 pb-20">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 relative">
        
        {/* Toast Notification */}
        {toastMessage && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl z-50 flex items-center animate-bounce">
                ✅ {toastMessage}
            </div>
        )}

        {/* Header & Compliance Setup */}
        <div className="bg-slate-900 p-6 text-white">
          <h1 className="text-xl font-bold mb-1">Billing Command Center</h1>
          <p className="text-slate-400 text-sm mb-4">Integrative Psychiatry • Dr. Zelisko</p>
          
          <div className="mb-4">
             <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Provider Licensure</label>
             <select 
                aria-label="Provider Licensure"
                value={licensureModifier}
                onChange={(e) => setLicensureModifier(e.target.value as Licensure)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
             >
                <option value="AF">AF - Psychiatrist (MD/DO)</option>
                <option value="AH">AH - Clinical Psychologist (PhD)</option>
                <option value="HO">HO - Master&apos;s Level (LCSW, LPC)</option>
                <option value="SA">SA - Nurse Practitioner (NP)</option>
             </select>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Select Payer</label>
          <select 
            aria-label="Select Payer"
            value={selectedPayer}
            onChange={(e) => setSelectedPayer(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {Object.entries(PAYERS).map(([key, data]) => (
              <option key={key} value={key}>{data.name}</option>
            ))}
          </select>
        </div>
        
        {/* Telehealth Compliance Panel */}
        <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm text-blue-800">Telehealth Compliance</span>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-xs text-blue-700 font-medium">Remote?</span>
                    <div className={`relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in ${isTelehealth ? 'bg-blue-600' : 'bg-slate-300'} rounded-full`}>
                        <input type="checkbox" name="toggle" id="toggle" checked={isTelehealth} onChange={() => setIsTelehealth(!isTelehealth)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" />
                        <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer"></label>
                    </div>
                </label>
            </div>
            {isTelehealth && (
                <div className="text-xs space-y-1 text-slate-700">
                    <p>POS Code: <strong className="text-blue-600">{pos}</strong></p>
                    <p>Required Modifiers: <strong className="text-blue-600">{modifier}</strong> (on CPT code)</p>
                    <p className="font-medium text-red-600">{alertText}</p>
                </div>
            )}
        </div>

        {/* 5-Tab Navigation */}
        <div className="flex border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide">
          {['new_patient', 'med_check', 'combo', 'psychotherapy', 'additional_revenue'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as Tab)}
              className={`flex-1 py-3 text-center transition-colors duration-100 ${activeTab === tab ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* TAB 1: NEW PATIENT (Full Decision Engine) */}
        {activeTab === 'new_patient' && (
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-lg">New Patient Intake</h2>
                <button onClick={() => setShowMDMGuide(!showMDMGuide)} className="text-xs text-blue-600 underline font-bold">📖 MDM Guide</button>
            </div>
            
            {/* MDM REFERENCE GUIDE (Collapsible) */}
            {showMDMGuide && (
                <div className="bg-slate-50 border border-slate-300 p-4 rounded-lg text-xs space-y-3 shadow-inner">
                    <h3 className="font-bold text-slate-800 border-b pb-1">Defining E/M Complexity (2 of 3 Required)</h3>
                    
                    <div className="grid grid-cols-1 gap-2">
                        <div className="bg-white p-2 rounded border border-orange-200">
                            <div className="font-bold text-orange-700 mb-1">MODERATE (99204 / 99214)</div>
                            <ul className="list-disc pl-3 space-y-1 text-slate-600">
                                <li><strong>Problems:</strong> 1 Acute complicated illness OR 2+ stable chronic illnesses OR 1 new problem with uncertain prognosis.</li>
                                <li><strong>Data:</strong> Review of 3 distinct sources (e.g., notes, labs, collateral).</li>
                                <li><strong>Risk:</strong> Prescription management, decision regarding minor surgery.</li>
                            </ul>
                        </div>
                        <div className="bg-white p-2 rounded border border-green-200">
                            <div className="font-bold text-green-700 mb-1">HIGH (99205 / 99215)</div>
                            <ul className="list-disc pl-3 space-y-1 text-slate-600">
                                <li><strong>Problems:</strong> 1+ Chronic with severe exacerbation OR threat to life/bodily function.</li>
                                <li><strong>Data:</strong> Extensive review + Independent interpretation of tests.</li>
                                <li><strong>Risk:</strong> High-risk meds (Lithium, Clozapine), decision to hospitalize, or decision to forego treatment due to risk.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded">
                        <strong>Billing Rule:</strong> If using Add-on Therapy codes, E/M level MUST be based on MDM, not Time.
                    </div>
                    <button onClick={() => setShowMDMGuide(false)} className="w-full py-1 bg-slate-200 text-slate-600 rounded mt-2">Close Guide</button>
                </div>
            )}
            
            {/* Therapy Selector */}
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Select Psychotherapy Time (Add-On Code)</label>
                <select 
                    value={newPtTherapyAddOn}
                    onChange={(e) => setNewPtTherapyAddOn(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded"
                >
                    <option value="90833">16–37 minutes (90833)</option>
                    <option value="90836">38–52 minutes (90836)</option>
                    <option value="90838">53+ minutes (90838)</option>
                </select>
                <div className="text-xs text-slate-500 mt-2">
                    Note: If therapy is 53+ mins, <strong>90838</strong> is the Maximizer choice.
                </div>
            </div>

            {/* E/M Combo Cards */}
            <h3 className="font-bold text-md text-slate-700 border-b pb-1 mt-6">Profitability Strategies</h3>

            {/* 99204 Combo Card */}
            <div className="p-4 rounded-lg border border-orange-300 bg-orange-50 flex justify-between items-center group relative overflow-hidden">
              <div className="relative z-10">
                <div className="font-bold text-orange-900">99204 + {newPtTherapyAddOn}</div>
                <div className="text-xs text-orange-800">Moderate Intake + Therapy</div>
                <div className="text-[10px] text-orange-600 mt-1 font-semibold italic">&quot;Highly Profitable&quot; for Moderate MDM</div>
              </div>
              <div className="text-right relative z-10">
                <div className="text-xl font-bold text-orange-700">{formatCurrency(getNewPatientComboTotal('99204', newPtTherapyAddOn))}</div>
                <button onClick={() => copyNote('new_pt_combo_99204')} className="text-xs text-orange-700 hover:text-orange-900 underline mt-1 font-bold">📋 Copy Note</button>
              </div>
            </div>

            {/* 99205 Combo Card */}
            <div className="p-4 rounded-lg border border-green-600 bg-green-50 flex justify-between items-center group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-200 text-green-800 text-[10px] px-2 py-0.5 rounded-bl font-bold">MAXIMIZER</div>
              <div className="relative z-10">
                <div className="font-bold text-green-900">99205 + {newPtTherapyAddOn}</div>
                <div className="text-xs text-green-800">High Intake + Therapy</div>
                <div className="text-[10px] text-green-600 mt-1 font-semibold italic">Requires High MDM</div>
              </div>
              <div className="text-right relative z-10">
                <div className="text-xl font-bold text-green-700">{formatCurrency(getNewPatientComboTotal('99205', newPtTherapyAddOn))}</div>
                <button onClick={() => copyNote('new_pt_combo_99205')} className="text-xs text-green-700 hover:text-green-900 underline mt-1 font-bold">📋 Copy Note</button>
              </div>
            </div>

            {/* Standard 90792 Card */}
            <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center group">
                <div>
                    <div className="font-bold text-slate-800">90792</div>
                    <div className="text-xs text-slate-500">Standard Intake (No Therapy Add-on)</div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">{formatCurrency(getRate('90792'))}</div>
                    <button onClick={() => copyNote('90792')} className="text-xs text-blue-500 hover:text-blue-700 underline mt-1 font-bold">📋 Copy Note</button>
                </div>
                </div>
            </div>
            
          </div>
        )}

        {/* TAB 2: MED CHECK */}
        {activeTab === 'med_check' && (
          <div className="p-6 space-y-4">
            <h2 className="font-bold text-lg mb-2">Medication Management (E/M Only)</h2>
            <button onClick={() => setShowMDMWizard(!showMDMWizard)} className="w-full py-2 bg-indigo-100 text-indigo-700 font-bold rounded hover:bg-indigo-200 transition text-sm">
              {showMDMWizard ? "Hide MDM Wizard" : "🧙‍♂️ Launch MDM Wizard (99213 vs 99214)"}
            </button>

            {showMDMWizard && (
              <div className="bg-slate-100 p-4 rounded-lg space-y-4 border border-slate-200">
                 <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Patient Status (Problems)</label>
                  <div className="flex space-x-2">
                    <button onClick={() => setProblemLevel('low')} className={`flex-1 py-2 text-xs rounded border ${problemLevel === 'low' ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-slate-50'}`}>Stable</button>
                    <button onClick={() => setProblemLevel('moderate')} className={`flex-1 py-2 text-xs rounded border ${problemLevel === 'moderate' ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-slate-50'}`}>Worsening</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Intervention (Risk)</label>
                  <div className="flex space-x-2">
                    <button onClick={() => setRiskLevel('low')} className={`flex-1 py-2 text-xs rounded border ${riskLevel === 'low' ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-slate-50'}`}>No Meds</button>
                    <button onClick={() => setRiskLevel('moderate')} className={`flex-1 py-2 text-xs rounded border ${riskLevel === 'moderate' ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-slate-50'}`}>Prescription</button>
                  </div>
                </div>
                <div className={`p-3 rounded text-sm border ${problemLevel === 'moderate' && riskLevel === 'moderate' ? 'bg-green-100 border-green-300 text-green-900' : 'bg-yellow-100 border-yellow-300 text-yellow-900'}`}>
                  {problemLevel === 'moderate' && riskLevel === 'moderate' ? "✅ Recommended: 99214" : "⚠️ Recommended: 99213"}
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <div><div className="font-bold">99213</div><div className="text-sm text-slate-500">Stable Refill</div></div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(getRate('99213'))}</div>
                <button onClick={() => copyNote('med_check_low')} className="text-xs text-blue-500 hover:text-blue-700 underline mt-1 font-bold">📋 Copy Note</button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <div><div className="font-bold">99214</div><div className="text-sm text-slate-500">Complex/Adjust</div></div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(getRate('99214'))}</div>
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
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Medical (E/M)</label>
                <select aria-label="Medical (E/M)" value={comboMedical} onChange={(e) => setComboMedical(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded">
                  <option value="99213">99213 (Low)</option>
                  <option value="99214">99214 (Mod)</option>
                  <option value="99215">99215 (High)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Therapy (Add-on)</label>
                <select aria-label="Therapy (Add-on)" value={comboTherapy} onChange={(e) => setComboTherapy(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded">
                  <option value="90833">16-37m (90833)</option>
                  <option value="90836">38-52m (90836)</option>
                  <option value="90838">53m+ (90838)</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-lg text-center shadow-lg relative">
              <div className="text-sm text-slate-400 uppercase tracking-widest mb-1">Total Revenue</div>
              <div className="text-4xl font-bold">{formatCurrency(getComboTotal())}</div>
              <button onClick={() => copyNote('combo')} className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center justify-center mx-auto">
                📋 Copy Note for EMR
              </button>
              <div className="text-xs text-red-400 mt-2">REQUIRED: Modifier 25 on the E/M code.</div>
            </div>
          </div>
        )}

        {/* TAB 4: THERAPY SUITE */}
        {activeTab === 'psychotherapy' && (
          <div className="p-6 space-y-4">
            <h2 className="font-bold text-lg mb-2">Therapy Suite (Therapy Only)</h2>
            <div className="flex bg-slate-100 p-1 rounded-lg mb-4 text-xs font-bold uppercase overflow-x-auto">
              {['individual', 'family', 'crisis', 'group'].map((type) => (
                <button key={type} onClick={() => setTherapyType(type)} className={`flex-1 py-2 px-3 rounded capitalize ${therapyType === type ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>{type}</button>
              ))}
            </div>
            
            {therapyType === 'individual' && (
               <div className="space-y-3">
                 {[{c:'90832',l:'30m'},{c:'90834',l:'45m'},{c:'90837',l:'60m'}].map(i=>(
                   <div key={i.c} className="p-3 bg-white border rounded flex justify-between"><span>{i.l} ({i.c})</span><span className="font-bold">{formatCurrency(getRate(i.c))}</span></div>
                 ))}
                 <div className="text-xs text-red-600 p-2 border border-red-200 bg-red-50 rounded">Use codes 90832/34/37 only when NO separate E/M work is done.</div>
               </div>
            )}
            {therapyType === 'family' && (
               <div className="space-y-3">
                 {[{c:'90846',l:'No Patient'},{c:'90847',l:'With Patient'}].map(i=>(
                   <div key={i.c} className="p-3 bg-white border rounded flex justify-between"><span>{i.l} ({i.c})</span><span className="font-bold">{formatCurrency(getRate(i.c))}</span></div>
                 ))}
               </div>
            )}
            {therapyType === 'crisis' && (
               <div className="space-y-3">
                 <div className="bg-red-50 p-3 rounded text-sm text-red-800 border border-red-200 mb-2">
                   <strong>Alert:</strong> Cannot be billed with 90792 or 992xx on the same day.
                 </div>
                 {[{c:'90839',l:'First 60m'},{c:'90840',l:'Add\'l 30m'}].map(i=>(
                   <div key={i.c} className="p-3 bg-white border border-red-100 rounded flex justify-between"><span>{i.l} ({i.c})</span><span className="font-bold text-red-600">{formatCurrency(getRate(i.c))}</span></div>
                 ))}
               </div>
            )}
             {therapyType === 'group' && (
               <div className="p-3 bg-white border rounded flex justify-between"><span>Group (90853)</span><span className="font-bold">{formatCurrency(getRate('90853'))}</span></div>
            )}
          </div>
        )}
        
        {/* TAB 5: ADDITIONAL REVENUE */}
        {activeTab === 'additional_revenue' && (
          <div className="p-6 space-y-6">
            <h2 className="font-bold text-lg mb-4">Additional Revenue Opportunities</h2>
            
            {/* Caregiver Training Services (CTS) */}
            <div className="space-y-3">
                <h3 className="font-bold text-md text-slate-700 border-b pb-1">Caregiver Training Services (CTS)</h3>
                <div className="text-xs text-slate-500 mb-2">For teaching parents/spouses skills to manage the patient&apos;s condition (not relationship-focused like family therapy).</div>
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

            {/* Digital Mental Health Treatment (DMHT) */}
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