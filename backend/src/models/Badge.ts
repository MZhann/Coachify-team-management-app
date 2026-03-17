import mongoose, { Schema, Model } from "mongoose";

export type BadgeCategory = "performance" | "discipline" | "attendance" | "leadership" | "special";

export interface IBadge {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  criteria: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
    category: {
      type: String,
      enum: ["performance", "discipline", "attendance", "leadership", "special"],
      required: true,
    },
    criteria: { type: String, required: true },
    color: { type: String, required: true },
  },
  { timestamps: true }
);

export const Badge: Model<IBadge> =
  mongoose.models.Badge || mongoose.model<IBadge>("Badge", BadgeSchema);

export interface IPlayerBadge {
  _id: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  badgeId: mongoose.Types.ObjectId;
  awardedBy: mongoose.Types.ObjectId;
  awardedAt: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerBadgeSchema = new Schema<IPlayerBadge>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    badgeId: { type: Schema.Types.ObjectId, ref: "Badge", required: true },
    awardedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    awardedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

PlayerBadgeSchema.index({ playerId: 1 });
PlayerBadgeSchema.index({ playerId: 1, badgeId: 1 }, { unique: true });

export const PlayerBadge: Model<IPlayerBadge> =
  mongoose.models.PlayerBadge || mongoose.model<IPlayerBadge>("PlayerBadge", PlayerBadgeSchema);

export const DEFAULT_BADGES: Omit<IBadge, "_id" | "createdAt" | "updatedAt">[] = [
  { name: "Hat Trick Hero", description: "Score 3 goals in a single official match", icon: "⚽", category: "performance", criteria: "Score 3+ goals in one official match", color: "bg-yellow-500" },
  { name: "Iron Man", description: "Attend every training session for a full month", icon: "💪", category: "attendance", criteria: "100% training attendance for 30 days", color: "bg-blue-500" },
  { name: "Discipline Master", description: "No disciplinary actions for 3 consecutive months", icon: "🛡️", category: "discipline", criteria: "Zero violations for 90 days", color: "bg-green-500" },
  { name: "Top Scorer", description: "Score 10 or more goals in a season", icon: "🏆", category: "performance", criteria: "10+ goals scored in season", color: "bg-amber-500" },
  { name: "Captain's Choice", description: "Recognized by coach for outstanding leadership", icon: "⭐", category: "leadership", criteria: "Awarded by coach for leadership", color: "bg-purple-500" },
  { name: "Rising Star", description: "Most improved player over a season", icon: "🌟", category: "special", criteria: "Awarded for significant improvement", color: "bg-pink-500" },
  { name: "Training Beast", description: "Perfect training attendance for an entire season", icon: "🔥", category: "attendance", criteria: "100% training attendance for full season", color: "bg-orange-500" },
  { name: "Clean Record", description: "Complete an entire season with zero disciplinary issues", icon: "✅", category: "discipline", criteria: "Zero violations for entire season", color: "bg-emerald-500" },
  { name: "Team Player", description: "Attend all team events for a full month", icon: "🤝", category: "attendance", criteria: "100% attendance at all events for 30 days", color: "bg-cyan-500" },
  { name: "Goal Machine", description: "Score in 5 consecutive matches", icon: "🎯", category: "performance", criteria: "Score in 5 consecutive matches", color: "bg-red-500" },
];
