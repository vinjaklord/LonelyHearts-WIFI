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

// adding a method to the member model

membersSchema.methods.getAge = function () {
  return getAge(this.birthYear, this.birthMonth, this.birthDay);
};

// before saving, calculate age and sternzeichen
membersSchema.pre('save', function () {
  const member = this;
  member.age = getAge(this.birthYear, this.birthMonth, this.birthDay);
  member.zodiac = getZodiac(this.birthYear, this.birthMonth, this.birthDay);
});

export const Member = mongoose.model('Member', membersSchema);
export const Password = mongoose.model('Password', passwordSchema);
