import fs from "fs";

const deleteZombieFilesFromLocal = async (localFilePath) => {
    try {
        if (!localFilePath) return false;

        // Check if file actually exists before trying to delete
        // This prevents unnecessary 'file not found' errors
        fs.access(localFilePath); 

        fs.unlink(localFilePath);
        
        console.log(`Successfully deleted: ${path.basename(localFilePath)}`);
        return true;
    } catch (error) {
        // If file doesn't exist, we don't necessarily need an error log
        if (error.code === 'ENOENT') {
            console.warn("File already deleted or does not exist.");
        } else {
            console.error("Local Delete Error:", error.message);
        }
        return false;
    }
};

export { deleteZombieFilesFromLocal };
