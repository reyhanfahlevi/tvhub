import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface CityCoords {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string; // e.g. "Asia/Jakarta"
}

export const INDONESIAN_CITIES: Record<string, CityCoords> = {
  jakarta: { name: 'Jakarta (WIB)', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' },
  bandung: { name: 'Bandung (WIB)', latitude: -6.9175, longitude: 107.6191, timezone: 'Asia/Jakarta' },
  surabaya: { name: 'Surabaya (WIB)', latitude: -7.2575, longitude: 112.7521, timezone: 'Asia/Jakarta' },
  semarang: { name: 'Semarang (WIB)', latitude: -6.9667, longitude: 110.4167, timezone: 'Asia/Jakarta' },
  yogyakarta: { name: 'Yogyakarta (WIB)', latitude: -7.7956, longitude: 110.3695, timezone: 'Asia/Jakarta' },
  medan: { name: 'Medan (WIB)', latitude: 3.5952, longitude: 98.6722, timezone: 'Asia/Jakarta' },
  palembang: { name: 'Palembang (WIB)', latitude: -2.9761, longitude: 104.7754, timezone: 'Asia/Jakarta' },
  makassar: { name: 'Makassar (WITA)', latitude: -5.1477, longitude: 119.4327, timezone: 'Asia/Makassar' },
  denpasar: { name: 'Denpasar / Bali (WITA)', latitude: -8.6705, longitude: 115.2126, timezone: 'Asia/Makassar' },
  balikpapan: { name: 'Balikpapan (WITA)', latitude: -1.2379, longitude: 116.8529, timezone: 'Asia/Makassar' },
  jayapura: { name: 'Jayapura (WIT)', latitude: -2.5337, longitude: 140.7181, timezone: 'Asia/Jayapura' },
};

export interface PrayerTimesData {
  cityKey: string;
  cityName: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  currentPrayer: string;
  nextPrayer: string;
  nextPrayerNameId: string;
  nextPrayerTime: string;
  minutesRemaining: number;
  countdownText: string;
  title: string;
  subtitle: string;
}

const PRAYER_NAMES_ID: Record<string, string> = {
  fajr: 'Subuh',
  sunrise: 'Terbit',
  dhuhr: 'Dzuhur',
  asr: 'Ashar',
  maghrib: 'Maghrib',
  isha: 'Isya',
  none: 'Subuh',
};

export function calculatePrayerTimes(cityKey = 'jakarta', targetDate = new Date()): PrayerTimesData {
  const city = INDONESIAN_CITIES[cityKey.toLowerCase()] || INDONESIAN_CITIES['jakarta'];
  const coordinates = new Coordinates(city.latitude, city.longitude);
  
  // Southeast Asia / Kemenag RI parameter: Fajr 20°, Isha 18°
  const params = CalculationMethod.Singapore();
  params.madhab = Madhab.Shafi;
  
  const pt = new PrayerTimes(coordinates, targetDate, params);
  
  const formatTime = (d: Date): string => {
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: city.timezone,
      hour12: false,
    });
  };

  const fajrStr = formatTime(pt.fajr);
  const sunriseStr = formatTime(pt.sunrise);
  const dhuhrStr = formatTime(pt.dhuhr);
  const asrStr = formatTime(pt.asr);
  const maghribStr = formatTime(pt.maghrib);
  const ishaStr = formatTime(pt.isha);

  const next = pt.nextPrayer();
  const current = pt.currentPrayer();
  const nextPrayerKey = next === 'none' ? 'fajr' : next;
  const nextPrayerNameId = PRAYER_NAMES_ID[nextPrayerKey] || 'Subuh';

  let nextTimeObj: Date;
  switch (nextPrayerKey) {
    case 'fajr':
      // if next is fajr and current is isha, it is tomorrow's fajr
      if (current === 'isha') {
        const tomorrow = new Date(targetDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ptTomorrow = new PrayerTimes(coordinates, tomorrow, params);
        nextTimeObj = ptTomorrow.fajr;
      } else {
        nextTimeObj = pt.fajr;
      }
      break;
    case 'dhuhr':
      nextTimeObj = pt.dhuhr;
      break;
    case 'asr':
      nextTimeObj = pt.asr;
      break;
    case 'maghrib':
      nextTimeObj = pt.maghrib;
      break;
    case 'isha':
      nextTimeObj = pt.isha;
      break;
    default:
      nextTimeObj = pt.fajr;
      break;
  }

  const nextPrayerTimeStr = formatTime(nextTimeObj);
  const diffMs = nextTimeObj.getTime() - targetDate.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  let countdownText = '';
  if (diffMinutes < 60) {
    countdownText = `${diffMinutes}m lagi`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    countdownText = mins > 0 ? `${hours}j ${mins}m lagi` : `${hours} jam lagi`;
  }

  const title = `🕌 ${nextPrayerNameId} ${nextPrayerTimeStr}`;
  const subtitle = `(${countdownText}) • ${city.name.split(' ')[0]}`;

  return {
    cityKey,
    cityName: city.name,
    fajr: fajrStr,
    sunrise: sunriseStr,
    dhuhr: dhuhrStr,
    asr: asrStr,
    maghrib: maghribStr,
    isha: ishaStr,
    currentPrayer: current,
    nextPrayer: nextPrayerKey,
    nextPrayerNameId,
    nextPrayerTime: nextPrayerTimeStr,
    minutesRemaining: diffMinutes,
    countdownText,
    title,
    subtitle,
  };
}
