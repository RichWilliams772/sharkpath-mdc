import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The local speech model runs on onnxruntime's native binary; load these at runtime instead of bundling them.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp"],
};

export default nextConfig;
