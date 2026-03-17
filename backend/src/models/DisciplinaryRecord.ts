import mongoose, { Schema, Model } from "mongoose";

export type ViolationType =
  | "yellow_card"
  | "red_card"
  | "warning"
  | "verbal_warning"
  | "fine"
  | "suspension"
  | "unexcused_absence"
  | "late_arrival"
  | "misconduct"
  | "other";

export type Severity = "low" | "medium" | "high" | "critical";

export interface IDisciplinaryRecord {
  _id: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  violationType: ViolationType;
  severity: Severity;
  description: string;
  date: Date;
  fineAmount?: number;
  suspensionDays?: number;
  resolved: boolean;
  resolvedDate?: Date;
  resolvedNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DisciplinaryRecordSchema = new Schema<IDisciplinaryRecord>(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    violationType: {
      type: String,
      enum: [
        "yellow_card", "red_card", "warning", "verbal_warning",
        "fine", "suspension", "unexcused_absence", "late_arrival",
        "misconduct", "other",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    fineAmount: { type: Number },
    suspensionDays: { type: Number },
    resolved: { type: Boolean, default: false },
    resolvedDate: { type: Date },
    resolvedNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

DisciplinaryRecordSchema.index({ playerId: 1 });
DisciplinaryRecordSchema.index({ eventId: 1 });
DisciplinaryRecordSchema.index({ teamId: 1 });
DisciplinaryRecordSchema.index({ date: -1 });

export const DisciplinaryRecord: Model<IDisciplinaryRecord> =
  mongoose.models.DisciplinaryRecord ||
  mongoose.model<IDisciplinaryRecord>("DisciplinaryRecord", DisciplinaryRecordSchema);
