import mongoose, { Schema, Model } from "mongoose";

export interface INote {
  _id: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new Schema<INote>(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NoteSchema.index({ teamId: 1, createdAt: -1 });
NoteSchema.index({ teamId: 1, pinned: -1, createdAt: -1 });

export const Note: Model<INote> =
  mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);

