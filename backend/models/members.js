import mongoose from 'mongoose';
import { getAge, getZodiac } from '../common/index.js';

const Schema = mongoose.Schema;

const membersSchema = new Schema(
  {
    nickname: { type: String, require: true, unique: true },
    email: { type: String, require: true, unique: true },
    firstName: { type: String, require: true },
    lastName: { type: String, require: true },
    street: { type: String, require: true },
    city: { type: String, require: true },
    zip: { type: String, require: true },
    birthDay: { type: Number, require: true },
    birthMonth: { type: Number, require: true },
    birthYear: { type: Number, require: true },
    statement: String,
    paused: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    favorites: [
      { type: mongoose.Types.ObjectId, required: true, ref: 'Member' },
    ],
    photo: {
      cloudinaryPublicId: { type: String, required: true },
      url: { type: String, required: true },
    },
    geo: {
      lat: { type: Number, default: 0 },
      lon: { type: Number, default: 0 },
    },
    age: Number,
    zodiac: String,
  },
  { timestamps: true }
);

const passwordSchema = new Schema(
  {
    password: { type: String, require: true },
    member: { type: mongoose.Types.ObjectId, required: true, ref: 'Member' },
  },
  { timestamps: true }
);

const resetTokenSchema = new Schema(
  {
    token: { type: String, require: true },
    member: { type: mongoose.Types.ObjectId, required: true, ref: 'Member' },
  },
  { timestamps: true }
);

membersSchema.methods.getAge = function () {
  return getAge(this.birthYear, this.birthMonth, this.birthDay);
};

// before saving, calculate age and sternzeichen
membersSchema.pre('save', function () {
  const member = this;
  member.age = getAge(this.birthYear, this.birthMonth, this.birthDay);
  member.zodiac = getZodiac(this.birthYear, this.birthMonth, this.birthDay);
});

// finding and deleting a member

membersSchema.post('findOneAndDelete', async function (deletedMember) {
  if (deletedMember) {
    await Password.deleteMany({ member: deletedMember._id });

    await Resettoken.deleteMany({ member: deletedMember._id });

    await Visit.deleteMany({
      $or: [{ visitor: req.params.id }, { targetMember: req.params.id }],
    });

    await Heart.deleteMany({
      $or: [{ sender: req.params.id }, { recipient: req.params.id }],
    });
  }
});

const heartSchema = new Schema(
  {
    sender: { type: String, ref: 'Member', required: true },
    recipient: { type: String, ref: 'Member', required: true },
    text: { type: String, required: true },
    confirmed: { type: String, required: true },
  },
  { timestamps: true }
);

const visitSchema = new Schema(
  {
    visitor: { type: String, ref: 'Member', required: true },
    targetMember: { type: String, ref: 'Member', required: true },
  },
  { timestamps: true }
);

const messageSchema = new Schema({
  sender: { type: String, ref: 'Member', required: true },
  recipient: { type: String, ref: 'Member', required: true },
  text: { type: String, required: true },
});

export const Member = mongoose.model('Member', membersSchema);
export const Password = mongoose.model('Password', passwordSchema);
export const Heart = mongoose.model('Heart', heartSchema);
export const Visit = mongoose.model('Visit', visitSchema);
export const Message = mongoose.model('Message', messageSchema);
export const Resettoken = mongoose.model('ResetToken', resetTokenSchema);
