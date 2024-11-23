import { Router } from 'express';
import { body } from 'express-validator';
import {
  login,
  signup,
  getAllMembers,
  getOneMember,
} from '../controllers/members.js';
import { upload } from '../common/index.js';
const router = new Router();

// TODO: build in the chech token
router.get('/members', getAllMembers);

router.get('/members/:id', getOneMember);

router.post(
  '/members/signup',
  upload.single('photo'),
  body('password').escape().optional(),
  body('statement').escape().optional(),
  body('email').escape().isEmail().toLowerCase().normalizeEmail(),
  body('nickname').trim().escape().isLength({ min: 4, max: 50 }),
  body('firstName').trim().escape().isLength({ min: 2, max: 50 }),
  body('lastName').trim().escape().isLength({ min: 2, max: 50 }),
  body('street').trim().escape().isLength({ min: 2, max: 50 }),
  body('zip').trim().escape().isLength({ min: 2, max: 50 }),
  body('city').trim().escape().isLength({ min: 2, max: 50 }),
  body('birthDay').trim().escape().isInt({ min: 1, max: 50 }),
  body('birthMonth').trim().escape().isInt({ min: 1, max: 50 }),
  body('birthYear')
    .trim()
    .escape()
    .isInt({ min: 1900, max: new Date().getFullYear() }),
  signup
);

router.post(
  '/members/login',

  body('password').escape().optional(),
  body('login').escape().optional(),

  login
);
export default router;
