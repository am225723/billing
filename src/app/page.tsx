"use client";

import { useState } from "react";
import { PAYERS } from "../data/data";

type PayerKey = keyof typeof PAYERS;
type Tab = "intake" | "medcheck" | "combo" | "therapy";

// Wizard State Types
type ProblemLevel = "low" | "moderate";
type RiskLevel = "low" | "moderate";
type IntakeTherapy = "yes" | "no";
type IntakeTime = "30-44" | "45-59" | "60+";
type IntakeComplexity = "moderate" | "high";

type ComboMedicalCode = "99213" | "99214";
type ComboTherapyCode = "90833" | "90836" | "90838";
type TherapyCode = "90834" | "90837";

export default function Home() {
  const [selectedPayer, setSelectedPayer] = useState<PayerKey>("anthem");
  const [activeTab, setActiveTab] = useState<Tab>("intake");
  const [interactiveComplexity, setInteractiveComplexity] = useState(false);

  // MDM Wizard State (Follow-Up / Med Check)
  const [showWizard, setShowWizard] = useState(false);
  const [problemLevel, setProblemLevel] = useState<ProblemLevel>("low");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("low");

  // Intake Strategy Wizard State (New Patient)
  const [showIntakeWizard, setShowIntakeWizard] = useState(false);
  const [intakeTherapy, setIntakeTherapy] = useState<IntakeTherapy>("no");
  const [intakeTime, setIntakeTime] = useState<IntakeTime>("30-44");
  const [intakeComplexity, setIntakeComplexity] = useState<IntakeComplexity>("moderate");

  // Combo Visit State
  const [comboMedicalCode, setComboMedicalCode] = useState<ComboMedicalCode>("99213");
  const [comboTherapyCode, setComboTherapyCode] = useState<ComboTherapyCode>("90833");

  // Psychotherapy State
  const [therapyCode, setTherapyCode] = useState<TherapyCode>("90834");

  const payer = PAYERS[selectedPayer];
  const rates = payer.rates;

  // Interactive Complexity Fee
  const icFee = interactiveComplexity ? rates["90785"] : 0;

  // --- Calculations ---

  // 1. Intake Calculations
  const standardIntakeBase = rates["90792"];
  const standardIntakeTotal = standardIntakeBase + icFee;
  const maximizerBase = rates["99205"] + rates["90838"];
  const maximizerTotal = maximizerBase + icFee;
  const intakeDifference = maximizerTotal - standardIntakeTotal;

  // 2. Med Check (Brief Follow-Up) Calculations
  const followUp99213Base = rates["99213"];
  const followUp99213Total = followUp99213Base + icFee;
  const followUp99214Base = rates["99214"];
  const followUp99214Total = followUp99214Base + icFee;

  // MDM Logic (Med Check)
  const recommend99214 = problemLevel === "moderate" && riskLevel === "moderate";

  // Intake Strategy Logic
  let intakeRecommendation = "";
  let intakeReason = "";
  let intakeAlertClass = "bg-blue-50 border-blue-200 text-blue-900";

  if (intakeTherapy === "yes") {
    intakeReason = "💡 You cannot bill 90792 with therapy. You must use E/M codes.";
    if (intakeTime === "60+" || intakeComplexity === "high") {
      intakeRecommendation = "Recommend: 99205 + 90838 (The \"Maximizer\")";
    } else {
      intakeRecommendation = "Recommend: 99204 + 90836";
    }
  } else {
    // Therapy = NO
    if (selectedPayer === "anthem") {
      intakeRecommendation = "Recommend: 90792";
      intakeReason = "💰 Anthem pays ~$25 MORE for 90792 than 99205. Stick to 90792 unless you need add-on codes.";
      intakeAlertClass = "bg-green-100 border-green-200 text-green-900";
    } else {
      if (intakeTime === "60+" || intakeComplexity === "high") {
        intakeRecommendation = "Recommend: 99205";
      } else {
        intakeRecommendation = "Recommend: 90792";
      }
    }
  }

  // 3. Combo Visit Calculations
  const comboMedicalRate = rates[comboMedicalCode];
  const comboTherapyRate = rates[comboTherapyCode];
  // Note: Interactive complexity usually applies to the primary service or the session.
  // Assuming it adds to the total session value.
  const comboTotal = comboMedicalRate + comboTherapyRate + icFee;

  // 4. Psychotherapy Calculations
  const therapyBase = rates[therapyCode];
  const therapyTotal = therapyBase + icFee;


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <main className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Psychiatry Billing Command Center
          </h1>
          <p className="text-slate-600">
            Optimize your reimbursement rates with real-time calculations.
          </p>
        </header>

        {/* Controls Section */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Payer Selector */}
            <div className="flex flex-col space-y-2">
              <label htmlFor="payer-select" className="text-sm font-medium text-gray-700">
                Select Payer
              </label>
              <select
                id="payer-select"
                value={selectedPayer}
                onChange={(e) => setSelectedPayer(e.target.value as PayerKey)}
                className="rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border bg-white"
              >
                {Object.entries(PAYERS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Interactive Complexity Checkbox */}
            <div className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <input
                id="interactive-complexity"
                type="checkbox"
                checked={interactiveComplexity}
                onChange={(e) => setInteractiveComplexity(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="interactive-complexity" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                Interactive Complexity (+90785)
                <span className="ml-1 text-gray-500">
                  ({formatCurrency(rates["90785"])})
                </span>
              </label>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
              {[
                { id: "intake", label: "New Patient (Intake)" },
                { id: "medcheck", label: "Med Check (Brief)" },
                { id: "combo", label: "Combo Visit (Meds + Therapy)" },
                { id: "therapy", label: "Psychotherapy (Therapy Only)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`whitespace-nowrap border-b-2 py-4 px-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid gap-6">

          {/* TAB A: NEW PATIENT */}
          {activeTab === "intake" && (
            <div className="space-y-6">

              {/* Intake Strategy Wizard */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowIntakeWizard(!showIntakeWizard)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    🚀 Intake Strategy Wizard
                  </span>
                  <span className="text-gray-500">
                    {showIntakeWizard ? "▲" : "▼"}
                  </span>
                </button>

                {showIntakeWizard && (
                  <div className="p-6 space-y-6">
                    {/* Q1: Therapy */}
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">1. Did you include Psychotherapy?</p>
                      <div className="flex gap-4">
                         <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${intakeTherapy === 'yes' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="intakeTherapy" value="yes" checked={intakeTherapy === "yes"} onChange={() => setIntakeTherapy("yes")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-2 text-sm text-gray-700">Yes (Unlocks E/M + Therapy)</span>
                        </label>
                        <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${intakeTherapy === 'no' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="intakeTherapy" value="no" checked={intakeTherapy === "no"} onChange={() => setIntakeTherapy("no")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-2 text-sm text-gray-700">No (Unlocks 90792)</span>
                        </label>
                      </div>
                    </div>
                    {/* Q2: Time */}
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">2. Total Face-to-Face Time?</p>
                      <div className="flex flex-wrap gap-4">
                        {(["30-44", "45-59", "60+"] as const).map((opt) => (
                           <label key={opt} className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${intakeTime === opt ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            <input type="radio" name="intakeTime" value={opt} checked={intakeTime === opt} onChange={() => setIntakeTime(opt)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                            <span className="ml-2 text-sm text-gray-700">{opt} mins</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Q3: Complexity */}
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">3. Medical Complexity / Risk?</p>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${intakeComplexity === 'moderate' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="intakeComplexity" value="moderate" checked={intakeComplexity === "moderate"} onChange={() => setIntakeComplexity("moderate")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-2 text-sm text-gray-700">Moderate (Standard Prescription Mgmt)</span>
                        </label>
                        <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors ${intakeComplexity === 'high' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="intakeComplexity" value="high" checked={intakeComplexity === "high"} onChange={() => setIntakeComplexity("high")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-2 text-sm text-gray-700">High (Severe Crisis, Threat to Life)</span>
                        </label>
                      </div>
                    </div>
                    {/* Result */}
                    <div className={`p-4 rounded-lg border ${intakeAlertClass}`}>
                      <div className="font-bold mb-1 text-lg">{intakeRecommendation}</div>
                      {intakeReason && <div className="text-sm">{intakeReason}</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Standard Intake */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Standard Intake</h3>
                  <p className="text-sm text-gray-500">Code 90792</p>
                  <div className="mt-4 text-3xl font-bold text-gray-900">{formatCurrency(standardIntakeTotal)}</div>
                  {interactiveComplexity && <p className="mt-1 text-xs text-green-600 font-medium">Includes +{formatCurrency(rates["90785"])} (90785)</p>}
                </div>
                {/* Maximizer */}
                <div className="rounded-xl bg-blue-50 p-6 shadow-sm border border-blue-100 ring-1 ring-blue-500/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-blue-900">Maximizer</h3>
                    <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-800">Recommended</span>
                  </div>
                  <p className="text-sm text-blue-700">Code 99205 + 90838</p>
                  <div className="mt-4 text-3xl font-bold text-blue-900">{formatCurrency(maximizerTotal)}</div>
                   {interactiveComplexity && <p className="mt-1 text-xs text-blue-700 font-medium">Includes +{formatCurrency(rates["90785"])} (90785)</p>}
                </div>
              </div>

              {/* Comparison */}
              <div className="rounded-xl bg-green-50 p-6 text-center border border-green-100">
                <p className="text-sm font-medium text-green-800">Potential Revenue Increase</p>
                <div className="mt-1 text-4xl font-extrabold text-green-600">+{formatCurrency(intakeDifference)}</div>
                <p className="mt-2 text-sm text-green-700">By using the Maximizer strategy instead of Standard Intake.</p>
              </div>
            </div>
          )}

          {/* TAB B: MED CHECK (BRIEF) */}
          {activeTab === "medcheck" && (
            <div className="space-y-6">

              {/* MDM Wizard */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowWizard(!showWizard)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <span className="text-lg font-semibold text-gray-900">🧙‍♂️ MDM Wizard (99213 vs 99214)</span>
                  <span className="text-gray-500">{showWizard ? "▲" : "▼"}</span>
                </button>

                {showWizard && (
                  <div className="p-6 space-y-6">
                    {/* Q1: Status */}
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">1. Patient Status?</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${problemLevel === 'low' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="problemLevel" value="low" checked={problemLevel === "low"} onChange={() => setProblemLevel("low")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-3 text-sm text-gray-700">Stable / Improving</span>
                        </label>
                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${problemLevel === 'moderate' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="problemLevel" value="moderate" checked={problemLevel === "moderate"} onChange={() => setProblemLevel("moderate")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-3 text-sm text-gray-700">Worsening / New Issue / 2+ Stable Issues</span>
                        </label>
                      </div>
                    </div>
                    {/* Q2: Intervention */}
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">2. Intervention?</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${riskLevel === 'low' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="riskLevel" value="low" checked={riskLevel === "low"} onChange={() => setRiskLevel("low")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-3 text-sm text-gray-700">Therapy only / No Med changes</span>
                        </label>
                        <label className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${riskLevel === 'moderate' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input type="radio" name="riskLevel" value="moderate" checked={riskLevel === "moderate"} onChange={() => setRiskLevel("moderate")} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                          <span className="ml-3 text-sm text-gray-700">Prescription Management</span>
                        </label>
                      </div>
                    </div>
                    {/* Result */}
                    {recommend99214 ? (
                      <div className="p-4 rounded-lg bg-green-100 border border-green-200 text-green-800">
                        <div className="font-bold mb-1">✅ 99214 Recommended. (Moderate Complexity).</div>
                        <div className="text-sm">You have both a qualifying problem and risk.</div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
                        <div className="font-bold mb-1">⚠️ 99213 Recommended. (Low Complexity).</div>
                        <div className="text-sm">You generally need BOTH a complex problem AND prescription management to bill 99214.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* 99213 Card */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Level 3 Visit</h3>
                  <p className="text-sm text-gray-500">Code 99213</p>
                  <div className="mt-4 text-3xl font-bold text-gray-900">{formatCurrency(followUp99213Total)}</div>
                  {interactiveComplexity && <p className="mt-1 text-xs text-green-600 font-medium">Includes +{formatCurrency(rates["90785"])} (90785)</p>}
                </div>
                {/* 99214 Card */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Level 4 Visit</h3>
                  <p className="text-sm text-gray-500">Code 99214</p>
                  <div className="mt-4 text-3xl font-bold text-gray-900">{formatCurrency(followUp99214Total)}</div>
                  {interactiveComplexity && <p className="mt-1 text-xs text-green-600 font-medium">Includes +{formatCurrency(rates["90785"])} (90785)</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB C: COMBO VISIT */}
          {activeTab === "combo" && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Combo Visit Calculator</h2>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Medical Code Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Medical Code</label>
                    <select
                      value={comboMedicalCode}
                      onChange={(e) => setComboMedicalCode(e.target.value as ComboMedicalCode)}
                      className="w-full rounded-lg border-gray-300 shadow-sm py-2 px-3 border bg-white"
                    >
                      <option value="99213">99213 (Level 3)</option>
                      <option value="99214">99214 (Level 4)</option>
                    </select>
                    <p className="text-sm text-gray-500">Rate: {formatCurrency(comboMedicalRate)}</p>
                  </div>

                  {/* Therapy Code Selector */}
                   <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Therapy Add-on Code</label>
                    <select
                      value={comboTherapyCode}
                      onChange={(e) => setComboTherapyCode(e.target.value as ComboTherapyCode)}
                      className="w-full rounded-lg border-gray-300 shadow-sm py-2 px-3 border bg-white"
                    >
                      <option value="90833">16-37 mins (90833)</option>
                      <option value="90836">38-52 mins (90836)</option>
                      <option value="90838">53+ mins (90838)</option>
                    </select>
                     <p className="text-sm text-gray-500">Rate: {formatCurrency(comboTherapyRate)}</p>
                  </div>
                </div>

                {/* Result */}
                <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-slate-600 mb-2">Total Combined Revenue</p>
                  <div className="text-4xl font-bold text-slate-900">
                    {formatCurrency(comboMedicalRate)} + {formatCurrency(comboTherapyRate)} = {formatCurrency(comboTotal)}
                  </div>
                   {interactiveComplexity && <p className="mt-2 text-sm text-green-600 font-medium">Includes +{formatCurrency(icFee)} (90785)</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB D: PSYCHOTHERAPY */}
          {activeTab === "therapy" && (
            <div className="space-y-6">
               <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Psychotherapy (Therapy Only)</h2>

                 <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Select Code</label>
                    <select
                      value={therapyCode}
                      onChange={(e) => setTherapyCode(e.target.value as TherapyCode)}
                      className="w-full rounded-lg border-gray-300 shadow-sm py-2 px-3 border bg-white max-w-md"
                    >
                      <option value="90834">45 mins (90834)</option>
                      <option value="90837">60 mins (90837)</option>
                    </select>
                  </div>

                  {/* Result */}
                   <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-slate-600 mb-2">Reimbursement Rate</p>
                    <div className="text-4xl font-bold text-slate-900">
                      {formatCurrency(therapyTotal)}
                    </div>
                     {interactiveComplexity && <p className="mt-2 text-sm text-green-600 font-medium">Includes +{formatCurrency(icFee)} (90785)</p>}
                  </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
