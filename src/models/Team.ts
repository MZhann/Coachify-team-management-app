import mongoose, { Schema, Model } from "mongoose";

export type SportType = "football" | "basketball" | "volleyball" | "american_football";

export interface ITeam {
  _id: mongoose.Types.ObjectId;
  name: string;
  sport: SportType;
  coachId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    sport: {
      type: String,
      enum: ["football", "basketball", "volleyball", "american_football"],
      required: true,
    },
    coachId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);
