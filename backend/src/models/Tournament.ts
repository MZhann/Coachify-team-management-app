import mongoose, { Schema, Model } from "mongoose";

/* ─── Types ─── */

export type TournamentFormat = "groups_knockout" | "league" | "knockout";
export type TournamentStatus = "draft" | "group_stage" | "knockout" | "completed";

export interface IGroupTeam {
  teamId: mongoose.Types.ObjectId;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface IGroup {
  name: string; // "A", "B", "C", "D", etc.
  teams: IGroupTeam[];
}

export interface ITournamentMatch {
  _id: mongoose.Types.ObjectId;
  round: string; // "group", "round_of_16", "quarter_final", "semi_final", "final"
  group?: string; // Group name if group stage
  matchNumber: number;
  homeTeamId?: mongoose.Types.ObjectId;
  awayTeamId?: mongoose.Types.ObjectId;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  date?: Date;
  location?: string;
  eventId?: mongoose.Types.ObjectId; // Link to Event model for schedule
  // For knockout – track where winner advances
  nextMatchNumber?: number;
  nextMatchSlot?: "home" | "away";
}

export interface ITournament {
  _id: mongoose.Types.ObjectId;
  name: string;
  sport: string;
  format: TournamentFormat;
  status: TournamentStatus;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  teamIds: mongoose.Types.ObjectId[];
  teamsPerGroup: number; // For groups_knockout format (default 4)
  advancePerGroup: number; // How many teams advance from each group (default 2)
  groups: IGroup[];
  matches: ITournamentMatch[];
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/* ─── Sub-schemas ─── */

const GroupTeamSchema = new Schema<IGroupTeam>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    drawn: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    goalDifference: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { _id: false }
);

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    teams: [GroupTeamSchema],
  },
  { _id: false }
);

const TournamentMatchSchema = new Schema<ITournamentMatch>({
  round: {
    type: String,
    required: true,
    enum: ["group", "round_of_16", "quarter_final", "semi_final", "third_place", "final"],
  },
  group: { type: String },
  matchNumber: { type: Number, required: true },
  homeTeamId: { type: Schema.Types.ObjectId, ref: "Team" },
  awayTeamId: { type: Schema.Types.ObjectId, ref: "Team" },
  homeScore: { type: Number },
  awayScore: { type: Number },
  played: { type: Boolean, default: false },
  date: { type: Date },
  location: { type: String },
  eventId: { type: Schema.Types.ObjectId, ref: "Event" },
  nextMatchNumber: { type: Number },
  nextMatchSlot: { type: String, enum: ["home", "away"] },
});

/* ─── Main Schema ─── */

const TournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, required: true },
    format: {
      type: String,
      enum: ["groups_knockout", "league", "knockout"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "group_stage", "knockout", "completed"],
      default: "draft",
    },
    description: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamIds: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    teamsPerGroup: { type: Number, default: 4 },
    advancePerGroup: { type: Number, default: 2 },
    groups: [GroupSchema],
    matches: [TournamentMatchSchema],
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

TournamentSchema.index({ sport: 1, status: 1 });

export const Tournament: Model<ITournament> =
  mongoose.models.Tournament ||
  mongoose.model<ITournament>("Tournament", TournamentSchema);


