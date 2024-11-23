import multer from 'multer';
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

const deleteFile = (path) => {
  // Prüfen ob vorhanden
  if (fs.existsSync(path)) {
    // wenn ja -> Löschen
    fs.unlinkSync(path);
  }
};

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

const upload = multer({ storage, limits, fileFilter });

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

const checkToken = () => {};

export {
  upload,
  sendFileToCloudinary,
  getGeolocation,
  getHash,
  deleteFile,
  getAge,
  getZodiac,
  checkHash,
  getToken,
  checkToken,
};
