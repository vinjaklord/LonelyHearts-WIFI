import HttpError from '../models/http-error.js';
import { Member, Password, Heart, Visit } from '../models/members.js';
import { validationResult, matchedData } from 'express-validator';
import {
  sendFileToCloudinary,
  getGeolocation,
  getHash,
  deleteFile,
  checkHash,
  getToken,
  deleteFilefromCloudinary,
  getGeoDistance,
} from '../common/index.js';

const FOLDER_NAME = '1h2024';

import mongoose from 'mongoose';
import { response } from 'express';

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
    const response = await sendFileToCloudinary(FOLDER_NAME, req.file.path);

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
    if (!req.verifiedMember.isAdmin) {
      if (req.verifiedMember._id != req.params.id) {
        throw new HttpError('Cannot delete!', 403);
      }
    }

    // search for member, when not then abort with error
    const deletedMember = await Member.findOneAndDelete({ _id: req.params.id });

    // await Visit.deleteMany({
    //   $or: [{ visitor: req.params.id }, { targetMember: req.params.id }],
    // });

    // await Heart.deleteMany({
    //   $or: [{ sender: req.params.id }, { recipient: req.params.id }],
    // });

    // await Password.findOneAndDelete({ members: req.params.id });

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
  const memberList = await Member.find({}).populate('favorites'); // it adds the whole data from the added favorite to favorite array

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
  const member = await Member.findById(req.params.id).populate('favorites');

  try {
    if (!member) {
      throw new HttpError('Cannot find member', 404);
    }

    res.json(member);
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 422));
  }
};

// TODO: fix updatemember with default code

const updateMember = async (req, res, next) => {
  try {
    // Sicherheitsprüfung: Member kann sich nur selbst wollen
    const { id } = req.params;

    if (!req.verifiedMember.isAdmin) {
      if (req.verifiedMember._id.toString() !== id) {
        throw new HttpError('Cant update member', 403);
      }
    }

    // Feldprüfungen Ergebnis checken
    const result = validationResult(req);

    if (result.errors.length > 0) {
      throw new HttpError(JSON.stringify(result.errors), 422);
    }

    const data = matchedData(req);

    // gibt es den Member überhaupt? Wenn nein, Abbruch
    const foundMember = await Member.findById(id);

    if (!foundMember) {
      throw new HttpError('Member cannot be found', 404);
    }

    // Es werden nur die Felder geändert, die über die Schnittstelle kommen
    Object.assign(foundMember, data);

    // wenn ein Bild kommt:
    if (req.file) {
      // Neues Bild in Cloudinary speichern
      const response = await sendFileToCloudinary(FOLDER_NAME, req.file.path);

      // Cloudinary Bild löschen
      await deleteFilefromCloudinary(foundMember.photo.cloudinaryPublicId);

      const photo = {
        cloudinaryPublicId: response.public_id,
        url: response.secure_url,
      };

      foundMember.photo = photo;
    }

    // nur wenn Zip, Street oder City kommt, dann Geodaten neu holen
    if (data.zip || data.street || data.city) {
      const address = data.street + ', ' + data.zip + ' ' + data.city;
      const geo = await getGeolocation(address);
      foundMember.geo = geo;
    }

    // Member speichern
    const updatedMember = await foundMember.save();

    // geänderten Daten rausschicken
    res.json(updatedMember);
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 500));
  }
};

const getDistances = async (req, res, next) => {
  const { id } = req.params;

  const foundMember = await Member.findById(id);

  if (!foundMember) {
    throw new HttpError('member cannot be found', 404);
  }

  const otherMembers = await Member.find({ _id: { $ne: id } });

  const calculatedMembers = otherMembers.map((member) => {
    return {
      ...member.toObject(),
      distance: getGeoDistance(
        foundMember.geo.lat,
        foundMember.geo.lon,
        member.geo.lat,
        member.geo.lon
      ),
    };
  });

  res.json(calculatedMembers);
};

const addFavorite = async (req, res, next) => {
  const { _id: id } = req.verifiedMember;

  const foundMember = await Member.findById(id);

  if (!foundMember) {
    throw new HttpError('member cannot be found', 404);
  }

  const { favoriteId } = req.params;

  if (foundMember.favorites.includes(favoriteId)) {
    return res.json(foundMember);
  }
  foundMember.favorites.push(favoriteId);

  const savedMember = await foundMember.save();
  res.json(savedMember);
};

const removeFavorite = async (req, res, next) => {
  const { _id: id } = req.verifiedMember;
  const foundMember = await Member.findById(id);

  if (!foundMember) {
    throw new HttpError('Member not found.', 404);
  }

  const { favoriteId } = req.params;

  const index = foundMember.favorites.findIndex(
    (favorite) => favorite.toString() === favoriteId
  );
  if (index === -1) {
    return res.json(foundMember);
  }
  foundMember.favorites.splice(index, 1);

  const savedMember = await foundMember.save();

  res.json(savedMember);
};

const sendHeart = async (req, res, next) => {
  try {
    const { sender, recipient, text, confirmed } = req.body;

    const validSender = await Member.findById(sender);
    const validRecipient = await Member.findById(recipient);

    if (!validSender || !validRecipient) {
      throw new HttpError('sender/recipient not found.', 404);
    }

    const existingHeart = await Heart.findOne({ sender, recipient });

    if (existingHeart) {
      throw new HttpError('Heart already sent', 400);
    }

    const heart = new Heart({ sender, recipient, text, confirmed });
    await heart.save();

    res.json(heart);
  } catch (error) {
    return next(new HttpError(error, error.errorCode, 500));
  }
};

const getHeartsForMember = async (req, res, next) => {
  try {
    const memberId = req.params.id;

    const memberExists = await Member.findById(memberId);
    if (!memberExists) {
      throw new HttpError('Member not found', 404);
    }

    const hearts = await Heart.find({ sender: memberId });

    if (hearts.length === 0) {
      throw new HttpError('No hearts found for this member', 404);
    }

    res.json(hearts);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

const deleteHeart = async (req, res, next) => {
  try {
    const { id } = req.params;

    const heart = await Heart.findOneAndDelete({ _id: id });

    if (!heart) {
      throw new HttpError('Heart not found', 404);
    }

    res.json({ message: 'Heart deleted successfully' });
  } catch (error) {
    return next(new HttpError(error.message, error.errorCode || 500));
  }
};

const confirmHeart = async (req, res, next) => {
  try {
    const heartId = req.params.id;

    const heart = await Heart.findById(heartId);

    if (!heart) {
      throw new HttpError('Heart not found', 404);
    }

    heart.confirmed = true;
    await heart.save();

    res.json({ message: 'Heart confirmed successfully', heart });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};
/////////////////////////////////////////////////
const createVisit = async (req, res, next) => {
  try {
    const { visitor, targetMember } = req.body;

    const validSender = await Member.findById(visitor);
    const validRecipient = await Member.findById(targetMember);

    if (!validSender || !validRecipient) {
      throw new HttpError('Visitor/Target Member not found', 404);
    }

    // const existingVisit = await Heart.findOne({ visitor, targetMember });

    // if (existingVisit) {
    //   throw new HttpError('Heart already sent', 400);
    // }

    const visit = new Visit({ visitor, targetMember });
    await visit.save();

    res.json({
      message: `${validSender.nickname} is visiting ${validRecipient.nickname}`,
      visit,
    });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

const allVisits = async (req, res, next) => {
  const memberId = req.params.id;

  const memberExists = await Member.findById(memberId);
  if (!memberExists) {
    throw new HttpError('Member not found', 404);
  }

  const visits = await Visit.find({ visitor: memberId });

  if (visits.length === 0) {
    throw new HttpError('No hearts found for this member', 404);
  }

  res.json(visits);
};

const deleteVisit = async (req, res, next) => {
  try {
    const { id } = req.params;

    const visit = await Visit.findOneAndDelete({ _id: id });

    if (!visit) {
      throw new HttpError('Heart not found', 404);
    }

    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    return next(new HttpError(error.message, error.errorCode || 500));
  }
};

export {
  signup,
  login,
  getAllMembers,
  getOneMember,
  changePassword,
  deleteMember,
  updateMember,
  getDistances,
  addFavorite,
  removeFavorite,
  sendHeart,
  getHeartsForMember,
  deleteHeart,
  confirmHeart,
  createVisit,
  allVisits,
  deleteVisit,
};
