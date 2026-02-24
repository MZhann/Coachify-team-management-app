import mongoose, { Schema, Model } from "mongoose";
import crypto from "crypto";

export type SportType =
  | "football"
  | "basketball"
  | "volleyball"
  | "american_football";

export interface ITeam {
  _id: mongoose.Types.ObjectId;
  name: string;
  sport: SportType;
  coachId: mongoose.Types.ObjectId;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 7);
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    sport: {
      type: String,
      enum: ["football", "basketball", "volleyball", "american_football"],
      required: true,
    },
    coachId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: {
      type: String,
      unique: true,
      default: generateInviteCode,
    },
  },
  { timestamps: true }
);

// Ensure invite code is generated before save if missing
TeamSchema.pre("save", function (next) {
  if (!this.inviteCode) {
    this.inviteCode = generateInviteCode();
  }
  next();
});

export const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);
