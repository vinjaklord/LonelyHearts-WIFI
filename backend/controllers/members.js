import HttpError from '../models/http-error.js';
import { Member, Password } from '../models/members.js';
import { validationResult, matchedData } from 'express-validator';
import {
  sendFileToCloudinary,
  getGeolocation,
  getHash,
  deleteFile,
  checkHash,
  getToken,
} from '../common/index.js';

import mongoose from 'mongoose';

/////////////////////////////////////////////////////////////////////////////

const signup = async (req, res, next) => {
  let photo;
  try {
    // Validate data
    const result = validationResult(req);

    if (result.errors.length > 0) {
      // TODO: delete temporary photo

      throw new HttpError(JSON.stringify(result.errors), 422);
    }

    const data = matchedData(req);

    // Is a pic available
    if (!req.file) {
      throw new HttpError('Photo is missing', 422);
    }
    // photo transfer to cloudinary
    const response = await sendFileToCloudinary('1h2024', req.file.path);

    photo = {
      cloudinaryPublicId: response.public_id,
      url: response.secure_url,
    };

    // Is the member already registered

    // Geodata
    const address = `${data.street}, ${data.zip} ${data.city}`;
    const geo = await getGeolocation();
    // console.log('was ist geo', geo);

    // Generate password
    const password = getHash(data.password);

    let newMember;
    // create new member
    const createdMember = new Member({
      //spread operator
      ...data,
      geo,
      photo,
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    // Save member and Save password in one transaction
    // Save member
    newMember = await createdMember.save({ session: session });
    const createdPassword = new Password({
      password,
      // Read Member-ID
      member: newMember._id,
    });
    // Save password
    await createdPassword.save({ session });

    // Confirm transaction
    await session.commitTransaction();

    // Send the data to the client (w/o password)

    res.json(newMember);
  } catch (error) {
    // TODO: delete temporary photo
    if (photo) {
      deleteFile(req.file.path);
    }
    return next(new HttpError(error, 422));
  }
};

//////////////////////////////////////////////////////////////////////////

const login = async (req, res, next) => {
  try {
    const result = validationResult(req);

    if (result.errors.length > 0) {
      throw new HttpError(JSON.stringify(result.errors), 422);
    }

    const data = matchedData(req);
    // search for member, when not then abort with error

    const foundMember = await Member.findOne({
      $or: [{ nickname: data.login }, { email: data.login }],
    });

    if (!foundMember) {
      throw new HttpError('Cannot find member', 404);
    }
    // password holen
    const foundPassword = await Password.findOne({
      member: foundMember._id,
    });

    // hash mit Klartext-Password vergleichen?
    // wenn keine uberstimmung abbruch mit fehlermeldung

    if (!checkHash(data.password, foundPassword.password)) {
      throw new HttpError('Wrong username/email or password', 401);
    }

    // generate JWT token with member id

    const token = getToken(foundMember._id);

    // JWT token to client
    res.send(token);
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 422));
  }
};

const changePassword = async (req, res, next) => {
  try {
    const result = validationResult(req);

    if (result.errors.length > 0) {
      throw new HttpError(JSON.stringify(result.errors), 422);
    }

    const data = matchedData(req);
    // search for member, when not then abort with error

    const foundMember = await Member.findById(req.verifiedMember._id);

    if (!foundMember) {
      throw new HttpError('Cannot change password', 401);
    }
    // password holen
    const foundPassword = await Password.findOne({
      member: foundMember._id,
    });

    // hash mit Klartext-Password vergleichen?
    // wenn keine uberstimmung abbruch mit fehlermeldung

    if (!checkHash(data.oldPassword, foundPassword.password)) {
      throw new HttpError('Cannot change password', 401);
    }
    // Set new password
    const password = getHash(data.newPassword);
    foundPassword.password = password;
    await foundPassword.save();
    // generate JWT token with member id

    const token = getToken(foundMember._id);

    // JWT token to client
    res.send('password changed!');
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 422));
  }
};

const deleteMember = async (req, res, next) => {
  try {
    if (req.verifiedMember._id != req.params.id) {
      throw new HttpError('Cannot delete!', 403);
    }
    // search for member, when not then abort with error
    const deletedMember = await Member.findOneAndDelete({ _id: req.params.id });

    if (!deletedMember) {
      throw new HttpError('Member not found', 404);
    }

    // JWT token to client
    res.send('Member was deleted');
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 422));
  }
};
/////////////////////////////////////////////////////////////////////////////////

const getAllMembers = async (req, res, next) => {
  console.log(req.verifiedMember);
  // get all members with an empty object
  const memberList = await Member.find({});

  try {
    // List of all members in JSON-format send to the client

    res.json(memberList);
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 422));
  }
};

/////////////////////////////////////////////////////////////////////////////

const getOneMember = async (req, res, next) => {
  // get one member
  const member = await Member.findById(req.params.id);

  try {
    if (!member) {
      throw new HttpError('Cannot find member', 404);
    }

    res.json(member);
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 422));
  }
};

// TODO: "message": "Error: [{\"type\":\"field\",\"value\":\"\",\"msg\":\"Invalid value\",\"path\":\"birthYear\",\"location\":\"body\"}]"
const updateMember = async (req, res, next) => {
  try {
    // send out edited data
    const { id } = req.params;
    if (req.verifiedMember._id != req.params.id) {
      throw new HttpError('Cannot update!', 403);
    }

    const result = validationResult(req);

    if (result.errors.length > 0) {
      throw new HttpError(JSON.stringify(result.errors), 422);
    }

    const data = matchedData(req);
    console.log('was is data', data);

    res.json({});
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 422));
  }
};

// other controllers for member

export {
  signup,
  login,
  getAllMembers,
  getOneMember,
  changePassword,
  deleteMember,
  updateMember,
};
