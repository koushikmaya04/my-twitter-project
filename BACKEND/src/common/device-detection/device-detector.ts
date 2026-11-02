export interface ParsedDeviceInfo {
  browser: string;
  browserVersion: string | null;
  os: string;
  osVersion: string | null;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown device';
  displayName: string;
}

/**
 * Reliable User-Agent parser that accurately extracts browser name, browser version,
 * operating system, OS version, and device type without fake information or assumptions.
 */
export function parseUserAgent(userAgent?: string | null): ParsedDeviceInfo {
  if (!userAgent || typeof userAgent !== 'string' || !userAgent.trim()) {
    return {
      browser: 'Unknown',
      browserVersion: null,
      os: 'Unknown',
      osVersion: null,
      deviceType: 'Unknown device',
      displayName: 'Unknown device',
    };
  }

  const ua = userAgent.trim();

  // 1. Browser Detection
  let browser = 'Unknown';
  let browserVersion: string | null = null;
  let match: RegExpMatchArray | null;

  if ((match = ua.match(/(?:Edg|Edge)\/([\d.]+)/i))) {
    browser = 'Microsoft Edge';
    browserVersion = match[1];
  } else if ((match = ua.match(/(?:OPR|Opera)\/([\d.]+)/i))) {
    browser = 'Opera';
    browserVersion = match[1];
  } else if ((match = ua.match(/SamsungBrowser\/([\d.]+)/i))) {
    browser = 'Samsung Internet';
    browserVersion = match[1];
  } else if ((match = ua.match(/Firefox\/([\d.]+)/i))) {
    browser = 'Firefox';
    browserVersion = match[1];
  } else if (
    (match = ua.match(/Chrome\/([\d.]+)/i)) &&
    !ua.match(/Edg|OPR|SamsungBrowser/i)
  ) {
    browser = 'Chrome';
    browserVersion = match[1];
  } else if (
    (match = ua.match(/Version\/([\d.]+).*Safari/i)) ||
    (match = ua.match(/Safari\/([\d.]+)/i))
  ) {
    browser = 'Safari';
    browserVersion = match[1];
  }

  // 2. OS Detection
  let os = 'Unknown';
  let osVersion: string | null = null;

  if ((match = ua.match(/Windows NT ([\d.]+)/i))) {
    const ntVer = match[1];
    const ntMap: Record<string, string> = {
      '10.0': '10/11',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.1': 'XP',
    };
    os = 'Windows';
    osVersion = ntMap[ntVer] || ntVer;
  } else if ((match = ua.match(/Android(?:[\s/]([\d.]+))?/i))) {
    os = 'Android';
    osVersion = match[1] || null;
  } else if ((match = ua.match(/iPhone OS ([\d_]+)/i))) {
    os = 'iOS';
    osVersion = match[1].replace(/_/g, '.');
  } else if (
    (match = ua.match(/iPad; CPU OS ([\d_]+)/i)) ||
    (ua.match(/Macintosh/i) && ua.match(/Mobile/i))
  ) {
    os = 'iPadOS';
    osVersion = match ? match[1].replace(/_/g, '.') : null;
  } else if ((match = ua.match(/Mac OS X ([\d_]+)/i))) {
    os = 'macOS';
    osVersion = match[1].replace(/_/g, '.');
  } else if (ua.match(/CrOS/i)) {
    os = 'Chrome OS';
  } else if (ua.match(/Linux/i) && !ua.match(/Android/i)) {
    os = 'Linux';
  }

  // 3. Device Type Detection
  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown device' = 'Desktop';
  if (
    ua.match(/iPad/i) ||
    ua.match(/Tablet/i) ||
    (ua.match(/Android/i) && !ua.match(/Mobile/i))
  ) {
    deviceType = 'Tablet';
  } else if (
    ua.match(/Mobile/i) ||
    ua.match(/iPhone/i) ||
    (ua.match(/Android/i) && ua.match(/Mobile/i))
  ) {
    deviceType = 'Mobile';
  } else if (
    os === 'Windows' ||
    os === 'macOS' ||
    os === 'Linux' ||
    os === 'Chrome OS'
  ) {
    deviceType = 'Desktop';
  } else if (browser === 'Unknown' && os === 'Unknown') {
    deviceType = 'Unknown device';
  }

  // Formulate human-readable display name
  let displayName = '';
  if (browser !== 'Unknown' && os !== 'Unknown') {
    const osDisplay = osVersion ? `${os} ${osVersion}` : os;
    displayName = `${browser} on ${osDisplay}`;
  } else if (browser !== 'Unknown') {
    displayName = `${browser} on ${deviceType}`;
  } else if (os !== 'Unknown') {
    displayName = `${deviceType} (${os})`;
  } else {
    displayName = 'Unknown device';
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
    displayName,
  };
}
