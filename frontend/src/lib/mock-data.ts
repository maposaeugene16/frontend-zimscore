export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  description: string;
  amount: number;
  date: string;
  category: string;
  reference?: string;
  counterpartyId?: string;
}

export interface LoanRequest {
  id: string;
  borrower: string;
  amount: number;
  purpose: string;
  interestRate: number;
  term: number;
  riskRating: 'Low' | 'Medium' | 'High';
  funded: number;
  avatar: string;
  zimScore?: number;
  maxRate?: number;
  duration?: number;
  status?: 'open' | 'active' | 'repaying' | 'late' | 'default' | 'closed' | 'disputed';
  createdAt?: string;
  bids?: LoanBid[];
}

export interface LoanBid {
  id: string;
  lenderId: string;
  lenderName: string;
  amount: number;
  interestRate: number;
  date: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
}

export interface CrowdfundProject {
  id: number;
  title: string;
  description: string;
  goal: number;
  raised: number;
  backers: number;
  daysLeft: number;
  category: string;
  creator: string;
  returnType: string;
  businessPlanUploaded: boolean;
  milestones: Milestone[];
  escrowStatus: 'holding' | 'partial_release' | 'fully_released' | 'refunded';
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  evidence?: string;
  dueDate: string;
}

export interface MFIInstitution {
  id: string;
  name: string;
  registrationNumber: string;
  description: string;
  logo: string;
  avgInterestRate: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  loanProducts: MFILoanProduct[];
}

export interface MFILoanProduct {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  interestRate: number;
  repaymentPeriod: string;
  minZimScore: number;
  active: boolean;
}

export interface Notification {
  id: string;
  type: 'financial' | 'score' | 'loan' | 'system' | 'kyc';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export const mockUser = {
  name: "Tendai Moyo",
  email: "tendai@zimscore.co.zw",
  avatar: "TM",
  walletBalance: 4250.00,
  lockedBalance: 750.00,
  creditScore: 742,
  maxScore: 850,
  memberSince: "2023-06-15",
  walletFrozen: false,
  currency: "USD" as "USD" | "ZiG",
  kycStatus: "verified" as string,
  phone: "077X XXX XXXX",
};

export const creditBreakdown = [
  { label: "Income Stability", score: 88, weight: 35, color: "hsl(160, 84%, 39%)" },
  { label: "Expense Ratio", score: 72, weight: 30, color: "hsl(224, 76%, 48%)" },
  { label: "Payment History", score: 92, weight: 20, color: "hsl(45, 93%, 58%)" },
  { label: "Savings Behaviour", score: 65, weight: 15, color: "hsl(280, 70%, 55%)" },
];

export const scoreConfidence = Math.min(90, (7 * 15) + 25); // 7 months of data

export const scoreTips = [
  { tip: "Reduce your monthly expenses to below 60% of income.", impact: "+18 points", timeframe: "within 30 days", subScore: "Expense Ratio", completed: false },
  { tip: "Maintain consistent EcoCash deposits for 3 more months.", impact: "+12 points", timeframe: "within 90 days", subScore: "Income Stability", completed: false },
  { tip: "Start saving at least 10% of your monthly income.", impact: "+22 points", timeframe: "within 60 days", subScore: "Savings Behaviour", completed: true },
];

export const transactions: Transaction[] = [
  { id: "1", type: "credit", description: "Loan Repayment Received", amount: 320.00, date: "2024-01-15", category: "Repayment", reference: "REP-2024-001", counterpartyId: "user_jnyathi" },
  { id: "2", type: "debit", description: "P2P Loan to J. Nyathi", amount: 500.00, date: "2024-01-14", category: "Disbursement", reference: "DIS-2024-001", counterpartyId: "user_jnyathi" },
  { id: "3", type: "credit", description: "Wallet Top-up via EcoCash", amount: 1000.00, date: "2024-01-13", category: "Deposit", reference: "DEP-2024-003" },
  { id: "4", type: "debit", description: "SME Invoice Payment", amount: 150.00, date: "2024-01-12", category: "Fee", reference: "FEE-2024-001" },
  { id: "5", type: "credit", description: "Interest Earned", amount: 45.50, date: "2024-01-11", category: "Interest", reference: "INT-2024-001" },
  { id: "6", type: "debit", description: "Withdrawal to EcoCash", amount: 200.00, date: "2024-01-10", category: "Withdrawal", reference: "WTH-2024-001" },
  { id: "7", type: "debit", description: "Platform Transaction Fee", amount: 5.00, date: "2024-01-10", category: "Fee", reference: "FEE-2024-002" },
  { id: "8", type: "credit", description: "Bank Deposit", amount: 2000.00, date: "2024-01-08", category: "Deposit", reference: "DEP-2024-002" },
];

export const loanRequests: LoanRequest[] = [
  { id: "1", borrower: "John Nyathi", amount: 250, purpose: "Farm Equipment", interestRate: 12, term: 3, riskRating: "Low", funded: 68, avatar: "JN", zimScore: 710, maxRate: 15, duration: 90, status: "open", createdAt: "2024-01-10", bids: [{ id: "b1", lenderId: "l1", lenderName: "Tendai M.", amount: 170, interestRate: 11, date: "2024-01-11", status: "pending" }] },
  { id: "2", borrower: "Grace Chirume", amount: 100, purpose: "School Fees", interestRate: 8, term: 1, riskRating: "Low", funded: 45, avatar: "GC", zimScore: 680, maxRate: 10, duration: 30, status: "open", createdAt: "2024-01-12", bids: [] },
  { id: "3", borrower: "Peter Zulu", amount: 500, purpose: "Business Expansion", interestRate: 15, term: 3, riskRating: "Medium", funded: 22, avatar: "PZ", zimScore: 590, maxRate: 18, duration: 90, status: "open", createdAt: "2024-01-09", bids: [] },
  { id: "4", borrower: "Mary Dube", amount: 80, purpose: "Medical Bills", interestRate: 6, term: 1, riskRating: "Low", funded: 90, avatar: "MD", zimScore: 750, maxRate: 8, duration: 14, status: "open", createdAt: "2024-01-13", bids: [{ id: "b2", lenderId: "l2", lenderName: "Sarah K.", amount: 72, interestRate: 5, date: "2024-01-13", status: "pending" }] },
  { id: "5", borrower: "Samuel Ncube", amount: 450, purpose: "Vehicle Repair", interestRate: 18, term: 3, riskRating: "High", funded: 15, avatar: "SN", zimScore: 420, maxRate: 20, duration: 60, status: "open", createdAt: "2024-01-08", bids: [] },
];

export const crowdfundProjects: CrowdfundProject[] = [
  { id: 1, title: "Solar Farm in Masvingo", description: "Community solar energy project powering 200 homes with clean, sustainable energy.", goal: 15000, raised: 11250, backers: 87, daysLeft: 14, category: "Energy", creator: "Masvingo Council", returnType: "Revenue Share", businessPlanUploaded: true, escrowStatus: "holding", milestones: [{ id: "m1", title: "Equipment Purchase", amount: 5000, status: "approved", dueDate: "2024-02-15" }, { id: "m2", title: "Installation", amount: 6000, status: "pending", dueDate: "2024-03-15" }, { id: "m3", title: "Grid Connection", amount: 4000, status: "pending", dueDate: "2024-04-15" }] },
  { id: 2, title: "Tech Hub Harare", description: "Co-working space and incubator for tech startups in downtown Harare.", goal: 25000, raised: 8500, backers: 42, daysLeft: 28, category: "Technology", creator: "ZimTech Foundation", returnType: "Equity", businessPlanUploaded: true, escrowStatus: "holding", milestones: [{ id: "m4", title: "Lease & Renovation", amount: 10000, status: "pending", dueDate: "2024-03-01" }, { id: "m5", title: "Equipment Setup", amount: 15000, status: "pending", dueDate: "2024-04-01" }] },
  { id: 3, title: "Clean Water Bulawayo", description: "Water purification system for rural communities in Matabeleland.", goal: 8000, raised: 7200, backers: 124, daysLeft: 5, category: "Infrastructure", creator: "WaterAid Zim", returnType: "Social Impact", businessPlanUploaded: true, escrowStatus: "partial_release", milestones: [{ id: "m6", title: "Borehole Drilling", amount: 4000, status: "approved", dueDate: "2024-01-20" }, { id: "m7", title: "Purification System", amount: 4000, status: "submitted", evidence: "Installation photos and receipts uploaded", dueDate: "2024-02-20" }] },
  { id: 4, title: "Mobile Clinic Network", description: "Health services for remote farming communities across rural Zimbabwe.", goal: 20000, raised: 4000, backers: 31, daysLeft: 45, category: "Health", creator: "HealthBridge", returnType: "Revenue Share", businessPlanUploaded: false, escrowStatus: "holding", milestones: [{ id: "m8", title: "Vehicle Purchase", amount: 12000, status: "pending", dueDate: "2024-05-01" }, { id: "m9", title: "Medical Equipment", amount: 8000, status: "pending", dueDate: "2024-06-01" }] },
];

export const mfiInstitutions: MFIInstitution[] = [
  { id: "mfi1", name: "ZimFin Microfinance", registrationNumber: "MFI-2021-0045", description: "Leading microfinance serving small businesses and individuals in Harare and surrounding areas.", logo: "ZF", avgInterestRate: 8.5, rating: 4.2, reviewCount: 156, verified: true, loanProducts: [{ id: "lp1", name: "Small Business Starter", minAmount: 100, maxAmount: 2000, interestRate: 8, repaymentPeriod: "3-12 months", minZimScore: 550, active: true }, { id: "lp2", name: "Growth Capital", minAmount: 2000, maxAmount: 10000, interestRate: 10, repaymentPeriod: "6-24 months", minZimScore: 650, active: true }] },
  { id: "mfi2", name: "Mwana Trust Finance", registrationNumber: "MFI-2020-0012", description: "Community-focused MFI specializing in agricultural loans and women's empowerment financing.", logo: "MT", avgInterestRate: 7.0, rating: 4.5, reviewCount: 89, verified: true, loanProducts: [{ id: "lp3", name: "Agri-Boost", minAmount: 50, maxAmount: 1500, interestRate: 6, repaymentPeriod: "3-6 months", minZimScore: 450, active: true }, { id: "lp4", name: "Women's Enterprise", minAmount: 100, maxAmount: 3000, interestRate: 7, repaymentPeriod: "6-12 months", minZimScore: 500, active: true }] },
  { id: "mfi3", name: "Sunrise Capital", registrationNumber: "MFI-2022-0078", description: "Innovative fintech-driven microfinance offering fast approvals and competitive rates.", logo: "SC", avgInterestRate: 9.0, rating: 3.8, reviewCount: 42, verified: true, loanProducts: [{ id: "lp5", name: "Quick Cash", minAmount: 20, maxAmount: 500, interestRate: 10, repaymentPeriod: "7-30 days", minZimScore: 400, active: true }, { id: "lp6", name: "Education Loan", minAmount: 200, maxAmount: 5000, interestRate: 8, repaymentPeriod: "6-18 months", minZimScore: 600, active: true }] },
];

export const notifications: Notification[] = [
  { id: "n1", type: "financial", title: "Repayment Due in 48 Hours", message: "Your loan repayment of $85.00 is due on 17 Jan 2024. Ensure sufficient wallet balance.", read: false, createdAt: "2024-01-15T10:30:00Z", actionUrl: "/wallet" },
  { id: "n2", type: "score", title: "Score Improved! +12 Points", message: "Your Zimscore increased from 730 to 742 this week. Your improved savings behaviour contributed the most.", read: false, createdAt: "2024-01-14T09:00:00Z", actionUrl: "/score" },
  { id: "n3", type: "loan", title: "New Bid on Your Loan Request", message: "Tendai M. placed a bid of $170 at 11% interest on your loan request.", read: true, createdAt: "2024-01-13T14:20:00Z", actionUrl: "/p2p" },
  { id: "n4", type: "kyc", title: "KYC Verification Approved", message: "Your identity has been verified successfully. You now have full access to all platform features.", read: true, createdAt: "2024-01-10T08:00:00Z" },
  { id: "n5", type: "system", title: "Scheduled Maintenance", message: "Platform maintenance scheduled for 20 Jan 2024, 2:00 AM - 4:00 AM CAT. Transactions will be temporarily unavailable.", read: true, createdAt: "2024-01-09T12:00:00Z" },
  { id: "n6", type: "financial", title: "Deposit Received", message: "Your EcoCash deposit of $1,000.00 has been credited to your wallet.", read: true, createdAt: "2024-01-08T16:45:00Z", actionUrl: "/wallet" },
];

export const monthlyScoreHistory = [
  { month: "Jul", score: 680, annotation: "Account opened" },
  { month: "Aug", score: 695, annotation: "First EcoCash upload" },
  { month: "Sep", score: 702, annotation: "" },
  { month: "Oct", score: 718, annotation: "Loan repaid on time" },
  { month: "Nov", score: 730, annotation: "Savings increased" },
  { month: "Dec", score: 735, annotation: "" },
  { month: "Jan", score: 742, annotation: "Expense ratio improved" },
];

export const adminStats = {
  totalUsers: 1247,
  activeLoans: 342,
  totalWalletBalance: 2850000,
  pendingKYC: 18,
  openDisputes: 7,
  failedTransactions24h: 3,
  defaultRate: 4.2,
  monthlyRevenue: 45600,
  revenueBySource: [
    { source: "Transaction Fees", amount: 28400 },
    { source: "MFI Listing Fees", amount: 12200 },
    { source: "Premium Features", amount: 5000 },
  ],
  defaultByBand: [
    { band: "750-850", rate: 1.2 },
    { band: "650-749", rate: 3.8 },
    { band: "550-649", rate: 8.5 },
    { band: "400-549", rate: 15.2 },
    { band: "0-399", rate: 28.0 },
  ],
  loanVolume: [
    { month: "Aug", disbursed: 125000, repaid: 98000, defaulted: 4200 },
    { month: "Sep", disbursed: 142000, repaid: 112000, defaulted: 5100 },
    { month: "Oct", disbursed: 158000, repaid: 128000, defaulted: 4800 },
    { month: "Nov", disbursed: 175000, repaid: 145000, defaulted: 6200 },
    { month: "Dec", disbursed: 168000, repaid: 152000, defaulted: 5400 },
    { month: "Jan", disbursed: 192000, repaid: 165000, defaulted: 4900 },
  ],
  suspiciousActivity: [
    { id: "sa1", userId: "user_xyz", type: "Rapid withdrawals", description: "3 withdrawals totaling $2,400 within 45 minutes of deposit", severity: "high", timestamp: "2024-01-15T08:12:00Z" },
    { id: "sa2", userId: "user_abc", type: "Failed logins", description: "8 failed login attempts in 10 minutes", severity: "medium", timestamp: "2024-01-14T22:30:00Z" },
  ],
  usersByRole: [
    { role: "Borrower", count: 842 },
    { role: "P2P Lender", count: 215 },
    { role: "SME Owner", count: 128 },
    { role: "Investor", count: 44 },
    { role: "MFI Admin", count: 12 },
    { role: "Platform Admin", count: 6 },
  ],
};

export const formatCurrency = (amount: number, currency: "USD" | "ZiG" = "USD") => {
  if (currency === "ZiG") {
    return `ZiG ${amount.toFixed(2)}`;
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
};

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatDateLong = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
