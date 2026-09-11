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
        
        // A nyers Influx adatokat "Recharts-barát" objektumokká alakítjuk
        const formattedData = data.map(row => {
            const date = new Date(row._time);
            let timeLabel = '';

            // A X tengely feliratának formázása a nézethez igazítva
            if (timeFormat === 'minute') {
                timeLabel = \`\${String(date.getHours()).padStart(2, '0')}:\${String(date.getMinutes()).padStart(2, '0')}\`;
            } else if (timeFormat === 'hour') {
                timeLabel = \`\${String(date.getHours()).padStart(2, '0')}:00\`;
            } else if (timeFormat === 'dayWeek') {
                const days = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];
                timeLabel = days[date.getDay()];
            } else if (timeFormat === 'dayMonth') {
                timeLabel = \`\${date.getDate()}.\`;
            }

            // Kimentjük az összes létező mezőt (ha esetleg még nem küld ilyet a hardver, null lesz)
            return {
                t: timeLabel,
                temp: row.temperature ? parseFloat(row.temperature.toFixed(1)) : null,
                hum: row.humidity ? parseFloat(row.humidity.toFixed(1)) : null,
                pres: row.pressure ? parseFloat(row.pressure.toFixed(1)) : null,
                speed: row.wind_speed ? parseFloat(row.wind_speed.toFixed(1)) : null,
                gust: row.wind_speed ? parseFloat((row.wind_speed * 1.3).toFixed(1)) : null, // Szimulált lökés
                acc: row.rain ? parseFloat(row.rain.toFixed(1)) : 0,
                intensity: row.rain ? parseFloat(row.rain.toFixed(1)) : 0,
                lux: row.lux ? Math.round(row.lux) : null,
                uv: row.uv ? parseFloat(row.uv.toFixed(1)) : null
            };
        });

        res.status(200).json(formattedData);
    } catch (error) {
        console.error("InfluxDB Hiba:", error);
        res.status(500).json({ error: error.message });
    }
}