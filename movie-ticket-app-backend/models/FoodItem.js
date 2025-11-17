// models/FoodItem.js

import { pool } from '../config/db.js';
import { v2 as cloudinary } from '../config/cloudinaryConfig.js';

class FoodItem {
    constructor(itemId, categoryName, name, description, price, imageUrl, isAvailable) {
        this.item_id = itemId;
        this.category_name = categoryName;
        this.name = name;
        this.description = description;
        this.price = parseFloat(price);
        this.image_url = imageUrl;
        this.is_available = Boolean(isAvailable);
    }

    static async findAll() {
        const [rows] = await pool.execute('SELECT * FROM food_items');
        return rows.map(row => new FoodItem(row.item_id, row.category_name, row.name, row.description, row.price, row.image_url, row.is_available));
    }

    static async findById(itemId) {
        const [rows] = await pool.execute('SELECT * FROM food_items WHERE item_id = ?', [itemId]);
        if (rows.length > 0) {
            const row = rows[0];
            return new FoodItem(row.item_id, row.category_name, row.name, row.description, row.price, row.image_url, row.is_available);
        }
        return null;
    }

    /**
     * Creates a new food item in the database.
     * @param {object} foodItemData - Object containing food item data.
     * @returns {Promise<FoodItem|null>} A promise that resolves to the new FoodItem object if successful, or null.
     */
    static async create(foodItemData) {
        const { category_name, name, description, price, image_url, is_available } = foodItemData;
        const query = `
            INSERT INTO food_items (category_name, name, description, price, image_url, is_available)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        // Đảm bảo giá trị 'is_available' được chuyển đổi phù hợp với kiểu boolean/TINYINT trong MySQL
        // MySQL TINYINT(1) coi 1 là true, 0 là false. Boolean JS 'true'/'false' thường được driver xử lý.
        const values = [category_name, name, description, price, image_url, is_available ? 1 : 0]; // Chuyển đổi boolean JS thành 1 hoặc 0

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute(query, values);
            await connection.commit();

            if (result.insertId) {
                // Trả về đối tượng FoodItem mới với ID đã tạo
                return new FoodItem(result.insertId, category_name, name, description, price, image_url, is_available);
            }
            return null; // Trường hợp không có insertId (rất hiếm khi xảy ra nếu insert thành công)
        } catch (error) {
            await connection.rollback();
            // Xử lý lỗi cụ thể và ném ra thông báo rõ ràng hơn
            if (error.code === 'ER_DUP_ENTRY') {
                // Đây là lỗi khi có ràng buộc UNIQUE và bạn cố gắng chèn giá trị trùng lặp
                throw new Error('Tên đồ ăn này đã tồn tại trong danh mục đã chọn.');
            }
            // Ném lại các lỗi khác để controller có thể bắt
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Helper function to extract Cloudinary public ID from a URL.
     * @param {string} url - The Cloudinary image URL.
     * @returns {string|null} The public ID or null if not a Cloudinary URL.
     */
    static getPublicIdFromUrl(url) {
        if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
            return null;
        }
        const parts = url.split('/');
        // Cloudinary URL typically ends with /version/folder/public_id.extension
        // We need to get 'folder/public_id' part
        const filenameWithExtension = parts.pop();
        const folder = parts.pop();
        if (folder && filenameWithExtension) {
            const publicId = `${folder}/${filenameWithExtension.split('.')[0]}`;
            // Optional: Remove any version numbers if present (e.g., /v12345/folder/public_id)
            // Lọc bỏ phần "v" + số phiên bản nếu có (ví dụ: 'v1678901234/myfolder/myimage' -> 'myfolder/myimage')
            const partsAfterVersion = publicId.split('/');
            if (partsAfterVersion.length >= 2 && partsAfterVersion[0].startsWith('v') && /^\d+$/.test(partsAfterVersion[0].substring(1))) {
                return partsAfterVersion.slice(1).join('/');
            }
            return publicId;
        }
        return null;
    }

    /**
     * Updates an existing food item in the database and handles old image deletion.
     * @param {number} itemId - The ID of the food item to update.
     * @param {object} updateData - Object containing fields to update.
     * @returns {Promise<boolean>} A promise that resolves to true if updated, false otherwise.
     */
    static async update(itemId, updateData) {
        const updates = [];
        const values = [];

        const validFields = ['category_name', 'name', 'description', 'price', 'image_url', 'is_available'];
        let oldImageUrl = null;

        // Fetch current item to get old image_url if a new one is provided
        if (updateData.image_url !== undefined) {
            const existingItem = await this.findById(itemId);
            if (existingItem) {
                oldImageUrl = existingItem.image_url;
            }
        }

        for (const field of validFields) {
            if (updateData[field] !== undefined) {
                updates.push(`${field} = ?`);
                // Đặc biệt xử lý is_available để đảm bảo kiểu dữ liệu phù hợp với database
                if (field === 'is_available') {
                    values.push(updateData[field] ? 1 : 0); // Chuyển đổi boolean JS thành 1 hoặc 0
                } else {
                    values.push(updateData[field]);
                }
            }
        }

        if (updates.length === 0) {
            return false; // No fields to update
        }

        const query = `UPDATE food_items SET ${updates.join(', ')} WHERE item_id = ?`;
        values.push(itemId);

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [result] = await connection.execute(query, values);

            if (result.affectedRows > 0 && updateData.image_url !== undefined && oldImageUrl) {
                const publicId = this.getPublicIdFromUrl(oldImageUrl);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                    console.log(`Cloudinary: Old image ${publicId} deleted.`);
                }
            }

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Tên đồ ăn đã tồn tại trong danh mục này.');
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Deletes a food item from the database and its associated image from Cloudinary.
     * @param {number} itemId - The ID of the food item to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if deleted, false otherwise.
     */
    static async delete(itemId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // First, get the image URL of the item to be deleted
            const foodItemToDelete = await this.findById(itemId);
            if (!foodItemToDelete) {
                return false; // Item not found
            }

            const [result] = await connection.execute('DELETE FROM food_items WHERE item_id = ?', [itemId]);

            if (result.affectedRows > 0 && foodItemToDelete.image_url) {
                const publicId = this.getPublicIdFromUrl(foodItemToDelete.image_url);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                    console.log(`Cloudinary: Image ${publicId} deleted during food item deletion.`);
                }
            }

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            // You might want to handle specific errors like foreign key constraints here
            throw error;
        } finally {
            connection.release();
        }
    }
}

export default FoodItem;
