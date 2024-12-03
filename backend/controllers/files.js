import { error } from 'console';
import fs from 'fs';
import { parse } from 'path';

const uploadAsStream = async (req, res, next) => {
  const FILE_PATH = './uploads/stream.pdf';

  const uploadFile = async () => {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(FILE_PATH);
      stream.on('open', () => {
        console.log('Stream open... 0.00%');
        req.pipe(stream);
      });

      stream.on('drain', () => {
        const written = parseInt(stream.bytesWritten);
        const total = parseInt(req.headers['content-length']); // this is like req.headers.content-length, BUT the minus is not allowed, that is why it is in square brackets, but it is still a KEY-VALUE pair
        const percent = ((written / total) * 100).toFixed(2);
        console.log(`Processing ... ${percent}% done!`);
      });

      stream.on('close', () => {
        resolve(FILE_PATH);
      });

      stream.on('error', () => {
        console.error(error);
        reject(error);
      });
    });
  };

  const response = await uploadFile();
  res.send(response);
};

export { uploadAsStream };
