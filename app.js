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

    const times = hr.time || [];
    const temps = hr.temperature_2m || [];
    const feels = hr.apparent_temperature || [];
    const humidity = hr.relative_humidity_2m || [];
    const precip = hr.precipitation || [];
    const wind = hr.windspeed_10m || [];
    const uv = hr.uv_index || [];
    const wcode = hr.weathercode || [];

    if (times.length === 0) {
        $("#hourlyTable tbody").html("<tr><td colspan='8'>No hay datos horarios disponibles</td></tr>");
        return;
    }

    const nowMadridHour = new Date().toLocaleString('sv', { timeZone: 'Europe/Madrid', hour12: false }).slice(11,16);
    let startIdx = times.findIndex(t => t.slice(11,16) >= nowMadridHour);
    if (startIdx === -1) startIdx = 0;

    // ---------- Calcular máximos ----------
    const maxTemp = Math.max(...temps.slice(startIdx, startIdx+24));
    const maxFeels = Math.max(...feels.slice(startIdx, startIdx+24));
    const maxHumidity = Math.max(...humidity.slice(startIdx, startIdx+24));
    const maxPrecip = Math.max(...precip.slice(startIdx, startIdx+24));
    const maxWind = Math.max(...wind.slice(startIdx, startIdx+24));
    const maxUv = Math.max(...uv.slice(startIdx, startIdx+24));

    const $tbody = $("#hourlyTable tbody");
    $tbody.empty();

    const labels = [];
    const chartData = [];

    for (let i = startIdx; i < Math.min(times.length, startIdx + 24); i++) {
        const displayTime = times[i].slice(11,16);

        // ---------- Determinar si es máximo (solo si > 0 para precip) ----------
        const tempClass = temps[i] === maxTemp ? "highlight" : "";
        const feelsClass = feels[i] === maxFeels ? "highlight" : "";
        const humClass = humidity[i] === maxHumidity ? "highlight" : "";
        const precipClass = (precip[i] === maxPrecip && maxPrecip > 0) ? "highlight" : "";
        const windClass = wind[i] === maxWind ? "highlight" : "";
        const uvClass = uv[i] === maxUv ? "highlight" : "";

        const row = `
      <tr>
        <td>${displayTime}</td>
        <td class="${tempClass}">${temps[i] ?? ""}</td>
        <td class="${feelsClass}">${feels[i] ?? ""}</td>
        <td class="${humClass}">${humidity[i] ?? ""}</td>
        <td class="${precipClass}">${precip[i] ?? 0}</td>
        <td class="${windClass}">${wind[i] ?? ""}</td>
        <td class="${uvClass}">${uv[i] ?? ""}</td>
        <td>${wcode[i] ?? ""}</td>
      </tr>
    `;
        $tbody.append(row);

        labels.push(displayTime);
        chartData.push(temps[i] ?? null);
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
