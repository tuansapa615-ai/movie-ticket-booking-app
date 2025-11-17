// controllers/bannerController.js
import {pool} from '../config/db.js'; // Đảm bảo bạn đã có kết nối database
import { v2 as cloudinary } from '../config/cloudinaryConfig.js'; // Import cloudinary instance

// Hàm helper để trích xuất public_id từ URL Cloudinary
const getPublicIdFromUrl = (url) => {
    if (!url) return null;
    const parts = url.split('/');
    const publicIdWithExtension = parts[parts.length - 1];
    const publicId = publicIdWithExtension.split('.')[0]; // Xóa đuôi file
    // Cloudinary folder structure: banners/public_id
    const folderName = parts[parts.length - 2];
    if (folderName === 'banners') { // Chỉ xóa nếu nó thuộc folder banners
        return `${folderName}/${publicId}`;
    }
    return null;
};

// @route GET /api/banners
// @desc Lấy tất cả banners
// @access Public
export const getAllBanners = async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM Banners');
        res.status(200).json({ banners: rows });
    } catch (error) {
        console.error('Lỗi khi lấy banners:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi lấy banners.' });
    }
};

// @route POST /api/banners
// @desc Thêm banner mới
// @access Admin
export const addBanner = async (req, res) => {
    const { launchUrl } = req.body;
    // req.file sẽ có thông tin ảnh đã upload từ Multer-Cloudinary
    const imageUrl = req.file?.path; // URL ảnh từ Cloudinary

    if (!imageUrl || !launchUrl) {
        // Nếu không có ảnh hoặc launchUrl, xóa ảnh vừa upload (nếu có)
        if (imageUrl) {
            const publicId = getPublicIdFromUrl(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }
        return res.status(400).json({ message: 'Vui lòng cung cấp cả URL ảnh và URL khởi chạy.' });
    }

    try {
        const [result] = await pool.execute(
            'INSERT INTO Banners (imageUrl, launchUrl) VALUES (?, ?)',
            [imageUrl, launchUrl]
        );
        res.status(201).json({
            message: 'Banner đã được thêm thành công.',
            banner: {
                banner_id: result.insertId,
                imageUrl,
                launchUrl
            }
        });
    } catch (error) {
        console.error('Lỗi khi thêm banner:', error);
        // Xóa ảnh đã upload nếu có lỗi database
        if (imageUrl) {
            const publicId = getPublicIdFromUrl(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi khi thêm banner.' });
    }
};

// @route PUT /api/banners/:id
// @desc Cập nhật banner
// @access Admin
export const updateBanner = async (req, res) => {
    const { id } = req.params;
    const { launchUrl } = req.body;
    const newImageUrl = req.file?.path; // URL ảnh mới từ Cloudinary (nếu có)

    try {
        // Lấy thông tin banner hiện tại để có URL ảnh cũ
        const [banners] = await pool.execute('SELECT * FROM Banners WHERE banner_id = ?', [id]);

        if (banners.length === 0) {
            // Nếu không tìm thấy banner, xóa ảnh mới đã upload (nếu có)
            if (newImageUrl) {
                const newPublicId = getPublicIdFromUrl(newImageUrl);
                if (newPublicId) {
                    await cloudinary.uploader.destroy(newPublicId);
                }
            }
            return res.status(404).json({ message: 'Không tìm thấy banner.' });
        }

        const oldBanner = banners[0];
        let imageUrlToUpdate = oldBanner.imageUrl;

        // Nếu có ảnh mới được upload, xóa ảnh cũ trên Cloudinary
        if (newImageUrl) {
            const oldPublicId = getPublicIdFromUrl(oldBanner.imageUrl);
            if (oldPublicId) {
                await cloudinary.uploader.destroy(oldPublicId);
            }
            imageUrlToUpdate = newImageUrl; // Cập nhật URL ảnh mới
        } else if (launchUrl === undefined) { // Nếu không có ảnh mới và không có launchUrl, có thể là lỗi.
            return res.status(400).json({ message: 'Không có dữ liệu để cập nhật.' });
        }


        const [result] = await pool.execute(
            'UPDATE Banners SET imageUrl = ?, launchUrl = ? WHERE banner_id = ?',
            [imageUrlToUpdate, launchUrl ?? oldBanner.launchUrl, id] // Dùng launchUrl mới hoặc cũ
        );

        if (result.affectedRows === 0) {
            // Nếu không có hàng nào bị ảnh hưởng, có thể do ID không tồn tại
            // hoặc dữ liệu không thay đổi.
            // Xóa ảnh mới đã upload nếu không có cập nhật trong DB
            if (newImageUrl) {
                const newPublicId = getPublicIdFromUrl(newImageUrl);
                if (newPublicId) {
                    await cloudinary.uploader.destroy(newPublicId);
                }
            }
            return res.status(404).json({ message: 'Không tìm thấy banner để cập nhật hoặc không có thay đổi.' });
        }

        res.status(200).json({
            message: 'Banner đã được cập nhật thành công.',
            banner: {
                banner_id: id,
                imageUrl: imageUrlToUpdate,
                launchUrl: launchUrl ?? oldBanner.launchUrl
            }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật banner:', error);
        // Xóa ảnh đã upload nếu có lỗi database trong quá trình cập nhật
        if (newImageUrl) {
            const newPublicId = getPublicIdFromUrl(newImageUrl);
            if (newPublicId) {
                await cloudinary.uploader.destroy(newPublicId);
            }
        }
        res.status(500).json({ message: 'Đã xảy ra lỗi khi cập nhật banner.' });
    }
};

// @route DELETE /api/banners/:id
// @desc Xóa banner
// @access Admin
export const deleteBanner = async (req, res) => {
    const { id } = req.params;

    try {
        // Lấy URL ảnh để xóa trên Cloudinary
        const [banners] = await pool.execute('SELECT imageUrl FROM Banners WHERE banner_id = ?', [id]);

        if (banners.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy banner.' });
        }

        const imageUrlToDelete = banners[0].imageUrl;

        // Xóa banner khỏi database trước
        const [result] = await pool.execute('DELETE FROM Banners WHERE banner_id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy banner để xóa.' });
        }

        // Sau khi xóa khỏi DB, xóa ảnh trên Cloudinary
        const publicId = getPublicIdFromUrl(imageUrlToDelete);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            console.log(`Đã xóa ảnh Cloudinary: ${publicId}`);
        } else {
            console.warn(`Không thể trích xuất Public ID từ URL: ${imageUrlToDelete}`);
        }

        res.status(200).json({ message: 'Banner đã được xóa thành công.' });
    } catch (error) {
        console.error('Lỗi khi xóa banner:', error);
        res.status(500).json({ message: 'Đã xảy ra lỗi khi xóa banner.' });
    }
};