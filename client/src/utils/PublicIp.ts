export const getPublicIp = async (): Promise<string> => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    if (!response.ok) {
      throw new Error("Failed to fetch public IP");
    }
    const data = await response.json();
    return data.ip || "unknown";
  } catch (error) {
    console.error("Error getting public IP:", error);
    return "unknown";
  }
};
