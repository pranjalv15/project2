import express from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Create the uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Storage configuration using Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Image upload endpoint
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const fileBuffer = req.file.buffer;
  const fileName = `temp-${Date.now()}.png`;
  const filePath = path.join(uploadDir, fileName);

  try {
    // Save the resized image to the server
    await sharp(fileBuffer)
      .resize(300) // Resize for preview
      .toFile(filePath);
    const fileUrl = `http://localhost:5000/uploads/${fileName}`;
    res.json({ fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error processing image" });
  }
});

// Image processing (brightness, contrast, etc.)
app.post("/process", async (req, res) => {
  const { filePath, brightness, contrast, saturation, rotation } = req.body;

  try {
    // Define the processed file name and path
    const processedFileName = `processed-${Date.now()}.png`;
    const processedFilePath = path.join(uploadDir, processedFileName);

    // Create a Sharp instance for image processing
    let image = sharp(filePath);

    // Apply brightness and saturation adjustments
    if (brightness !== undefined || saturation !== undefined) {
      image = image.modulate({
        brightness: brightness ?? 1,
        saturation: saturation ?? 1,
      });
    }

    // Apply contrast adjustment
    if (contrast !== undefined) {
      const contrastFactor = contrast < 1 ? contrast + 1 : contrast;
      image = image.linear(contrastFactor, -(128 * (contrastFactor - 1)));
    }

    // Apply rotation
    if (rotation !== undefined) {
      image = image.rotate(rotation);
    }

    // Save the processed image with resizing for preview
    await image.resize({ width: 300 }).toFile(processedFilePath);

    const processedFileUrl = `http://localhost:5000/uploads/${processedFileName}`;
    res.json({ processedFileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error processing image" });
  }
});

// Start the server
const port = 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
