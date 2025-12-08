"use client";

import { useState } from "react";
import { PAYERS } from "../data/data";

type PayerKey = keyof typeof PAYERS;
type Tab = "intake" | "followup";

export default function Home() {
  const [selectedPayer, setSelectedPayer] = useState<PayerKey>("anthem");
  const [activeTab, setActiveTab] = useState<Tab>("intake");
  const [interactiveComplexity, setInteractiveComplexity] = useState(false);

  const payer = PAYERS[selectedPayer];
  const rates = payer.rates;

  // Interactive Complexity Fee
  const icFee = interactiveComplexity ? rates["90785"] : 0;

  // Intake Calculations
  // Standard Intake: 90792
  const standardIntakeBase = rates["90792"];
  const standardIntakeTotal = standardIntakeBase + icFee;

  // Maximizer: 99205 + 90838
  const maximizerBase = rates["99205"] + rates["90838"];
  const maximizerTotal = maximizerBase + icFee;

  const intakeDifference = maximizerTotal - standardIntakeTotal;

  // Follow-Up Calculations
  // Option A: 99213
  const followUp99213Base = rates["99213"];
  const followUp99213Total = followUp99213Base + icFee;

  // Option B: 99214
  const followUp99214Base = rates["99214"];
  const followUp99214Total = followUp99214Base + icFee;


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

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("intake")}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === "intake"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                New Patient Intake
              </button>
              <button
                onClick={() => setActiveTab("followup")}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                  activeTab === "followup"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Follow-Up Visit
              </button>
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid gap-6">
          {activeTab === "intake" && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Standard Intake Card */}
                <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Standard Intake</h3>
                  <p className="text-sm text-gray-500">Code 90792</p>
                  <div className="mt-4 text-3xl font-bold text-gray-900">
                    {formatCurrency(standardIntakeTotal)}
                  </div>
                  {interactiveComplexity && (
                    <p className="mt-1 text-xs text-green-600 font-medium">
                      Includes +{formatCurrency(rates["90785"])} (90785)
                    </p>
                  )}
                </div>

                {/* Maximizer Card */}
                <div className="rounded-xl bg-blue-50 p-6 shadow-sm border border-blue-100 ring-1 ring-blue-500/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-blue-900">Maximizer</h3>
                    <span className="rounded-full bg-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">Code 99205 + 90838</p>
                  <div className="mt-4 text-3xl font-bold text-blue-900">
                    {formatCurrency(maximizerTotal)}
                  </div>
                   {interactiveComplexity && (
                    <p className="mt-1 text-xs text-blue-700 font-medium">
                      Includes +{formatCurrency(rates["90785"])} (90785)
                    </p>
                  )}
                </div>
              </div>

              {/* Comparison Highlight */}
              <div className="rounded-xl bg-green-50 p-6 text-center border border-green-100">
                <p className="text-sm font-medium text-green-800">Potential Revenue Increase</p>
                <div className="mt-1 text-4xl font-extrabold text-green-600">
                  +{formatCurrency(intakeDifference)}
                </div>
                <p className="mt-2 text-sm text-green-700">
                  By using the Maximizer strategy instead of Standard Intake.
                </p>
              </div>
            </div>
          )}

          {activeTab === "followup" && (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Option A Card */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Level 3 Visit</h3>
                <p className="text-sm text-gray-500">Code 99213</p>
                <div className="mt-4 text-3xl font-bold text-gray-900">
                  {formatCurrency(followUp99213Total)}
                </div>
                {interactiveComplexity && (
                    <p className="mt-1 text-xs text-green-600 font-medium">
                      Includes +{formatCurrency(rates["90785"])} (90785)
                    </p>
                  )}
              </div>

              {/* Option B Card */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Level 4 Visit</h3>
                <p className="text-sm text-gray-500">Code 99214</p>
                <div className="mt-4 text-3xl font-bold text-gray-900">
                  {formatCurrency(followUp99214Total)}
                </div>
                {interactiveComplexity && (
                    <p className="mt-1 text-xs text-green-600 font-medium">
                      Includes +{formatCurrency(rates["90785"])} (90785)
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
