import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    //change the way file name is being stored in cloudinary
    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage,
});
