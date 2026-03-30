const PREFECTURE_CENTERS = {
  "01": { lat: 43.0642, lng: 141.3469 },
  "02": { lat: 40.8246, lng: 140.74 },
  "03": { lat: 39.7036, lng: 141.1527 },
  "04": { lat: 38.2682, lng: 140.8694 },
  "05": { lat: 39.7186, lng: 140.1024 },
  "06": { lat: 38.2404, lng: 140.3633 },
  "07": { lat: 37.7503, lng: 140.4676 },
  "08": { lat: 36.3418, lng: 140.4468 },
  "09": { lat: 36.5657, lng: 139.8836 },
  "10": { lat: 36.3912, lng: 139.0608 },
  "11": { lat: 35.857, lng: 139.6489 },
  "12": { lat: 35.6051, lng: 140.1233 },
  "13": { lat: 35.6895, lng: 139.6917 },
  "14": { lat: 35.4478, lng: 139.6425 },
  "15": { lat: 37.9022, lng: 139.0232 },
  "16": { lat: 36.6953, lng: 137.2113 },
  "17": { lat: 36.5947, lng: 136.6256 },
  "18": { lat: 36.0652, lng: 136.2216 },
  "19": { lat: 35.6639, lng: 138.5684 },
  "20": { lat: 36.6513, lng: 138.181 },
  "21": { lat: 35.3912, lng: 136.7223 },
  "22": { lat: 34.9756, lng: 138.3828 },
  "23": { lat: 35.1815, lng: 136.9066 },
  "24": { lat: 34.7303, lng: 136.5086 },
  "25": { lat: 35.0045, lng: 135.8686 },
  "26": { lat: 35.0116, lng: 135.7681 },
  "27": { lat: 34.6937, lng: 135.5023 },
  "28": { lat: 34.6901, lng: 135.1955 },
  "29": { lat: 34.6851, lng: 135.8048 },
  "30": { lat: 34.226, lng: 135.1675 },
  "31": { lat: 35.5039, lng: 134.2383 },
  "32": { lat: 35.4681, lng: 133.0484 },
  "33": { lat: 34.6551, lng: 133.9195 },
  "34": { lat: 34.3853, lng: 132.4553 },
  "35": { lat: 34.1785, lng: 131.4737 },
  "36": { lat: 34.0657, lng: 134.5593 },
  "37": { lat: 34.3428, lng: 134.0466 },
  "38": { lat: 33.8392, lng: 132.7657 },
  "39": { lat: 33.5597, lng: 133.5311 },
  "40": { lat: 33.5904, lng: 130.4017 },
  "41": { lat: 33.2635, lng: 130.3009 },
  "42": { lat: 32.7503, lng: 129.8777 },
  "43": { lat: 32.8031, lng: 130.7079 },
  "44": { lat: 33.2382, lng: 131.6126 },
  "45": { lat: 31.9111, lng: 131.4239 },
  "46": { lat: 31.5966, lng: 130.5571 },
  "47": { lat: 26.2124, lng: 127.6809 },
} as const;

function toRadians(degree: number): number {
  return (degree * Math.PI) / 180;
}

function haversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function distanceToPrefectureCenterKm(
  prefectureCode: string,
  userLocation: { lat: number; lng: number }
): number {
  const center = PREFECTURE_CENTERS[prefectureCode as keyof typeof PREFECTURE_CENTERS];
  if (!center) return Number.POSITIVE_INFINITY;
  return haversineDistanceKm(userLocation, center);
}
