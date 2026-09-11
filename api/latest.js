import { InfluxDB } from '@influxdata/influxdb-client';

export default async function handler(req, res) {
    // A Vercel környezeti változóiból olvassuk ki a titkos kulcsot
    const url = 'https://eu-central-1-1.aws.cloud2.influxdata.com';
    const token = process.env.INFLUX_TOKEN; 
    const org = 'weather_station';
    const bucket = 'weather_data';

    if (!token) {
        return res.status(500).json({ error: "Nincs beállítva az INFLUX_TOKEN" });
    }

    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);

    // Flux nyelvű lekérdezés: Az elmúlt 24 óra legutolsó (legfrissebb) adatcsomagja
    const fluxQuery = `
        from(bucket: "${bucket}")
            |> range(start: -24h)
            |> filter(fn: (r) => r._measurement == "station_metrics")
            |> last()
            |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    `;

    try {
        const data = await queryApi.collectRows(fluxQuery);
        if (data.length > 0) {
            // Visszaküldjük a letisztított JSON adatot a Reactnek
            res.status(200).json(data[0]);
        } else {
            res.status(404).json({ error: "Nincs friss adat az elmúlt 24 órában" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
} 
