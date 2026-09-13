// src/services/cloudinaryService.js

const CLOUD  = process.env.REACT_APP_CLOUDINARY_CLOUD;
const PRESET = process.env.REACT_APP_CLOUDINARY_PRESET;

export async function uploadImage(file) {
  if (!file) throw new Error("No file provided");

  console.log("Uploading to Cloudinary...");
  console.log("Cloud:", CLOUD);
  console.log("Preset:", PRESET);

  const formData = new FormData();
  formData.append("file",          file);
  formData.append("upload_preset", PRESET);

  const url = "https://api.cloudinary.com/v1_1/" + CLOUD + "/image/upload";
  console.log("Upload URL:", url);

  const res = await fetch(url, {
    method: "POST",
    body:   formData,
  });

  console.log("Response status:", res.status);

  if (!res.ok) {
    const errData = await res.json();
    console.error("Cloudinary error:", errData);
    throw new Error(errData?.error?.message || "Upload failed");
  }

  const data = await res.json();
  console.log("Upload success:", data.secure_url);

  return {
    url:      data.secure_url,
    publicId: data.public_id,
    width:    data.width,
    height:   data.height,
  };
}

export function getOptimizedUrl(url, width = 400) {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/w_" + width + ",q_auto,f_auto/");
}