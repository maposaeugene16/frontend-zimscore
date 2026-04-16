import { motion } from "framer-motion";

interface CreditScoreGaugeProps {
  score: number;
  maxScore: number;
}

export function CreditScoreGauge({ score, maxScore }: CreditScoreGaugeProps) {
  const percentage = score / maxScore;
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference * (1 - percentage * 0.75);
  const rating = score >= 740 ? "Excellent" : score >= 670 ? "Good" : score >= 580 ? "Fair" : "Poor";
  const ratingColor = score >= 740 ? "text-success" : score >= 670 ? "text-primary" : score >= 580 ? "text-accent" : "text-destructive";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
          {/* Background arc */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          {/* Score arc */}
          <motion.circle
            cx="50" cy="50" r="45" fill="none" stroke="url(#scoreGradient)" strokeWidth="8"
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(224, 76%, 48%)" />
              <stop offset="50%" stopColor="hsl(160, 84%, 39%)" />
              <stop offset="100%" stopColor="hsl(45, 93%, 58%)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display text-4xl font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
          <span className={`text-sm font-semibold ${ratingColor}`}>{rating}</span>
          <span className="text-xs text-muted-foreground">out of {maxScore}</span>
        </div>
      </div>
    </div>
  );
}
