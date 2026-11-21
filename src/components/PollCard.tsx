import { useState } from "react";
import { votePoll } from "@/lib/api";
import { BarChart3 } from "lucide-react";

interface PollOption {
  id: number;
  text: string;
  votes: number;
}

interface Props {
  postId: string;
  question: string;
  options: PollOption[];
  userVoted?: number | null;
}

const PollCard = ({ postId, question, options: initialOptions, userVoted }: Props) => {
  const [options, setOptions] = useState<PollOption[]>(initialOptions);
  const [voted, setVoted] = useState<number | null>(userVoted ?? null);

  const totalVotes = options.reduce((s, o) => s + (o.votes || 0), 0);

  const handleVote = async (optionIndex: number) => {
    if (voted !== null) return;
    setVoted(optionIndex);
    setOptions(prev => prev.map((o, i) => i === optionIndex ? { ...o, votes: (o.votes || 0) + 1 } : o));
    try {
      const data = await votePoll(postId, optionIndex);
      if (data.pollOptions) setOptions(data.pollOptions);
    } catch {}
  };

  return (
    <div className="mt-3 rounded-xl border border-border p-3 bg-secondary/30">
      <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <BarChart3 className="w-4 h-4 text-primary" />
        {question}
      </p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          const isSelected = voted === i;
          return (
            <button
              key={opt.id ?? i}
              onClick={() => handleVote(i)}
              disabled={voted !== null}
              className={`w-full relative rounded-lg overflow-hidden text-left px-3 py-2.5 text-sm font-medium transition-all ${
                voted !== null
                  ? "cursor-default"
                  : "hover:bg-primary/10 active:scale-[0.98]"
              } ${isSelected ? "ring-2 ring-primary" : "border border-border"}`}
            >
              {voted !== null && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between">
                <span className="text-foreground">{opt.text}</span>
                {voted !== null && (
                  <span className="text-xs text-muted-foreground font-bold ml-2">{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {voted !== null && (
        <p className="text-xs text-muted-foreground mt-2 text-right">{totalVotes} oy</p>
      )}
    </div>
  );
};

export default PollCard;

