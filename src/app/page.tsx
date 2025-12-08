// app/page.tsx
'use client';

import { useState } from 'react';
import { PAYERS } from './data';

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
    // We tell TypeScript that selectedPayer is a valid key for PAYERS
    const payer = PAYERS[selectedPayer as keyof typeof PAYERS];
    return payer?.rates[code] || 0;
  };

  // Helper for Combo Total
  const getComboTotal = () => {
    const medRate = getRate(comboMedical);
    const therapyRate = getRate(comboTherapy);
    return medRate + therapyRate;
  };

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
            className={`flex
