export const getDeviceInfo = () => {
  const ua = navigator.userAgent;

  let equipment = "Unknown";
  if (/Windows/i.test(ua)) equipment = "Windows";
  else if (/Macintosh/i.test(ua)) equipment = "Mac OS";
  else if (/iPhone/i.test(ua)) equipment = "iPhone";
  else if (/iPad/i.test(ua)) equipment = "iPad";
  else if (/Android/i.test(ua)) equipment = "Android";
  else if (/Linux/i.test(ua)) equipment = "Linux";

  let browser = "Unknown";

  const browserRegexes = [
    { name: "Edge", regex: /Edg\/([0-9._]+)/ },
    { name: "Chrome", regex: /Chrome\/([0-9._]+)/ },
    { name: "Firefox", regex: /Firefox\/([0-9._]+)/ },
    { name: "Safari", regex: /Version\/([0-9._]+).*Safari/ },
    { name: "Opera", regex: /OPR\/([0-9._]+)/ },
  ];

  for (const b of browserRegexes) {
    const match = ua.match(b.regex);
    if (match) {
      browser = `${b.name} ${match[1]}`;
      break;
    }
  }

  return { equipment, browser };
};
