import { Metadata } from "next";
import { CONFIG } from "@/config";

export const metadata: Metadata = {
  title: CONFIG.site.name,
  description: CONFIG.site.description,
}; 