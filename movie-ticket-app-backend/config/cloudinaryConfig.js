// config/cloudinaryConfig.js

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Cấu hình Multer cho AVATARS ---
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'avatars',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ width: 250, height: 250, crop: 'fill' }]
    }
});
const uploadAvatars = multer({ storage: avatarStorage });

// --- Cấu hình Multer cho MOVIE POSTERS ---
const moviePosterStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'movie_posters',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    }
});
const uploadMoviePoster = multer({ storage: moviePosterStorage });

// --- Cấu hình Multer cho BANNERS ---
const bannerStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'banners',
        format: async (req, file) => 'png',
        public_id: (req, file) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            return `banner_${uniqueSuffix}_${file.originalname.split('.')[0]}`;
        },
    },
});
const uploadBanner = multer({ storage: bannerStorage });

// --- Cấu hình Multer cho FOOD_ITEMS (Mới) ---
const foodItemImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'food_items', // Thư mục dành cho ảnh đồ ăn
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        // Bạn có thể thêm các transformation khác cho ảnh đồ ăn ở đây nếu muốn
    }
});
const uploadFoodItemImage = multer({ storage: foodItemImageStorage });


// Export cloudinary dưới tên 'v2' và các instance 'upload' cụ thể
export { cloudinary as v2, uploadAvatars, uploadMoviePoster, uploadBanner, uploadFoodItemImage };