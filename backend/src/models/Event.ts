import mongoose, { Schema, Model } from "mongoose";

export type EventType = "training" | "match";
export type EventStatus = "scheduled" | "completed" | "cancelled";

export interface IEvent {
  _id: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  type: EventType;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  location: string;
  // Match-specific
  opponent?: string;
  homeAway?: "home" | "away" | "neutral";
  scoreHome?: number;
  scoreAway?: number;
  // Common
  status: EventStatus;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["training", "match"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    location: { type: String, default: "", trim: true },
    // Match-specific
    opponent: { type: String, trim: true },
    homeAway: {
      type: String,
      enum: ["home", "away", "neutral"],
    },
    scoreHome: { type: Number },
    scoreAway: { type: Number },
    // Common
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// Index for efficient team + date queries
EventSchema.index({ teamId: 1, date: 1 });
EventSchema.index({ teamId: 1, type: 1, date: 1 });

export const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);

