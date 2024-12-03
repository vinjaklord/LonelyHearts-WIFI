import { Message, Member } from '../models/members.js';
import HttpError from '../models/http-error.js';
import mongoose from 'mongoose';

const sendMessage = async (req, res, next) => {
  try {
    const { sender, recipient, text } = req.body;

    const validSender = await Member.findById(sender);
    const validRecipient = await Member.findById(recipient);

    if (!validSender || !validRecipient) {
      throw new HttpError('sender/recipient not found.', 404);
    }

    const message = new Message({ sender, recipient, text });
    await message.save();

    res.json(message);
  } catch (error) {}
};

const editMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, read } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      throw new HttpError('Message not found.', 404);
    }

    if (text) {
      message.text = text;
    }
    if (read) {
      message.read = read;
    }

    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } catch (error) {
    return next(
      new HttpError(error, error.errorCode || 'Updating message failed', 500)
    );
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;

    const message = await Message.findOneAndDelete({ _id: id });

    if (!message) {
      throw new HttpError('Message not found', 404);
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    return next(new HttpError(error.message, error.errorCode || 500));
  }
};

const allMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({});

    if (!messages.length) {
      return res.status(404).json({ message: 'No messages found.' });
    }

    res.json(messages);
  } catch (error) {
    return next(
      new HttpError(error, error.errorCode || 'Fetching messages failed.', 500)
    );
  }
};

const oneMessage = async (req, res, next) => {
  const memberId = req.params.id;

  const memberExists = await Message.findById(memberId);

  const message = await Message.find({ sender: memberId });

  res.json(message);
};

const getThreads = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError('Cant find threads', 404);
    }

    const messages = await Message.find({ recipient: id })
      .populate('sender')
      .sort({ createAt: 'desc' });

    const threads = [];
    messages.forEach((message) => {
      const index = threads.findIndex(
        (thread) => thread.sender.toString() === message.sender.toString()
      );

      if (index < 0) {
        threads.push(message);
      }
    });

    res.json([]);
  } catch (error) {
    return next(new HttpError(error, error.errorCode || 500));
  }
};

const allMessagesProThread = async (req, res, next) => {
  const { sender, recipient } = req.query;

  if (!sender || !recipient) {
    return res.status(400).json({ error: 'Missing sender or recipient' });
  }

  try {
    const messages = await Message.find({ sender, recipient });

    if (!messages) {
      return res
        .status(404)
        .json({ error: 'No messages found for this thread' });
    }

    res.json(messages);
  } catch (err) {
    next(err);
  }
};

export {
  sendMessage,
  editMessage,
  deleteMessage,
  allMessages,
  oneMessage,
  getThreads,
  allMessagesProThread,
};
