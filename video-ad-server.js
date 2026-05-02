import express from "express";
import multer from "multer";
import { exec } from "child_process";
import path from "path";

const app = express();
const upload = multer({ dest: "uploads/" });

const formats = {
  square: "1080:1080",
  story: "1080:1920",
  portrait: "1080:1350",
  landscape: "1200:628",
};

app.post(
  "/create-video",
  upload.fields([
    { name: "images", maxCount: 20 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    const images = req.files.images;
    const audio = req.files.audio[0];
    const outputs = [];

    for (const [name, size] of Object.entries(formats)) {
      const listPath = `uploads/list-${name}.txt`;

      const listContent = images
        .map((img) => `file '${path.resolve(img.path)}'\nduration 3`)
        .join("\n");

      await Bun.write(listPath, listContent);

      const output = `outputs/facebook-ad-${name}.mp4`;

      const cmd = `
        ffmpeg -y
        -f concat -safe 0 -i ${listPath}
        -i ${audio.path}
        -vf "scale=${size}:force_original_aspect_ratio=increase,crop=${size},format=yuv420p"
        -shortest
        -r 30
        -c:v libx264
        -c:a aac
        ${output}
      `;

      await new Promise((resolve, reject) => {
        exec(cmd, (err) => (err ? reject(err) : resolve()));
      });

      outputs.push({ format: name, file: output });
    }

    res.json({ success: true, videos: outputs });
  }
);

app.listen(3000, () => {
  console.log("Video ad generator running on port 3000");
});
