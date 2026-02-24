import mongoose, { Schema, Model } from "mongoose";

/* ───── Stats sub-schema (0-99, like FIFA) ───── */
export interface IPlayerStats {
  // Pace
  acceleration: number;
  sprintSpeed: number;
  // Shooting
  positioning: number;
  finishing: number;
  shotPower: number;
  longShots: number;
  volleys: number;
  penalties: number;
  // Passing
  vision: number;
  crossing: number;
  fkAccuracy: number;
  shortPassing: number;
  longPassing: number;
  curve: number;
  // Dribbling
  agility: number;
  balance: number;
  reactions: number;
  ballControl: number;
  dribbling: number;
  composure: number;
  // Defending
  interceptions: number;
  headingAccuracy: number;
  marking: number;
  standTackle: number;
  slideTackle: number;
  // Physical
  jumping: number;
  stamina: number;
  strength: number;
  aggression: number;
}

const statField = { type: Number, default: 50, min: 0, max: 99 };

const PlayerStatsSchema = new Schema<IPlayerStats>(
  {
    acceleration: statField,
    sprintSpeed: statField,
    positioning: statField,
    finishing: statField,
    shotPower: statField,
    longShots: statField,
    volleys: statField,
    penalties: statField,
    vision: statField,
    crossing: statField,
    fkAccuracy: statField,
    shortPassing: statField,
    longPassing: statField,
    curve: statField,
    agility: statField,
    balance: statField,
    reactions: statField,
    ballControl: statField,
    dribbling: statField,
    composure: statField,
    interceptions: statField,
    headingAccuracy: statField,
    marking: statField,
    standTackle: statField,
    slideTackle: statField,
    jumping: statField,
    stamina: statField,
    strength: statField,
    aggression: statField,
  },
  { _id: false }
);

/* ───── Player document ───── */
export interface IPlayer {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  position: string;
  jerseyNumber?: number;
  status: "active" | "injured" | "suspended" | "inactive";
  // Bio
  nationality: string;
  age?: number;
  height?: number; // cm
  weight?: number; // kg
  preferredFoot: "L" | "R" | "Both";
  // Stats
  stats: IPlayerStats;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    position: { type: String, default: "Unassigned", trim: true },
    jerseyNumber: { type: Number },
    status: {
      type: String,
      enum: ["active", "injured", "suspended", "inactive"],
      default: "active",
    },
    // Bio
    nationality: { type: String, default: "", trim: true },
    age: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    preferredFoot: {
      type: String,
      enum: ["L", "R", "Both"],
      default: "R",
    },
    // Stats
    stats: { type: PlayerStatsSchema, default: () => ({}) },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One user can only be in a team once
PlayerSchema.index({ userId: 1, teamId: 1 }, { unique: true });

export const Player: Model<IPlayer> =
  mongoose.models.Player || mongoose.model<IPlayer>("Player", PlayerSchema);
