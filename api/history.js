import { InfluxDB } from '@influxdata/influxdb-client';

export default async function handler(req, res) {
    const url = 'https://eu-central-1-1.aws.cloud2.influxdata.com';
    const token = process.env.INFLUX_TOKEN;
    const org = 'weather_station';
    const bucket = 'weather_data';

    if (!token) {
        return res.status(500).json({ error: "Nincs beállítva az INFLUX_TOKEN!" });
    }

    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    
    // A frontend lekérdezheti, hogy milyen távot kér (pl. /api/history?range=1w)
    // Ha nem ad meg semmit, alapértelmezetten 1 napos (1d) adatot adunk vissza
    const { range = '1d' } = req.query;

    // Időtáv és aggregációs ablak (ablak = mennyi időt vonjunk össze 1 adatponttá)
    let start = '-24h';
    let window = '1h';
    let timeFormat = 'hour'; // Segédváltozó a szép dátumformázáshoz

    if (range === '1h') { 
        start = '-1h'; window = '15m'; timeFormat = 'minute'; 
    } else if (range === '1w') { 
        start = '-7d'; window = '1d'; timeFormat = 'dayWeek'; 
    } else if (range === '1mo') { 
        start = '-30d'; window = '1d'; timeFormat = 'dayMonth'; 
    }

    // A Varázslat: A Flux lekérdezés, ami az adatbázisban átlagol
    // ... (A fenti InfluxDB config sorok maradhatnak: url, token, org, bucket, start, window, timeFormat) ...

    // A Varázslat: A Flux lekérdezés, ami az adatbázisban átlagol
    const fluxQuery = `
        from(bucket: "${bucket}")
            |> range(start: ${start})
            |> filter(fn: (r) => r._measurement == "station_metrics")
            |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
            |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> yield(name: "mean")
    `;

    try {
        const data = await queryApi.collectRows(fluxQuery);
        
        // A nyers Influx adatokat szigorú "Recharts-barát" objektumokká alakítjuk
        const formattedData = data.map(row => {
            const date = new Date(row._time);
            let timeLabel = '';

            // A X tengely feliratának formázása a nézethez igazítva
            if (timeFormat === 'minute') {
                timeLabel = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            } else if (timeFormat === 'hour') {
                timeLabel = `${String(date.getHours()).padStart(2, '0')}:00`;
            } else if (timeFormat === 'dayWeek') {
                const days = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
                timeLabel = days[date.getDay()];
            } else if (timeFormat === 'dayMonth') {
                timeLabel = `${date.getDate()}.`;
            }

            // A BIZTONSÁGI HÁLÓ: Alapértelmezett értékeket adunk (0 vagy fallback érték), ha az adatbázis mezője üres (null).
            // Így a React Recharts diagramja sosem fagy le "undefined" vagy "null" miatt!
            return {
                t: timeLabel,
                temp: row.temperature != null ? parseFloat(row.temperature.toFixed(1)) : 22.0, // Fallback hőmérséklet
                hum: row.humidity != null ? parseFloat(row.humidity.toFixed(1)) : 50.0,      // Fallback páratartalom
                pres: row.pressure != null ? parseFloat(row.pressure.toFixed(1)) : 1013.2,   // Fallback légnyomás
                speed: row.wind_speed != null ? parseFloat(row.wind_speed.toFixed(1)) : 0.0,   // Fallback szélsebesség
                gust: row.wind_speed != null ? parseFloat((row.wind_speed * 1.3).toFixed(1)) : 0.0, 
                acc: row.rain != null ? parseFloat(row.rain.toFixed(1)) : 0.0,
                intensity: row.rain != null ? parseFloat(row.rain.toFixed(1)) : 0.0,
                lux: row.lux != null ? Math.round(row.lux) : 0,
                uv: row.uv != null ? parseFloat(row.uv.toFixed(1)) : 0.0
            };
        });

        // Üres tömb elleni védelem: Ha az InfluxDB egyáltalán nem küld adatot (mert pl. az ESP32 offline volt 24 óráig),
        // akkor visszadobunk egy 404-es hibát, amire a frontend a saját "MOCK DATA" tömbjeivel fog reagálni (Fallback).
        if (formattedData.length === 0) {
           return res.status(404).json({ error: "Nincs megjeleníthető historikus adat az InfluxDB-ben." });
        }

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("InfluxDB Hiba:", error);
        res.status(500).json({ error: error.message });
    }
}