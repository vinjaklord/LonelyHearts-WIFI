import multer from 'multer';
import * as dotenv from 'dotenv';

import HttpError from '../models/http-error.js';
import { Member } from '../models/members.js';

import jwt from 'jsonwebtoken';

dotenv.config();

// Middleware Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    const extArray = file.mimetype.split('/');
    const extention = extArray[extArray.length - 1];
    cb(null, file.fieldname + '-' + Date.now() + '.' + extention);
  },
});

const limits = {
  fileSize: 1024 * 1024 * 5, // 5mb
};

const fileFilter = (req, file, callback) => {
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/gif'
  ) {
    return callback(null, true);
  }

  callback(null, false);
};

const upload = multer({ storage, limits, fileFilter });

const checkToken = async (req, res, next) => {
  // Middleware fur Tokenuberprufung
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    const { authorization } = req.headers;
    if (!authorization) {
      throw new HttpError('Invalid Token', 401);
    }
    const token = authorization.split(' ')[1];

    // Token uberprufen(ist er abgelaufen, kommt eine ID mit)
    const decoded = jwt.verify(token, process.env.JWT_KEY);

    const { id } = decoded;
    const member = await Member.findById(id);

    if (!member) {
      throw new HttpError('Invalid Token', 401);
    }

    // Request um den Eintrag verifiedMember erweitern
    req.verifiedMember = member;
    next();
  } catch (err) {
    return next(new HttpError(err, err.errorCode || 500));
  }

  // Http methode OPTIONS durchlassen
  // header prufen ob ein authorisation token kommt
};

export { upload, checkToken };
