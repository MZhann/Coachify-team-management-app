import mongoose, { Schema, Model } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface IAttendance {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused"],
      default: "absent",
    },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// One attendance entry per player per event
AttendanceSchema.index({ eventId: 1, playerId: 1 }, { unique: true });
AttendanceSchema.index({ teamId: 1, eventId: 1 });
AttendanceSchema.index({ playerId: 1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

