// app/page.tsx
'use client';

import { useState } from 'react';
import { PAYERS } from './data';

// --- TYPE DEFINITIONS ---
type Licensure = 'AF' | 'AH' | 'HO' | 'AJ' | 'SA';
type Tab = 'new_patient' | 'med_check' | 'combo' | 'psychotherapy' | 'additional_revenue';

export default function BillingCommandCenter() {
  const [activeTab, setActiveTab] = useState<Tab>('new_patient');
  const [selectedPayer, setSelectedPayer] = useState('anthem');
  
  // --- STATE: Compliance & Setup ---
  const [licensureModifier, setLicensureModifier] = useState<Licensure>('AF'); // Defaulting to AF (Psychiatrist)
  const [isTelehealth, setIsTelehealth] = useState(false);

  // --- STATE: New Patient Wizard ---
  const [showIntakeWizard, setShowIntakeWizard] = useState(false);
  const [intakeTherapy, setIntakeTherapy] = useState('no'); 
  const [intakeTime, setIntakeTime] = useState('standard'); 
  const [intakeRisk, setIntakeRisk] = useState('moderate');
  const [newPtTherapyAddOn, setNewPtTherapyAddOn] = useState('90838');

  // --- STATE: Med Check Wizard ---
  const [showMDMWizard, setShowMDMWizard] = useState(false);
  const [problemLevel, setProblemLevel] = useState('low');
  const [riskLevel, setRiskLevel] = useState('low');

  // --- STATE: Combo Visit ---
  const [comboMedical, setComboMedical] = useState('99214');
  const [comboTherapy, setComboTherapy] = useState('90833');
  
  // --- STATE: Therapy Suite ---
  const [therapyType, setTherapyType] = useState('individual');

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

  const getNewPatientMaximizerTotal = () => {
    const emRate = getRate('99205');
    const therapyRate = getRate(newPtTherapyAddOn);
    return emRate + therapyRate;
  };

  // --- TELEHEALTH LOGIC ---
  const getTelehealthCompliance = () => {
    const payerName = PAYERS[selectedPayer as keyof typeof PAYERS]?.name.toLowerCase();
    
    let pos = "11 (Office)";
    let modifier = "";
    let alert = "";

    if (isTelehealth) {
        if (payerName.includes('medicare')) {
            pos = "10 (Patient Home)";
            modifier = "95 (or 93 for Audio-Only)";
            alert = "Medicare Note: Use POS 10 for higher reimbursement rate.";
        } else if (payerName.includes('blue cross') || payerName.includes('anthem')) {
            pos = "10 or 11 (Check State)";
            modifier = "95 / GT";
            alert = "BCBS Note: Strict documentation required (start/stop times).";
        } else if (payerName.includes('united') || payerName.includes('optum')) {
            pos = "02 (Other Telehealth)";
            modifier = "95 (Informational)";
            alert = "UHC Note: UHC often prefers POS 02.";
        } else {
            pos = "11 (Office/Telehealth)";
            modifier = "95";
            alert = "General Telehealth: Use Modifier 95.";
        }
    }
    
    return { pos, modifier, alert };
  };
  const { pos, modifier, alert } = getTelehealthCompliance();


  // --- FEATURE: Note Generator ---
  const copyNote = (type: string) => {
    let text = "";
    
    if (type === '90792') {
      text = `[LICENSURE: ${licensureModifier}]. Psychiatric diagnostic evaluation with medical services (90792). Comprehensive history, mental status exam, and initial plan formulation completed. Medical decision making included prescription management and ordering of diagnostic studies.`;
    } else if (type === '99205_combo') {
      const therapyMins = newPtTherapyAddOn === '90833' ? '16-37' : newPtTherapyAddOn === '90836' ? '38-52' : '53+';
      text = `[LICENSURE: ${licensureModifier}] [POS: ${isTelehealth ? pos : '11'}]. New Patient Combo (99205-25${isTelehealth ? `-${modifier}` : ''} + ${newPtTherapyAddOn}). High complexity medical decision making due to [severe risk/threat to life/decision to hospitalize]. Separately identifiable psychotherapy (${therapyMins} mins) provided, distinct from medical management. Total face-to-face time >60 minutes.`;
    } else if (type === 'med_check_low') {
      text = `[LICENSURE: ${licensureModifier}] [POS: ${isTelehealth ? pos : '11'}]. Follow-up visit (99213${isTelehealth ? `-${modifier}` : ''}). Patient stable. Reviewed current medications and side effects. Low complexity medical decision making. Plan: Continue current regimen.`;
    } else if (type === 'med_check_mod') {
      text = `[LICENSURE: ${licensureModifier}] [POS: ${isTelehealth ? pos : '11'}]. Follow-up visit (99214${isTelehealth ? `-${modifier}` : ''}). Patient reports [worsening symptoms/new problem]. Moderate complexity medical decision making due to prescription management and problem status. Plan: [Adjusted dose/Added med]. Cigna Alert: Documentation must explicitly justify complexity (e.g., 'management of Lithium, risks discussed').`;
    } else if (type === 'combo') {
      text = `[LICENSURE: ${licensureModifier}] [POS: ${isTelehealth ? pos : '11'}]. Combo Visit (${comboMedical}-25${isTelehealth ? `-${modifier}` : ''} + ${comboTherapy}). Medical management provided for [diagnosis]. Separately identifiable psychotherapy (${comboTherapy === '90833' ? '16-37' : comboTherapy === '90836' ? '38-52' : '53+'} mins) provided. Therapy distinct from medical work, focusing on coping strategies and symptom processing.`;
    }

    // Replace the alert() function with a console log for file generation compliance
    console.log("Note copied to clipboard:", text);
    navigator.clipboard.writeText(text); 
    // Show a custom message box instead of alert, but for simplicity in this final output, we'll use a direct copy instruction.
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        
        {/* Header & Compliance Setup */}
        <div className="bg-slate-900 p-6 text-white">
          <h1 className="text-xl font-bold mb-1">Billing Command Center</h1>
          <p className="text-slate-400 text-sm mb-4">Integrative Psychiatry • Dr. Zelisko</p>
          
          {/* Licensure Selector */}
          <div className="mb-4">
             <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
                Provider Licensure
             </label>
             <select 
                value={licensureModifier}
                onChange={(e) => setLicensureModifier(e.target.value as Licensure)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
             >
                <option value="AF">AF - Psychiatrist (MD/DO)</option>
                <option value="AH">AH - Clinical Psychologist (PhD)</option>
                <option value="HO">HO - Master's Level (LCSW, LPC)</option>
                <option value="SA">SA - Nurse Practitioner (NP)</option>
             </select>
          </div>

          {/* Payer Selector */}
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
                    <p className="font-medium text-red-600">{alert}</p>
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

        {/* TAB 1: NEW PATIENT */}
        {activeTab === 'new_patient' && (
          <div className="p-6 space-y-4">
            <h2 className="font-bold text-lg mb-2">New Patient Intake</h2>
            
            {/* INTAKE STRATEGY WIZARD */}
            <button 
              onClick={() => setShowIntakeWizard(!showIntakeWizard)}
              className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded hover:bg-blue-200 transition text-sm mb-2"
            >
              {showIntakeWizard ? "Hide Wizard" : "🚀 Launch Intake Strategy Wizard"}
            </button>

            {showIntakeWizard && (
              <div className="bg-slate-100 p-4 rounded-lg space-y-3 border border-slate-200 text-sm">
                <div>
                  <span className="font-bold block mb-1">1. Did you do Therapy?</span>
                  <div className="flex space-x-2">
                    <button onClick={() => setIntakeTherapy('yes')} className={`flex-1 py-1 border rounded ${intakeTherapy === 'yes' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Yes</button>
                    <button onClick={() => setIntakeTherapy('no')} className={`flex-1 py-1 border rounded ${intakeTherapy === 'no' ? 'bg-blue-600 text-white' : 'bg-white'}`}>No</button>
                  </div>
                </div>
                <div>
                  <span className="font-bold block mb-1">2. Time Spent?</span>
                  <div className="flex space-x-2">
                    <button onClick={() => setIntakeTime('standard')} className={`flex-1 py-1 border rounded ${intakeTime === 'standard' ? 'bg-blue-600 text-white' : 'bg-white'}`}>30-59m</button>
                    <button onClick={() => setIntakeTime('long')} className={`flex-1 py-1 border rounded ${intakeTime === 'long' ? 'bg-blue-600 text-white' : 'bg-white'}`}>60m+</button>
                  </div>
                </div>
                 <div>
                  <span className="font-bold block mb-1">3. Complexity?</span>
                  <div className="flex space-x-2">
                    <button onClick={() => setIntakeRisk('moderate')} className={`flex-1 py-1 border rounded ${intakeRisk === 'moderate' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Moderate</button>
                    <button onClick={() => setIntakeRisk('high')} className={`flex-1 py-1 border rounded ${intakeRisk === 'high' ? 'bg-blue-600 text-white' : 'bg-white'}`}>High (Crisis)</button>
                  </div>
                </div>
                <div className="p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-900 mt-2">
                  {intakeTherapy === 'yes' ? (
                    <span><strong>Recommendation:</strong> Use <strong>99204/99205 + Therapy Add-on</strong>. (90792 is generally disallowed with separate therapy.)</span>
                  ) : (
                    <span>
                      {selectedPayer === 'anthem' && intakeTime !== 'long' && intakeRisk !== 'high' ? (
                        <span><strong>Recommendation: 90792.</strong> Anthem pays more for this than 99204/5.</span>
                      ) : (
                        <span><strong>Recommendation:</strong> {intakeRisk === 'high' || intakeTime === 'long' ? '99205 (High Complexity)' : '90792 (Standard)'}</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            {/* New Selector for Therapy Time */}
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                    Select Therapy Time (For Maximizer Combo)
                </label>
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
                    Pairs with **99205** for the total below. Remember **Modifier 25** is required!
                </div>
            </div>

            {/* Maximizer Combo Card */}
            <div className="p-4 rounded-lg border border-green-600 bg-green-50 flex justify-between items-center group">
              <div>
                <div className="font-bold text-green-800">MAXIMIZER TOTAL</div>
                <div className="text-sm text-slate-500">99205-25 + {newPtTherapyAddOn}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">{formatCurrency(getNewPatientMaximizerTotal())}</div>
                <button onClick={() => copyNote('99205_combo')} className="text-xs text-green-600 hover:text-green-800 underline mt-1">📋 Copy Note</button>
              </div>
            </div>

            {/* Standard 90792 Card */}
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex justify-between items-center group">
              <div>
                <div className="font-bold text-slate-800">90792</div>
                <div className="text-sm text-slate-500">Standard Psych Intake (No Therapy)</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(getRate('90792'))}</div>
                <button onClick={() => copyNote('90792')} className="text-xs text-blue-500 hover:text-blue-700 underline mt-1">📋 Copy Note</button>
              </div>
            </div>
            
          </div>
        )}

        {/* TAB 2: MED CHECK */}
        {activeTab === 'med_check' && (
          <div className="p-6 space-y-4">
            <h2 className="font-bold text-lg mb-2">Medication Management</h2>
            <button onClick={() => setShowMDMWizard(!showMDMWizard)} className="w-full py-2 bg-indigo-100 text-indigo-700 font-bold rounded hover:bg-indigo-200 transition text-sm">
              {showMDMWizard ? "Hide MDM Wizard" : "🧙‍♂️ Launch MDM Wizard"}
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
                <button onClick={() => copyNote('med_check_low')} className="text-xs text-blue-500 hover:text-blue-700 underline mt-1">📋 Copy Note</button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white flex justify-between items-center">
              <div><div className="font-bold">99214</div><div className="text-sm text-slate-500">Complex/Adjust</div></div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{formatCurrency(getRate('99214'))}</div>
                <button onClick={() => copyNote('med_check_mod')} className="text-xs text-blue-500 hover:text-blue-700 underline mt-1">📋 Copy Note</button>
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
                <select value={comboMedical} onChange={(e) => setComboMedical(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded">
                  <option value="99213">99213 (Low)</option>
                  <option value="99214">99214 (Mod)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Therapy (Add-on)</label>
                <select value={comboTherapy} onChange={(e) => setComboTherapy(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded">
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
                 {[{c:'90846',l:'Family (No Patient)'},{c:'90847',l:'Family (With Patient)'}].map(i=>(
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
