"use strict";

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const crimeData = await fetch("./london_crime_data.json")
    .then(response => response.json());
const boroughCrimes = crimeData.dates["2021-04-01"].boroughs

const offencesUpperBound = 10000;
for (const [borough, boroughData] of Object.entries(boroughCrimes)) {
    if (borough === "Unknown") {
        continue;
    }

    let boroughId = borough.replaceAll(" ", "-").toLowerCase();
    if (boroughId === "southwark") {
        boroughId = "southwark-and-city-of-london";
    }
    const boroughElement = document.getElementById(boroughId);
    if (boroughElement === null) {
        console.error(`Element with id ${boroughId} not found`);
        continue
    }

    const ratio = boroughData.total_criminal_offences / offencesUpperBound;
    const colorValue = Math.floor(255 * (1 - ratio));
    const colorHex = colorValue.toString(16).padStart(2, "0");
    boroughElement.style.fill = `#ff${colorHex}${colorHex}`;
}
