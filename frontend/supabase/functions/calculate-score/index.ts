import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Zimscore Formulas (Python model ported to TypeScript) ───

function calcIncomeStability(weeklyIncomes: number[]): {
  score: number;
  avgIncome: number;
  avgDeviation: number;
} {
  if (weeklyIncomes.length < 2)
    return { score: 50, avgIncome: 0, avgDeviation: 25 };

  const avg =
    weeklyIncomes.reduce((a, b) => a + b, 0) / weeklyIncomes.length;
  if (avg === 0) return { score: 50, avgIncome: 0, avgDeviation: 25 };

  const deviations = weeklyIncomes.map(
    (w) => (Math.abs(w - avg) / avg) * 100
  );
  const avgDev =
    deviations.reduce((a, b) => a + b, 0) / deviations.length;

  const score = Math.max(0, Math.min(100, 100 - avgDev * 2));
  return {
    score: Math.round(score * 10) / 10,
    avgIncome: Math.round(avg * 100) / 100,
    avgDeviation: Math.round(avgDev * 10) / 10,
  };
}

function calcExpenseRatio(
  totalIncome: number,
  totalExpenses: number
): { score: number; ratio: number } {
  if (totalIncome === 0) return { score: 0, ratio: 1 };
  const ratio = totalExpenses / totalIncome;
  let score: number;
  if (ratio <= 0.5) {
    score = 100;
  } else {
    score = 100 - (ratio - 0.5) * 200;
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)),
    ratio: Math.round(ratio * 1000) / 1000,
  };
}

function calcPaymentHistory(
  onTimeCount: number,
  totalPayments: number,
  monthsActive: number,
  lateCount: number
): number {
  if (totalPayments === 0) return 50;
  const onTimePct = onTimeCount / totalPayments;
  const freqBonus = Math.min(10, monthsActive * 2);
  const latePenalty = lateCount * 5;
  const score = onTimePct * 100 + freqBonus - latePenalty;
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

function calcSavingsBehaviour(
  weeklyBalances: number[],
  threshold = 20
): { score: number; savingsFreq: number; avgBalance: number } {
  if (weeklyBalances.length < 2)
    return { score: 25, savingsFreq: 0, avgBalance: 0 };

  let savingWeeks = 0;
  const measurable = weeklyBalances.length - 1;
  for (let i = 1; i < weeklyBalances.length; i++) {
    if (weeklyBalances[i] - weeklyBalances[i - 1] >= threshold) {
      savingWeeks++;
    }
  }

  const savingsFreq = measurable > 0 ? savingWeeks / measurable : 0;
  const avgBalance =
    weeklyBalances.reduce((a, b) => a + b, 0) / weeklyBalances.length;
  const avgBalanceMod = Math.min(50, avgBalance / 5);
  const score = savingsFreq * 50 + avgBalanceMod;

  return {
    score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)),
    savingsFreq: Math.round(savingsFreq * 1000) / 1000,
    avgBalance: Math.round(avgBalance * 100) / 100,
  };
}

function calcRepaymentHistory(
  loans: Array<{
    repaidOnTime: boolean;
    daysEarly: number;
    daysLate: number;
  }>
): number {
  if (loans.length === 0) return 0;
  const onTime = loans.filter((l) => l.repaidOnTime).length;
  const earlyBonus = loans.reduce(
    (sum, l) => sum + Math.min(5, l.daysEarly),
    0
  );
  const latePenalty = loans.reduce((sum, l) => sum + l.daysLate * 3, 0);
  const base = (onTime / loans.length) * 100;
  return Math.max(0, Math.min(100, Math.round((base + earlyBonus - latePenalty) * 10) / 10));
}

function calcCreditUtilization(
  currentDebt: number,
  monthlyIncome: number
): number {
  if (monthlyIncome === 0) return 0;
  const ratio = currentDebt / monthlyIncome;
  if (ratio <= 0.3) return 100;
  return Math.max(0, Math.round((100 - (ratio - 0.3) * 250) * 10) / 10);
}

function calcHistoryLength(monthsData: number, numLoans: number): number {
  const monthScore = Math.min(60, monthsData * 6.67);
  const loanScore = Math.min(40, numLoans * 13.33);
  return Math.min(100, Math.round((monthScore + loanScore) * 10) / 10);
}

function getBand(score: number): { band: string; riskLevel: string } {
  if (score >= 750) return { band: "Excellent", riskLevel: "Very Low" };
  if (score >= 650) return { band: "Very Good", riskLevel: "Low" };
  if (score >= 500) return { band: "Good", riskLevel: "Medium" };
  if (score >= 300) return { band: "Fair", riskLevel: "High" };
  return { band: "Poor", riskLevel: "Very High" };
}

function calcConfidence(monthsOfData: number): number {
  return Math.min(90, monthsOfData * 15 + 25);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      weeklyIncomes = [],
      weeklyExpenses = [],
      weeklyBalances = [],
      onTimePayments = 0,
      totalPayments = 0,
      latePayments = 0,
      monthsOfData = 3,
      // Phase 2
      loans = [],
      currentDebt = 0,
      monthlyIncome = 0,
    } = body;

    const totalIncome = weeklyIncomes.reduce(
      (a: number, b: number) => a + b,
      0
    );
    const totalExp = weeklyExpenses.reduce(
      (a: number, b: number) => a + b,
      0
    );

    const income = calcIncomeStability(weeklyIncomes);
    const expense = calcExpenseRatio(totalIncome, totalExp);
    const payment = calcPaymentHistory(
      onTimePayments,
      totalPayments,
      monthsOfData,
      latePayments
    );
    const savings = calcSavingsBehaviour(weeklyBalances);

    const hasLoans = loans.length > 0 && monthsOfData >= 6;
    let baseScore: number;
    let phase = 1;
    let repayment: number | null = null;
    let utilization: number | null = null;
    let historyLength: number | null = null;

    if (hasLoans) {
      phase = 2;
      repayment = calcRepaymentHistory(loans);
      const finBehaviour = (income.score + expense.score) / 2;
      utilization = calcCreditUtilization(currentDebt, monthlyIncome);
      historyLength = calcHistoryLength(monthsOfData, loans.length);
      baseScore =
        repayment * 0.4 +
        finBehaviour * 0.4 +
        utilization * 0.1 +
        historyLength * 0.1;
    } else {
      baseScore =
        income.score * 0.35 +
        expense.score * 0.3 +
        payment * 0.2 +
        savings.score * 0.15;
    }

    const finalScore = Math.max(
      0,
      Math.min(850, Math.round(baseScore * 8.5))
    );
    const { band, riskLevel } = getBand(finalScore);
    const confidence = calcConfidence(monthsOfData);

    const result = {
      phase,
      incomeStabilityScore: income.score,
      expenseRatioScore: expense.score,
      paymentHistoryScore: payment,
      savingsBehaviourScore: savings.score,
      repaymentHistoryScore: repayment,
      creditUtilizationScore: utilization,
      historyLengthScore: historyLength,
      baseScore: Math.round(baseScore * 100) / 100,
      finalZimscore: finalScore,
      band,
      riskLevel,
      confidence,
      details: {
        avgWeeklyIncome: income.avgIncome,
        avgDeviation: income.avgDeviation,
        expenseRatio: expense.ratio,
        savingsFrequency: savings.savingsFreq,
        avgBalance: savings.avgBalance,
        monthsOfData,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Score calculation error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
