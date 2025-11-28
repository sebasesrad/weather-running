// Coordenadas fijas
const LOCS = {
    almassora: { name: "Almassora", lat: 39.95, lon: -0.05 },
    castellon: { name: "Castellón de la Plana", lat: 39.986, lon: -0.051 },
    vinaros: { name: "Vinaròs", lat: 40.471, lon: 0.475 }
};

let chartInstance = null;

$(document).ready(function () {

    console.log("app.js cargado");


    // Evento: Select o botón refrescar
    $("#btnRefresh, #place").on("click change", function () {
        const key = $("#place").val();
        const loc = LOCS[key];
        fetchWeather(loc);
    });

    // Carga inicial
    fetchWeather(LOCS[$("#place").val()]);
});


// ==========================
//   FUNCIÓN PRINCIPAL
// ==========================
async function fetchWeather(loc) {

    $("#currentContent").html("Cargando...");
    $("#hourlyTable tbody").empty();

    const base = "https://api.open-meteo.com/v1/forecast";
    const params = new URLSearchParams({
        latitude: loc.lat,
        longitude: loc.lon,
        current_weather: "true",
        hourly: [
            'temperature_2m',
            'apparent_temperature',
            'relative_humidity_2m',
            'precipitation',
            'windspeed_10m',
            'winddirection_10m',
            'uv_index',
            'weathercode'
        ].join(','),
        timezone: 'Europe/Madrid'
    });

    const url = `${base}?${params.toString()}`;

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("API error: " + resp.status);
        const data = await resp.json();

        renderCurrent(loc, data.current_weather);
        renderHourly(data.hourly, loc);

    } catch (err) {
        $("#currentContent").html("Error: " + err.message);
        console.error(err);
    }
}


// ==========================
//   RENDER: DATOS ACTUALES
// ==========================
function renderCurrent(loc, cw) {
    const html = `
    <strong>${loc.name}</strong><br>
    <strong>Hora:</strong> ${cw.time} &nbsp;
    <strong>Temp:</strong> ${cw.temperature} °C &nbsp;
    <strong>Viento:</strong> ${cw.windspeed} m/s (${Math.round(cw.winddirection)}°) &nbsp;
    <strong>Weather code:</strong> ${cw.weathercode}
  `;
    $("#currentContent").html(html);
}


// ========================================
//   RENDER: TABLA + GRÁFICA 24 HORAS
// ========================================
function renderHourly(hr, loc) {

    const times = hr.time;
    const temps = hr.temperature_2m;
    const feels = hr.apparent_temperature;
    const humidity = hr.relative_humidity_2m;
    const precip = hr.precipitation;
    const wind = hr.windspeed_10m;
    const uv = hr.uv_index;
    const wcode = hr.weathercode;

    // Encuentra el índice de la hora actual
    const nowStr = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    let startIdx = times.findIndex(t => t.startsWith(nowStr));
    if (startIdx === -1) startIdx = 0;

    const labels = [];
    const chartData = [];

    const $tbody = $("#hourlyTable tbody");

    for (let i = startIdx; i < Math.min(times.length, startIdx + 24); i++) {

        const row = `
      <tr>
        <td>${times[i].replace("T", " ")}</td>
        <td>${temps[i]}</td>
        <td>${feels[i] ?? ""}</td>
        <td>${humidity[i] ?? ""}</td>
        <td>${precip[i] ?? 0}</td>
        <td>${wind[i] ?? ""}</td>
        <td>${uv[i] ?? ""}</td>
        <td>${wcode[i] ?? ""}</td>
      </tr>
    `;

        $tbody.append(row);

        labels.push(times[i].replace("T", " "));
        chartData.push(temps[i]);
    }

    drawChart(labels, chartData, loc.name);
}


// ==========================
//   GRÁFICO (Chart.js)
// ==========================
function drawChart(labels, data, placeName) {

    if (typeof Chart === "undefined") return;

    const ctx = document.getElementById("tempChart").getContext("2d");

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Temp 24h (${placeName})`,
                data: data,
                fill: false,
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}
