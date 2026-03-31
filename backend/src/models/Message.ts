import mongoose, { Schema, Model } from "mongoose";

export type MessageChannel = "global" | "team";

export interface IMessage {
  _id: mongoose.Types.ObjectId;
  channel: MessageChannel;
  teamId?: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole: string;
  senderTeamName?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    channel: {
      type: String,
      enum: ["global", "team"],
      required: true,
    },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    senderTeamName: { type: String },
    content: { type: String, required: true, maxlength: 2000, trim: true },
  },
  { timestamps: true }
);

MessageSchema.index({ channel: 1, createdAt: -1 });
MessageSchema.index({ channel: 1, teamId: 1, createdAt: -1 });

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);
