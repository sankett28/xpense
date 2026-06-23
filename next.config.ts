import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading dev resources (HMR, etc.) when the app is opened from another
  // device on the LAN (e.g. testing on a phone). Add the Mac's Wi-Fi IP here;
  // it can change between sessions, so the whole 192.168.29.x subnet is allowed.
  allowedDevOrigins: ["192.168.29.129", "192.168.29.*"],
};

export default nextConfig;
