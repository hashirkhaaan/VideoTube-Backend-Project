import { v2 as cloudinary } from "cloudinary";

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const deleteZombieFilesOnCloudinary = async (publicId, resource_type) => {
    try {
        if (!publicId) return null;

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type,
        });

        if (response.result !== "ok") {
            console.warn(
                `Cloudinary Delete Warning: ${publicId} - ${response.result}`
            );
        }

        return response;
    } catch (error) {
        console.error("Cloudinary Delete Failed:", error.message);
        return null;
    }
};

export { deleteZombieFilesOnCloudinary };
