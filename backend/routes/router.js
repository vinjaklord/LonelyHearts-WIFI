import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  login,
  signup,
  getAllMembers,
  getOneMember,
  changePassword,
  deleteMember,
  updateMember,
  addFavorite,
  removeFavorite,
  sendHeart,
  getHeartsForMember,
  confirmHeart,
  deleteHeart,
  createVisit,
  allVisits,
  deleteVisit,
} from '../controllers/members.js';
import { upload, checkToken } from '../common/middlewares.js';
const router = new Router();

// TODO: build in the chech token
router.get('/members', checkToken, getAllMembers);
router.get('/members/:id', checkToken, getOneMember);
router.get('/members/distances/:id', checkToken, getOneMember);
router.post('/favorites/:favoriteId', checkToken, addFavorite);
router.delete('/favorites/:favoriteId', checkToken, removeFavorite);

router.post(
  '/members/signup',
  upload.single('photo'),
  body('password').escape().isLength({ min: 6, max: 50 }),
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

router.patch(
  '/members/:id',
  checkToken,
  upload.single('photo'),
  body('statement').escape().optional(),
  body('firstName').trim().escape().isLength({ min: 2, max: 50 }).optional(),
  body('lastName').trim().escape().isLength({ min: 2, max: 50 }).optional(),
  body('street').trim().escape().isLength({ min: 2, max: 50 }).optional(),
  body('zip').trim().escape().isLength({ min: 2, max: 50 }).optional(),
  body('city').trim().escape().isLength({ min: 2, max: 50 }).optional(),
  body('birthDay').escape().isInt({ min: 1, max: 50 }).optional(),
  body('birthMonth').escape().isInt({ min: 1, max: 50 }).optional(),
  body('paused').escape().isBoolean().optional(),
  body('birthYear')
    .escape()
    .isInt({ min: 1900, max: new Date().getFullYear() }),
  updateMember
);

router.patch(
  '/members/change-password',
  checkToken,
  body('oldPassword').escape().isLength({ min: 6, max: 50 }),
  body('newPassword').escape().isLength({ min: 6, max: 50 }),
  changePassword
);

router.delete('/members/:id', checkToken, deleteMember);

router.post(
  '/members/login',

  body('password').escape().optional(),
  body('login').escape().optional(),

  login
);

router.post(
  '/hearts',
  checkToken,
  body('sender').isMongoId(),
  body('recipient').isMongoId(),
  body('text').isString().isLength({ min: 1, max: 500 }),
  body('confirmed').optional().isBoolean(),
  sendHeart
);

router.get(
  '/hearts/:id',
  checkToken,
  param('id').isMongoId(),
  getHeartsForMember
);

router.patch(
  '/hearts/:id',
  checkToken,
  param('id').isMongoId(),
  body('confirmed').isBoolean(),
  confirmHeart
);

router.delete('/hearts/:id', checkToken, param('id').isMongoId(), deleteHeart);

router.post(
  '/visits',
  checkToken,

  createVisit
);
router.get(
  '/visits/:id',
  checkToken,

  allVisits
);
router.delete(
  '/visits/:id',
  checkToken,

  deleteVisit
);

export default router;
