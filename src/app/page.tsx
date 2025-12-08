'use client';

import { useState } from 'react';
import { PAYERS } from '../data/data';

export default function BillingCommandCenter() {
  const [activeTab, setActiveTab] = useState('new_patient');
  const [selectedPayer, setSelectedPayer] = useState('anthem');
  
  // State for MDM Wizard (Med Check)
  const [showMDMWizard, setShowMDMWizard] = useState(false);
  const [problemLevel, setProblemLevel] = useState('low');
  const [riskLevel, setRiskLevel] = useState('low');

  // State for Combo Visit
  const [comboMedical, setComboMedical] = useState('99214');
  const [comboTherapy, setComboTherapy] = useState('90833');

  // State for Therapy Suite
  const [therapyType, setTherapyType] = useState('individual'); // individual, family, crisis, group

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getRate = (code: string): number => {
    const payer = PAYERS[selectedPayer as keyof typeof PAYERS];
    return payer?.rates[code] || 0;
  };

  // Helper for Combo Total
  const getComboTotal = () => {
    const medRate = getRate(comboMedical);
    const therapyRate = getRate(comboTherapy);
    return medRate + therapyRate;
  };

  // Helper for MDM Wizard
  const getMDMCode = () => {
    if (problemLevel === 'high' || riskLevel === 'high') return '99214'; // Simplified for demo
    if (problemLevel === 'moderate' || riskLevel === 'moderate') return '99214';
    return '99213';
  };

  const mdmCode = getMDMCode();

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
        
        {/* Header & Payer Selection */}
        <div className="bg-slate-900 p-6 text-white">
          <h1 className="text-xl font-bold mb-1">Billing Command Center</h1>
          <p className="text-slate-400 text-sm mb-4">Integrative Psychiatry • Dr. Zelisko</p>
          
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
            Select Payer
          </label>
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

        {/* 4-Tab Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-bold uppercase tracking-wide">
          <button 
            onClick={() => setActiveTab('new_patient')}
            className={`flex-1 py-3 text-center ${activeTab === 'new_patient' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            New Pt
          </button>
          <button 
            onClick={() => setActiveTab('med_check')}
            className={`flex-1 py-3 text-center ${activeTab === 'med_check' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Med Check
          </button>
          <button
            onClick={() => setActiveTab('combo')}
            className={`flex-1 py-3 text-center ${activeTab === 'combo' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Combo
          </button>
          <button
            onClick={() => setActiveTab('psychotherapy')}
            className={`flex-1 py-3 text-center ${activeTab === 'psychotherapy' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Therapy
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6">

          {/* New Patient Tab */}
          {activeTab === 'new_patient' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Intake Strategy</h2>
              <div className="grid gap-3">
                 <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">90792</div>
                      <div className="text-xs text-slate-500">Psychiatric Diagnostic Evaluation</div>
                    </div>
                    <div className="text-lg font-mono font-bold text-green-600">{formatCurrency(getRate('90792'))}</div>
                 </div>
                 <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">99205</div>
                      <div className="text-xs text-slate-500">High Complexity Intake</div>
                    </div>
                    <div className="text-lg font-mono font-bold text-green-600">{formatCurrency(getRate('99205'))}</div>
                 </div>
                 <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">99204</div>
                      <div className="text-xs text-slate-500">Moderate Complexity Intake</div>
                    </div>
                    <div className="text-lg font-mono font-bold text-green-600">{formatCurrency(getRate('99204'))}</div>
                 </div>
              </div>
            </div>
          )}

          {/* Med Check Tab */}
          {activeTab === 'med_check' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Med Check</h2>
                <button
                   onClick={() => setShowMDMWizard(!showMDMWizard)}
                   className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-bold"
                >
                  {showMDMWizard ? 'Hide Wizard' : 'MDM Wizard'}
                </button>
              </div>

              {showMDMWizard && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-800 mb-1">Problem Complexity</label>
                    <div className="flex gap-2">
                      {['low', 'moderate', 'high'].map((l) => (
                        <button
                          key={l}
                          onClick={() => setProblemLevel(l)}
                          className={`flex-1 py-1 px-2 rounded text-xs capitalize border ${problemLevel === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-800 border-blue-200'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-800 mb-1">Risk Level</label>
                    <div className="flex gap-2">
                      {['low', 'moderate', 'high'].map((l) => (
                        <button
                          key={l}
                          onClick={() => setRiskLevel(l)}
                          className={`flex-1 py-1 px-2 rounded text-xs capitalize border ${riskLevel === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-800 border-blue-200'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-blue-900">Recommended Code:</span>
                    <span className="text-lg font-bold text-blue-700">{mdmCode}</span>
                  </div>
                </div>
              )}

              <div className={`p-4 rounded-lg border ${(!showMDMWizard || mdmCode === '99214') ? 'bg-green-50 border-green-200 ring-2 ring-green-500' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">99214</div>
                      <div className="text-xs text-slate-500">Moderate Complexity (25 mins)</div>
                    </div>
                    <div className="text-lg font-mono font-bold text-green-600">{formatCurrency(getRate('99214'))}</div>
                 </div>
              </div>

              <div className={`p-4 rounded-lg border ${(!showMDMWizard || mdmCode === '99213') ? 'bg-green-50 border-green-200 ring-2 ring-green-500' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">99213</div>
                      <div className="text-xs text-slate-500">Low Complexity (15 mins)</div>
                    </div>
                    <div className="text-lg font-mono font-bold text-green-600">{formatCurrency(getRate('99213'))}</div>
                 </div>
              </div>

            </div>
          )}

          {/* Combo Visit Tab */}
          {activeTab === 'combo' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Combo Visit Calculator</h2>

              <div className="space-y-3">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Medical Code (E/M)</label>
                   <div className="flex gap-2">
                     <button
                        onClick={() => setComboMedical('99214')}
                        className={`flex-1 py-2 px-3 rounded text-sm font-bold border ${comboMedical === '99214' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                     >
                       99214
                     </button>
                     <button
                        onClick={() => setComboMedical('99213')}
                        className={`flex-1 py-2 px-3 rounded text-sm font-bold border ${comboMedical === '99213' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                     >
                       99213
                     </button>
                   </div>
                   <div className="text-right text-xs font-mono text-slate-400 mt-1">{formatCurrency(getRate(comboMedical))}</div>
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">Therapy Add-on</label>
                   <select
                     value={comboTherapy}
                     onChange={(e) => setComboTherapy(e.target.value)}
                     className="w-full bg-white border border-slate-300 text-slate-900 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                   >
                     <option value="90833">90833 (16-37 mins)</option>
                     <option value="90836">90836 (38-52 mins)</option>
                     <option value="90838">90838 (53+ mins)</option>
                   </select>
                   <div className="text-right text-xs font-mono text-slate-400 mt-1">{formatCurrency(getRate(comboTherapy))}</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-900 text-white rounded-lg flex justify-between items-center">
                 <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide font-bold">Total Revenue</div>
                    <div className="text-xs text-slate-500">
                      {comboMedical} + {comboTherapy}
                    </div>
                 </div>
                 <div className="text-2xl font-mono font-bold text-green-400">{formatCurrency(getComboTotal())}</div>
              </div>
            </div>
          )}

          {/* Psychotherapy Tab */}
          {activeTab === 'psychotherapy' && (
             <div className="space-y-4">
               <h2 className="text-lg font-bold text-slate-800">Psychotherapy Suite</h2>

               <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                 {['individual', 'family', 'crisis', 'group'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTherapyType(t)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${therapyType === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                 ))}
               </div>

               <div className="space-y-3">
                 {therapyType === 'individual' && (
                    <>
                      {['90832', '90834', '90837'].map(code => (
                         <div key={code} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                            <div>
                               <div className="font-bold text-slate-900">{code}</div>
                               <div className="text-xs text-slate-500">
                                 {code === '90832' ? '30 mins' : code === '90834' ? '45 mins' : '60 mins'}
                               </div>
                            </div>
                            <div className="font-mono font-bold text-slate-700">{formatCurrency(getRate(code))}</div>
                         </div>
                      ))}
                    </>
                 )}
                 {therapyType === 'family' && (
                    <>
                      {['90846', '90847'].map(code => (
                         <div key={code} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                            <div>
                               <div className="font-bold text-slate-900">{code}</div>
                               <div className="text-xs text-slate-500">
                                 {code === '90846' ? 'Without Patient' : 'With Patient'}
                               </div>
                            </div>
                            <div className="font-mono font-bold text-slate-700">{formatCurrency(getRate(code))}</div>
                         </div>
                      ))}
                    </>
                 )}
                 {therapyType === 'crisis' && (
                    <>
                      {['90839', '90840'].map(code => (
                         <div key={code} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                            <div>
                               <div className="font-bold text-slate-900">{code}</div>
                               <div className="text-xs text-slate-500">
                                 {code === '90839' ? 'First 60 mins' : 'Addl 30 mins'}
                               </div>
                            </div>
                            <div className="font-mono font-bold text-slate-700">{formatCurrency(getRate(code))}</div>
                         </div>
                      ))}
                    </>
                 )}
                 {therapyType === 'group' && (
                    <>
                      {['90853'].map(code => (
                         <div key={code} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                            <div>
                               <div className="font-bold text-slate-900">{code}</div>
                               <div className="text-xs text-slate-500">
                                 Group Therapy
                               </div>
                            </div>
                            <div className="font-mono font-bold text-slate-700">{formatCurrency(getRate(code))}</div>
                         </div>
                      ))}
                    </>
                 )}
               </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
