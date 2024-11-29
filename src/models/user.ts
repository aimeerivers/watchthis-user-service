import bcrypt from "bcrypt";
import type { Document, ObjectId } from "mongoose";
import mongoose from "mongoose";

export interface IUser extends Document {
  id: string;
  username: string;
  password: string;
  comparePassword: (_candidatePassword: string) => Promise<boolean>;
}

const UserSchema = new mongoose.Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

UserSchema.virtual("id").get(function () {
  return this._id as ObjectId;
});

UserSchema.set("toJSON", {
  virtuals: true,
});

UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const user = this as IUser;
  return await bcrypt.compare(candidatePassword, user.password).catch(() => false);
};

const User = mongoose.model("User", UserSchema);

export { User };
