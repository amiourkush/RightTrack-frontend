/**
 * Indian Railway Station Coordinates Lookup
 *
 * Source: train_station_coordinates.md
 * ~250 major stations across all IR zones.
 *
 * Usage:
 *   import { getStationCoords } from './stationCoordinates';
 *   const coords = getStationCoords('NDLS'); // → { lat: 28.6424, lng: 77.2195 } | null
 */

/** @type {Record<string, { lat: number, lng: number }>} */
export const STATION_COORDS = {
  // ── Delhi NCR & Northern Railway ──────────────────────────────────────────
  'NDLS':  { lat: 28.6424, lng: 77.2195 }, // New Delhi
  'DLI':   { lat: 28.6606, lng: 77.2287 }, // Old Delhi
  'NZM':   { lat: 28.5886, lng: 77.2534 }, // Hazrat Nizamuddin
  'ANVT':  { lat: 28.6504, lng: 77.3153 }, // Anand Vihar Terminal
  'DEC':   { lat: 28.5904, lng: 77.1232 }, // Delhi Cantt
  'DEE':   { lat: 28.6644, lng: 77.1772 }, // Delhi Sarai Rohilla
  'GZB':   { lat: 28.6642, lng: 77.4378 }, // Ghaziabad
  'MTC':   { lat: 28.9845, lng: 77.7064 }, // Meerut City
  'MOZ':   { lat: 29.4727, lng: 77.7085 }, // Muzaffarnagar
  'SRE':   { lat: 29.9640, lng: 77.5460 }, // Saharanpur
  'UMB':   { lat: 30.3340, lng: 76.8378 }, // Ambala Cantt
  'CDG':   { lat: 30.7046, lng: 76.8016 }, // Chandigarh
  'KLK':   { lat: 30.8359, lng: 76.9333 }, // Kalka
  'LDH':   { lat: 30.9010, lng: 75.8573 }, // Ludhiana
  'JUC':   { lat: 31.3260, lng: 75.5762 }, // Jalandhar City
  'ASR':   { lat: 31.6340, lng: 74.8723 }, // Amritsar
  'JAT':   { lat: 32.7060, lng: 74.8800 }, // Jammu Tawi
  'SVDK':  { lat: 32.9928, lng: 74.9318 }, // SMVD Katra
  'HW':    { lat: 29.9457, lng: 78.1642 }, // Haridwar
  'DDN':   { lat: 30.3165, lng: 78.0322 }, // Dehradun
  'RK':    { lat: 29.8543, lng: 77.8880 }, // Roorkee

  // ── Uttar Pradesh ─────────────────────────────────────────────────────────
  'HPU':   { lat: 28.7306, lng: 77.7759 }, // Hapur
  'MB':    { lat: 28.8386, lng: 78.7733 }, // Moradabad
  'RMU':   { lat: 28.8078, lng: 79.0274 }, // Rampur
  'BE':    { lat: 28.3470, lng: 79.4204 }, // Bareilly Jn
  'SPN':   { lat: 27.8805, lng: 79.9120 }, // Shahjahanpur
  'STP':   { lat: 27.5684, lng: 80.6780 }, // Sitapur
  'BUW':   { lat: 27.1350, lng: 81.3397 }, // Burhwal
  'GD':    { lat: 27.1300, lng: 81.9619 }, // Gonda Jn
  'MUR':   { lat: 27.0877, lng: 82.2530 }, // Mankapur
  'BST':   { lat: 26.7997, lng: 82.7486 }, // Basti
  'KLD':   { lat: 26.7797, lng: 83.0305 }, // Khalilabad
  'GKP':   { lat: 26.7606, lng: 83.3732 }, // Gorakhpur Jn
  'CPJ':   { lat: 26.9602, lng: 83.7144 }, // Kaptanganj
  'SBZ':   { lat: 27.1040, lng: 83.8960 }, // Siswa Bazar
  'BUG':   { lat: 27.1850, lng: 84.1160 }, // Bagaha
  'NKE':   { lat: 27.1000, lng: 84.4980 }, // Narkatiaganj
  'BTH':   { lat: 26.8018, lng: 84.5029 }, // Bettiah
  'SGL':   { lat: 26.7780, lng: 84.7730 }, // Sagauli
  'BGU':   { lat: 26.7865, lng: 84.9740 }, // Bairgania
  'RXL':   { lat: 26.9800, lng: 84.8500 }, // Raxaul Jn
  'LKO':   { lat: 26.8317, lng: 80.9200 }, // Lucknow Charbagh
  'LJN':   { lat: 26.8320, lng: 80.9180 }, // Lucknow Jn
  'CNB':   { lat: 26.4547, lng: 80.3507 }, // Kanpur Central
  'ALJN':  { lat: 27.8974, lng: 78.0880 }, // Aligarh
  'TDL':   { lat: 27.2023, lng: 78.2435 }, // Tundla
  'AGC':   { lat: 27.1592, lng: 77.9944 }, // Agra Cantt
  'AF':    { lat: 27.1826, lng: 78.0167 }, // Agra Fort
  'MTJ':   { lat: 27.4924, lng: 77.6737 }, // Mathura Jn
  'PRYJ':  { lat: 25.4484, lng: 81.8333 }, // Prayagraj Jn
  'BSB':   { lat: 25.3268, lng: 82.9877 }, // Varanasi Jn
  'DDU':   { lat: 25.2785, lng: 83.1186 }, // Pt. DDU / Mughalsarai
  'MGS':   { lat: 25.2785, lng: 83.1186 }, // Mughalsarai (alias)
  'AY':    { lat: 26.7922, lng: 82.2040 }, // Ayodhya Dham
  'AYC':   { lat: 26.7730, lng: 82.1380 }, // Ayodhya Cantt
  'SLN':   { lat: 26.2648, lng: 82.0727 }, // Sultanpur
  'JOP':   { lat: 25.7538, lng: 82.6837 }, // Jaunpur
  'MAU':   { lat: 25.9520, lng: 83.5610 }, // Mau Jn
  'CPR':   { lat: 25.7811, lng: 84.7543 }, // Chhapra
  'SV':    { lat: 26.2200, lng: 84.3600 }, // Siwan
  'DEOS':  { lat: 26.5020, lng: 83.7780 }, // Deoria Sadar
  'BUI':   { lat: 25.7580, lng: 84.1480 }, // Ballia
  'ETW':   { lat: 26.7767, lng: 79.0247 }, // Etawah
  'RURA':  { lat: 26.5150, lng: 79.8990 }, // Rura
  'FTP':   { lat: 25.9320, lng: 80.8100 }, // Fatehpur
  'BKO':   { lat: 26.0780, lng: 80.5860 }, // Bindki Road
  'SRO':   { lat: 25.6570, lng: 81.3200 }, // Sirathu
  'BRE':   { lat: 25.5400, lng: 81.5100 }, // Bharwari

  // ── Bihar & Jharkhand ─────────────────────────────────────────────────────
  'PNBE':  { lat: 25.6022, lng: 85.1376 }, // Patna Jn
  'PPTA':  { lat: 25.6139, lng: 85.0881 }, // Patliputra
  'DNR':   { lat: 25.5866, lng: 85.0444 }, // Danapur
  'RJPB':  { lat: 25.6008, lng: 85.1636 }, // Rajendra Nagar
  'ARA':   { lat: 25.5540, lng: 84.6637 }, // Ara
  'BXR':   { lat: 25.5647, lng: 83.9777 }, // Buxar
  'GAYA':  { lat: 24.8016, lng: 84.9994 }, // Gaya Jn
  'DHN':   { lat: 23.7917, lng: 86.4299 }, // Dhanbad
  'GMO':   { lat: 23.7744, lng: 86.1557 }, // NSCB Gomoh
  'KQR':   { lat: 24.4687, lng: 85.5947 }, // Koderma
  'RNC':   { lat: 23.3516, lng: 85.3359 }, // Ranchi
  'HTE':   { lat: 23.3211, lng: 85.3139 }, // Hatia
  'TATA':  { lat: 22.7700, lng: 86.2000 }, // Tatanagar
  'BKSC':  { lat: 23.6693, lng: 86.1511 }, // Bokaro Steel City
  'JSME':  { lat: 24.5167, lng: 86.6500 }, // Jasidih
  'MDP':   { lat: 24.2667, lng: 86.7000 }, // Madhupur
  'MKA':   { lat: 25.4000, lng: 85.8800 }, // Mokama
  'BJU':   { lat: 25.4200, lng: 86.0000 }, // Barauni
  'KGG':   { lat: 25.5000, lng: 86.4800 }, // Khagaria
  'KIR':   { lat: 25.5500, lng: 87.5700 }, // Katihar
  'DBG':   { lat: 26.1500, lng: 85.9000 }, // Darbhanga
  'SPJ':   { lat: 25.8600, lng: 85.7800 }, // Samastipur
  'MFP':   { lat: 26.1200, lng: 85.3700 }, // Muzaffarpur
  'HJP':   { lat: 25.6800, lng: 85.2100 }, // Hajipur
  'SEE':   { lat: 25.7000, lng: 85.1700 }, // Sonpur
  'SHC':   { lat: 25.8800, lng: 86.6000 }, // Saharsa
  'JYG':   { lat: 26.5800, lng: 86.1300 }, // Jaynagar
  'ASN':   { lat: 23.6889, lng: 86.9661 }, // Asansol

  // ── West Bengal & North East ───────────────────────────────────────────────
  'HWH':   { lat: 22.5838, lng: 88.3426 }, // Howrah
  'SDAH':  { lat: 22.5697, lng: 88.3712 }, // Sealdah
  'KOAA':  { lat: 22.6028, lng: 88.3769 }, // Kolkata
  'SHM':   { lat: 22.5539, lng: 88.3075 }, // Shalimar
  'BWN':   { lat: 23.2324, lng: 87.8615 }, // Barddhaman
  'DGR':   { lat: 23.5333, lng: 87.3167 }, // Durgapur
  'MLDT':  { lat: 25.0108, lng: 88.1411 }, // Malda Town
  'NJP':   { lat: 26.6853, lng: 88.4419 }, // New Jalpaiguri
  'KNE':   { lat: 26.1000, lng: 87.9500 }, // Kishanganj
  'NCB':   { lat: 26.3300, lng: 89.4600 }, // New Cooch Behar
  'NOQ':   { lat: 26.5300, lng: 89.7000 }, // New Alipurduar
  'NBQ':   { lat: 26.5000, lng: 90.5600 }, // New Bongaigaon
  'GHY':   { lat: 26.1824, lng: 91.7506 }, // Guwahati
  'KYQ':   { lat: 26.1550, lng: 91.7060 }, // Kamakhya
  'DBRG':  { lat: 27.4728, lng: 94.9120 }, // Dibrugarh
  'BDC':   { lat: 23.0833, lng: 88.3833 }, // Bandel Jn
  'KMME':  { lat: 23.7800, lng: 86.8200 }, // Kumardubi
  'BRR':   { lat: 23.7800, lng: 86.6500 }, // Barakar

  // ── Rajasthan & Gujarat ────────────────────────────────────────────────────
  'JP':    { lat: 26.9196, lng: 75.7878 }, // Jaipur
  'AII':   { lat: 26.4520, lng: 74.6399 }, // Ajmer
  'JU':    { lat: 26.2847, lng: 73.0243 }, // Jodhpur
  'BKN':   { lat: 28.0180, lng: 73.3150 }, // Bikaner
  'UDZ':   { lat: 24.5772, lng: 73.7020 }, // Udaipur City
  'KOTA':  { lat: 25.2138, lng: 75.8648 }, // Kota
  'SWM':   { lat: 25.9930, lng: 76.3680 }, // Sawai Madhopur
  'BTE':   { lat: 27.2170, lng: 77.4900 }, // Bharatpur
  'ABR':   { lat: 24.4780, lng: 72.7800 }, // Abu Road
  'ADI':   { lat: 23.0225, lng: 72.5714 }, // Ahmedabad
  'SBIB':  { lat: 23.0640, lng: 72.5850 }, // Sabarmati
  'BRC':   { lat: 22.3107, lng: 73.1812 }, // Vadodara
  'ST':    { lat: 21.2049, lng: 72.8407 }, // Surat
  'ANND':  { lat: 22.5645, lng: 72.9289 }, // Anand
  'NVS':   { lat: 20.9467, lng: 72.9520 }, // Navsari
  'BL':    { lat: 20.6100, lng: 72.9300 }, // Valsad
  'VAPI':  { lat: 20.3700, lng: 72.9100 }, // Vapi
  'RJT':   { lat: 22.3082, lng: 70.8022 }, // Rajkot
  'BH':    { lat: 21.7051, lng: 72.9959 }, // Bharuch
  'BVC':   { lat: 21.7645, lng: 72.1519 }, // Bhavnagar
  'OKHA':  { lat: 22.4635, lng: 69.0734 }, // Okha
  'DWK':   { lat: 22.2442, lng: 68.9685 }, // Dwarka
  'JAM':   { lat: 22.4707, lng: 70.0577 }, // Jamnagar
  'GIMB':  { lat: 23.0760, lng: 70.1340 }, // Gandhidham
  'BHUJ':  { lat: 23.2500, lng: 69.6700 }, // Bhuj

  // ── Maharashtra & Central India ───────────────────────────────────────────
  'CSMT':  { lat: 18.9400, lng: 72.8354 }, // Mumbai CSMT
  'MMCT':  { lat: 18.9696, lng: 72.8193 }, // Mumbai Central
  'BVI':   { lat: 19.2290, lng: 72.8570 }, // Borivali
  'BDTS':  { lat: 19.0607, lng: 72.8413 }, // Bandra Terminus
  'DR':    { lat: 19.0178, lng: 72.8478 }, // Dadar
  'LTT':   { lat: 19.0694, lng: 72.8914 }, // Lokmanya Tilak Terminus
  'TNA':   { lat: 19.1860, lng: 72.9757 }, // Thane
  'KYN':   { lat: 19.2354, lng: 73.1299 }, // Kalyan
  'PNVL':  { lat: 18.9894, lng: 73.1175 }, // Panvel
  'PUNE':  { lat: 18.5284, lng: 73.8743 }, // Pune
  'LNL':   { lat: 18.7557, lng: 73.4091 }, // Lonavala
  'DD':    { lat: 18.4685, lng: 74.5828 }, // Daund
  'SUR':   { lat: 17.6599, lng: 75.9064 }, // Solapur
  'ANG':   { lat: 19.0952, lng: 74.7480 }, // Ahmednagar
  'KPG':   { lat: 19.8880, lng: 74.4750 }, // Kopargaon
  'MMR':   { lat: 20.2559, lng: 74.4443 }, // Manmad
  'NK':    { lat: 19.9575, lng: 73.8290 }, // Nashik Road
  'IGP':   { lat: 19.6970, lng: 73.5650 }, // Igatpuri
  'BSL':   { lat: 20.8197, lng: 75.7873 }, // Bhusaval
  'JL':    { lat: 21.0055, lng: 75.5667 }, // Jalgaon
  'AK':    { lat: 20.7002, lng: 77.0082 }, // Akola
  'BD':    { lat: 20.7300, lng: 77.7500 }, // Badnera / Amravati
  'WR':    { lat: 20.7453, lng: 78.6022 }, // Wardha
  'NGP':   { lat: 21.1524, lng: 79.0888 }, // Nagpur
  'CD':    { lat: 19.9500, lng: 79.3000 }, // Chandrapur
  'BPQ':   { lat: 19.8600, lng: 79.3500 }, // Balharshah
  'NED':   { lat: 19.1500, lng: 77.3100 }, // Nanded
  'AWB':   { lat: 19.8762, lng: 75.3433 }, // Aurangabad / Sambhajinagar
  'KOP':   { lat: 16.7050, lng: 74.2433 }, // Kolhapur

  // ── Madhya Pradesh & Chhattisgarh ─────────────────────────────────────────
  'BPL':   { lat: 23.2599, lng: 77.4126 }, // Bhopal
  'RKMP':  { lat: 23.2110, lng: 77.4390 }, // Rani Kamalapati / Habibganj
  'HBJ':   { lat: 23.2110, lng: 77.4390 }, // Habibganj (alias)
  'INDB':  { lat: 22.7196, lng: 75.8679 }, // Indore
  'UJN':   { lat: 23.1765, lng: 75.7885 }, // Ujjain
  'RTM':   { lat: 23.3315, lng: 75.0367 }, // Ratlam
  'GWL':   { lat: 26.2183, lng: 78.1828 }, // Gwalior
  'MRA':   { lat: 26.4950, lng: 78.0000 }, // Morena
  'JHS':   { lat: 25.4484, lng: 78.5685 }, // Jhansi
  'VGLJ':  { lat: 25.4484, lng: 78.5685 }, // Jhansi (alias)
  'BINA':  { lat: 24.1800, lng: 78.1800 }, // Bina
  'ET':    { lat: 22.6108, lng: 77.7607 }, // Itarsi
  'JBP':   { lat: 23.1686, lng: 79.9339 }, // Jabalpur
  'KTE':   { lat: 23.8343, lng: 80.3957 }, // Katni
  'STA':   { lat: 24.5800, lng: 80.8300 }, // Satna
  'REWA':  { lat: 24.5300, lng: 81.3000 }, // Rewa
  'R':     { lat: 21.2514, lng: 81.6296 }, // Raipur
  'BSP':   { lat: 22.0797, lng: 82.1409 }, // Bilaspur
  'DURG':  { lat: 21.1900, lng: 81.2800 }, // Durg
  'RIG':   { lat: 21.8900, lng: 83.3900 }, // Raigarh
  'DWX':   { lat: 22.9630, lng: 76.0500 }, // Dewas Jn
  'LMNR':  { lat: 22.7800, lng: 75.9300 }, // Laxmibai Nagar

  // ── Andhra Pradesh & Telangana ────────────────────────────────────────────
  'SC':    { lat: 17.4334, lng: 78.5045 }, // Secunderabad
  'HYB':   { lat: 17.3924, lng: 78.4682 }, // Hyderabad Deccan
  'KCG':   { lat: 17.3912, lng: 78.4975 }, // Kacheguda
  'KZJ':   { lat: 17.9800, lng: 79.5200 }, // Kazipet
  'WL':    { lat: 17.9689, lng: 79.5941 }, // Warangal
  'BZA':   { lat: 16.5186, lng: 80.6198 }, // Vijayawada
  'GNT':   { lat: 16.3067, lng: 80.4365 }, // Guntur
  'RJY':   { lat: 17.0005, lng: 81.7800 }, // Rajahmundry
  'SLO':   { lat: 17.0500, lng: 82.1600 }, // Samalkot
  'VSKP':  { lat: 17.7215, lng: 83.2885 }, // Visakhapatnam
  'DVD':   { lat: 17.7000, lng: 83.1500 }, // Duvvada
  'VZM':   { lat: 18.1100, lng: 83.4000 }, // Vizianagaram
  'OGL':   { lat: 15.5057, lng: 80.0499 }, // Ongole
  'NLR':   { lat: 14.4426, lng: 79.9865 }, // Nellore
  'GDR':   { lat: 14.1500, lng: 79.8500 }, // Gudur
  'RU':    { lat: 13.6288, lng: 79.4750 }, // Renigunta
  'TPTY':  { lat: 13.6288, lng: 79.4192 }, // Tirupati
  'GTL':   { lat: 15.1764, lng: 77.3693 }, // Guntakal
  'KRNT':  { lat: 15.8300, lng: 78.0300 }, // Kurnool City

  // ── Karnataka & Goa ───────────────────────────────────────────────────────
  'SBC':   { lat: 12.9781, lng: 77.5696 }, // KSR Bengaluru
  'YPR':   { lat: 13.0238, lng: 77.5503 }, // Yesvantpur
  'SMVB':  { lat: 13.0039, lng: 77.6534 }, // SMVT Bengaluru
  'MYS':   { lat: 12.3160, lng: 76.6450 }, // Mysuru
  'UBL':   { lat: 15.3647, lng: 75.1240 }, // SSS Hubballi
  'DWR':   { lat: 15.4589, lng: 75.0078 }, // Dharwad
  'BGM':   { lat: 15.8497, lng: 74.4977 }, // Belagavi
  'MAQ':   { lat: 12.8698, lng: 74.8430 }, // Mangaluru Central
  'MAJN':  { lat: 12.8710, lng: 74.8730 }, // Mangaluru Jn
  'UD':    { lat: 13.3409, lng: 74.7421 }, // Udupi
  'MAO':   { lat: 15.2736, lng: 73.9582 }, // Madgaon / Goa
  'VSG':   { lat: 15.3982, lng: 73.8115 }, // Vasco Da Gama

  // ── Tamil Nadu & Kerala ───────────────────────────────────────────────────
  'MAS':   { lat: 13.0827, lng: 80.2755 }, // Chennai Central
  'MS':    { lat: 13.0784, lng: 80.2606 }, // Chennai Egmore
  'TBM':   { lat: 12.9249, lng: 80.1280 }, // Tambaram
  'KPD':   { lat: 12.9698, lng: 79.1325 }, // Katpadi
  'JTJ':   { lat: 12.5694, lng: 78.5819 }, // Jolarpettai
  'SA':    { lat: 11.6643, lng: 78.1460 }, // Salem
  'ED':    { lat: 11.3410, lng: 77.7172 }, // Erode
  'CBE':   { lat: 11.0168, lng: 76.9558 }, // Coimbatore
  'TPJ':   { lat: 10.7905, lng: 78.7047 }, // Tiruchchirappalli
  'MDU':   { lat:  9.9195, lng: 78.1193 }, // Madurai
  'TEN':   { lat:  8.7139, lng: 77.7567 }, // Tirunelveli
  'CAPE':  { lat:  8.0883, lng: 77.5385 }, // Kanniyakumari
  'RMM':   { lat:  9.2876, lng: 79.3129 }, // Rameswaram
  'PGT':   { lat: 10.7867, lng: 76.6548 }, // Palakkad
  'TCR':   { lat: 10.5160, lng: 76.2133 }, // Thrissur
  'AWY':   { lat: 10.1076, lng: 76.3516 }, // Aluva
  'ERS':   { lat:  9.9678, lng: 76.2907 }, // Ernakulam South
  'ERN':   { lat:  9.9926, lng: 76.2878 }, // Ernakulam North
  'ALLP':  { lat:  9.4981, lng: 76.3264 }, // Alappuzha
  'QLN':   { lat:  8.8932, lng: 76.5975 }, // Kollam
  'TVC':   { lat:  8.4875, lng: 76.9525 }, // Thiruvananthapuram
  'KTYM':  { lat:  9.5916, lng: 76.5222 }, // Kottayam

  // ── Odisha ────────────────────────────────────────────────────────────────
  'BBS':   { lat: 20.2649, lng: 85.8355 }, // Bhubaneswar
  'PURI':  { lat: 19.8006, lng: 85.8237 }, // Puri
  'CTC':   { lat: 20.4625, lng: 85.8830 }, // Cuttack
  'JAJP':  { lat: 20.8500, lng: 86.1700 }, // Jajpur Keonjhar Road
  'TLHR':  { lat: 21.4800, lng: 86.7300 }, // Talcher Road
  'BAM':   { lat: 21.5300, lng: 83.5200 }, // Bamra
  'SBP':   { lat: 21.4700, lng: 83.9700 }, // Sambalpur
  'ROU':   { lat: 22.2604, lng: 84.8536 }, // Rourkela

  // ── Haryana & Punjab ─────────────────────────────────────────────────────
  'ROHTAK': { lat: 28.8955, lng: 76.6066 }, // Rohtak
  'HNM':   { lat: 29.3871, lng: 76.0867 }, // Hissar / Hisar
  'BTI':   { lat: 29.1500, lng: 74.9500 }, // Bathinda
  'FZR':   { lat: 30.9278, lng: 74.6196 }, // Firozpur Cantt
  'PKK':   { lat: 30.3590, lng: 73.7700 }, // Pathankot Cantt
  'PTK':   { lat: 32.2745, lng: 75.6522 }, // Pathankot (city)
  'PTKC':  { lat: 32.2745, lng: 75.6522 }, // Pathankot Cantt
};

/**
 * Resolve a station code (case-insensitive) to { lat, lng }.
 * Returns null if the code is not in the dataset.
 * @param {string} code
 * @returns {{ lat: number, lng: number } | null}
 */
export function getStationCoords(code) {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  return STATION_COORDS[key] ?? null;
}
