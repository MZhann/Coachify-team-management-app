import mongoose, { Schema, Model } from "mongoose";

export interface IMatchStat {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  // Performance
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCard: boolean;
  // Shooting
  shotsOnTarget: number;
  shotsTotal: number;
  // Passing
  passesCompleted: number;
  passesTotal: number;
  // Defensive
  tackles: number;
  interceptions: number;
  fouls: number;
  // Goalkeeper
  saves: number;
  // Coach evaluation
  rating: number; // 0-10
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const MatchStatSchema = new Schema<IMatchStat>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    // Performance
    minutesPlayed: { type: Number, default: 0, min: 0 },
    goals: { type: Number, default: 0, min: 0 },
    assists: { type: Number, default: 0, min: 0 },
    yellowCards: { type: Number, default: 0, min: 0, max: 2 },
    redCard: { type: Boolean, default: false },
    // Shooting
    shotsOnTarget: { type: Number, default: 0, min: 0 },
    shotsTotal: { type: Number, default: 0, min: 0 },
    // Passing
    passesCompleted: { type: Number, default: 0, min: 0 },
    passesTotal: { type: Number, default: 0, min: 0 },
    // Defensive
    tackles: { type: Number, default: 0, min: 0 },
    interceptions: { type: Number, default: 0, min: 0 },
    fouls: { type: Number, default: 0, min: 0 },
    // Goalkeeper
    saves: { type: Number, default: 0, min: 0 },
    // Coach evaluation
    rating: { type: Number, default: 0, min: 0, max: 10 },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// One stat entry per player per event
MatchStatSchema.index({ eventId: 1, playerId: 1 }, { unique: true });
MatchStatSchema.index({ teamId: 1, eventId: 1 });

export const MatchStat: Model<IMatchStat> =
  mongoose.models.MatchStat ||
  mongoose.model<IMatchStat>("MatchStat", MatchStatSchema);

