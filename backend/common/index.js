import cloudinary from 'cloudinary';
import * as dotenv from 'dotenv';
import axios from 'axios';
import bcrypt from 'bcrypt';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const getZodiac = (y, m, d) => {
  const date = new Date(y, m - 1, d);
  const days = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  const signs = [
    'Capricorn', // January
    'Aquarius', // February
    'Pisces', // March
    'Aries', // April
    'Taurus', // May
    'Gemini', // June
    'Cancer', // July
    'Leo', // August
    'Virgo', // September
    'Libra', // October
    'Scorpio', // November
    'Sagittarius', // December
  ];

  let month = date.getMonth();
  let day = date.getDate();

  if (day <= days[month]) {
  }
  if (month < 0) {
    month = 11;
  }
  return signs[month];
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

const sendFileToCloudinary = async (folder, imagePath) => {
  // call cloudinary, send file
  const response = await cloudinary.v2.uploader.upload(imagePath, {
    folder,
    overwrite: true,
    secure: true,
  });
  // TODO: Error handling
  // TODO: delete temporary local photo
  deleteFile(imagePath);
  // return result
  return response;
};
const deleteFilefromCloudinary = async (publicId) => {
  if (!publicId || publicId.length === 0) {
    return;
  }

  await cloudinary.v2.uploader.destroy(publicId);
};

const getAge = (year, month, day) => {
  // Achtung: in Javascript fangen die Monate bei 0 an!
  const today = new Date();
  const birthDate = new Date(year, month, day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};
const getToken = (id) => {
  const token = jwt.sign(
    {
      id,
    },
    process.env.JWT_KEY,
    { expiresIn: '1h' }
  );
  return token;
};

const getGeolocation = async (address) => {
  const apiKey = process.env.LOCATIONIQ_KEY;
  const url = `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(
    address
  )}&format=json`;
  const response = await axios(url);
  // console.log(`Was ist locationiq DATA ${response.data[0]}`);
  const geo = {
    lat: 0,
    lon: 0,
  };
  if (response.data.length > 0) {
    const { lat, lon } = response.data[0];
    geo.lat = lat;
    geo.lon = lon;
  }
  return geo;
};

const getHash = (plainText) => {
  // plainText hash
  const hash = bcrypt.hashSync(plainText, SALT_ROUNDS);
  // return hash
  return hash;
};

const checkHash = (plainText, hashText) => {
  // password vergleichen

  return bcrypt.compareSync(plainText, hashText);
};

const limits = {
  fileSize: 1024 * 1024 * 5, // 5mb
};

const deleteFile = (path) => {
  // Prüfen ob vorhanden
  if (fs.existsSync(path)) {
    // wenn ja -> Löschen
    fs.unlinkSync(path);
  }
};

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getGeoDistance(lat1, lon1, lat2, lon2) {
  // console.log(lat1, lon1, lat2, lon2);
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

const handleValidationErrors = (errors) => {
  const uniqueErrorsPath = [];
  const addedPaths = new Set();
  let error;

  errors.forEach((error) => {
    if (!error.from) {
      if (!addedPaths.has(error.path)) {
        uniqueErrorsPath.push({
          path: error.path,
          msg: error.msg,
        });
        addedPaths.add(error.path);
      }
    }
  });

  // Customize the errorCode, typ, redirectTo, and messageArray as per your requirements
  error = new HttpError('Validation Error', 400, uniqueErrorsPath);

  // Return or throw the error object
  return error;
};

const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    const errorResponse = err.toJSON();
    res.status(err.errorCode).json(errorResponse);
  } else {
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};

export {
  sendFileToCloudinary,
  getGeolocation,
  getHash,
  deleteFile,
  getAge,
  getZodiac,
  checkHash,
  getToken,
  deleteFilefromCloudinary,
  getGeoDistance,
  handleValidationErrors,
  errorHandler,
};
